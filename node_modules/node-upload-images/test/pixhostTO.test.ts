import { PixhostTO } from '../src/services/pixhostTO';
import * as fs from 'fs';

function getRegexp(filename: string) {
  //https://img84.pixhost.to/images/56/340579117_arctic-code-vault-contributor-default.png
  return new RegExp(`^https:\/\/.+?\.pixhost\.to\/images\/.+?${filename}$`);
}

describe('pixhost.to', () => {
  let sampleImage =
    'https://github.githubassets.com/images/modules/profile/achievements/arctic-code-vault-contributor-default.png';
  let imagePath = './test/test.png';

  it('should upload image from binary', async () => {
    const service = new PixhostTO();
    const imageData = fs.readFileSync(imagePath);

    const result = await service.uploadFromBinary(imageData, 'test.png');
    let filename = 'test.png';
    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);
  });

  it('should upload image from file (automatic filename)', async () => {
    const service = new PixhostTO();

    let filename = 'test.png';
    const result = await service.uploadFromFile(imagePath);
    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);
  });

  it('should upload image from file (custom filename)', async () => {
    const service = new PixhostTO();

    let filename = 'test123.png';
    const result = await service.uploadFromFile(imagePath, filename);
    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);
  });

  it('should upload an image from a URL and return the URL of the uploaded image (with matching filename)', async () => {
    const service = new PixhostTO();
    const result = await service.uploadFromUrl(sampleImage);

    let filename = 'arctic-code-vault-contributor-default.png';
    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);
  });

  it('should upload an image from a URL and return the URL of the uploaded image (with random filename)', async () => {
    const service = new PixhostTO();
    const result = await service.uploadFromUrl(sampleImage, true);

    let filename = '.png';
    let rx = getRegexp(filename);
    expect(result.directLink).toMatch(rx);
  });
});
