import axios, { AxiosInstance } from 'axios';
import { URL } from 'url';
import path from 'path';
import crypto from 'crypto';
import FormData from 'form-data';
import * as fs from 'fs';

export type TGenericImageUploadResponse = {
  directLink: string;
};

export interface IGenericImageUploadService {
  uploadFromBinary(
    imageData: Buffer,
    filename: string
  ): Promise<TGenericImageUploadResponse>;

  uploadFromFile(
    filePath: string,
    filename?: string
  ): Promise<TGenericImageUploadResponse>;

  uploadFromUrl(
    url: string,
    randomFilename: boolean
  ): Promise<TGenericImageUploadResponse>;
}

export abstract class GenericImageUploadService
  implements IGenericImageUploadService
{
  protected axios: AxiosInstance = axios.create();

  protected headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
  };

  protected uploadHeaders: Record<string, string> = {};
  protected uploadUrl!: string;

  protected getUploadHeaders(): Record<string, string> {
    return {
      ...this.headers,
      ...this.uploadHeaders
    };
  }

  private async _downloadBinary(imageUrl: string) {
    // Download the image as an array buffer
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer'
    });

    const urlObject = new URL(imageUrl);
    const filename = path.basename(urlObject.pathname);
    const extension = path.extname(urlObject.pathname);

    // Create a buffer from the downloaded image data
    const imageData = Buffer.from(response.data);
    return {
      data: imageData,
      filename,
      extension
    };
  }

  async uploadFromFile(
    filePath: string,
    filename?: string
  ): Promise<TGenericImageUploadResponse> {
    const imageData = fs.readFileSync(filePath);
    filename ??= filePath.split('/').pop() || 'unknown';
    return this.uploadFromBinary(imageData, filename);
  }

  protected async uploadFormData(form: FormData) {
    return this.axios.post(this.uploadUrl, form.getBuffer(), {
      headers: {
        ...this.getUploadHeaders(),
        ...form.getHeaders()
      }
    });
  }

  abstract uploadFromBinary(
    imageData: Buffer,
    filename: string
  ): Promise<TGenericImageUploadResponse>;

  protected async getUploadedImageDirectUrl(
    url: string,
    linkRx: RegExp
  ): Promise<TGenericImageUploadResponse> {
    const response = await this.axios.get<string>(url, {
      headers: this.headers
    });

    const match = linkRx.exec(response.data);
    if (!match) {
      throw new Error(`Direct link to image not found in page body: ${url}`);
    }

    return {
      directLink: match[1]
    };
  }

  async uploadFromUrl(
    url: string,
    randomFilename = false
  ): Promise<TGenericImageUploadResponse> {
    let { data, filename, extension } = await this._downloadBinary(url);
    if (randomFilename) filename = this.generateRandomString(6) + extension;
    return this.uploadFromBinary(data, filename);
  }

  protected generateRandomString(length: number) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }
}
