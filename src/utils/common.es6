'use strict';

import uuid from 'node-uuid';
import mkdirp from 'mkdirp';

export function pad(num, size = 2) {
  let s = String(num);

  while (s.length < size) {
    s = "0" + s;
  }

  return s;
}

export function imageExtension(mimeType) {
  let extension = null;

  switch (mimeType) {
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

  return extension;
}

export function composeDest(template)  {
  const now  = new Date();
  const d    = now.getDate();
  const m    = now.getMonth() + 1;
  const y    = now.getFullYear();

  return template
    .replace('%y', pad(y))
    .replace('%m', pad(m))
    .replace('%d', pad(d));
}

export function composeFilename(filename, template) {
  const ext = filename.split('.').pop();

  return template
    .replace('%name', uuid.v4())
    .replace('%ext', ext);
}

export function composeURL(config, requestFilePath) {
  return [
    config.serve.url,
    requestFilePath.replace(new RegExp(`^${config.storage.root}`), '')
  ].join('');
}
