import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PasswordHasherPort } from '@application/ports/output/password-hasher.port';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
