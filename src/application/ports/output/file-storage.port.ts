export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface FileStoragePort {
  uploadProfilePhoto(
    filePath: string,
    userId: number,
    options?: { width: number; height: number; crop: string },
  ): Promise<string>;
  deleteProfilePhoto(photoUrl: string): Promise<void>;
  uploadImage(filePath: string, folder: string): Promise<string>;
  deleteImage(photoUrl: string, folder: string): Promise<void>;
  uploadVideo(filePath: string, folder: string): Promise<string>;
  deleteVideo(videoUrl: string, folder: string): Promise<void>;
  uploadMessageMedia(
    filePath: string,
    mediaType: 'image' | 'video' | 'audio',
  ): Promise<string>;
  deleteMessageMedia(
    mediaUrl: string,
    mediaType?: string | null,
  ): Promise<void>;
}
