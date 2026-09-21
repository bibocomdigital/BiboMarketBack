import type { FileStoragePort } from '@application/ports/output/file-storage.port';
import { BunnyFileStorage } from '@infrastructure/storage/bunny-file-storage';
import { CloudinaryFileStorage } from '@infrastructure/storage/cloudinary-file-storage';

/** Route les fichiers : images/avatars → Cloudinary, vidéos/audio → Bunny. */
export class HybridFileStorage implements FileStoragePort {
  private readonly cloudinary: CloudinaryFileStorage;
  private readonly bunny: BunnyFileStorage;

  constructor(
    cloudinary = new CloudinaryFileStorage(),
    bunny = new BunnyFileStorage(),
  ) {
    this.cloudinary = cloudinary;
    this.bunny = bunny;
  }

  uploadProfilePhoto(
    filePath: string,
    userId: number,
    options?: { width: number; height: number; crop: string },
  ): Promise<string> {
    return this.cloudinary.uploadProfilePhoto(filePath, userId, options);
  }

  deleteProfilePhoto(photoUrl: string): Promise<void> {
    return this.cloudinary.deleteProfilePhoto(photoUrl);
  }

  uploadImage(filePath: string, folder: string): Promise<string> {
    return this.cloudinary.uploadImage(filePath, folder);
  }

  deleteImage(photoUrl: string, folder: string): Promise<void> {
    return this.cloudinary.deleteImage(photoUrl, folder);
  }

  uploadVideo(filePath: string, folder: string): Promise<string> {
    return this.bunny.uploadVideo(filePath, folder);
  }

  deleteVideo(videoUrl: string, folder: string): Promise<void> {
    void folder;
    return this.bunny.deleteVideo(videoUrl);
  }

  uploadMessageMedia(
    filePath: string,
    mediaType: 'image' | 'video' | 'audio',
  ): Promise<string> {
    if (mediaType === 'image') {
      return this.cloudinary.uploadMessageMedia(filePath, 'image');
    }
    return this.bunny.uploadMessageMedia(filePath, mediaType);
  }

  deleteMessageMedia(
    mediaUrl: string,
    mediaType?: string | null,
  ): Promise<void> {
    if (mediaType === 'image') {
      return this.cloudinary.deleteMessageMedia(mediaUrl, 'image');
    }
    return this.bunny.deleteMessageMedia(mediaUrl);
  }
}
