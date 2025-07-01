import { GenericImageUploadService } from './genericImageUploadService';
import FormData from 'form-data';

export class PixhostTO extends GenericImageUploadService {
  imageDirectLinkRx: RegExp;
  formFilename: string;

  constructor() {
    super();
    this.uploadUrl = 'https://api.pixhost.to/images';
    this.imageDirectLinkRx = /class="image-img" src="(?<image_url>.+?)"/m;
    this.formFilename = 'img';

    this.uploadHeaders = {
      ...this.headers,
      'x-requested-with': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    };
  }

  async uploadFromBinary(imageData: Buffer, filename: string) {
    const form = new FormData();
    form.append('content_type', 0);
    form.append(this.formFilename, imageData, {
      filename
    });

    let uploadResponse = await super.uploadFormData(form);

    if (uploadResponse.data.show_url) {
      return await this.getUploadedImageDirectUrl(
        uploadResponse.data.show_url,
        this.imageDirectLinkRx
      );
    } else {
      throw new Error(
        `Upload failed, got incorrect response status:${JSON.stringify(
          uploadResponse.data
        )}`
      );
    }
  }
}
