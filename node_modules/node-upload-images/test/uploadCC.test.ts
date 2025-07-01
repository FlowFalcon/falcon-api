import { UploadCC } from '../src/services/uploadCC';
import * as fs from 'fs';

describe('upload.cc', () => {
  let sampleImage =
    'https://github.githubassets.com/images/modules/profile/achievements/arctic-code-vault-contributor-default.png';
  let imagePath = './test/test.png';
  //https://upload.cc/i1/2023/03/09/I421ae.png"
  let regexp = /^https:\/\/upload\.cc\/.+?.png$/;

  it('should upload image from binary', async () => {
    const service = new UploadCC();
    const imageData = fs.readFileSync(imagePath);

    const result = await service.uploadFromBinary(imageData, 'test.png');
    expect(result.directLink).toMatch(regexp);
  });

  it('should upload image from file', async () => {
    const service = new UploadCC();

    const result = await service.uploadFromFile(imagePath);
    expect(result.directLink).toMatch(regexp);
  });

  it('should upload an image from a URL and return the URL of the uploaded image (filename is always random)', async () => {
    const service = new UploadCC();
    const result = await service.uploadFromUrl(sampleImage, true);
    expect(result.directLink).toMatch(regexp);
  });
});
