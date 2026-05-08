import { Injectable, Logger } from '@nestjs/common';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class SchemaValidatorService {
  private readonly logger = new Logger(SchemaValidatorService.name);
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  validate(schema: any, data: any): { valid: boolean; errors?: ErrorObject[] } {
    try {
      const validate: ValidateFunction = this.ajv.compile(schema);
      const valid = validate(data);

      if (!valid) {
        return {
          valid: false,
          errors: validate.errors || [],
        };
      }

      return { valid: true };
    } catch (error: any) {
      this.logger.error('Schema validation error:', error);
      return {
        valid: false,
        errors: [{
          keyword: 'error',
          message: error.message || 'Invalid schema',
          instancePath: '',
          schemaPath: '',
          params: {},
        } as ErrorObject],
      };
    }
  }

  validateConfig(schema: any, config: any): { valid: boolean; errors?: string[] } {
    const result = this.validate(schema, config);
    if (!result.valid && result.errors) {
      const errorMessages = result.errors.map((err) => {
        const path = err.instancePath || err.schemaPath || 'root';
        return `${path}: ${err.message}`;
      });
      return { valid: false, errors: errorMessages };
    }
    return { valid: true };
  }
}

