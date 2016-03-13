import path from 'path';
import url  from 'url';
import http from 'http';
import fs   from 'fs';
import mime from 'mime';
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
    if (this.redirects > 5) { console.log( 'Too many redirects' ) }

    const self = this;
    const u = url.parse(remoteURL);
    const filePath = self.localFile(path.basename(u.path));

    const req = http.get(this.options(u), (res) => {
      switch(res.statusCode) {
        case 200:
          self.contentLength = parseInt(res.headers['content-length']);
          break;
        case 302:
          self.redirects += 1;
          self.download(res.headers.location, cb);
          return;
          break;
        case 404:
          self.reset();
          console.log("File Not Found");
        default:
          self.reset();
          req.abort();
          return;
      }

      res.on('data', (chunk) => {
        if (!self.file) {
          self.file = fs.createWriteStream(filePath);
        }

        if (self.total < self.contentLength) {
          self.file.write(chunk);
          self.total += chunk.length;
        }
      });

      res.on('end', () => {
        const opts = {
          original: path.basename(u.path),
          url: utils.composeURL(this.config, filePath),
          size: self.total,
          mimetype: mime.lookup(filePath)
        };

        self.file.end();
        self.reset();
        cb(opts);
      });
    });

    req.on('error', (e) => {
      self.reset();
      console.log("Got error: " + e.message);
    });
  }
}
