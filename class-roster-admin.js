(() => {
  'use strict';
  const form = document.querySelector('#rosterAccessForm');
  const keyInput = document.querySelector('#adminKey');
  const status = document.querySelector('#rosterStatus');
  const view = document.querySelector('#rosterView');
  const rows = document.querySelector('#rosterRows');
  const count = document.querySelector('#rosterCount');
  const empty = document.querySelector('#rosterEmpty');
  const limitNote = document.querySelector('#rosterLimitNote');
  const loadButton = document.querySelector('#loadRosterBtn');
  const signOutButton = document.querySelector('#signOutBtn');
  let accessKey = '';
  let roster = [];

  function setStatus(message, type = '') {
    status.textContent = message;
    status.className = 'roster-status' + (type ? ' ' + type : '');
  }
  function safeDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  function td(text) {
    const cell = document.createElement('td');
    cell.textContent = String(text ?? '—');
    return cell;
  }
  function render(data) {
    roster = Array.isArray(data.records) ? data.records : [];
    rows.replaceChildren();
    for (const item of roster) {
      const row = document.createElement('tr');
      row.append(td(item.learnerName), td(Number(item.writtenTestScore) + '%'), td(Number(item.aiNarrativeScore) + '/100'), td(safeDate(item.completedAt)));
      rows.append(row);
    }
    count.textContent = roster.length + (roster.length === 1 ? ' learner completed' : ' learners completed');
    empty.hidden = roster.length !== 0;
    limitNote.hidden = !data.truncated;
    view.hidden = false;
    signOutButton.disabled = false;
  }
  async function load() {
    loadButton.disabled = true;
    setStatus('Loading roster…');
    try {
      const response = await fetch('/.netlify/functions/class-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessKey },
        body: '{}',
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        accessKey = '';
        keyInput.value = '';
        view.hidden = true;
        throw new Error('Access was not authorized. Check the key and try again.');
      }
      if (!response.ok) throw new Error(data.error || 'Roster could not be loaded. Try again.');
      render(data);
      keyInput.value = '';
      setStatus('Roster loaded. Use Print roster for a print-friendly copy.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      loadButton.disabled = false;
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (keyInput.value.trim()) accessKey = keyInput.value.trim();
    if (!accessKey) { setStatus('Enter the administrator access key.', 'error'); return; }
    load();
  });
  document.querySelector('#refreshRosterBtn').addEventListener('click', load);
  document.querySelector('#printRosterBtn').addEventListener('click', () => window.print());
  document.querySelector('#downloadRosterBtn').addEventListener('click', () => {
    const header = ['Learner name', 'Written test score', 'AI narrative score', 'Completed'];
    const lines = [header, ...roster.map(item => [item.learnerName, item.writtenTestScore, item.aiNarrativeScore, safeDate(item.completedAt)])]
      .map(line => line.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([lines], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ems-report-writing-class-roster.csv';
    link.click();
    URL.revokeObjectURL(url);
  });
  signOutButton.addEventListener('click', () => {
    accessKey = '';
    roster = [];
    rows.replaceChildren();
    view.hidden = true;
    keyInput.value = '';
    signOutButton.disabled = true;
    setStatus('Signed out. Enter the administrator access key to view the roster.');
  });
})();