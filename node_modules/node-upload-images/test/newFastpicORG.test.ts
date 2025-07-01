import { NewFastpicORG } from '../src/services/newFastpicORG';
import * as fs from 'fs';

describe('new.fastpic.org', () => {
  let sampleImage =
    'https://github.githubassets.com/images/modules/profile/achievements/arctic-code-vault-contributor-default.png';
  let imagePath = './test/test.png';
  //"https://i121.fastpic.org/big/2023/0306/ce/6d6bedb8f33b62024fced36ba0785ace.png"
  let regexp = /^https:\/\/.+?\.fastpic\.org\/big\/.+\.(jpe?g|png|gif)$/;

  it('should upload image from binary', async () => {
    const service = new NewFastpicORG();
    const imageData = fs.readFileSync(imagePath);

    const result = await service.uploadFromBinary(imageData, 'test.png');
    expect(result.directLink).toMatch(regexp);
  });

  it('should upload image from file', async () => {
    const service = new NewFastpicORG();

    const result = await service.uploadFromFile(imagePath);
    expect(result.directLink).toMatch(regexp);
  });

  it('should upload an image from a URL and return the URL of the uploaded image (filename is always random)', async () => {
    const service = new NewFastpicORG();

    const result = await service.uploadFromUrl(sampleImage);
    expect(result.directLink).toMatch(regexp);
  });
});
