export type OnboardingStepName =
  | 'personal_info'
  | 'contact_info'
  | 'address_info'
  | 'profile_photo'
  | 'completed';

export interface User {
  id: number;
  email: string | null;
  password: string;
  role: string;
  isVerified: boolean;
  verificationCode: string | null;
  tokenExpiry: Date | null;
  resetCode: string | null;
  onboardingStep: string;
  profileCompletion: number;
  isProfileCompleted: boolean;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  country: string | null;
  city: string | null;
  department: string | null;
  commune: string | null;
  address: string | null;
  photo: string | null;
  googleId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserWriteInput = Record<string, unknown>;
