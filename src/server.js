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
import yaml       from 'js-yaml';
import fs         from 'fs';
import yargs      from 'yargs';
import request    from 'request';
import bodyParser from 'body-parser';

import * as utils from './utils/common';
import Download   from './utils/download';

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
app.post(config.routes.copy, (req, res) => {
  if (!req.body.url) {
    res.status(500);
    return res.json({ error : 'You should pass url parameter!' })
  }

  const dl = new Download(config);
  dl.download(req.body.url, (data) => {
    console.log(data);
    res.json(data);
  });
});

// Upload image to local server
//
// Example:
//
// curl -F "file=@/home/tanraya/Pictures/1105121.jpg" -X POST http://localhost:9001/upload
//
app.post(config.routes.upload, (req, res, next) => {
  const upload = utils.upload(config);

  upload(req, res, (err) => {
    if (err) {
      res.status(500);
      return res.json({ error : err })
    }

    res.json({
      original : req.file.originalname,
      url      : utils.composeURL(config, req.file.path),//url,
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

  if (true === config.storage.xSendfileEnabled) {
    const reqPath = `/serve${req.path}`;

    res.set(config.storage.xSendfileHeader, reqPath);
    res.end()
  } else {
    if (fs.existsSync(path)) {
      res.sendFile(path);
    } else {
      res.status(404);
      res.json({ error : 'File not found' });
    }
  }
});

// Run server
app.listen(config.server.port, config.server.host, () => {
  console.log(`Easywyg API running on http://${config.server.host}:${config.server.port}`);
});
