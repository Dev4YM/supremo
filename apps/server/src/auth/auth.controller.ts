import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { RbacService } from './rbac.service';
import { SessionGuard } from './guards/session.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiStandardResponses } from '../common/decorators/api-response.decorator';

interface AuthenticatedRequest extends Request {
  botUserId?: string;
  guildId?: string;
  permissions?: Set<string>;
}

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private rbacService: RbacService,
  ) {}

  /**
   * Register new user
   */
  @Post('register')
  @ApiOperation({ summary: 'Register new user', description: 'Creates a new user account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'securePassword123' },
        username: { type: 'string', example: 'JohnDoe' },
      },
      required: ['email', 'password', 'username'],
    },
  })
  @ApiStandardResponses()
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(
    @Body() body: { email: string; password: string; username: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { email, password, username } = body;

    if (!email || !password || !username) {
      throw new BadRequestException('Email, password, and username are required');
    }

    const user = await this.authService.register(email, password, username);

    // Create session for the new user
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');
    const session = await this.sessionService.createSession(user.id, ip, userAgent);

    // Set session cookie (same-origin, httpOnly)
    this.setSessionCookie(res, session.token);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      message: 'Registration successful',
    });
  }

  /**
   * Login with email/password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login', description: 'Authenticates user with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'securePassword123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiStandardResponses()
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.authService.login(email, password, ip, userAgent);

    // Set session cookie (same-origin, httpOnly)
    this.setSessionCookie(res, result.sessionToken);

    return res.json({
      user: result.user,
      message: 'Login successful',
    });
  }

  /**
   * Get Discord OAuth URL
   */
  @Get('discord/url')
  @ApiOperation({ summary: 'Get Discord OAuth URL', description: 'Returns the Discord OAuth authorization URL' })
  getDiscordOAuthUrl() {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      throw new BadRequestException('Discord OAuth configuration is missing');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds',
    });

    const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
    
    return {
      url,
      message: 'Discord OAuth URL generated successfully',
    };
  }

  /**
   * Discord OAuth login (POST endpoint for frontend)
   */
  @Post('discord')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discord OAuth Login', description: 'Authenticate with Discord authorization code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'discord_auth_code' },
      },
    },
  })
  async discordLogin(
    @Body('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new BadRequestException(`Discord token exchange failed: ${error}`);
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokenData;

      // Get user data from Discord
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new BadRequestException('Failed to fetch Discord user data');
      }

      const discordUser = await userResponse.json();
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Process OAuth with real Discord data
      const result = await this.authService.discordOAuth(
        discordUser.id,
        access_token,
        refresh_token || '',
        expiresAt,
        {
          username: discordUser.username,
          avatar: discordUser.avatar,
          email: discordUser.email,
        },
        ip,
        userAgent,
      );

      return res.json({
        data: {
          token: result.sessionToken,
          user: result.user,
        },
        message: 'Discord authentication successful',
      });
    } catch (error) {
      console.error('Discord OAuth error:', error);
      throw new BadRequestException(error.message || 'Discord authentication failed');
    }
  }

  /**
   * Discord OAuth callback (GET endpoint for Discord redirect)
   */
  @Get('discord/callback')
  async discordCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      return res.redirect(this.buildAuthCallbackUrl({ error }));
    }

    if (!code) {
      return res.redirect(
        this.buildAuthCallbackUrl({ error: 'No authorization code received' }),
      );
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Discord token exchange failed:', error);
        return res.redirect(
          this.buildAuthCallbackUrl({ error: 'Discord token exchange failed' }),
        );
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokenData;

      // Get user data from Discord
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!userResponse.ok) {
        console.error('Failed to fetch Discord user data');
        return res.redirect(
          this.buildAuthCallbackUrl({ error: 'Failed to fetch user data' }),
        );
      }

      const discordUser = await userResponse.json();
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Process OAuth with real Discord data
      const result = await this.authService.discordOAuth(
        discordUser.id,
        access_token,
        refresh_token || '',
        expiresAt,
        {
          username: discordUser.username,
          avatar: discordUser.avatar,
          email: discordUser.email,
        },
        ip,
        userAgent,
      );

      // Redirect with short-lived session token (client exchanges for httpOnly cookie).
      // User profile is returned from POST /exchange-token — avoid serializing user in the URL.
      return res.redirect(
        this.buildAuthCallbackUrl({
          success: 'true',
          token: result.sessionToken,
        }),
      );
    } catch (error) {
      console.error('Discord OAuth error:', error);
      return res.redirect(
        this.buildAuthCallbackUrl({ error: 'Authentication failed' }),
      );
    }
  }

  /**
   * Exchange session token for cookie-based session
   */
  @Post('exchange-token')
  @ApiOperation({ 
    summary: 'Exchange token for session', 
    description: 'Exchanges a session token for a cookie-based session' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Session token from OAuth callback' },
      },
      required: ['token'],
    },
  })
  @ApiStandardResponses()
  @ApiResponse({ status: 200, description: 'Session established successfully' })
  async exchangeToken(
    @Body() body: { token: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { token } = body;

    if (!token) {
      throw new BadRequestException('Token is required');
    }

    try {
      // Validate the session token and get user info
      const session = await this.sessionService.validateSession(token);
      
      if (!session || !session.botUserId) {
        throw new BadRequestException('Invalid or expired token');
      }

      // Get user data
      const user = await this.authService.getUserById(session.botUserId);
      
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Set session cookie
      this.setSessionCookie(res, token);

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar: user.avatar,
            discordId: user.discordId,
            createdAt: user.createdAt,
          },
        },
        message: 'Session established successfully',
      });
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new BadRequestException('Failed to exchange token for session');
    }
  }

  /**
   * Get session status - returns user info, guilds, and setup status
   * This is the single source of truth for frontend routing decisions
   */
  @Get('session')
  @UseGuards(SessionGuard)
  @ApiOperation({ 
    summary: 'Get session status', 
    description: 'Returns authenticated user info, guilds, and setup requirements. Use this for routing decisions.' 
  })
  @ApiStandardResponses()
  @ApiResponse({ status: 200, description: 'Session status' })
  async getSession(@CurrentUser() botUserId: string) {
    const user = await this.authService.getUserById(botUserId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get user's guilds (returns guild IDs)
    const guildIds = await this.rbacService.getUserGuilds(botUserId);

    // Fetch full guild details
    const guilds = await this.authService.getUserGuildsWithDetails(guildIds);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        discordId: user.discordId,
      },
      guilds,
      setupRequired: guilds.length === 0,
    };
  }

  /**
   * Get current user (legacy endpoint, prefer /session)
   */
  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get current user', description: 'Retrieves the authenticated user\'s information' })
  @ApiStandardResponses()
  @ApiResponse({ status: 200, description: 'User information' })
  async getMe(@CurrentUser() botUserId: string) {
    const user = await this.authService.getUserById(botUserId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get user's guilds
    const guildIds = await this.rbacService.getUserGuilds(botUserId);

    return {
      ...user,
      guilds: guildIds,
    };
  }

  /**
   * Logout
   */
  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout', description: 'Invalidates the current session' })
  @ApiStandardResponses()
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const token = req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await this.sessionService.revokeSession(token);
    }

    res.clearCookie('session_token', {
      path: '/',
      secure: this.isSessionCookieSecure(),
    });

    return res.json({ message: 'Logout successful' });
  }

  /** Base URL of the Next.js app (OAuth redirect target). */
  private getFrontendBaseUrl(): string {
    const base =
      process.env.WEB_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (base) {
      return base.replace(/\/$/, '');
    }
    return 'http://localhost:7634';
  }

  private buildAuthCallbackUrl(params: Record<string, string>): string {
    const qs = new URLSearchParams(params).toString();
    return `${this.getFrontendBaseUrl()}/auth/callback?${qs}`;
  }

  private isSessionCookieSecure(): boolean {
    if (process.env.COOKIE_SECURE === 'true') {
      return true;
    }
    if (process.env.COOKIE_SECURE === 'false') {
      return false;
    }
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Helper method to set session cookie with consistent settings
   */
  private setSessionCookie(res: Response, token: string) {
    const secure = this.isSessionCookieSecure();

    res.cookie('session_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });
  }
}

