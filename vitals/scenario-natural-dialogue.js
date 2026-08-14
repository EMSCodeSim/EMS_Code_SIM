(() => {
  'use strict';

  const VERSION = '2026.08.14.5';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').trim().toLowerCase();
  const $ = id => document.getElementById(id);
  const record = () => {
    try { return window.EMSCodeSimScenarioSession?.sync?.() || window.EMSCodeSimPatientRecord?.active?.() || null; }
    catch (_) { return null; }
  };
  const horse = () => requested === 'horse_crush' || requested === 'horse-crush' || record()?.scenarioId === 'horse_crush' || record()?.id === 'horse_crush';
  if (!horse()) return;

  // Stable, fully synthetic scenario biography. Do not source these details from a real patient.
  const PROFILE = Object.freeze({
    firstName:'Linda',
    age:64,
    spouse:'Ray',
    home:'a small place outside town',
    occupation:'retired school office manager',
    family:'two grown daughters',
    horses:'three horses; the bay mare is named Rosie',
    contact:'her husband Ray',
    routine:'usually handles the evening feeding herself'
  });

  const askCounts = new Map();
  let pendingQuestion = '';
  let pendingCount = 0;
  let rewriteTimer = 0;
  let customQuestion = '';

  const ones = ['', 'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function under100(n) {
    n = Math.round(Number(n));
    if (n < 20) return ones[n] || String(n);
    const t = Math.floor(n / 10), o = n % 10;
    return `${tens[t]}${o ? `-${ones[o]}` : ''}`;
  }
  function bpNumber(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return String(value);
    if (n < 100) return under100(n);
    if (n < 200) {
      const r = n - 100;
      if (!r) return 'one hundred';
      if (r < 10) return `one oh ${ones[r]}`;
      return `one ${under100(r)}`;
    }
    if (n < 300) {
      const h = Math.floor(n / 100), r = n % 100;
      if (!r) return `${ones[h]} hundred`;
      if (r < 10) return `${ones[h]} oh ${ones[r]}`;
      return `${ones[h]} ${under100(r)}`;
    }
    return String(n);
  }

  function normalizeForSpeech(value) {
    let text = String(value || '').replace(/[“”]/g, '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    text = text
      .replace(/\b(\d{1,2})\s*\/\s*10\b/g, (_, n) => `${under100(Number(n))} out of ten`)
      .replace(/\b(\d{2,3})\s*\/\s*(\d{2,3})\b/g, (_, a, b) => `${bpNumber(a)} over ${bpNumber(b)}`)
      .replace(/(\d{2,3})\.(\d)\s*°?F\b/gi, (_, a, b) => `${bpNumber(a)} point ${under100(Number(b))} degrees Fahrenheit`)
      .replace(/\bSpO[₂2]\b/gi, 'oxygen saturation')
      .replace(/\bA\s*&\s*O\s*[x×]\s*4\b/gi, 'alert and oriented times four')
      .replace(/\bCSM\b/g, 'circulation, sensation, and movement')
      .replace(/\bBP\b/g, 'blood pressure')
      .replace(/\bHR\b/g, 'heart rate')
      .replace(/\bRR\b/g, 'respiratory rate')
      .replace(/\bbpm\b/gi, 'beats per minute')
      .replace(/\bmmHg\b/gi, 'millimeters of mercury')
      .replace(/\bmg\/dL\b/gi, 'milligrams per deciliter')
      .replace(/\bw\/o\b/gi, 'without')
      .replace(/\bw\//gi, 'with ')
      .replace(/&/g, ' and ')
      .replace(/\+/g, ' plus ')
      .replace(/\b(x|×)\s*(\d+)\b/gi, 'times $2')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  }

  function installGlobalSpeechNormalizer() {
    const synth = window.speechSynthesis;
    if (!synth || synth.__emsNaturalSpeechInstalled) return;
    const original = synth.speak?.bind(synth);
    if (!original) return;
    try {
      synth.speak = utterance => {
        const sourceText = String(utterance?.text || '');
        const spoken = normalizeForSpeech(sourceText);
        if (!spoken || spoken === sourceText || !window.SpeechSynthesisUtterance) return original(utterance);
        const clone = new SpeechSynthesisUtterance(spoken);
        clone.voice = utterance.voice || null;
        clone.lang = utterance.lang || 'en-US';
        clone.rate = utterance.rate || 1;
        clone.pitch = utterance.pitch || 1;
        clone.volume = utterance.volume ?? 1;
        clone.onstart = event => utterance.onstart?.(event);
        clone.onend = event => utterance.onend?.(event);
        clone.onerror = event => utterance.onerror?.(event);
        clone.onpause = event => utterance.onpause?.(event);
        clone.onresume = event => utterance.onresume?.(event);
        clone.onmark = event => utterance.onmark?.(event);
        clone.onboundary = event => utterance.onboundary?.(event);
        return original(clone);
      };
      synth.__emsNaturalSpeechInstalled = true;
    } catch (_) {}
  }

  function cleanRepeatLead(text) {
    return String(text || '')
      .replace(/^\s*(like i said|as i said|i already told you|like i told you)[,.:;\s-]*/i, '')
      .replace(/^\s*(again|yes, again)[,.:;\s-]*/i, '')
      .trim();
  }

  function personalAnswer(question) {
    const q = String(question || '').toLowerCase();
    if (/what(?:'s| is) your name|your name/.test(q)) return `Linda. Linda is fine.`;
    if (/date of birth|birth year|birthday|when.*born|year.*born/.test(q)) return 'I was born in 1962.';
    if (/how old|your age|approximate age/.test(q)) return `I’m ${PROFILE.age}.`;
    if (/where do you live|home address|your address|live alone/.test(q)) return `I live at ${PROFILE.home} with my husband, ${PROFILE.spouse}.`;
    if (/married|husband|wife|spouse|family/.test(q)) return `I’m married. My husband is ${PROFILE.spouse}, and we have ${PROFILE.family}.`;
    if (/emergency contact|who should we call|call anyone|contact/.test(q)) return `Please call my husband, ${PROFILE.spouse}. He should be nearby.`;
    if (/what do you do|occupation|work|job|retired/.test(q)) return `I’m retired now. I used to work as a ${PROFILE.occupation}.`;
    if (/horse|horses|animals|mare/.test(q) && !/what happened|event|injur/.test(q)) return `We have ${PROFILE.horses}. I’ve been around horses for years. This was just a bad accident.`;
    return '';
  }

  function specificRepeatVariant(question, base, count) {
    const q = String(question || '').toLowerCase();
    const text = cleanRepeatLead(base);
    const personal = personalAnswer(question);
    if (personal) {
      const variants = [personal,
        personal.replace(/^I’m /, 'I am ').replace(/^Linda\./, 'My name is Linda.'),
        personal.replace(/\. /g, '. Yeah, ').replace('Please call', 'You can call')];
      return variants[(count - 1) % variants.length];
    }
    if (/allerg/.test(q)) return ['No medication allergies that I know of.','No, I don’t have any known medication allergies.','Not that I’m aware of. I’ve never been told I’m allergic to a medicine.'][(count - 2) % 3];
    if (/blood thinner|anticoag/.test(q)) return ['No, I don’t take a blood thinner.','No blood thinners.','No. Nothing like Eliquis, Xarelto, or warfarin.'][(count - 2) % 3];
    if (/medication|medicine|meds/.test(q)) return ['The only regular medicine I take is Wellbutrin.','I take Wellbutrin. That’s my regular prescription.','Just Wellbutrin on a regular basis.'][(count - 2) % 3];
    if (/last.*eat|last.*drink|oral intake|when did you eat/.test(q)) return ['I ate earlier today.','It’s been a few hours since I ate.','I had something to eat earlier, before I came out to the horses.'][(count - 2) % 3];
    if (/what happened|how.*happen|event|mechanism/.test(q)) return ['I got squeezed between two horses and they knocked me down.','The horses crowded together, I got caught between them, and then I went down.','I was between two horses when they pressed into me. I fell right after that.'][(count - 2) % 3];
    if (/pain|hurt|where does it hurt/.test(q)) return [`It’s my left hip. It’s about ${window.EMSCodeSimScenarioRuntime?.horseClinicalState?.(record())?.painScore || 8} out of ten right now.`,`The worst pain is right in my left hip. Moving it makes it much sharper.`,`Mostly the left hip, and it shoots down the leg when it moves.`][(count - 2) % 3];
    if (/numb|tingl|feel.*foot|sensation/.test(q)) return ['No numbness or tingling. I can feel my foot.','My foot feels normal. No pins and needles.','I can feel you touching my foot. Nothing feels numb.'][(count - 2) % 3];
    if (/head|knock.*out|loss of consciousness|passed out/.test(q)) return ['No, I didn’t hit my head and I never blacked out.','I stayed awake the whole time. I don’t remember hitting my head.','No loss of consciousness. I remember the whole thing.'][(count - 2) % 3];
    if (!text) return base;
    const openers = ['No, that hasn’t changed. ', 'Sure. ', 'Yeah. ', 'The answer is still the same: '];
    return `${openers[(count - 2) % openers.length]}${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }

  function patientVoiceSpeak(text) {
    const natural = normalizeForSpeech(text);
    if (!natural) return;
    try {
      window.speechSynthesis?.cancel?.();
      if (window.EMSCodeSimPatientConversation?.speakPatient) {
        window.EMSCodeSimPatientConversation.speakPatient(natural);
        return;
      }
      if (!window.SpeechSynthesisUtterance || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(natural);
      u.rate = .96; u.pitch = 1.04; u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function applyHistoryVariation() {
    clearTimeout(rewriteTimer);
    rewriteTimer = window.setTimeout(() => {
      const response = $('historyResponseText');
      const questionNode = $('historyResponseQuestion');
      const question = pendingQuestion || customQuestion || String(questionNode?.textContent || '').trim();
      if (!response || !question) return;
      const base = cleanRepeatLead(response.textContent || '');
      const personal = personalAnswer(question);
      let next = base;
      if (personal) next = specificRepeatVariant(question, personal, Math.max(1, pendingCount));
      else if (pendingCount > 1) next = specificRepeatVariant(question, base, pendingCount);
      if (!next) return;
      if (response.textContent.trim() !== next) response.textContent = next;
      if (personal || pendingCount > 1) patientVoiceSpeak(next);
      pendingQuestion = '';
      customQuestion = '';
    }, 70);
  }

  function installHistoryMemory() {
    document.addEventListener('click', event => {
      const historyButton = event.target.closest?.('.history-question-button');
      if (historyButton) {
        const question = String(historyButton.querySelector('span')?.textContent || historyButton.textContent || '').replace(/Ask again|Ask$/i,'').trim();
        if (question) {
          const count = (askCounts.get(question) || 0) + 1;
          askCounts.set(question, count);
          pendingQuestion = question;
          pendingCount = count;
          applyHistoryVariation();
        }
      }
      if (event.target.closest?.('#askHistoryCustom,#horseHistoryCustomAsk')) {
        const input = $('horseHistoryCustomText') || $('historyCustomInput');
        const question = String(input?.value || '').trim();
        if (question) {
          const key = `custom:${question.toLowerCase()}`;
          const count = (askCounts.get(key) || 0) + 1;
          askCounts.set(key, count);
          customQuestion = question;
          pendingQuestion = question;
          pendingCount = count;
          applyHistoryVariation();
        }
      }
    }, true);

    const panel = $('historyPanel');
    if (panel) {
      new MutationObserver(mutations => {
        if (mutations.some(m => m.target?.id === 'historyResponseText' || m.target?.closest?.('#historyResponseText'))) applyHistoryVariation();
      }).observe(panel, { subtree:true, childList:true, characterData:true });
    }
  }

  function exposeProfile() {
    window.EMSCodeSimSyntheticPatientProfile = PROFILE;
  }

  function start() {
    exposeProfile();
    installGlobalSpeechNormalizer();
    installHistoryMemory();
  }

  window.EMSCodeSimNaturalDialogue = Object.freeze({ version:VERSION, profile:PROFILE, normalizeForSpeech, personalAnswer });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
