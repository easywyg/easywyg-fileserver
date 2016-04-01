'use strict';

/**
 * Easywyg Fileserver
 *
 * POST /upload - Upload an image
 * POST /copy - Download image from remote URL
 */

import http       from 'http';
import url        from 'url';
import yaml       from 'js-yaml';
import fs         from 'fs';
import yargs      from 'yargs';
import mime       from 'mime';

import * as utils from './utils/common';
import Download   from './utils/download';
import Upload     from './utils/upload';

// Check for --config argument
const configPath = yargs.argv.config || process.env.EF_CONFIG;
if (!configPath) {
  console.log('Error: you should pass --config option or EF_CONFIG env variable');
  process.exit();
}

const config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
const corsOpts = { origin: true, preflightContinue: false };

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'origin, content-type, accept, x-client-id');

  const method = req.method.toLowerCase();
  const path   = req.url;
  const params = url.parse(req.url,true).query;

  const json = (res, data, status = 200) => {
    res.writeHead(status, { 'content-type': 'application/json' });

    if (data) {
      res.end(JSON.stringify(data));
    } else {
      res.end();
    }
  }

  // Upload image to local server
  //
  // Example:
  //
  // curl -F "file=@/home/tanraya/Pictures/1105121.jpg" -X POST http://localhost:12320/upload
  //
  if ('/upload' == path && 'post' == method) {
    const promise = (new Upload(config)).upload(req);
    const reject  = (data) => { json(res, data, 400) };
    const resolve = (data) => { json(res, data) };

    promise.then(resolve, reject);
  }

  // Copy image from remote server to local server
  // curl -X POST -d "url=https://www.google.ru/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" http://localhost:12320/copy
  else if ('/copy' == path && 'post' == method) {
    if (!params.url) {
      json(res, { error : 'You should pass url parameter!' }, 400)
    }

    const promise = (new Download(config)).download(req.body.url);
    const reject  = (data) => { json(res, data, 400) };
    const resolve = (data) => { json(res, data) };

    promise.then(resolve, reject);
  }

  // Support options request
  else if (['/upload', '/copy'].some(x => x == path) && 'options' == method) {
    json(res)
  }

  // Welcome screen
  else if ('/' == path) {
    json(res, { message: 'Welcome to Easywyg Fileserver!' })
  }

  // Serve files
  else if (config.serve.enabled) {
    const filePath = [config.storage.root, path.replace(/^\/+/, '')].join('/');

    // Serving by fileserver itself
    if ('fileserver' == config.serve.via && fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
      res.writeHead(200, {
        'Content-Type': mime.lookup(filePath),
        'Content-Length': fs.statSync(filePath)['size'],
      });

      fs.createReadStream(filePath, 'utf-8').pipe(res);
    }
    // Serve via Nginx or Apache
    else if ('webserver' == config.serve.via)
      res.set(config.serve.xSendfileHeader, `/serve/${path}`);
      res.end()
    else {
      json(res, { error: 'File not found' }, 404)
    }
  }
}).listen(config.server.port, config.server.host);

server.on('error', (e) => {
  // Handle your error here
  console.log(e);
});
