import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import type { FileStoragePort } from '@application/ports/output/file-storage.port';
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from '@application/config/env';

@Injectable()
export class CloudinaryFileStorage implements FileStoragePort {
  async uploadProfilePhoto(
    filePath: string,
    userId: number,
    options: { width: number; height: number; crop: string } = {
      width: 800,
      height: 800,
      crop: 'limit',
    },
  ): Promise<string> {
    const publicId = `user_${userId}_${Date.now()}`;
    const transformation = `w_${options.width},h_${options.height},c_${options.crop},q_auto`;
    return this.upload(filePath, 'profile_photos', publicId, transformation);
  }

  async deleteProfilePhoto(photoUrl: string): Promise<void> {
    await this.deleteImage(photoUrl, 'profile_photos');
  }

  uploadImage(filePath: string, folder: string): Promise<string> {
    return this.upload(filePath, folder, `${Date.now()}`);
  }

  async deleteImage(photoUrl: string, folder: string): Promise<void> {
    await this.destroy(photoUrl, folder, 'image');
  }

  uploadVideo(filePath: string, folder: string): Promise<string> {
    return this.upload(filePath, folder, `${Date.now()}`, undefined, 'video');
  }

  async deleteVideo(videoUrl: string, folder: string): Promise<void> {
    await this.destroy(videoUrl, folder, 'video');
  }

  uploadMessageMedia(
    filePath: string,
    mediaType: 'image' | 'video' | 'audio',
  ): Promise<string> {
    const folder =
      mediaType === 'audio'
        ? 'messages/audio'
        : mediaType === 'video'
          ? 'messages/videos'
          : 'messages/images';
    const extra: Record<string, string | number> =
      mediaType === 'audio'
        ? { format: 'mp3', audio_codec: 'mp3', audio_frequency: 44100 }
        : {};
    return this.upload(
      filePath,
      folder,
      `${Date.now()}`,
      undefined,
      mediaType === 'image' ? 'image' : 'video',
      extra,
    );
  }

  async deleteMessageMedia(
    mediaUrl: string,
    mediaType?: string | null,
  ): Promise<void> {
    this.assertConfigured();
    const publicId = mediaUrl.split('/').slice(-2).join('/').split('.')[0];
    if (!publicId) {
      return;
    }
    const resourceType =
      mediaType === 'video' || mediaType === 'audio' ? 'video' : 'image';
    await this.destroyByPublicId(publicId, resourceType);
  }

  private async destroy(
    mediaUrl: string,
    folder: string,
    resourceType: 'image' | 'video',
  ): Promise<void> {
    this.assertConfigured();

    const publicIdWithExtension = mediaUrl.split('/').pop();
    if (!publicIdWithExtension) {
      return;
    }

    const publicId = `${folder}/${publicIdWithExtension.split('.')[0]}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = {
      public_id: publicId,
      timestamp,
    };
    if (resourceType === 'video') {
      params.resource_type = 'video';
    }
    const signature = this.sign(params);

    const body = new URLSearchParams({
      public_id: publicId,
      api_key: CLOUDINARY_API_KEY as string,
      timestamp: String(timestamp),
      signature,
    });
    if (resourceType === 'video') {
      body.set('resource_type', 'video');
    }

    await this.postDestroy(body, resourceType);
  }

  private async destroyByPublicId(
    publicId: string,
    resourceType: 'image' | 'video',
  ): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = {
      public_id: publicId,
      timestamp,
    };
    if (resourceType === 'video') {
      params.resource_type = 'video';
    }
    const signature = this.sign(params);

    const body = new URLSearchParams({
      public_id: publicId,
      api_key: CLOUDINARY_API_KEY as string,
      timestamp: String(timestamp),
      signature,
    });
    if (resourceType === 'video') {
      body.set('resource_type', 'video');
    }

    await this.postDestroy(body, resourceType);
  }

  private async postDestroy(
    body: URLSearchParams,
    resourceType: 'image' | 'video',
  ): Promise<void> {
    await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );
  }

  private async upload(
    filePath: string,
    folder: string,
    publicId: string,
    transformation?: string,
    resourceType: 'image' | 'video' = 'image',
    extra: Record<string, string | number> = {},
  ): Promise<string> {
    this.assertConfigured();

    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = {
      public_id: publicId,
      timestamp,
      folder,
      ...extra,
    };
    if (transformation) {
      params.transformation = transformation;
    }
    const signature = this.sign(params);

    const file = await readFile(filePath);
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(file)]), publicId);
    form.set('api_key', CLOUDINARY_API_KEY as string);
    form.set('timestamp', String(timestamp));
    form.set('public_id', publicId);
    form.set('folder', folder);
    if (transformation) {
      form.set('transformation', transformation);
    }
    for (const [key, value] of Object.entries(extra)) {
      form.set(key, String(value));
    }
    form.set('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      { method: 'POST', body: form },
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || 'Cloudinary upload failed');
    }

    const result = (await response.json()) as { secure_url: string };
    return result.secure_url;
  }

  private sign(params: Record<string, string | number>): string {
    const toSign =
      Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&') + (CLOUDINARY_API_SECRET as string);

    return createHash('sha1').update(toSign).digest('hex');
  }

  private assertConfigured() {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary is not configured');
    }
  }
}
