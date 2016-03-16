'use strict';

import path   from 'path';
import url    from 'url';
import http   from 'http';
import fs     from 'fs';
import mime   from 'mime';
import mkdirp from 'mkdirp';

import * as utils from './common';

export default class Download {
  constructor(config) {
    this.config = config;
    this.reset()
  }

  reset() {
    this.file = null;
    this.total = 0;
    this.contentLength = 0;
    this.redirects = 0;
  }

  options(url) {
    return {
      host: url.hostname,
      port: url.port,
      path: url.pathname
    };
  }

  localFile(original) {
    const dest = utils.composeDest(this.config.storage.path);
    const path = [this.config.storage.root, dest].join('/');

    mkdirp.sync(path);

    const filename = utils.composeFilename(original, this.config.storage.filename);
    return [path, filename].join('/');
  }

  download(remoteURL, cb = () => {}) {
    const self = this;

    return new Promise((resolve, reject) => {
      if (self.redirects > 5) { reject({ error: 'Too many redirects', code: 'MANY_REDIRECTS' }) }

      const u = url.parse(remoteURL);
      const filePath = self.localFile(path.basename(u.path));

      const req = http.get(self.options(u), (res) => {
        switch(res.statusCode) {
          case 200:
            self.contentLength = parseInt(res.headers['content-length']);
            break;
          case 302:
            self.redirects += 1;
            return self.download(res.headers.location, cb);
            break;
          case 404:
            self.reset();
            reject({ error: 'File Not Found', code: 'NOT_FOUND' });
          default:
            reject({ error: `HTTP status is not supported: ${res.statusCode}`, code: 'WRONG_STATUS' });
            self.reset();
            req.abort();
            return;
        }

        if (!utils.imageExtension(res.headers['content-type'])) {
          reject({ error: 'Image format is not supported', code: 'WRONG_IMG_FORMAT' });
        }

        res.on('data', (chunk) => {
          if (!self.file) { self.file = fs.createWriteStream(filePath) }

          if (self.total < self.contentLength && self.total < self.config.storage.fileMaxSize) {
            self.file.write(chunk);
            self.total += chunk.length;
          }
        });

        res.on('end', () => {
          const mimetype = mime.lookup(filePath);
          const result = {
            original : path.basename(u.path),
            url      : utils.composeURL(self.config, filePath),
            size     : self.total,
            mimetype : mimetype
          };

          if (!utils.imageExtension(mimetype)) {
            fs.unlinkSync(filePath);
            reject({ error: 'Image format is not supported', code: 'WRONG_IMG_FORMAT' });
          }

          self.file.end();
          self.reset();
          resolve(result)
        });
      });

      req.on('error', (e) => {
        self.reset();
        resolve({ error: e.message });
      });
    })
  }
}
