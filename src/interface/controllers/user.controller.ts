import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import {
  CreateUserUseCase,
  DeleteUserByIdUseCase,
  GetConnectedProfileUseCase,
  GetUserByIdUseCase,
  ListUsersUseCase,
  UpdateConnectedProfileUseCase,
  UpdateUserByIdUseCase,
  UploadUserProfilePhotoUseCase,
} from '@application/use-cases/user/user.use-case';
import { GetSuggestedUsersUseCase } from '@application/use-cases/subscription/subscription.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import {
  UsersAuthGuard,
  UsersMerchantGuard,
} from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

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

@ApiTags('users')
@UseFilters(ExpressContractFilter)
@Controller('users')
export class UserController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUserById: GetUserByIdUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUserById: UpdateUserByIdUseCase,
    private readonly deleteUserById: DeleteUserByIdUseCase,
    private readonly getConnectedProfile: GetConnectedProfileUseCase,
    private readonly updateConnectedProfile: UpdateConnectedProfileUseCase,
    private readonly uploadUserProfilePhoto: UploadUserProfilePhotoUseCase,
    private readonly getSuggestedUsers: GetSuggestedUsersUseCase,
  ) {}

  @Get('profile')
  @UseGuards(UsersAuthGuard)
  profile(@Req() request: Request) {
    return this.getConnectedProfile.execute(currentUserId(request));
  }

  @Put('profile')
  @UseGuards(UsersAuthGuard)
  updateProfile(
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

  @Post('profile/photo')
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

  @Get('merchant-dashboard')
  @UseGuards(UsersAuthGuard, UsersMerchantGuard)
  merchantDashboard(@Req() request: Request) {
    return {
      message: `Bienvenue ${request.user?.firstName}, tableau de bord commerçant.`,
    };
  }

  @Get('suggestions')
  @UseGuards(UsersAuthGuard)
  suggestions(@Req() request: Request, @Query('limit') limit?: string) {
    return this.getSuggestedUsers.execute(currentUserId(request), limit ?? 10);
  }

  @Get()
  list() {
    return this.listUsers.execute();
  }

  @Post()
  @HttpCode(201)
  create(
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      role?: string;
    },
  ) {
    return this.createUser.execute(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getUserById.execute(parseInt(id, 10));
  }

  @Put(':id')
  update(
    @Param('id') id: string,
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
      password?: string;
    },
  ) {
    return this.updateUserById.execute(parseInt(id, 10), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deleteUserById.execute(parseInt(id, 10));
  }
}
