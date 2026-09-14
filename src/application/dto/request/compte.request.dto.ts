import { AuthProvider, Role } from '@domain/types/role';
import {
  DisabilityType,
  Region,
  ResidenceType,
  Sexe,
} from '@domain/types/user';

export interface JwtPayload {
  /** Identifiant utilisateur — payload historique Express (`jwt.sign({ id })`). */
  id: number;
  /** Alias lu par certaines routes Express (`req.user.userId`). */
  userId?: number;
  role?: Role;
  phoneNumber?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export type RegistrationPlatform = 'web' | 'mobile';

export interface CreateAccountDto {
  platform?: RegistrationPlatform;
  password?: string;
  firstName?: string;
  lastName?: string;
  telephone?: string;
  indicatif?: string;
  email?: string;
  googleId?: string;
  provider?: AuthProvider;
  imageUrl?: string;
  role: Role;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export interface AdminCreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface UpdateProfileDto {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface CompleteProfileDto {
  userId: string;
  // Basic user info
  firstName?: string;
  lastName?: string;
  email?: string;
  // Profile info
  ageRangeId?: string;
  currentStatusId?: string;
  referralSourceId?: string;
  sexe?: Sexe;
  region?: Region;
  residenceType?: ResidenceType;
  disability?: boolean;
  disabilityType?: DisabilityType;
  disabilityDetails?: string;
  consentGiven?: boolean;
  telephone?: string;
  indicatif?: string;
}

export interface LoginDto {
  email?: string;
  telephone?: string;
  indicatif?: string;
  password: string;
}

export interface SendPhoneOtpDto {
  telephone: string;
  indicatif: string;
}

export interface VerifyPhoneDto {
  telephone: string;
  indicatif: string;
  otp: string;
}

export interface RequestPasswordResetDto {
  email: string;
}

export interface SendEmailVerificationDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface RequestPasswordResetPhoneDto {
  telephone: string;
  indicatif: string;
}

export interface ResetPasswordPhoneDto {
  telephone: string;
  indicatif: string;
  otp: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordDto {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Country codes avec plage de longueur des numéros locaux (min, max)
export const INDICATIF_LOCAL_LENGTHS: Record<
  string,
  { min: number; max: number }
> = {
  // Afrique de l'Ouest
  '+221': { min: 9, max: 9 }, // Senegal (77, 78, 70 + 7 digits)
  '+223': { min: 8, max: 8 }, // Mali
  '+224': { min: 8, max: 9 }, // Guinea
  '+225': { min: 8, max: 10 }, // Côte d'Ivoire
  '+226': { min: 8, max: 8 }, // Burkina Faso
  '+227': { min: 8, max: 8 }, // Niger
  '+228': { min: 8, max: 8 }, // Togo
  '+229': { min: 8, max: 8 }, // Benin
  '+230': { min: 7, max: 8 }, // Mauritius
  '+231': { min: 7, max: 9 }, // Liberia
  '+232': { min: 8, max: 8 }, // Sierra Leone
  '+233': { min: 9, max: 9 }, // Ghana
  '+234': { min: 7, max: 10 }, // Nigeria
  '+235': { min: 8, max: 8 }, // Chad
  '+236': { min: 8, max: 8 }, // Central African Republic
  '+237': { min: 8, max: 9 }, // Cameroon
  '+238': { min: 7, max: 7 }, // Cape Verde
  '+239': { min: 6, max: 7 }, // Sao Tome and Principe
  '+240': { min: 9, max: 9 }, // Equatorial Guinea
  '+241': { min: 7, max: 8 }, // Gabon
  '+242': { min: 9, max: 9 }, // Republic of the Congo
  '+243': { min: 8, max: 9 }, // Democratic Republic of the Congo
  '+244': { min: 9, max: 9 }, // Angola
  '+245': { min: 7, max: 9 }, // Guinea-Bissau
  '+246': { min: 7, max: 7 }, // British Indian Ocean Territory
  '+247': { min: 4, max: 4 }, // Ascension Island
  '+248': { min: 7, max: 7 }, // Seychelles
  '+249': { min: 9, max: 9 }, // Sudan
  '+250': { min: 9, max: 9 }, // Rwanda
  '+251': { min: 9, max: 9 }, // Ethiopia
  '+252': { min: 8, max: 9 }, // Somalia
  '+253': { min: 8, max: 8 }, // Djibouti
  '+254': { min: 9, max: 10 }, // Kenya
  '+255': { min: 9, max: 9 }, // Tanzania
  '+256': { min: 9, max: 9 }, // Uganda
  '+257': { min: 8, max: 8 }, // Burundi
  '+258': { min: 8, max: 9 }, // Mozambique
  '+260': { min: 9, max: 10 }, // Zambia
  '+261': { min: 10, max: 10 }, // Madagascar
  '+262': { min: 9, max: 10 }, // Réunion/Mayotte
  '+263': { min: 9, max: 10 }, // Zimbabwe
  '+264': { min: 8, max: 9 }, // Namibia
  '+265': { min: 8, max: 9 }, // Malawi
  '+266': { min: 8, max: 8 }, // Lesotho
  '+267': { min: 7, max: 8 }, // Botswana
  '+268': { min: 7, max: 8 }, // Eswatini
  '+269': { min: 7, max: 7 }, // Comoros
  '+27': { min: 9, max: 10 }, // South Africa

  // Europe
  '+33': { min: 9, max: 10 }, // France
  '+44': { min: 10, max: 11 }, // UK
  '+49': { min: 10, max: 12 }, // Germany
  '+34': { min: 9, max: 10 }, // Spain
  '+39': { min: 10, max: 12 }, // Italy
  '+46': { min: 7, max: 10 }, // Sweden
  '+7': { min: 10, max: 10 }, // Russia

  // Amériques
  '+1': { min: 10, max: 11 }, // USA/Canada
  '+55': { min: 10, max: 11 }, // Brazil
  '+52': { min: 10, max: 11 }, // Mexico

  // Asie
  '+91': { min: 10, max: 10 }, // India
  '+81': { min: 10, max: 11 }, // Japan
  '+86': { min: 11, max: 11 }, // China
  '+82': { min: 10, max: 11 }, // South Korea
  '+90': { min: 10, max: 11 }, // Turkey
  '+94': { min: 9, max: 10 }, // Sri Lanka
  '+92': { min: 10, max: 11 }, // Pakistan
  '+880': { min: 10, max: 11 }, // Bangladesh

  // Océanie
  '+61': { min: 9, max: 10 }, // Australia
  '+64': { min: 8, max: 10 }, // New Zealand
  '+675': { min: 8, max: 8 }, // Papua New Guinea

  // Moyen-Orient
  '+971': { min: 9, max: 10 }, // UAE
  '+966': { min: 9, max: 10 }, // Saudi Arabia
  '+972': { min: 9, max: 10 }, // Israel
  '+963': { min: 9, max: 10 }, // Syria
  '+964': { min: 10, max: 10 }, // Iraq
  '+965': { min: 8, max: 8 }, // Kuwait
  '+968': { min: 8, max: 8 }, // Oman
};

export const INDICATIFS = [
  // Afrique de l'Ouest
  '+221', // Senegal
  '+223', // Mali
  '+224', // Guinea
  '+225', // Côte d'Ivoire
  '+226', // Burkina Faso
  '+227', // Niger
  '+228', // Togo
  '+229', // Benin
  '+230', // Mauritius
  '+231', // Liberia
  '+232', // Sierra Leone
  '+233', // Ghana
  '+234', // Nigeria
  '+235', // Chad
  '+236', // Central African Republic
  '+237', // Cameroon
  '+238', // Cape Verde
  '+239', // Sao Tome and Principe
  '+240', // Equatorial Guinea
  '+241', // Gabon
  '+242', // Republic of the Congo
  '+243', // Democratic Republic of the Congo
  '+244', // Angola
  '+245', // Guinea-Bissau
  '+246', // British Indian Ocean Territory
  '+247', // Ascension Island
  '+248', // Seychelles
  '+249', // Sudan
  '+250', // Rwanda
  '+251', // Ethiopia
  '+252', // Somalia
  '+253', // Djibouti
  '+254', // Kenya
  '+255', // Tanzania
  '+256', // Uganda
  '+257', // Burundi
  '+258', // Mozambique
  '+260', // Zambia
  '+261', // Madagascar
  '+262', // Réunion/Mayotte
  '+263', // Zimbabwe
  '+264', // Namibia
  '+265', // Malawi
  '+266', // Lesotho
  '+267', // Botswana
  '+268', // Eswatini
  '+269', // Comoros
  '+27', // South Africa

  // Europe
  '+33', // France
  '+44', // UK
  '+49', // Germany
  '+34', // Spain
  '+39', // Italy
  '+46', // Sweden
  '+7', // Russia

  // Amériques
  '+1', // USA/Canada
  '+55', // Brazil
  '+52', // Mexico

  // Asie
  '+91', // India
  '+81', // Japan
  '+86', // China
  '+82', // South Korea
  '+90', // Turkey
  '+94', // Sri Lanka
  '+92', // Pakistan
  '+880', // Bangladesh

  // Océanie
  '+61', // Australia
  '+64', // New Zealand
  '+675', // Papua New Guinea

  // Moyen-Orient
  '+971', // UAE
  '+966', // Saudi Arabia
  '+972', // Israel
  '+963', // Syria
  '+964', // Iraq
  '+965', // Kuwait
  '+968', // Oman
];
