'use strict';

export default {
  pad: (num, size = 2) => {
    let s = String(num);

    while (s.length < size) {
      s = "0" + s;
    }

    return s;
  }
}
