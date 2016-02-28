'use strict';

/**
 * Easywyg Fileserver
 *
 * POST /upload - Upload an image
 * POST /copy - Download image from remote URL
 *
 * NEXT:
 * - Add filter to only images uploads
 * - Config as separate file
 * - Move some functions to utils
 * - Json response when error or 404 occurs
 * - Json response after file uploaded
 * - Print API version in /
 */

import express from 'express';
import multer  from 'multer';
import mkdirp  from 'mkdirp';
import uuid    from 'node-uuid';
import yaml    from 'js-yaml';
import fs      from 'fs';
import yargs   from 'yargs';
import request from 'request';
import utils   from './utils/common';

// Check for --config argument
const configPath = yargs.argv.config;
if (!configPath) {
  console.log('Error: you should pass --config option');
  process.exit();
}

const config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const app = express();

// Fileserver welcome screen
app.get('/', (req, res) => {
  res.json({ message: `Welcome to Easywyg Fileserver v${pkg.version}` });
});

// Copy image from remote server to local server
// curl -X POST -d "url=https://www.google.ru/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" http://localhost:9001/copy
app.post(config.routes.copy, (req, res) => {
  if (!req.params.url) {
    res.status(500);
    return res.json({ error : 'Should pass url parameter!' })
  }

  request
    .get(req.params.url)
    .on('error', (err) => {
      res.status(500);
      return res.json({ error : err })
    })
    .on('response', (response) => {
      if (200 !== response.statusCode) {
        res.status(500);
        return res.json({ error : 'Cannot read remote file!' })
      }

      let extension = null;

      switch (response.headers['content-type']) {
        case 'image/jpeg':
        case 'image/jpg':
        case 'image/pjpeg':
          extension = 'jpg';
        break;
        case 'image/png':
          extension = 'png';
        break;
        case 'image/gif':
          extension = 'gif';
        break;
        case 'image/bmp':
          extension = 'bmp';
        break;
        case 'image/webp':
          extension = 'webp';
        break;
      }

      if (!extension) {
        res.status(500);
        return res.json({ error : 'File format is not allowed!' });
      }
    })
    .pipe(fs.createWriteStream('doodle.png'));
});

// Upload image to local server
//
// Example:
//
// curl -F "file=@/home/tanraya/Pictures/1105121.jpg" -X POST http://localhost:9001/upload
//
app.post(config.routes.upload, (req, res, next) => {
  // Define a storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const now  = new Date();
      const d    = now.getDate();
      const m    = now.getMonth() + 1;
      const y    = now.getFullYear();
      const path = config.storage.path
        .replace('%y', utils.pad(y))
        .replace('%m', utils.pad(m))
        .replace('%d', utils.pad(d));

      mkdirp.sync(path);
      cb(null, path);
    },
    filename: (req, file, cb) => {
      const ext = file.originalname.split('.').pop();
      const filename = config.storage.filename
        .replace('%name', uuid.v4())
        .replace('%ext', ext);

      cb(null, filename);
    }
  });

  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      // Accept only images
      let isExtAllowed = /(?:jpe?g|gif|bmp|png|webp)$/.test(file.originalname);
      let isMimeAllowed = /^image\/.+/i.test(file.mimetype);

      cb(null, isExtAllowed && isMimeAllowed);
    }
  }).single(config.file.fieldName);

  upload(req, res, (err) => {
    if (err) {
      res.status(500);
      return res.json({ error : err })
    }

    const url = [config.storage.url, req.file.path].join('/');

    res.json({
      original : req.file.originalname,
      url      : url,
      size     : req.file.size,
      mimetype : req.file.mimetype
    });
  });
});

// Load image from storage
//
// Example:
//
// curl http://localhost:9001/uploads/2016/02/26/ae10175f-9a59-4998-8bea-4c5c4387ace7.jpg
//
// If file not found it set http status 404 and return JSON response with error.
//
app.use((req, res) => {
  let path = [config.storage.root, req.path.replace(/^\/+/, '')].join('/');

  if (fs.existsSync(path)) {
    if (true === config.storage.xSendfileEnabled) {
      res.set(config.storage.xSendfileHeader, req.path);
      res.end()
    } else {
      res.sendFile(path);
    }
  } else {
    res.status(404);
    res.json({ error : 'File not found' });
  }
});

// Run server
app.listen(config.server.port, config.server.host, () => {
  console.log(`Easywyg API runs on http://${config.server.host}:${config.server.port}`);
});
