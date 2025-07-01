# node-upload-images

Library for uploading images to popular image hosting services, uses Node and Axios.

- Upload from binary, file and remote URL

## Supported services

- [new.fastpic.org](https://new.fastpic.org)
- [pixhost.to](https://pixhost.to)
- [postimages.org](https://postimages.org)
- [upload.cc](https://upload.cc) - _DDoS Guard protection bypassed using [axios-ddos-guard-bypass](https://github.com/4miners/axios-ddos-guard-bypass)_

## Installation

```
npm install node-upload-images
```

## Usage

Upload from binary data:

```js
import { ImageUploadService } from 'node-upload-images';
import * as fs from 'fs';

const service = new ImageUploadService('new.fastpic.org');

try {
  const imageData = fs.readFileSync('/test.png');
  let { directLink } = await service.uploadFromBinary(imageData, 'test.png');

  console.log(directLink);
} catch (error) {}
```

Upload from file:

```js
import { ImageUploadService } from 'node-upload-images';

const service = new ImageUploadService('new.fastpic.org');

try {
  let { directLink } = await service.uploadFromUrl('./test.png');

  console.log(directLink);
} catch (error) {}
```

Upload from remote URL:

```js
import { ImageUploadService } from 'node-upload-images';

const service = new ImageUploadService('new.fastpic.org');

try {
  let { directLink } = await service.uploadFromUrl(
    'https://example.com/image.png'
  );

  console.log(directLink);
} catch (error) {}
```

## Limitations

No login/authentication support yet, image upload is anonymous.
