import {
  GenericImageUploadService,
  IGenericImageUploadService,
  TGenericImageUploadResponse
} from './services/genericImageUploadService';

import { PostimagesORG } from './services/postimagesORG';
import { UploadCC } from './services/uploadCC';
import { PixhostTO } from './services/pixhostTO';
import { NewFastpicORG } from './services/newFastpicORG';

export type ImageUploadServiceName =
  | 'postimages.org'
  | 'upload.cc'
  | 'pixhost.to'
  | 'new.fastpic.org';

const services = {
  'postimages.org': PostimagesORG,
  'upload.cc': UploadCC,
  'pixhost.to': PixhostTO,
  'new.fastpic.org': NewFastpicORG
};

export class ImageUploadService implements IGenericImageUploadService {
  private uploader: GenericImageUploadService;

  constructor(serviceName: ImageUploadServiceName) {
    const ServiceClass = services[serviceName];
    if (!ServiceClass) {
      throw new Error(`Invalid service name: ${serviceName}`);
    }
    this.uploader = new ServiceClass();
  }

  async uploadFromBinary(
    imageData: Buffer,
    filename: string
  ): Promise<TGenericImageUploadResponse> {
    return this.uploader.uploadFromBinary(imageData, filename);
  }

  async uploadFromFile(
    filePath: string,
    filename?: string
  ): Promise<TGenericImageUploadResponse> {
    return this.uploader.uploadFromFile(filePath, filename);
  }

  async uploadFromUrl(
    url: string,
    randomFilename: boolean
  ): Promise<TGenericImageUploadResponse> {
    return this.uploader.uploadFromUrl(url, randomFilename);
  }
}
