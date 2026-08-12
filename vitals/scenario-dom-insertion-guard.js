(() => {
  'use strict';

  if (window.EMSCodeSimDomInsertionGuard) return;

  const nativeInsertBefore = Node.prototype.insertBefore;

  function guardedInsertBefore(newNode, referenceNode) {
    if (referenceNode != null && referenceNode.parentNode !== this) {
      return nativeInsertBefore.call(this, newNode, null);
    }
    return nativeInsertBefore.call(this, newNode, referenceNode);
  }

  Object.defineProperty(Node.prototype, 'insertBefore', {
    configurable: true,
    writable: true,
    value: guardedInsertBefore
  });

  window.EMSCodeSimDomInsertionGuard = Object.freeze({
    version: '2026.08.12.1',
    active: true
  });
})();
