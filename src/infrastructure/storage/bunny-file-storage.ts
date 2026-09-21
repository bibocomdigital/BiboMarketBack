import { readFile } from 'node:fs/promises';
import {
  BUNNY_API_KEY,
  BUNNY_CDN_HOST,
  BUNNY_STORAGE_ZONE,
} from '@application/config/env';

/** Stockage Bunny pour les vidéos/audio (storage zone + CDN public). */
export class BunnyFileStorage {
  private get storageBase(): string {
    return BUNNY_STORAGE_ZONE
      ? `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}`
      : '';
  }

  private get cdnBase(): string {
    return BUNNY_CDN_HOST ? `https://${BUNNY_CDN_HOST}` : this.storageBase;
  }

  async uploadVideo(filePath: string, folder: string): Promise<string> {
    const buffer = await readFile(filePath);
    const path = `${folder}/${Date.now()}.mp4`;
    await this.putObject(path, buffer, 'video/mp4');
    return `${this.cdnBase}/${path}`;
  }

  async uploadMessageMedia(
    filePath: string,
    mediaType: 'video' | 'audio',
  ): Promise<string> {
    const buffer = await readFile(filePath);
    const subfolder = mediaType === 'audio' ? 'audio' : 'videos';
    const extension = mediaType === 'audio' ? 'mp3' : 'mp4';
    const contentType = mediaType === 'audio' ? 'audio/mpeg' : 'video/mp4';
    const path = `messages/${subfolder}/${Date.now()}.${extension}`;
    await this.putObject(path, buffer, contentType);
    return `${this.cdnBase}/${path}`;
  }

  deleteVideo(videoUrl: string): Promise<void> {
    return this.deleteObject(videoUrl);
  }

  deleteMessageMedia(mediaUrl: string): Promise<void> {
    return this.deleteObject(mediaUrl);
  }

  private async putObject(
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    this.assertConfigured();

    const response = await fetch(`${this.storageBase}/${path}`, {
      method: 'PUT',
      headers: {
        AccessKey: BUNNY_API_KEY as string,
        'Content-Type': contentType,
      },
      body: buffer as unknown as BodyInit,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Bunny upload failed: ${response.status} ${details}`);
    }
  }

  private async deleteObject(mediaUrl: string): Promise<void> {
    this.assertConfigured();
    if (!mediaUrl) {
      return;
    }

    const path = this.toStoragePath(mediaUrl);
    const response = await fetch(`${this.storageBase}/${path}`, {
      method: 'DELETE',
      headers: { AccessKey: BUNNY_API_KEY as string },
    });

    if (!response.ok) {
      throw new Error(`Bunny delete failed: ${response.status}`);
    }
  }

  private toStoragePath(mediaUrl: string): string {
    if (this.cdnBase && mediaUrl.startsWith(this.cdnBase)) {
      return mediaUrl.slice(this.cdnBase.length).replace(/^\//, '');
    }
    if (this.storageBase && mediaUrl.startsWith(this.storageBase)) {
      return mediaUrl.slice(this.storageBase.length).replace(/^\//, '');
    }
    return mediaUrl.replace(/^https?:\/\/[^/]+\//, '');
  }

  private assertConfigured(): void {
    if (!this.storageBase || !BUNNY_API_KEY) {
      throw new Error(
        'Bunny storage not configured (BUNNY_STORAGE_ZONE/BUNNY_API_KEY)',
      );
    }
  }
}
