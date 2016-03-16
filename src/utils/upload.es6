'use strict';

import busboy from 'busboy';
import path   from 'path';
import fs     from 'fs';
import mkdirp from 'mkdirp';

import * as utils from './common';

export default class Upload {
  constructor(config) {
    this.config = config;
  }

  upload(req) {
    const self = this;
    const bb = new busboy({
      headers: req.headers,
      limits: {
        fileSize: this.config.storage.fileMaxSize,
        files: 1
      }
    });

    return new Promise((resolve, reject) => {
      bb.on('file', (_, file, filename, encoding, mimetype) => {
        const extension = utils.imageExtension(mimetype);

        if (!extension) {
          reject({ error: 'Image format is not supported', code: 'WRONG_IMG_FORMAT' });
        }

        const filePath = self.localFile(extension);
        file.pipe(fs.createWriteStream(filePath));

        file.on('end', () => {
          if (file.truncated) { // File too large
            fs.unlinkSync(filePath); // Remove it
            reject({ error: 'Image is too large', code: 'IMG_TOO_LARGE' });
          } else {
            resolve(self.resolveResponse(filePath, mimetype));
          }
        });
      });

      req.pipe(bb);
    });
  }

  localFile(extension) {
    const dest = utils.composeDest(this.config.storage.path);
    const path = [this.config.storage.root, dest].join('/');
    const filename = utils.composeFilename(`file.${extension}`, this.config.storage.filename);

    mkdirp.sync(path);
    return [path, filename].join('/');
  }

  resolveResponse(filePath, mimetype) {
    return {
      original : path.basename(filePath),
      url      : utils.composeURL(this.config, filePath),
      size     : this.total,
      mimetype : mimetype
    }
  }
}
