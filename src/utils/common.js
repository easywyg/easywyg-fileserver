'use strict';

export default {
  pad: (num, size = 2) => {
    let s = String(num);

    while (s.length < size) {
      s = "0" + s;
    }

    return s;
  }

  imageExtension: (mimeType) => {
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
}
