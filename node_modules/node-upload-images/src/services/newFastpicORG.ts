import { GenericImageUploadService } from './genericImageUploadService';
import FormData from 'form-data';

export class NewFastpicORG extends GenericImageUploadService {
  imageDirectLinkRx: RegExp;
  formFilename: string;

  constructor() {
    super();
    this.uploadUrl = 'https://new.fastpic.org/v2upload/';
    this.imageDirectLinkRx = /Direct Link.+?value="(.+?)"/m;
    this.formFilename = 'file1';

    this.uploadHeaders = {
      ...this.headers,
      'x-requested-with': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    };
  }

  async uploadFromBinary(imageData: Buffer, filename: string) {
    const form = new FormData();
    form.append('uploading', 1);
    form.append('delete_after', 0);
    form.append(this.formFilename, imageData, {
      filename
    });

    let uploadResponse = await super.uploadFormData(form);

    if (uploadResponse.data?.view_link) {
      let match = this.imageDirectLinkRx.exec(uploadResponse.data.codes);
      if (!match) {
        throw new Error(`Direct link to image not found in page body`);
      }
      return { directLink: match[1] };
    } else {
      throw new Error(
        `Upload failed, got incorrect response status:${JSON.stringify(
          uploadResponse.data
        )}`
      );
    }
  }
}
