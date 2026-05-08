import { IsOptional, IsString, IsBoolean, IsHexColor, IsIn, IsUrl, MaxLength } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  botDisplayName?: string;

  @IsOptional()
  @IsUrl()
  botAvatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  botStatusMessage?: string;

  @IsOptional()
  @IsHexColor()
  themePrimaryColor?: string;

  @IsOptional()
  @IsHexColor()
  themeSecondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  themeAccentColor?: string;

  @IsOptional()
  @IsIn(['light', 'dark', 'auto'])
  themeMode?: string;

  @IsOptional()
  @IsUrl()
  customLogoUrl?: string;

  @IsOptional()
  @IsUrl()
  customFaviconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  commandPrefix?: string;

  @IsOptional()
  @IsHexColor()
  embedColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  embedFooterText?: string;

  @IsOptional()
  @IsUrl()
  embedFooterIconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @IsOptional()
  @IsBoolean()
  hideBranding?: boolean;
}

export class BrandingResponseDto {
  id: string;
  guildId: string;
  botDisplayName?: string;
  botAvatarUrl?: string;
  botStatusMessage?: string;
  themePrimaryColor?: string;
  themeSecondaryColor?: string;
  themeAccentColor?: string;
  themeMode: string;
  customLogoUrl?: string;
  customFaviconUrl?: string;
  commandPrefix?: string;
  embedColor?: string;
  embedFooterText?: string;
  embedFooterIconUrl?: string;
  customDomain?: string;
  hideBranding: boolean;
  createdAt: Date;
  updatedAt: Date;
}

