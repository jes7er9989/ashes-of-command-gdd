/* ===================================================================
   three-loader.js -- Lazy-load Three.js on first use
   CC-116: Defers ~580 KB three.min.js until a 3D feature is needed.
   Updated: Loads local bundle first, CDN fallback if local fails.
   =================================================================== */

window.ensureThree = (function () {
  'use strict';

  var THREE_LOCAL = 'js/vendor/three.min.js';
  var THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var _promise = null;

  function _loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(window.THREE); };
      s.onerror = function () { reject(new Error('Failed to load: ' + src)); };
      document.head.appendChild(s);
    });
  }

  return function ensureThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (_promise) return _promise;

    _promise = _loadScript(THREE_LOCAL).catch(function () {
      // Local failed — try CDN fallback
      console.warn('[three-loader] Local bundle failed, trying CDN...');
      return _loadScript(THREE_CDN);
    }).catch(function () {
      _promise = null;                       // allow retry
      throw new Error('Failed to load Three.js from both local and CDN');
    });

    return _promise;
  };
})();
