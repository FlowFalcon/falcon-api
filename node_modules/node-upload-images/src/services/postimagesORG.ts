import { GenericImageUploadService } from './genericImageUploadService';
import FormData from 'form-data';

export class PostimagesORG extends GenericImageUploadService {
  token: string;
  session: string;
  imageDirectLinkRx: RegExp;
  formFilename: string;

  constructor() {
    super();
    this.uploadUrl = 'https://postimages.org/json/rr';
    this.token = '61aa06d6116f7331ad7b2ba9c7fb707ec9b182e8';
    this.session = this.generateRandomString(32);
    this.imageDirectLinkRx =
      /<meta property="og:image" content="(?<image_url>.+?)"/m;
    this.formFilename = 'file';

    this.uploadHeaders = {
      ...this.headers,
      'x-requested-with': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    };
  }

  async uploadFromBinary(imageData: Buffer, filename: string) {
    const form = new FormData();
    form.append('token', this.token);
    form.append('optsize', 0);
    form.append('expire', 0);
    form.append('session_upload', Date.now());
    form.append('numfiles', 1);
    form.append('upload_session', this.session);
    form.append(this.formFilename, imageData, {
      filename
    });

    let uploadResponse = await super.uploadFormData(form);

    if (uploadResponse.data?.status === 'OK') {
      return await this.getUploadedImageDirectUrl(
        uploadResponse.data.url,
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
