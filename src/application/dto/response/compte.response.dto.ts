import { ErrorCode } from '@domain/enums/error-code.enum';
import { Role } from '@domain/types/role';

export interface Login {
  refresh: string;
  access: string;
}

export class UserResponseDto {
  code?: ErrorCode;
  id!: string;
  email?: string;
  firstName!: string;
  lastName!: string;
  telephone?: string;
  phoneVerified?: boolean;
  role!: Role;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  createdAt!: Date;
  isProfileComplete?: boolean;
}

export interface LoginResponseDto {
  user: UserResponseDto;
  lastActivity?: {
    courseId: string;
    lessonId: string;
    status: string;
    redirectTo: string;
  };
}
