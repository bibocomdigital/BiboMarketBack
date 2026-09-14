import { Inject, Injectable } from '@nestjs/common';
import {
  calculateProfileCompletion,
  getNextOnboardingStep,
} from '@domain/onboarding/profile-completion';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  FILE_STORAGE,
  type FileStoragePort,
} from '@application/ports/output/file-storage.port';

@Injectable()
export class GetOnboardingStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ExpressContractException(404, 'Utilisateur non trouvé');
    }

    const nextStep = getNextOnboardingStep(user);
    const completion = calculateProfileCompletion(user);

    return {
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        country: user.country,
        city: user.city,
        photo: user.photo,
        onboardingStep: user.onboardingStep,
        profileCompletion: user.profileCompletion,
        isProfileCompleted: user.isProfileCompleted,
      },
      onboarding: {
        isRequired: nextStep !== 'completed',
        currentStep: user.onboardingStep,
        nextStep,
        progress: completion,
        steps: {
          personal_info: !!(user.firstName && user.lastName),
          contact_info: !!user.phoneNumber,
          address_info: !!(user.country && user.city),
          profile_photo: !!user.photo,
        },
      },
    };
  }
}

@Injectable()
export class CompletePersonalInfoUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    userId: number,
    input: {
      firstName?: string;
      lastName?: string;
      gender?: string;
      dateOfBirth?: string;
    },
  ) {
    const { firstName, lastName, gender, dateOfBirth } = input;

    if (!firstName || !lastName) {
      throw new ExpressContractException(
        400,
        'Le prénom et nom sont requis',
      );
    }

    const updatedUser = await this.users.update(userId, {
      firstName,
      lastName,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      onboardingStep: 'contact_info',
      profileCompletion: 50,
    });

    return {
      status: 'success',
      message: 'Informations personnelles enregistrées',
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        onboardingStep: updatedUser.onboardingStep,
        profileCompletion: updatedUser.profileCompletion,
      },
      onboarding: {
        isRequired: true,
        nextStep: 'contact_info',
        progress: 50,
      },
    };
  }
}

@Injectable()
export class CompleteContactInfoUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    userId: number,
    input: { phoneNumber?: string; whatsappNumber?: string },
  ) {
    const { phoneNumber, whatsappNumber } = input;

    if (!phoneNumber) {
      throw new ExpressContractException(
        400,
        'Le numéro de téléphone est requis',
      );
    }

    const existingPhone = await this.users.findByPhoneNumberExcludingId(
      phoneNumber,
      userId,
    );
    if (existingPhone) {
      throw new ExpressContractException(
        400,
        'Ce numéro de téléphone est déjà utilisé',
        'PHONE_EXISTS',
      );
    }

    const updatedUser = await this.users.update(userId, {
      phoneNumber,
      whatsappNumber,
      onboardingStep: 'address_info',
      profileCompletion: 70,
    });

    return {
      status: 'success',
      message: 'Informations de contact enregistrées',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
      },
      onboarding: {
        isRequired: true,
        nextStep: 'address_info',
        progress: 70,
      },
    };
  }
}

@Injectable()
export class CompleteAddressInfoUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    userId: number,
    input: {
      country?: string;
      city?: string;
      department?: string;
      commune?: string;
      address?: string;
    },
  ) {
    const updatedUser = await this.users.update(userId, {
      country: input.country,
      city: input.city,
      department: input.department,
      commune: input.commune,
      address: input.address,
      onboardingStep: 'profile_photo',
      profileCompletion: 85,
    });

    return {
      status: 'success',
      message: 'Adresse enregistrée',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        city: updatedUser.city,
        country: updatedUser.country,
      },
      onboarding: {
        isRequired: true,
        nextStep: 'profile_photo',
        progress: 85,
        canSkip: true,
      },
    };
  }
}

@Injectable()
export class CompleteProfilePhotoUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(userId: number, filePath?: string) {
    let photoUrl: string | null = null;

    if (filePath) {
      try {
        photoUrl = await this.fileStorage.uploadProfilePhoto(filePath, userId, {
          width: 400,
          height: 400,
          crop: 'fill',
        });
      } catch (cloudinaryError) {
        throw new ExpressContractException(
          500,
          "Erreur lors de l'upload de l'image",
          undefined,
          {
            name: 'CloudinaryError',
            details:
              cloudinaryError instanceof Error
                ? cloudinaryError.message
                : String(cloudinaryError),
          },
        );
      }
    }

    const updatedUser = await this.users.update(userId, {
      photo: photoUrl,
      onboardingStep: 'completed',
      profileCompletion: 100,
      isProfileCompleted: true,
    });

    return {
      status: 'success',
      message: 'Profil complété avec succès !',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        photo: updatedUser.photo,
      },
      onboarding: {
        isRequired: false,
        completed: true,
        progress: 100,
      },
    };
  }
}

@Injectable()
export class SkipOnboardingStepUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: number, step?: string) {
    const stepMapping: Record<
      string,
      { next: string; completion: number; profileCompleted: boolean }
    > = {
      profile_photo: {
        next: 'completed',
        completion: 90,
        profileCompleted: true,
      },
      address_info: {
        next: 'profile_photo',
        completion: 70,
        profileCompleted: false,
      },
    };

    const stepInfo = step ? stepMapping[step] : undefined;
    if (!stepInfo) {
      throw new ExpressContractException(
        400,
        'Étape non trouvée ou non ignorable',
      );
    }

    await this.users.update(userId, {
      onboardingStep: stepInfo.next,
      profileCompletion: stepInfo.completion,
      isProfileCompleted: stepInfo.profileCompleted,
    });

    return {
      status: 'success',
      message: 'Étape ignorée',
      onboarding: {
        nextStep: stepInfo.next,
        progress: stepInfo.completion,
        completed: stepInfo.next === 'completed',
      },
    };
  }
}
