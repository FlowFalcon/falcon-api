import { ImageUploadService } from '../src/index';

describe('ImageUploadService', () => {
  it('should return a correct class for the selected service', async () => {
    const service = new ImageUploadService('new.fastpic.org');

    expect(service).toBeInstanceOf(ImageUploadService);
  });
});
