/* ===================================================================
   three-loader.js -- Lazy-load Three.js on first use
   CC-116: Defers ~580 KB three.min.js until a 3D feature is needed.
   =================================================================== */

window.ensureThree = (function () {
  'use strict';

  var THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var _promise = null;

  return function ensureThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (_promise) return _promise;

    _promise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = THREE_CDN;
      s.onload = function () { resolve(window.THREE); };
      s.onerror = function () {
        _promise = null;                       // allow retry
        reject(new Error('Failed to load Three.js from CDN'));
      };
      document.head.appendChild(s);
    });

    return _promise;
  };
})();
