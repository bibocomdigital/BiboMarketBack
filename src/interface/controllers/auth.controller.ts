import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, NoFilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import type { Request, Response } from 'express';
import { RegisterUserUseCase } from '@application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '@application/use-cases/auth/login-user.use-case';
import { HandleGoogleLoginUseCase } from '@application/use-cases/auth/google-login.use-case';
import { ForgotPasswordUseCase } from '@application/use-cases/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from '@application/use-cases/auth/reset-password.use-case';
import { VerifyRegistrationUseCase } from '@application/use-cases/auth/verify-registration.use-case';
import { SendPhoneVerificationCodeUseCase } from '@application/use-cases/auth/send-phone-verification.use-case';
import { VerifyPhoneUseCase } from '@application/use-cases/auth/verify-phone.use-case';
import {
  ChangePasswordUseCase,
  DeleteUserAccountUseCase,
  GetAllUsersUseCase,
  GetUserProfileUseCase,
  LogoutUserUseCase,
  UpdateUserProfileUseCase,
  UpdateUserRoleUseCase,
  VerifyAuthTokenUseCase,
} from '@application/use-cases/auth/profile-auth.use-case';
import {
  CompleteAddressInfoUseCase,
  CompleteContactInfoUseCase,
  CompletePersonalInfoUseCase,
  CompleteProfilePhotoUseCase,
  GetOnboardingStatusUseCase,
  SkipOnboardingStepUseCase,
} from '@application/use-cases/onboarding/onboarding.use-case';
import {
  UpdateConnectedProfileUseCase,
  UploadUserProfilePhotoUseCase,
} from '@application/use-cases/user/user.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import {
  ExpressAdminGuard,
  ExpressAuthGuard,
  currentUserId,
} from '@interface/guards/express-auth.guard';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

const photoUpload = FileInterceptor('photo', {
  storage: diskStorage({
    destination: 'uploads',
    filename: (_req, file, callback) => {
      const cleanName = file.originalname
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');
      callback(null, `${Date.now()}-${cleanName}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

@ApiTags('auth')
@UseFilters(ExpressContractFilter)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly forgotPassword: ForgotPasswordUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly verifyRegistration: VerifyRegistrationUseCase,
    private readonly sendPhoneVerificationCode: SendPhoneVerificationCodeUseCase,
    private readonly verifyPhone: VerifyPhoneUseCase,
    private readonly getUserProfile: GetUserProfileUseCase,
    private readonly updateUserProfile: UpdateUserProfileUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly deleteUserAccount: DeleteUserAccountUseCase,
    private readonly verifyAuthToken: VerifyAuthTokenUseCase,
    private readonly getAllUsers: GetAllUsersUseCase,
    private readonly updateUserRole: UpdateUserRoleUseCase,
    private readonly logoutUser: LogoutUserUseCase,
    private readonly getOnboardingStatus: GetOnboardingStatusUseCase,
    private readonly completePersonalInfo: CompletePersonalInfoUseCase,
    private readonly completeContactInfo: CompleteContactInfoUseCase,
    private readonly completeAddressInfo: CompleteAddressInfoUseCase,
    private readonly completeProfilePhoto: CompleteProfilePhotoUseCase,
    private readonly skipOnboardingStep: SkipOnboardingStepUseCase,
    private readonly handleGoogleLogin: HandleGoogleLoginUseCase,
    private readonly updateConnectedProfile: UpdateConnectedProfileUseCase,
    private readonly uploadUserProfilePhoto: UploadUserProfilePhotoUseCase,
  ) {}

  @Post('register')
  @HttpCode(201)
  @UseInterceptors(NoFilesInterceptor())
  register(
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      password?: string;
      role?: string;
      email?: string;
      city?: string;
      department?: string;
      commune?: string;
    },
  ) {
    return this.registerUser.execute(body);
  }

  @Post('verify')
  verify(@Body() body: { email?: string; verificationCode?: string }) {
    return this.verifyRegistration.execute(body);
  }

  @Post('login')
  login(
    @Body() body: { phoneNumber?: string; email?: string; password?: string },
  ) {
    return this.loginUser.execute(body);
  }

  /** GIS : le front envoie l'ID token Google, pas un code OAuth. */
  @Post('google-login')
  @HttpCode(200)
  googleLogin(@Body() body: { idToken?: string }) {
    return this.handleGoogleLogin.execute({ idToken: body.idToken });
  }

  @Get('google')
  startGoogle(@Res() response: Response) {
    return response.status(410).json({
      message:
        'Flux OAuth redirect obsolète. Utilisez POST /auth/google-login avec un idToken.',
    });
  }

  @Get('google/callback')
  googleCallback(@Res() response: Response) {
    return response.status(410).json({
      message:
        'Flux OAuth redirect obsolète. Utilisez POST /auth/google-login avec un idToken.',
    });
  }

  @Put('profile1')
  @UseGuards(UsersAuthGuard)
  updateProfile1(
    @Req() request: Request,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      password?: string;
      country?: string;
      city?: string;
      department?: string;
      commune?: string;
      role?: string;
    },
  ) {
    return this.updateConnectedProfile.execute(currentUserId(request), body);
  }

  @Post('upload-photo')
  @UseGuards(UsersAuthGuard)
  @UseInterceptors(photoUpload)
  uploadPhoto(
    @Req() request: Request,
    @UploadedFile() file?: { path: string },
  ) {
    return this.uploadUserProfilePhoto.execute(
      currentUserId(request),
      file?.path,
    );
  }

  @Post('forgot-password')
  requestPasswordReset(@Body() body: { phoneNumber?: string; email?: string }) {
    return this.forgotPassword.execute(body);
  }

  @Post('reset-password')
  restorePassword(
    @Body()
    body: {
      phone?: string;
      email?: string;
      resetCode?: string;
      newPassword?: string;
    },
  ) {
    return this.resetPassword.execute(body);
  }

  @Post('phone/send-code')
  @HttpCode(200)
  @UseGuards(ExpressAuthGuard)
  sendPhoneCode(@Req() request: Request) {
    return this.sendPhoneVerificationCode.execute(currentUserId(request));
  }

  @Post('phone/verify')
  @HttpCode(200)
  @UseGuards(ExpressAuthGuard)
  verifyPhoneNumber(@Req() request: Request, @Body() body: { code?: string }) {
    return this.verifyPhone.execute(currentUserId(request), body.code ?? '');
  }

  @Get('profile')
  @UseGuards(ExpressAuthGuard)
  profile(@Req() request: Request) {
    return this.getUserProfile.execute(currentUserId(request));
  }

  @Put('profile')
  @UseGuards(ExpressAuthGuard)
  @UseInterceptors(photoUpload)
  updateProfile(
    @Req() request: Request,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      country?: string;
      city?: string;
      department?: string;
      commune?: string;
      role?: string;
    },
    @UploadedFile() file?: { path: string },
  ) {
    return this.updateUserProfile.execute(
      currentUserId(request),
      body,
      file?.path,
    );
  }

  @Put('change-password')
  @UseGuards(ExpressAuthGuard)
  updatePassword(
    @Req() request: Request,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.changePassword.execute(
      currentUserId(request),
      body.currentPassword,
      body.newPassword,
    );
  }

  @Delete('account')
  @UseGuards(ExpressAuthGuard)
  removeAccount(@Req() request: Request) {
    return this.deleteUserAccount.execute(currentUserId(request));
  }

  @Post('logout')
  @UseGuards(ExpressAuthGuard)
  logout() {
    return this.logoutUser.execute();
  }

  @Get('verify-token')
  @UseGuards(ExpressAuthGuard)
  token(@Req() request: Request) {
    return this.verifyAuthToken.execute(currentUserId(request));
  }

  @Get('all')
  @UseGuards(ExpressAuthGuard, ExpressAdminGuard)
  allUsers(@Req() request: Request) {
    return this.getAllUsers.execute(request.user?.role);
  }

  @Put('role')
  @UseGuards(ExpressAuthGuard, ExpressAdminGuard)
  role(
    @Req() request: Request,
    @Body() body: { userId: number; role: string },
  ) {
    return this.updateUserRole.execute(
      request.user?.role,
      body.userId,
      body.role,
    );
  }

  @Get('onboarding/status')
  @UseGuards(ExpressAuthGuard)
  onboardingStatus(@Req() request: Request) {
    return this.getOnboardingStatus.execute(currentUserId(request));
  }

  @Post('onboarding/personal')
  @UseGuards(ExpressAuthGuard)
  onboardingPersonal(
    @Req() request: Request,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      gender?: string;
      dateOfBirth?: string;
    },
  ) {
    return this.completePersonalInfo.execute(currentUserId(request), body);
  }

  @Post('onboarding/contact')
  @UseGuards(ExpressAuthGuard)
  onboardingContact(
    @Req() request: Request,
    @Body() body: { phoneNumber?: string; whatsappNumber?: string },
  ) {
    return this.completeContactInfo.execute(currentUserId(request), body);
  }

  @Post('onboarding/address')
  @UseGuards(ExpressAuthGuard)
  onboardingAddress(
    @Req() request: Request,
    @Body()
    body: {
      country?: string;
      city?: string;
      department?: string;
      commune?: string;
      address?: string;
    },
  ) {
    return this.completeAddressInfo.execute(currentUserId(request), body);
  }

  @Post('onboarding/photo')
  @UseGuards(ExpressAuthGuard)
  @UseInterceptors(photoUpload)
  onboardingPhoto(
    @Req() request: Request,
    @UploadedFile() file?: { path: string },
  ) {
    return this.completeProfilePhoto.execute(
      currentUserId(request),
      file?.path,
    );
  }

  @Post('onboarding/skip')
  @UseGuards(ExpressAuthGuard)
  onboardingSkip(@Req() request: Request, @Body() body: { step?: string }) {
    return this.skipOnboardingStep.execute(currentUserId(request), body.step);
  }
}
