/**
 * Shared export helper for Patient Simulator V2 modules.
 * Works in both browser (window.PSV2) and Node (module.exports).
 */
(function (global) {
  'use strict';

  function exportModule(name, api) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = api;
    }
    global.PSV2 = global.PSV2 || {};
    global.PSV2[name] = api;
    return api;
  }

  global.PSV2 = global.PSV2 || {};
  global.PSV2.exportModule = exportModule;
})(typeof globalThis !== 'undefined' ? globalThis : this);
