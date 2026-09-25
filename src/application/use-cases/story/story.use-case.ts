import { readFileSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  BADGE_REPOSITORY,
  type BadgeRepository,
  type StoryMediaValue,
  type StoryStatusValue,
} from '@domain/repositories/badge.repository';
import { isStaffRole } from '@domain/types/role';
import { BadgeLifecycleUseCase } from '@application/use-cases/badge/badge.use-case';

const STORY_HOURS = 24;
const VIDEO_MAX_SECONDS = 30;

export function storyMediaFile(filename: string): string {
  const root = resolve(process.cwd(), 'uploads', 'stories');
  const file = resolve(root, filename);
  if (!file.startsWith(`${root}/`)) {
    throw ExpressContractException.raw(400, { message: 'Média invalide' });
  }
  return file;
}

@Injectable()
export class GetStoryMediaUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
  ) {}

  async execute(id: number) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'Story invalide' });
    }
    const story = await this.badges.findStory(id);
    if (!story) {
      throw ExpressContractException.raw(404, { message: 'Story introuvable' });
    }
    return story;
  }
}

@Injectable()
export class ListStoriesUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
  ) {}

  async execute() {
    const stories = await this.badges.listPublicStories();
    return {
      stories: stories.map((story) => ({
        ...story,
        mediaUrl: `/api/stories/${story.id}/media`,
      })),
    };
  }
}

@Injectable()
export class ListModerationStoriesUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
  ) {}

  async execute() {
    const stories = await this.badges.listModerationStories();
    return {
      stories: stories.map((story) => ({
        ...story,
        mediaUrl: `/api/stories/${story.id}/media`,
      })),
    };
  }
}

@Injectable()
export class CreateStoryUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
    private readonly lifecycle: BadgeLifecycleUseCase,
  ) {}

  async execute(
    userId: number,
    input: {
      mediaType: StoryMediaValue;
      mediaPath: string;
      durationSeconds: number | null;
    },
  ) {
    await this.lifecycle.refreshUser(userId);
    const active = await this.badges.hasActiveBadge(userId);
    if (!active) {
      throw ExpressContractException.raw(403, {
        message: 'Un badge actif est nécessaire pour publier une story',
      });
    }
    let durationSeconds = input.durationSeconds;
    if (input.mediaType === 'VIDEO' && input.mediaPath.toLowerCase().endsWith('.mp4')) {
      const measured = mp4DurationSeconds(storyMediaFile(input.mediaPath));
      if (measured !== null) durationSeconds = Math.ceil(measured);
    }
    if (input.mediaType === 'VIDEO') {
      const duration = durationSeconds ?? 0;
      if (!Number.isFinite(duration) || duration <= 0 || duration > VIDEO_MAX_SECONDS) {
        throw ExpressContractException.raw(400, {
          message: 'La vidéo doit durer au plus 30 secondes',
        });
      }
    }
    const story = await this.badges.createStory({
      userId,
      mediaType: input.mediaType,
      mediaPath: input.mediaPath,
      durationSeconds: input.mediaType === 'VIDEO' ? durationSeconds : null,
      expiresAt: new Date(Date.now() + STORY_HOURS * 60 * 60 * 1000),
    });
    return { story: { ...story, mediaUrl: `/api/stories/${story.id}/media` } };
  }
}

@Injectable()
export class ModerateStoryUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
  ) {}

  async execute(id: number, status: string) {
    if (status !== 'PUBLISHED' && status !== 'REJECTED') {
      throw ExpressContractException.raw(400, {
        message: 'Statut attendu : PUBLISHED ou REJECTED',
      });
    }
    const existing = await this.badges.findStory(id);
    if (!existing) {
      throw ExpressContractException.raw(404, { message: 'Story introuvable' });
    }
    const story = await this.badges.setStoryStatus(id, status as StoryStatusValue);
    return { story };
  }
}

@Injectable()
export class DeleteStoryUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
  ) {}

  async execute(id: number, actorId: number, actorRole?: string) {
    const existing = await this.badges.findStory(id);
    if (!existing) {
      throw ExpressContractException.raw(404, { message: 'Story introuvable' });
    }
    if (existing.userId !== actorId && !isStaffRole(actorRole)) {
      throw ExpressContractException.raw(403, {
        message: 'Vous ne pouvez pas supprimer cette story',
      });
    }
    await this.badges.deleteStory(id);
    await unlink(storyMediaFile(existing.mediaPath)).catch(() => undefined);
    return { message: 'Story supprimée', id };
  }
}

export function storyUploadPath(filename: string): string {
  return filename;
}

function mp4DurationSeconds(filePath: string): number | null {
  try {
    const data = readFileSync(filePath).subarray(0, 2_000_000);
    const mvhd = data.indexOf(Buffer.from('mvhd'));
    if (mvhd < 0 || mvhd + 20 >= data.length) return null;
    const version = data[mvhd + 4];
    if (version === 0) {
      const scale = data.readUInt32BE(mvhd + 16);
      const duration = data.readUInt32BE(mvhd + 20);
      if (!scale) return null;
      return duration / scale;
    }
    if (version === 1 && mvhd + 32 < data.length) {
      const scale = data.readUInt32BE(mvhd + 28);
      const duration = Number(data.readBigUInt64BE(mvhd + 32));
      if (!scale) return null;
      return duration / scale;
    }
    return null;
  } catch {
    return null;
  }
}
