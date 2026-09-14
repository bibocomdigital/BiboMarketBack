import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';
import { AppException } from '@domain/exceptions/app.exception';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      // Zod error handling
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw AppException.validation('Validation failed', errorMessages);
      }

      throw AppException.validation('Validation failed');
    }
  }
}
