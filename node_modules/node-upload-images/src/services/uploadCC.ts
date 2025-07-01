import {
  GenericImageUploadService,
  TGenericImageUploadResponse
} from './genericImageUploadService';
import FormData from 'form-data';
import { ddosGuardBypass } from 'axios-ddos-guard-bypass';

export class UploadCC extends GenericImageUploadService {
  formFilename: string;
  serviceUrl: string;

  constructor() {
    super();
    this.serviceUrl = 'https://upload.cc';
    this.uploadUrl = 'https://upload.cc/image_upload';
    this.uploadHeaders = {
      Referer: this.serviceUrl
    };

    this.formFilename = 'uploaded_file[]';

    ddosGuardBypass(this.axios);
  }

  async uploadFromBinary(
    imageData: Buffer,
    filename: string
  ): Promise<TGenericImageUploadResponse> {
    let form = new FormData();
    form.append(this.formFilename, imageData, {
      filename
    });

    let uploadResponse = await super.uploadFormData(form);

    if (
      uploadResponse.data?.code === 100 &&
      uploadResponse.data.total_success
    ) {
      return {
        directLink: `${this.serviceUrl}/${uploadResponse.data.success_image[0].url}`
      };
    } else {
      throw new Error(
        `Upload failed, got incorrect response status:${JSON.stringify(
          uploadResponse.data
        )}`
      );
    }
  }
}
