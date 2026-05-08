/**
 * Discord-specific utility functions
 */

export class DiscordUtils {
  /**
   * Validate Discord snowflake ID
   */
  static isValidSnowflake(id: string): boolean {
    return /^\d{17,19}$/.test(id);
  }

  /**
   * Extract timestamp from Discord snowflake
   */
  static snowflakeToTimestamp(snowflake: string): Date {
    const timestamp = (BigInt(snowflake) >> 22n) + 1420070400000n;
    return new Date(Number(timestamp));
  }

  /**
   * Format user mention
   */
  static formatUserMention(userId: string): string {
    return `<@${userId}>`;
  }

  /**
   * Format role mention
   */
  static formatRoleMention(roleId: string): string {
    return `<@&${roleId}>`;
  }

  /**
   * Format channel mention
   */
  static formatChannelMention(channelId: string): string {
    return `<#${channelId}>`;
  }

  /**
   * Parse mention to get ID
   */
  static parseMention(mention: string): { type: 'user' | 'role' | 'channel' | null; id: string | null } {
    // User mention: <@123> or <@!123>
    const userMatch = mention.match(/^<@!?(\d+)>$/);
    if (userMatch) {
      return { type: 'user', id: userMatch[1] };
    }

    // Role mention: <@&123>
    const roleMatch = mention.match(/^<@&(\d+)>$/);
    if (roleMatch) {
      return { type: 'role', id: roleMatch[1] };
    }

    // Channel mention: <#123>
    const channelMatch = mention.match(/^<#(\d+)>$/);
    if (channelMatch) {
      return { type: 'channel', id: channelMatch[1] };
    }

    return { type: null, id: null };
  }

  /**
   * Format custom emoji
   */
  static formatCustomEmoji(name: string, id: string, animated = false): string {
    return `<${animated ? 'a' : ''}:${name}:${id}>`;
  }

  /**
   * Parse custom emoji
   */
  static parseCustomEmoji(emoji: string): { name: string; id: string; animated: boolean } | null {
    const match = emoji.match(/^<(a?):([^:]+):(\d+)>$/);
    if (match) {
      return {
        animated: match[1] === 'a',
        name: match[2],
        id: match[3]
      };
    }
    return null;
  }

  /**
   * Validate Discord invite code
   */
  static isValidInviteCode(code: string): boolean {
    return /^[a-zA-Z0-9]{2,32}$/.test(code);
  }

  /**
   * Extract invite codes from text
   */
  static extractInviteCodes(text: string): string[] {
    const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discordapp\.com\/invite\/|discord\.com\/invite\/)([a-zA-Z0-9]{2,32})/g;
    const matches = [];
    let match;
    
    while ((match = inviteRegex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  }

  /**
   * Format Discord code block
   */
  static formatCodeBlock(code: string, language = ''): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  /**
   * Format inline code
   */
  static formatInlineCode(code: string): string {
    return `\`${code}\``;
  }

  /**
   * Create Discord embed color from hex
   */
  static hexToDiscordColor(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  /**
   * Convert Discord color to hex
   */
  static discordColorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  /**
   * Validate Discord webhook URL
   */
  static isValidWebhookUrl(url: string): boolean {
    return /^https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url);
  }

  /**
   * Split message into chunks that fit Discord's character limit
   */
  static splitMessage(content: string, maxLength = 2000): string[] {
    if (content.length <= maxLength) {
      return [content];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    const lines = content.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        
        // If single line is too long, split it
        if (line.length > maxLength) {
          let remainingLine = line;
          while (remainingLine.length > maxLength) {
            chunks.push(remainingLine.substring(0, maxLength));
            remainingLine = remainingLine.substring(maxLength);
          }
          currentChunk = remainingLine;
        } else {
          currentChunk = line;
        }
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Get Discord CDN URL for user avatar
   */
  static getUserAvatarUrl(userId: string, avatarHash: string, size = 256): string {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${avatarHash.startsWith('a_') ? 'gif' : 'png'}?size=${size}`;
  }

  /**
   * Get default Discord avatar URL
   */
  static getDefaultAvatarUrl(discriminator: string): string {
    const avatarId = parseInt(discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${avatarId}.png`;
  }

  /**
   * Get Discord CDN URL for guild icon
   */
  static getGuildIconUrl(guildId: string, iconHash: string, size = 256): string {
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${iconHash.startsWith('a_') ? 'gif' : 'png'}?size=${size}`;
  }
}