/**
 * String utility functions
 */

export class StringUtils {
  /**
   * Truncate string to specified length with ellipsis
   */
  static truncate(str: string, maxLength: number, ellipsis = '...'): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - ellipsis.length) + ellipsis;
  }

  /**
   * Capitalize first letter of string
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Convert string to title case
   */
  static toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Convert camelCase to kebab-case
   */
  static camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Convert kebab-case to camelCase
   */
  static kebabToCamel(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  /**
   * Remove all whitespace from string
   */
  static removeWhitespace(str: string): string {
    return str.replace(/\s/g, '');
  }

  /**
   * Normalize whitespace (collapse multiple spaces to single space)
   */
  static normalizeWhitespace(str: string): string {
    return str.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract mentions from Discord message content
   */
  static extractMentions(content: string): {
    users: string[];
    roles: string[];
    channels: string[];
    everyone: boolean;
    here: boolean;
  } {
    const userMentions = content.match(/<@!?(\d+)>/g) || [];
    const roleMentions = content.match(/<@&(\d+)>/g) || [];
    const channelMentions = content.match(/<#(\d+)>/g) || [];
    
    return {
      users: userMentions.map(m => m.replace(/<@!?(\d+)>/, '$1')),
      roles: roleMentions.map(m => m.replace(/<@&(\d+)>/, '$1')),
      channels: channelMentions.map(m => m.replace(/<#(\d+)>/, '$1')),
      everyone: content.includes('@everyone'),
      here: content.includes('@here')
    };
  }

  /**
   * Escape Discord markdown
   */
  static escapeMarkdown(str: string): string {
    return str.replace(/([*_`~\\|])/g, '\\$1');
  }

  /**
   * Clean string for use in file names
   */
  static sanitizeFilename(str: string): string {
    return str.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Check if string contains only ASCII characters
   */
  static isASCII(str: string): boolean {
    return /^[\x00-\x7F]*$/.test(str);
  }

  /**
   * Count words in string
   */
  static wordCount(str: string): number {
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract URLs from string
   */
  static extractUrls(str: string): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    return str.match(urlRegex) || [];
  }

  /**
   * Remove URLs from string
   */
  static removeUrls(str: string): string {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    return str.replace(urlRegex, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  static similarity(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
  }
}