const handoffState = { active: false };

function append(role, message) {
  if (typeof window.appendChatBubble === 'function') {
    window.appendChatBubble(role, message);
  }
}

function scoreHandoff(text) {
  const normalized = String(text || '').toLowerCase();
  const checks = [
    { label: 'patient and complaint', match: /(year|yo|male|female|patient|complaint|called for)/ },
    { label: 'findings or injuries', match: /(finding|injur|exam|assessment|pain|lung|airway|breath|skin|mental|stroke)/ },
    { label: 'vital signs', match: /(bp|blood pressure|pulse|heart rate|respir|spo2|oxygen saturation|glucose|gcs|vital)/ },
    { label: 'treatments', match: /(treat|oxygen|aspirin|nitro|iv|medication|splint|bandage|intervention|transport)/ },
  ];
  const present = checks.filter(item => item.match.test(normalized));
  return { present, missing: checks.filter(item => !item.match.test(normalized)) };
}

window.startHandoffInline = function startHandoffInline() {
  handoffState.active = true;
  window.handoffActive = true;
  append('system', 'Enter a concise MIST-style handoff: patient/complaint, key findings, vital signs, treatments, response, and current status.');
  const input = document.getElementById('user-input');
  if (input) {
    input.placeholder = 'Type your MIST handoff report...';
    input.focus();
  }
};

window.handleHandoffSubmission = function handleHandoffSubmission(text) {
  const report = String(text || '').trim();
  if (!report) {
    append('system', 'Enter your handoff report before submitting.');
    return;
  }
  append('you', report);
  const result = scoreHandoff(report);
  const percent = Math.round((result.present.length / 4) * 100);
  const feedback = result.missing.length
    ? `Handoff score: ${percent}%. Add or clarify: ${result.missing.map(item => item.label).join(', ')}.`
    : 'Handoff score: 100%. Your report included the core MIST elements. Keep it concise and include patient response and current status when relevant.';
  append('system', feedback);
  handoffState.active = false;
  window.handoffActive = false;
  const input = document.getElementById('user-input');
  if (input) input.placeholder = 'Type your response here...';
};
