/**
 * Canonical scenario event timeline — source of truth for grading, PCR, debrief.
 */
(function (global) {
  'use strict';

  function createTimeline() {
    const events = [];
    let sequence = 0;

    function push(partial) {
      const event = Object.freeze({
        id: `evt_${++sequence}`,
        timestamp: Number(partial.timestamp) || 0,
        eventType: String(partial.eventType || 'action'),
        action: String(partial.action || ''),
        result: partial.result != null ? partial.result : null,
        clinicalStateBefore: partial.clinicalStateBefore || null,
        clinicalStateAfter: partial.clinicalStateAfter || null,
        metadata: Object.freeze({ ...(partial.metadata || {}) }),
        recordedAt: Date.now()
      });
      events.push(event);
      return event;
    }

    function list() {
      return events.slice();
    }

    function find(predicate) {
      return events.filter(predicate);
    }

    function hasAction(actionOrPattern) {
      if (actionOrPattern instanceof RegExp) {
        return events.some(e => actionOrPattern.test(e.action));
      }
      return events.some(e => e.action === actionOrPattern);
    }

    function firstAction(action) {
      return events.find(e => e.action === action) || null;
    }

    function lastAction(action) {
      for (let i = events.length - 1; i >= 0; i -= 1) {
        if (events[i].action === action) return events[i];
      }
      return null;
    }

    function formatClock(seconds) {
      const s = Math.max(0, Math.floor(seconds));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    }

    function toDisplayRows() {
      return events.map(e => ({
        clock: formatClock(e.timestamp),
        eventType: e.eventType,
        action: e.action,
        result: e.result,
        metadata: e.metadata
      }));
    }

    function reset() {
      events.length = 0;
      sequence = 0;
    }

    function snapshot() {
      return events.map(e => ({ ...e, metadata: { ...e.metadata } }));
    }

    return {
      push,
      list,
      find,
      hasAction,
      firstAction,
      lastAction,
      formatClock,
      toDisplayRows,
      reset,
      snapshot,
      get length() { return events.length; }
    };
  }

  const api = { createTimeline };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.EventTimeline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
