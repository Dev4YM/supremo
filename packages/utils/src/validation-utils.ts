/**
 * Validation utility functions
 */

export class ValidationUtils {
  /**
   * Check if email is valid
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if URL is valid
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if string is not empty or whitespace
   */
  static isNotEmpty(str: string): boolean {
    return str.trim().length > 0;
  }

  /**
   * Check if value is within range
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * Check if string matches pattern
   */
  static matchesPattern(str: string, pattern: RegExp): boolean {
    return pattern.test(str);
  }

  /**
   * Validate required fields in object
   */
  static validateRequired<T extends Record<string, any>>(
    obj: T, 
    requiredFields: (keyof T)[]
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        missingFields.push(String(field));
      }
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
}