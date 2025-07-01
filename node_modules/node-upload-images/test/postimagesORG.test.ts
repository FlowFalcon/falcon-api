import { PostimagesORG } from '../src/services/postimagesORG';
import * as fs from 'fs';

function getRegexp(filename: string) {
  //https://i.postimg.cc/0Q4zMrzY/arctic-code-vault-contributor-default.png
  return new RegExp(`^https:\/\/i\.postimg\.cc\/.+?\/${filename}$`);
}

describe('postimages.org', () => {
  let sampleImage =
    'https://github.githubassets.com/images/modules/profile/achievements/arctic-code-vault-contributor-default.png';
  let firstUploadLink: string;
  let imagePath = './test/test.png';
  let filename = 'arctic-code-vault-contributor-default.png';

  it('should upload image from binary', async () => {
    const service = new PostimagesORG();
    const imageData = fs.readFileSync(imagePath);

    const result = await service.uploadFromBinary(imageData, filename);
    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);

    firstUploadLink = result.directLink;
  });

  it('should upload image from file (automatic filename)', async () => {
    const service = new PostimagesORG();

    const result = await service.uploadFromFile(imagePath, filename);
    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);

    // When the same file is uploaded, even with different filename - it returns the original link, probably based on file checksum
    expect(result.directLink).toMatch(firstUploadLink);
  });

  it('should upload image from file (custom filename)', async () => {
    const service = new PostimagesORG();

    let filename = 'test123.png';
    const result = await service.uploadFromFile(imagePath, filename);

    // When the same file is uploaded, even with different filename - it returns the original link, probably based on file checksum
    expect(result.directLink).toMatch(firstUploadLink);
  });

  it('should upload an image from a URL and return the URL of the uploaded image (with matching filename)', async () => {
    const service = new PostimagesORG();
    const result = await service.uploadFromUrl(sampleImage);

    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);

    // When the same file is uploaded, even with different filename - it returns the original link, probably based on file checksum
    expect(result.directLink).toMatch(firstUploadLink);
  });

  it('should upload an image from a URL and return the URL of the uploaded image (with random filename)', async () => {
    const service = new PostimagesORG();
    const result = await service.uploadFromUrl(sampleImage, true);

    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);

    // When the same file is uploaded, even with different filename - it returns the original link, probably based on file checksum
    expect(result.directLink).toMatch(firstUploadLink);
  });
});
