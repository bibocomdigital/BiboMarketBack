import { CloudinaryFileStorage } from '@infrastructure/storage/cloudinary-file-storage';
import { BunnyFileStorage } from '@infrastructure/storage/bunny-file-storage';
import { HybridFileStorage } from '@infrastructure/storage/hybrid-file-storage';

describe('HybridFileStorage', () => {
  const cloudinary = {
    uploadProfilePhoto: jest.fn(),
    deleteProfilePhoto: jest.fn(),
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
    uploadVideo: jest.fn(),
    deleteVideo: jest.fn(),
    uploadMessageMedia: jest.fn(),
    deleteMessageMedia: jest.fn(),
  } as unknown as CloudinaryFileStorage;

  const bunny = {
    uploadVideo: jest.fn(),
    deleteVideo: jest.fn(),
    uploadMessageMedia: jest.fn(),
    deleteMessageMedia: jest.fn(),
  } as unknown as BunnyFileStorage;

  let storage: HybridFileStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new HybridFileStorage(cloudinary, bunny);
  });

  it('envoie les images vers Cloudinary', async () => {
    await storage.uploadImage('/tmp/a.png', 'product_images');

    expect(cloudinary.uploadImage).toHaveBeenCalledWith(
      '/tmp/a.png',
      'product_images',
    );
    expect(bunny.uploadVideo).not.toHaveBeenCalled();
  });

  it('envoie les vidéos vers Bunny', async () => {
    await storage.uploadVideo('/tmp/a.mp4', 'product_videos');

    expect(bunny.uploadVideo).toHaveBeenCalledWith('/tmp/a.mp4', 'product_videos');
    expect(cloudinary.uploadVideo).not.toHaveBeenCalled();
  });

  it('route les photos de profil vers Cloudinary', async () => {
    await storage.uploadProfilePhoto('/tmp/p.jpg', 7, {
      width: 300,
      height: 300,
      crop: 'limit',
    });

    expect(cloudinary.uploadProfilePhoto).toHaveBeenCalledWith('/tmp/p.jpg', 7, {
      width: 300,
      height: 300,
      crop: 'limit',
    });
  });

  it.each(['video', 'audio'] as const)(
    'route les médias %s de message vers Bunny',
    async (mediaType) => {
      await storage.uploadMessageMedia('/tmp/a', mediaType);

      expect(bunny.uploadMessageMedia).toHaveBeenCalledWith('/tmp/a', mediaType);
      expect(cloudinary.uploadMessageMedia).not.toHaveBeenCalled();
    },
  );

  it('route les images de message vers Cloudinary', async () => {
    await storage.uploadMessageMedia('/tmp/a.jpg', 'image');

    expect(cloudinary.uploadMessageMedia).toHaveBeenCalledWith('/tmp/a.jpg', 'image');
    expect(bunny.uploadMessageMedia).not.toHaveBeenCalled();
  });

  it('supprime les médias vidéo/audio via Bunny, les images via Cloudinary', async () => {
    await storage.deleteMessageMedia('https://cdn/v.mp4', 'video');
    expect(bunny.deleteMessageMedia).toHaveBeenCalledWith('https://cdn/v.mp4');

    await storage.deleteMessageMedia('https://cdn/img.jpg', 'image');
    expect(cloudinary.deleteMessageMedia).toHaveBeenCalledWith(
      'https://cdn/img.jpg',
      'image',
    );
  });
});