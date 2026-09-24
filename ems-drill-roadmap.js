'use strict';

/**
 * Responder Roadmap ↔ EMSCodeSim drill bridge (client).
 * Tokens are validated server-side. Completions sync with retry + idempotency.
 */
(function (global) {
  const PENDING_KEY = 'emscodesimEmsDrillPendingSyncV1';
  const RECEIPT_KEY = 'emscodesimEmsDrillLastReceiptV1';

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function track(eventName, params) {
    try {
      if (typeof global.gtag === 'function') {
        global.gtag('event', eventName, Object.assign({ event_category: 'ems_drills' }, params || {}));
      }
    } catch (_) { /* no-op */ }
  }

  function readPending() {
    try {
      return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function writePending(items) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(0, 25)));
  }

  function saveReceipt(receipt) {
    localStorage.setItem(RECEIPT_KEY, JSON.stringify(receipt));
  }

  function loadReceipt() {
    try {
      return JSON.parse(localStorage.getItem(RECEIPT_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function parseLaunchParams(search) {
    const params = new URLSearchParams(search || global.location.search);
    const token = params.get('token') || params.get('assignmentToken') || '';
    const source = (params.get('source') || '').toLowerCase();
    const drillId = params.get('id') || params.get('drill') || params.get('drillId') || '';
    const returnUrl = params.get('return') || params.get('return_url') || params.get('returnUrl') || '';
    const assignmentId = params.get('assignment') || params.get('assignmentId') || '';
    return {
      token,
      source: source || (token ? 'roadmap' : ''),
      drillId,
      returnUrl,
      assignmentId,
      fromRoadmap: Boolean(token) || source === 'roadmap'
    };
  }

  async function validateSession(token, drillId) {
    if (!token) return { ok: true, standalone: true };
    if (typeof token !== 'string' || !token.includes('.')) {
      return {
        ok: false,
        error: 'invalid_token_format',
        message: 'This Responder Roadmap launch link is malformed.'
      };
    }
    try {
      const response = await fetch('/.netlify/functions/ems-drill-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, drillId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || 'session_invalid',
          message: data.message || 'This Responder Roadmap launch link is invalid or expired.'
        };
      }
      return { ok: true, standalone: false, session: data.session };
    } catch (_) {
      return {
        ok: false,
        error: 'session_unreachable',
        message: 'Unable to validate the Responder Roadmap launch token right now. Reopen the assignment and try again.'
      };
    }
  }

  async function postCompletion(payload) {
    const response = await fetch('/.netlify/functions/ems-drill-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    return { httpStatus: response.status, data };
  }

  async function syncCompletion(completion, launch) {
    if (!launch?.token) {
      const receipt = {
        ...completion,
        syncStatus: 'standalone',
        syncedAt: completion.completedAt
      };
      saveReceipt(receipt);
      return receipt;
    }

    const payload = {
      token: launch.token,
      completion: {
        drillId: completion.drillId,
        drillVersion: completion.drillVersion,
        assignmentId: completion.assignmentId || launch.session?.assignmentId,
        completionId: completion.completionId,
        status: completion.status || 'completed',
        completedAt: completion.completedAt,
        durationSeconds: completion.durationSeconds,
        score: completion.score,
        passed: completion.passed,
        evaluatorId: completion.evaluatorId,
        attemptNumber: completion.attemptNumber || 1
      }
    };

    try {
      const result = await postCompletion(payload);
      if (result.data?.ok) {
        track('ems_drill_roadmap_sync_success', { drill_id: completion.drillId });
        const receipt = {
          ...completion,
          completionId: result.data.completionId || completion.completionId,
          syncStatus: 'synced',
          syncedAt: new Date().toISOString(),
          returnUrl: launch.session?.returnUrl || launch.returnUrl || null
        };
        saveReceipt(receipt);
        const pending = readPending().filter((item) => item.completion?.completionId !== receipt.completionId);
        writePending(pending);
        return receipt;
      }

      track('ems_drill_roadmap_sync_failure', {
        drill_id: completion.drillId,
        error: result.data?.error || 'sync_failed'
      });
      const pendingItem = {
        queuedAt: new Date().toISOString(),
        payload,
        completion
      };
      const pending = readPending().filter((item) => {
        const id = item.completion?.completionId || item.payload?.completion?.completionId;
        return id !== (completion.completionId || payload.completion.completionId);
      });
      pending.unshift(pendingItem);
      writePending(pending);
      const receipt = {
        ...completion,
        syncStatus: 'pending',
        syncError: result.data?.error || 'sync_failed',
        returnUrl: launch.session?.returnUrl || launch.returnUrl || null
      };
      saveReceipt(receipt);
      return receipt;
    } catch (error) {
      track('ems_drill_roadmap_sync_failure', { drill_id: completion.drillId, error: 'network' });
      const pending = readPending();
      pending.unshift({ queuedAt: new Date().toISOString(), payload, completion });
      writePending(pending.slice(0, 25));
      const receipt = {
        ...completion,
        syncStatus: 'pending',
        syncError: 'network',
        returnUrl: launch.session?.returnUrl || launch.returnUrl || null
      };
      saveReceipt(receipt);
      return receipt;
    }
  }

  async function flushPending() {
    const pending = readPending();
    if (!pending.length) return [];
    const remaining = [];
    const results = [];
    for (const item of pending) {
      try {
        const result = await postCompletion(item.payload);
        if (result.data?.ok) {
          results.push(result.data);
          track('ems_drill_roadmap_sync_success', { drill_id: item.completion?.drillId, retry: true });
        } else {
          remaining.push(item);
        }
      } catch (_) {
        remaining.push(item);
      }
    }
    writePending(remaining);
    return results;
  }

  function renderReceipt(target, receipt) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root || !receipt) return;
    const synced = receipt.syncStatus === 'synced';
    const pending = receipt.syncStatus === 'pending';
    const standalone = receipt.syncStatus === 'standalone' || !receipt.assignmentId;
    const when = receipt.completedAt
      ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.completedAt))
      : '—';
    const minutes = Math.max(1, Math.round((receipt.durationSeconds || 0) / 60));

    root.innerHTML = `
      <section class="ems-receipt" aria-live="polite">
        <p class="ems-drill-kicker">Drill Complete</p>
        <h2>${esc(receipt.drillTitle || receipt.drillId)}</h2>
        <dl class="ems-receipt-grid">
          <div><dt>Completion</dt><dd>${esc(when)}</dd></div>
          <div><dt>Duration</dt><dd>${minutes} min</dd></div>
          <div><dt>Score</dt><dd>${receipt.score == null ? '—' : `${esc(receipt.score)}%`}</dd></div>
          <div><dt>Evaluator</dt><dd>${esc(receipt.evaluatorName || receipt.evaluatorId || '—')}</dd></div>
        </dl>
        ${synced ? '<p class="ems-sync is-ok">✓ Completion sent to Responder Roadmap</p>' : ''}
        ${pending ? '<p class="ems-sync is-pending">Completion saved — waiting to sync</p><button type="button" class="ems-btn ems-btn-secondary" data-action="retry-sync">Retry sync</button>' : ''}
        ${standalone ? '<p class="ems-sync">Standalone EMSCodeSim practice session</p>' : ''}
        <div class="ems-receipt-actions">
          ${receipt.returnUrl ? `<a class="ems-btn ems-btn-primary" href="${esc(receipt.returnUrl)}">Return to Responder Roadmap</a>` : ''}
          <a class="ems-btn ems-btn-secondary" href="/ems-drills.html">Back to EMS Drills</a>
          <button type="button" class="ems-btn ems-btn-secondary" data-action="restart">Practice again</button>
        </div>
      </section>
    `;

    root.querySelector('[data-action="retry-sync"]')?.addEventListener('click', async () => {
      await flushPending();
      const latest = loadReceipt();
      if (latest) renderReceipt(root, latest);
    });
  }

  global.EmsDrillRoadmap = {
    parseLaunchParams,
    validateSession,
    syncCompletion,
    flushPending,
    renderReceipt,
    saveReceipt,
    loadReceipt,
    readPending
  };
})(typeof window !== 'undefined' ? window : globalThis);
