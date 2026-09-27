const { test, expect } = require('@playwright/test');
const { openScenario, clearSiteStorage } = require('./helpers');

test.describe('Patient Assessment learning loop', () => {
  test.beforeEach(async ({ page }) => {
    await clearSiteStorage(page);
  });

  test('Learning Mode shows progressive coaching and records hint level', async ({ page }) => {
    await openScenario(page, 'asthma', 'learning');
    await expect(page.locator('#modeBadge')).toContainText(/Learning Mode/i);

    const result = await page.evaluate(() => {
      const loop = window.EMSCodeSimLearningLoop;
      if (!loop) return { ok: false, reason: 'missing-api' };
      const track = loop.activeTrack();
      if (!track) return { ok: false, reason: 'no-track' };
      loop.showCoach(track, 1, true);
      loop.showCoach(track, 3, true);
      const assistance = loop.assistanceState();
      const dock = document.getElementById('learningLoopCoach');
      return {
        ok: true,
        trackId: track.id,
        level1: track.hints[1]?.prompt || '',
        level3: track.hints[3]?.prompt || '',
        highest: assistance.highestHintLevel[track.id],
        dockVisible: Boolean(dock && !dock.hidden),
        prompt: document.getElementById('llCoachPrompt')?.textContent || '',
        assessmentMode: loop.assessmentMode()
      };
    });

    expect(result.ok).toBeTruthy();
    expect(result.assessmentMode).toBeFalsy();
    expect(result.highest).toBe(3);
    expect(result.dockVisible).toBeTruthy();
    expect(result.level1.toLowerCase()).toMatch(/life threat|difficulty breathing|evaluate first/);
    expect(result.level3.toLowerCase()).toMatch(/breathing|ventilation|adequacy/);
    await expect(page.locator('#learningLoopCoach')).toBeVisible();
    await expect(page.locator('#llCoachPrompt')).not.toBeEmpty();
  });

  test('Assessment Mode does not show in-call coaching dock', async ({ page }) => {
    await openScenario(page, 'asthma', 'assessment');
    await expect(page.locator('#modeBadge')).toContainText(/Assessment Mode/i);

    const result = await page.evaluate(() => {
      const loop = window.EMSCodeSimLearningLoop;
      const track = loop?.COACHING_BY_CASE?.asthma?.[0];
      loop?.showCoach?.(track, 2, true);
      loop?.evaluateCoaching?.();
      const dock = document.getElementById('learningLoopCoach');
      return {
        assessmentMode: loop?.assessmentMode?.(),
        learningMode: loop?.learningMode?.(),
        dockHidden: !dock || dock.hidden === true
      };
    });

    expect(result.assessmentMode).toBeTruthy();
    expect(result.learningMode).toBeFalsy();
    expect(result.dockHidden).toBeTruthy();
  });

  test('weakness mapping and debrief remediation use canonical tools', async ({ page }) => {
    await openScenario(page, 'asthma', 'learning');

    const mapping = await page.evaluate(() => {
      const loop = window.EMSCodeSimLearningLoop;
      const breathing = loop.toolForWeakness('breathing_assessment');
      const sample = loop.toolForWeakness('sample');
      const opqrst = loop.toolForWeakness('opqrst');
      const breathSounds = loop.toolForWeakness('breath_sounds');
      return {
        breathing: breathing?.href || '',
        sample: sample?.href || '',
        opqrst: opqrst?.href || '',
        breathSounds: breathSounds?.href || '',
        returnTo: loop.patientReturnUrl(),
        retry: loop.retryUrl()
      };
    });

    expect(mapping.breathing).toContain('/vitals/respiratory-assessment-visual.html');
    expect(mapping.sample).toContain('/vitals/sample-history.html');
    expect(mapping.opqrst).toContain('/vitals/pain-opqrst.html');
    expect(mapping.breathSounds).toContain('/vitals/breath-sounds-scenario.html');
    expect(mapping.returnTo).toContain('case=asthma');
    expect(mapping.returnTo).toContain('training=learning');
    expect(mapping.retry).toContain('reset=1');

    // Seed a partial record and open debrief remediation model
    const debrief = await page.evaluate(() => {
      const api = window.EMSCodeSimPatientRecord;
      const loop = window.EMSCodeSimLearningLoop;
      api?.setFinding?.('scene_size_up', 'Scene safe in park', { source: 'test', normality: 'normal' });
      api?.setFinding?.('airway', 'Patent, speaking', { source: 'test', normality: 'not-normal' });
      api?.setDocumentation?.({
        learningLoop: {
          highestHintLevel: { primary_abc: 3, respiratory_detail: 2 },
          hints: { primary_abc: [1, 2, 3], respiratory_detail: [1, 2] },
          assistedCompletions: ['breathing_assessment'],
          independentCompletions: ['airway_assessment'],
          skippedCritical: ['breathing_assessment', 'breath_sounds']
        }
      });
      const model = loop.buildDebriefModel(api.active(), {
        opportunities: ['Missing before scenario end: Breathing assessment.'],
        critical: [],
        score: 48
      });
      const host = document.createElement('div');
      host.id = 'learningLoopDebriefHost';
      document.body.appendChild(host);
      loop.mountDebrief(host, { opportunities: model.needsPractice.map(x => x.detail), critical: [], score: 48 });
      return {
        strengths: model.strengths.map(x => x.text),
        needs: model.needsPractice.map(x => ({ id: x.id, href: x.practice?.href || '' })),
        hasRetry: Boolean(host.querySelector('[data-retry-scenario]')),
        hasPractice: Boolean(host.querySelector('[data-practice]')),
        markup: host.innerHTML
      };
    });

    expect(debrief.strengths.join(' ').toLowerCase()).toMatch(/airway|scene/);
    expect(debrief.needs.some(item => item.id === 'breathing_assessment' || item.id === 'breath_sounds' || item.id === 'life_threats')).toBeTruthy();
    expect(debrief.hasRetry).toBeTruthy();
    expect(debrief.hasPractice).toBeTruthy();
    expect(debrief.markup).toContain('Why it matters');
    expect(debrief.markup).toContain('Return to Patient');
  });

  test('Horse-crush coaching emphasizes trauma priorities differently from asthma', async ({ page }) => {
    await openScenario(page, 'horse_crush', 'learning');

    const result = await page.evaluate(() => {
      const loop = window.EMSCodeSimLearningLoop;
      const horse = loop.activeTrack();
      const asthmaFirst = loop.COACHING_BY_CASE.asthma[0];
      return {
        horseId: horse?.id || '',
        horsePrompt: horse?.hints?.[1]?.prompt || '',
        asthmaPrompt: asthmaFirst?.hints?.[1]?.prompt || '',
        horseWhy: horse?.hints?.[1]?.why || ''
      };
    });

    expect(result.horsePrompt.toLowerCase()).toMatch(/trauma|life threat|hip|scene/);
    expect(result.asthmaPrompt.toLowerCase()).toMatch(/breathing|dyspnea|life threat/);
    expect(result.horsePrompt).not.toEqual(result.asthmaPrompt);
    expect(result.horseWhy.toLowerCase()).toMatch(/abc|scene|bleeding|threat/);
  });
});
