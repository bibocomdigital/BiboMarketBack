import { PipeTransform, Injectable } from '@nestjs/common';
import { type ZodSchema, ZodError } from 'zod';
import { AppException } from '@domain/exceptions/app.exception';

@Injectable()
export class QueryValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any) {
    try {
      // Transform string query params to appropriate types
      const transformed = this.transformQueryParams(value);
      const parsedValue = this.schema.parse(transformed);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw AppException.validation('Query validation failed', errorMessages);
      }

      throw AppException.validation('Query validation failed');
    }
  }

  private transformQueryParams(query: any): any {
    const transformed = { ...query };

    // Transform string numbers to actual numbers
    Object.keys(transformed).forEach((key) => {
      const value = transformed[key];
      if (typeof value === 'string') {
        // Try to parse as number
        const numValue = Number(value);
        if (!isNaN(numValue) && value.trim() !== '') {
          transformed[key] = numValue;
        }
      }
    });

    return transformed;
  }
}
