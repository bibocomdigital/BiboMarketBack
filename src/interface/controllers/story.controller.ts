import { createReadStream } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  Param,
  Patch,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage, MulterError } from 'multer';
import type { Request } from 'express';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  CreateStoryUseCase,
  DeleteStoryUseCase,
  GetStoryMediaUseCase,
  ListModerationStoriesUseCase,
  ListStoriesUseCase,
  ModerateStoryUseCase,
  storyMediaFile,
  storyUploadPath,
} from '@application/use-cases/story/story.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { currentUserId } from '@interface/guards/express-auth.guard';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';
import { unlink } from 'node:fs/promises';

const STORY_DIR = 'uploads/stories';
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov'];

const storyUpload = FileInterceptor('media', {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(STORY_DIR, { recursive: true });
      callback(null, STORY_DIR);
    },
    filename: (_req, file, callback) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, unique + extname(file.originalname).toLowerCase());
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    const image = IMAGE_TYPES.includes(file.mimetype) || IMAGE_EXT.includes(ext);
    const video = VIDEO_TYPES.includes(file.mimetype) || VIDEO_EXT.includes(ext);
    if (image || video) {
      callback(null, true);
      return;
    }
    callback(
      ExpressContractException.raw(400, {
        message: 'Formats acceptés : photo (jpg, png, webp) ou vidéo (mp4, webm, mov)',
      }) as unknown as Error,
      false,
    );
  },
});

type UploadedMedia = {
  originalname: string;
  mimetype: string;
  filename: string;
  path: string;
};

function mediaKind(file: UploadedMedia): 'PHOTO' | 'VIDEO' {
  const ext = extname(file.originalname).toLowerCase();
  if (VIDEO_TYPES.includes(file.mimetype) || VIDEO_EXT.includes(ext)) return 'VIDEO';
  return 'PHOTO';
}

function contentType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mov') return 'video/quicktime';
  return 'image/jpeg';
}

@Catch(MulterError)
class StoryUploadFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const tooLarge = exception.code === 'LIMIT_FILE_SIZE';
    response.status(400).json({
      success: false,
      message: tooLarge
        ? 'Le fichier dépasse 20 Mo'
        : 'Fichier refusé',
    });
  }
}

@ApiTags('stories')
@UseFilters(ExpressContractFilter, StoryUploadFilter)
@Controller('stories')
export class StoryController {
  constructor(
    private readonly listStories: ListStoriesUseCase,
    private readonly getMedia: GetStoryMediaUseCase,
    private readonly listModeration: ListModerationStoriesUseCase,
    private readonly createStory: CreateStoryUseCase,
    private readonly moderateStory: ModerateStoryUseCase,
    private readonly deleteStory: DeleteStoryUseCase,
  ) {}

  @Get()
  feed() {
    return this.listStories.execute();
  }

  @Get(':id/media')
  async media(@Param('id') id: string) {
    const story = await this.getMedia.execute(parseInt(id, 10));
    const file = storyMediaFile(story.mediaPath);
    return new StreamableFile(createReadStream(file), {
      type: contentType(story.mediaPath),
    });
  }

  @UseGuards(UsersAuthGuard)
  @Post()
  @UseInterceptors(storyUpload)
  async create(
    @Req() request: Request,
    @UploadedFile() file: UploadedMedia | undefined,
    @Body() body: { durationSeconds?: string },
  ) {
    if (!file) {
      throw ExpressContractException.raw(400, { message: 'Ajoutez une photo ou une vidéo' });
    }
    const kind = mediaKind(file);
    const duration =
      body.durationSeconds !== undefined && body.durationSeconds !== ''
        ? Number(body.durationSeconds)
        : null;
    try {
      return await this.createStory.execute(currentUserId(request), {
        mediaType: kind,
        mediaPath: storyUploadPath(file.filename),
        durationSeconds: duration,
      });
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Get('moderation/queue')
  queue() {
    return this.listModeration.execute();
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Patch(':id/status')
  status(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.moderateStory.execute(parseInt(id, 10), body.status ?? '');
  }

  @UseGuards(UsersAuthGuard)
  @Delete(':id')
  remove(@Req() request: Request, @Param('id') id: string) {
    return this.deleteStory.execute(
      parseInt(id, 10),
      currentUserId(request),
      request.user?.role,
    );
  }
}

