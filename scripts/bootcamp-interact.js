(() => {
  'use strict';
  const STORAGE_KEY = 'emscodesim_bls_bootcamp_interact_v1';
  const DATA = window.EMSCodeSimBootcampData || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  };
  const write = (state) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  };
  let store = read();

  function markComplete(id) {
    store[id] = store[id] || {};
    store[id].complete = true;
    store[id].at = Date.now();
    write(store);
    renderProgress();
  }

  function isComplete(id) {
    return Boolean(store[id]?.complete);
  }

  function feedbackBox(kind, title, body) {
    const box = el('div', `bci-feedback ${kind}`);
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    if (title) box.append(el('strong', '', title));
    if (body) box.append(el('p', '', body));
    return box;
  }

  function choiceButtons(choices, onPick) {
    const wrap = el('div', 'bci-choices');
    choices.forEach((choice, index) => {
      const btn = el('button', 'bci-choice', choice.text);
      btn.type = 'button';
      btn.addEventListener('click', () => onPick(choice, index, wrap, btn));
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function shell(root, config, kindLabel) {
    root.classList.add('bci-widget');
    root.dataset.bciType = config.type;
    root.innerHTML = '';
    const head = el('div', 'bci-head');
    head.append(el('span', 'bci-kicker', kindLabel), el('h3', '', config.title));
    if (isComplete(root.dataset.bootcampInteract)) head.append(el('span', 'bci-done-badge', 'Completed'));
    root.appendChild(head);
    const body = el('div', 'bci-body');
    root.appendChild(body);
    return body;
  }

  function renderQuickCheck(root, config) {
    const body = shell(root, config, 'Quick Check');
    body.append(el('p', 'bci-prompt', config.prompt));
    const feed = el('div', 'bci-feed');
    const choices = choiceButtons(config.choices, (choice, _i, wrap, btn) => {
      [...wrap.children].forEach(node => { node.disabled = true; });
      btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
      wrap.querySelectorAll('.bci-choice').forEach((node, idx) => {
        if (config.choices[idx].correct) node.classList.add('is-key');
      });
      feed.innerHTML = '';
      feed.append(feedbackBox(
        choice.correct ? 'success' : 'warn',
        choice.correct ? 'Correct' : 'Not quite',
        choice.why
      ));
      const actions = el('div', 'bci-actions');
      if (!choice.correct) {
        const retry = el('button', 'bci-btn', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', () => renderQuickCheck(root, config));
        actions.appendChild(retry);
      } else {
        markComplete(root.dataset.bootcampInteract);
        actions.append(el('span', 'bci-continue-note', 'Continue the lesson ↓'));
      }
      feed.appendChild(actions);
    });
    body.append(choices, feed);
  }

  function renderClinicalDecision(root, config) {
    const body = shell(root, config, 'What Would You Do?');
    body.append(el('p', 'bci-stem', config.stem));
    if (config.vitals?.length) {
      const vitals = el('ul', 'bci-vitals');
      config.vitals.forEach(v => vitals.append(el('li', '', v)));
      body.appendChild(vitals);
    }
    body.append(el('p', 'bci-prompt', config.prompt));
    const feed = el('div', 'bci-feed');
    body.append(choiceButtons(config.choices, (choice, _i, wrap, btn) => {
      [...wrap.children].forEach(n => { n.disabled = true; });
      btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
      feed.innerHTML = '';
      feed.append(feedbackBox(choice.correct ? 'success' : 'warn', choice.correct ? 'Strong decision' : 'Reconsider', choice.why));
      const actions = el('div', 'bci-actions');
      if (!choice.correct) {
        const retry = el('button', 'bci-btn', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', () => renderClinicalDecision(root, config));
        actions.appendChild(retry);
      } else markComplete(root.dataset.bootcampInteract);
      feed.appendChild(actions);
    }), feed);
  }

  function renderAssessmentChallenge(root, config) {
    const body = shell(root, config, 'Assessment Challenge');
    body.append(el('p', 'bci-stem', config.patient));
    const grid = el('dl', 'bci-findings');
    config.findings.forEach(f => {
      grid.append(el('dt', '', f.label), el('dd', '', f.value));
    });
    body.append(grid, el('p', 'bci-prompt', config.prompt));
    const feed = el('div', 'bci-feed');
    body.append(choiceButtons(config.choices, (choice, _i, wrap, btn) => {
      [...wrap.children].forEach(n => { n.disabled = true; });
      btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
      feed.innerHTML = '';
      feed.append(feedbackBox(choice.correct ? 'success' : 'warn', choice.correct ? 'Life threat identified' : 'Look again', choice.why));
      if (!choice.correct) {
        const retry = el('button', 'bci-btn', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', () => renderAssessmentChallenge(root, config));
        feed.appendChild(retry);
      } else markComplete(root.dataset.bootcampInteract);
    }), feed);
  }

  function renderFieldTip(root, config) {
    const body = shell(root, config, 'EMT Field Tip');
    body.append(el('p', '', config.body));
    markComplete(root.dataset.bootcampInteract);
  }

  function renderCommonMistake(root, config) {
    const body = shell(root, config, 'Common EMT Mistake');
    body.append(el('p', 'bci-mistake', config.mistake));
    body.append(el('p', 'bci-better', `Better approach: ${config.better}`));
    markComplete(root.dataset.bootcampInteract);
  }

  function renderWhyItMatters(root, config) {
    const body = shell(root, config, 'Why this matters');
    const details = el('details', 'bci-why');
    details.append(el('summary', '', config.question));
    details.append(el('p', '', config.answer));
    details.addEventListener('toggle', () => {
      if (details.open) markComplete(root.dataset.bootcampInteract);
    });
    body.appendChild(details);
  }

  function renderVitalsTrainer(root, config) {
    const body = shell(root, config, 'Vitals Trainer');
    body.append(el('p', 'bci-intro', config.intro));
    const compare = el('div', 'bci-vitals-compare');
    [config.first, config.second].forEach(set => {
      const card = el('div', 'bci-vitals-card');
      card.append(el('strong', '', set.label));
      const list = el('ul', '');
      set.values.forEach(v => list.append(el('li', '', v)));
      card.appendChild(list);
      compare.appendChild(card);
    });
    body.append(compare, el('p', 'bci-prompt', config.prompt));
    const feed = el('div', 'bci-feed');
    body.append(choiceButtons(config.choices, (choice, _i, wrap, btn) => {
      [...wrap.children].forEach(n => { n.disabled = true; });
      btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
      feed.innerHTML = '';
      feed.append(feedbackBox(choice.correct ? 'success' : 'warn', choice.correct ? 'Trend recognized' : 'Check the direction of change', choice.why));
      if (!choice.correct) {
        const retry = el('button', 'bci-btn', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', () => renderVitalsTrainer(root, config));
        feed.appendChild(retry);
      } else markComplete(root.dataset.bootcampInteract);
    }), feed);
  }

  function renderSpotProblem(root, config) {
    const body = shell(root, config, 'Spot the Problem');
    body.append(el('p', 'bci-stem', config.scenario), el('p', 'bci-prompt', config.prompt));
    const feed = el('div', 'bci-feed');
    body.append(choiceButtons(config.choices, (choice, _i, wrap, btn) => {
      [...wrap.children].forEach(n => { n.disabled = true; });
      btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
      feed.innerHTML = '';
      feed.append(feedbackBox(choice.correct ? 'success' : 'warn', choice.correct ? 'Problem spotted' : 'Not the main issue', choice.why));
      if (!choice.correct) {
        const retry = el('button', 'bci-btn', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', () => renderSpotProblem(root, config));
        feed.appendChild(retry);
      } else markComplete(root.dataset.bootcampInteract);
    }), feed);
  }

  function renderHistoryTrainer(root, config) {
    const body = shell(root, config, 'History Trainer');
    body.append(el('p', 'bci-intro', config.intro), el('p', 'bci-stem', config.complaint));
    const asked = new Set(store[root.dataset.bootcampInteract]?.asked || []);
    const bank = el('div', 'bci-history-bank');
    const log = el('div', 'bci-history-log');
    log.append(el('strong', '', 'Information collected'));
    const list = el('ul', '');
    log.appendChild(list);

    function redrawLog() {
      list.innerHTML = '';
      config.bank.filter(item => asked.has(item.id)).forEach(item => {
        list.append(el('li', '', `${item.label} → ${item.answer}`));
      });
    }

    config.bank.forEach(item => {
      const btn = el('button', 'bci-choice', item.label);
      btn.type = 'button';
      if (asked.has(item.id)) btn.disabled = true;
      btn.addEventListener('click', () => {
        asked.add(item.id);
        btn.disabled = true;
        store[root.dataset.bootcampInteract] = store[root.dataset.bootcampInteract] || {};
        store[root.dataset.bootcampInteract].asked = [...asked];
        write(store);
        redrawLog();
      });
      bank.appendChild(btn);
    });

    const finish = el('button', 'bci-btn primary', 'Review completeness');
    finish.type = 'button';
    const feed = el('div', 'bci-feed');
    finish.addEventListener('click', () => {
      const required = config.bank.filter(item => item.required);
      const got = required.filter(item => asked.has(item.id));
      const missed = required.filter(item => !asked.has(item.id));
      feed.innerHTML = '';
      if (!missed.length) {
        feed.append(feedbackBox('success', 'Strong history', 'You covered the high-yield OPQRST items for this complaint.'));
        markComplete(root.dataset.bootcampInteract);
      } else {
        const missList = missed.map(item => item.label).join('; ');
        feed.append(feedbackBox('warn', `Collected ${got.length}/${required.length} key items`, `Important information you missed: ${missList}. ${config.missedAdvice || ''}`));
      }
    });
    body.append(bank, log, finish, feed);
    redrawLog();
  }

  function renderSkillWalkthrough(root, config) {
    const body = shell(root, config, 'Skill Walkthrough');
    body.append(el('p', 'bci-intro', config.intro));
    let step = store[root.dataset.bootcampInteract]?.step || 0;
    const stage = el('div', 'bci-skill-stage');
    const feed = el('div', 'bci-feed');

    function draw() {
      stage.innerHTML = '';
      feed.innerHTML = '';
      if (step >= config.steps.length) {
        stage.append(el('p', 'bci-prompt', 'Walkthrough complete. Review the full skill sheet for formal practice.'));
        if (config.sheetHref) {
          const link = el('a', 'bci-btn primary', config.sheetLabel || 'View skill sheet');
          link.href = config.sheetHref;
          stage.appendChild(link);
        }
        markComplete(root.dataset.bootcampInteract);
        return;
      }
      const current = config.steps[step];
      stage.append(el('p', 'bci-step-count', `Step ${step + 1} of ${config.steps.length}`));
      stage.append(el('p', 'bci-prompt', current.prompt));
      stage.append(choiceButtons(current.choices, (choice, _i, wrap, btn) => {
        [...wrap.children].forEach(n => { n.disabled = true; });
        btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
        feed.innerHTML = '';
        feed.append(feedbackBox(choice.correct ? 'success' : 'warn', choice.correct ? 'Correct next step' : 'Not yet', choice.why));
        if (choice.correct) {
          const next = el('button', 'bci-btn primary', step + 1 >= config.steps.length ? 'Finish' : 'Next step');
          next.type = 'button';
          next.addEventListener('click', () => {
            step += 1;
            store[root.dataset.bootcampInteract] = store[root.dataset.bootcampInteract] || {};
            store[root.dataset.bootcampInteract].step = step;
            write(store);
            draw();
          });
          feed.appendChild(next);
        } else {
          const retry = el('button', 'bci-btn', 'Try again');
          retry.type = 'button';
          retry.addEventListener('click', draw);
          feed.appendChild(retry);
        }
      }));
    }
    body.append(stage, feed);
    draw();
  }

  function renderRadioReport(root, config) {
    const body = shell(root, config, 'Radio Report Practice');
    body.append(el('p', 'bci-intro', config.intro));
    const pool = el('div', 'bci-radio-pool');
    const built = el('ol', 'bci-radio-built');
    let order = [];
    const pieces = [...config.pieces];

    function draw() {
      pool.innerHTML = '';
      built.innerHTML = '';
      pieces.forEach(piece => {
        const btn = el('button', 'bci-choice', piece.label);
        btn.type = 'button';
        btn.disabled = order.includes(piece.id);
        btn.addEventListener('click', () => {
          order.push(piece.id);
          draw();
        });
        pool.appendChild(btn);
      });
      order.forEach((id, index) => {
        const piece = pieces.find(p => p.id === id);
        const li = el('li', '');
        li.append(el('span', '', `${index + 1}. ${piece.label}`));
        const undo = el('button', 'bci-linkish', 'Remove');
        undo.type = 'button';
        undo.addEventListener('click', () => {
          order = order.filter(x => x !== id);
          draw();
        });
        li.appendChild(undo);
        built.appendChild(li);
      });
    }

    const check = el('button', 'bci-btn primary', 'Check report order');
    check.type = 'button';
    const feed = el('div', 'bci-feed');
    check.addEventListener('click', () => {
      feed.innerHTML = '';
      const ok = order.length === config.correctOrder.length && order.every((id, i) => id === config.correctOrder[i]);
      if (ok) {
        feed.append(feedbackBox('success', 'Clear structure', config.tip));
        feed.append(el('p', 'bci-example', `Example: ${config.example}`));
        markComplete(root.dataset.bootcampInteract);
      } else {
        feed.append(feedbackBox('warn', 'Reorder and retry', 'Aim for unit/ETA → age/sex → complaint → key findings → vitals/trend → treatment/response.'));
      }
    });
    const reset = el('button', 'bci-btn', 'Reset');
    reset.type = 'button';
    reset.addEventListener('click', () => { order = []; draw(); feed.innerHTML = ''; });
    const actions = el('div', 'bci-actions');
    actions.append(check, reset);
    body.append(pool, built, actions, feed);
    draw();
  }

  function renderLessonChallenge(root, config) {
    const body = shell(root, config, 'Lesson Challenge');
    body.append(el('p', 'bci-intro', config.intro));
    let index = 0;
    let score = 0;
    const stage = el('div', 'bci-challenge-stage');
    const feed = el('div', 'bci-feed');

    function draw() {
      stage.innerHTML = '';
      feed.innerHTML = '';
      if (index >= config.items.length) {
        stage.append(el('p', 'bci-prompt', `Challenge complete: ${score}/${config.items.length} strong answers.`));
        markComplete(root.dataset.bootcampInteract);
        return;
      }
      const item = config.items[index];
      stage.append(el('p', 'bci-step-count', `Question ${index + 1} of ${config.items.length}`));
      stage.append(el('p', 'bci-prompt', item.prompt));
      stage.append(choiceButtons(item.choices, (choice, _i, wrap, btn) => {
        [...wrap.children].forEach(n => { n.disabled = true; });
        btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
        if (choice.correct) score += 1;
        feed.innerHTML = '';
        feed.append(feedbackBox(choice.correct ? 'success' : 'warn', choice.correct ? 'Correct' : 'Review', choice.why));
        const next = el('button', 'bci-btn primary', index + 1 >= config.items.length ? 'Finish challenge' : 'Next');
        next.type = 'button';
        next.addEventListener('click', () => { index += 1; draw(); });
        feed.appendChild(next);
      }));
    }
    body.append(stage, feed);
    draw();
  }

  function renderMiniScenario(root, config) {
    const body = shell(root, config, 'Mini-Scenario');
    body.append(el('p', 'bci-intro', config.intro));
    let stageIndex = store[root.dataset.bootcampInteract]?.stage || 0;
    const stageBox = el('div', 'bci-mini-stage');
    const feed = el('div', 'bci-feed');

    function draw() {
      stageBox.innerHTML = '';
      feed.innerHTML = '';
      if (stageIndex >= config.stages.length) {
        stageBox.append(el('p', 'bci-prompt', 'Scenario investigation complete.'));
        if (config.continueHref) {
          const link = el('a', 'bci-btn primary', config.continueLabel || 'Continue');
          link.href = config.continueHref;
          stageBox.appendChild(link);
        }
        markComplete(root.dataset.bootcampInteract);
        return;
      }
      const stage = config.stages[stageIndex];
      stageBox.append(el('p', 'bci-step-count', stage.title));
      stageBox.append(el('p', 'bci-stem', stage.body));
      if (stage.action && !stage.choices) {
        const go = el('button', 'bci-btn primary', stage.action);
        go.type = 'button';
        go.addEventListener('click', () => {
          feed.innerHTML = '';
          feed.append(feedbackBox('success', 'Scene information', stage.reveal));
          const next = el('button', 'bci-btn primary', 'Continue');
          next.type = 'button';
          next.addEventListener('click', () => {
            stageIndex += 1;
            store[root.dataset.bootcampInteract] = store[root.dataset.bootcampInteract] || {};
            store[root.dataset.bootcampInteract].stage = stageIndex;
            write(store);
            draw();
          });
          feed.appendChild(next);
        });
        stageBox.appendChild(go);
        return;
      }
      stageBox.append(choiceButtons(stage.choices, (choice, _i, wrap, btn) => {
        [...wrap.children].forEach(n => { n.disabled = true; });
        btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
        feed.innerHTML = '';
        feed.append(feedbackBox(choice.correct ? 'success' : 'warn', choice.correct ? 'Good investigation' : 'Reassess priorities', choice.reveal || choice.why || ''));
        const next = el('button', 'bci-btn primary', choice.correct ? 'Continue' : 'Try this step again');
        next.type = 'button';
        next.addEventListener('click', () => {
          if (choice.correct) {
            stageIndex += 1;
            store[root.dataset.bootcampInteract] = store[root.dataset.bootcampInteract] || {};
            store[root.dataset.bootcampInteract].stage = stageIndex;
            write(store);
          }
          draw();
        });
        feed.appendChild(next);
      }));
    }
    body.append(stageBox, feed);
    draw();
  }

  function renderFinalChallenge(root, config) {
    const body = shell(root, config, 'Final Challenge');
    body.append(el('p', 'bci-intro', config.intro));
    let stageIndex = store[root.dataset.bootcampInteract]?.stage || 0;
    let score = store[root.dataset.bootcampInteract]?.score || 0;
    const stageBox = el('div', 'bci-final-stage');
    const feed = el('div', 'bci-feed');

    function draw() {
      stageBox.innerHTML = '';
      feed.innerHTML = '';
      if (stageIndex >= config.stages.length) {
        stageBox.append(el('p', 'bci-prompt', `Final challenge complete: ${score}/${config.stages.length} strong decisions.`));
        stageBox.append(el('p', '', 'Close the loop: document the fictional call, then replay a full visual-patient scenario if you want more reps.'));
        const links = el('div', 'bci-final-links');
        (config.docLinks || []).forEach(item => {
          const a = el('a', 'bci-btn', item.label);
          a.href = item.href;
          links.appendChild(a);
        });
        stageBox.appendChild(links);
        markComplete(root.dataset.bootcampInteract);
        return;
      }
      const stage = config.stages[stageIndex];
      stageBox.append(el('p', 'bci-step-count', stage.title));
      stageBox.append(el('p', 'bci-stem', stage.body));
      stageBox.append(el('p', 'bci-prompt', stage.prompt));
      stageBox.append(choiceButtons(stage.choices, (choice, _i, wrap, btn) => {
        [...wrap.children].forEach(n => { n.disabled = true; });
        btn.classList.add(choice.correct ? 'is-correct' : 'is-incorrect');
        feed.innerHTML = '';
        feed.append(feedbackBox(choice.correct ? 'success' : 'warn', choice.correct ? 'Solid field decision' : 'Teaching point', choice.why));
        if (choice.correct) score += 1;
        const next = el('button', 'bci-btn primary', 'Continue');
        next.type = 'button';
        next.addEventListener('click', () => {
          stageIndex += 1;
          store[root.dataset.bootcampInteract] = {
            ...(store[root.dataset.bootcampInteract] || {}),
            stage: stageIndex,
            score
          };
          write(store);
          draw();
        });
        feed.appendChild(next);
      }));
    }
    body.append(stageBox, feed);
    draw();
  }

  const RENDERERS = {
    quickCheck: renderQuickCheck,
    clinicalDecision: renderClinicalDecision,
    assessmentChallenge: renderAssessmentChallenge,
    fieldTip: renderFieldTip,
    commonMistake: renderCommonMistake,
    whyItMatters: renderWhyItMatters,
    vitalsTrainer: renderVitalsTrainer,
    spotProblem: renderSpotProblem,
    historyTrainer: renderHistoryTrainer,
    skillWalkthrough: renderSkillWalkthrough,
    radioReport: renderRadioReport,
    lessonChallenge: renderLessonChallenge,
    miniScenario: renderMiniScenario,
    finalChallenge: renderFinalChallenge
  };

  function mountAll() {
    document.querySelectorAll('[data-bootcamp-interact]').forEach(node => {
      const id = node.dataset.bootcampInteract;
      const config = DATA[id];
      if (!config) return;
      const renderer = RENDERERS[config.type];
      if (renderer) renderer(node, config);
    });
  }

  function renderProgress() {
    const track = $('#interactProgress');
    const label = $('#interactProgressLabel');
    if (!track || !label) return;
    const ids = [...document.querySelectorAll('[data-bootcamp-interact]')].map(n => n.dataset.bootcampInteract);
    const unique = [...new Set(ids)];
    const done = unique.filter(id => isComplete(id)).length;
    label.textContent = `${done} of ${unique.length} interactive drills complete`;
    track.style.width = `${unique.length ? (done / unique.length) * 100 : 0}%`;
    document.querySelectorAll('[data-interact-step]').forEach(step => {
      const need = (step.dataset.interactStep || '').split(',').filter(Boolean);
      const complete = need.length && need.every(id => isComplete(id));
      step.classList.toggle('is-complete', complete);
      step.classList.toggle('is-current', !complete && need.some(id => isComplete(id)));
    });
  }

  mountAll();
  renderProgress();
  window.EMSCodeSimBootcampInteract = { remount: mountAll, progress: renderProgress };
})();
