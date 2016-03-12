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

import express    from 'express';
import multer     from 'multer';
import mkdirp     from 'mkdirp';
import yaml       from 'js-yaml';
import fs         from 'fs';
import yargs      from 'yargs';
import request    from 'request';
import utils      from './utils/common';
import bodyParser from 'body-parser';

// Check for --config argument
const configPath = yargs.argv.config;
if (!configPath) {
  console.log('Error: you should pass --config option');
  process.exit();
}

const config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const app = express();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Fileserver welcome screen
app.get('/', (req, res) => {
  res.json({ message: `Welcome to Easywyg Fileserver v${pkg.version}` });
});

// Copy image from remote server to local server
// curl -X POST -d "url=https://www.google.ru/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" http://localhost:9001/copy
// curl -X POST -d "app_version=0.0.1" http://api.easywyg.com/releases
app.post(config.routes.copy, (req, res) => {
  if (!req.body.url) {
    res.status(500);
    return res.json({ error : 'You should pass url parameter!' })
  }

  request
    .get(req.body.url)
    .on('error', (err) => {
      res.status(500);
      return res.json({ error : err })
    })
    .on('response', (response) => {
      if (200 !== response.statusCode) {
        res.status(500);
        return res.json({ error : 'Cannot read remote file!' })
      }

      let extension = utils.imageExtension(response.headers['content-type']);

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
      const path = utils.composeDest(config.storage.path);
      mkdirp.sync(path);
      cb(null, path);
    },
    filename: (req, file, cb) => {
      const filename = utils.composeFilename(
        file.originalname, config.storage.filename
      );

      cb(null, filename);
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fieldSize: config.file.maxSize
    },
    fileFilter: (req, file, cb) => {
      // Accept only images
      let isExtAllowed = /(?:jpe?g|gif|bmp|png|webp)$/.test(file.originalname);
      let isMimeAllowed = /^image\/[^/]+$/i.test(file.mimetype);

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
