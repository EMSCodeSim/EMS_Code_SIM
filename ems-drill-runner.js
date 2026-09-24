'use strict';

(function () {
  const engine = new EmsDrillEngine({ root: 'drillApp', dataUrl: '/data/ems-drills.json' });
  const launch = EmsDrillRoadmap.parseLaunchParams();
  const params = new URLSearchParams(location.search);
  const requestedId = launch.drillId || params.get('id') || params.get('drill') || '';

  function showError(message) {
    const root = document.getElementById('drillApp');
    root.innerHTML = `<div class="ems-error-banner" role="alert"><p>${message}</p><p><a href="/ems-drills.html">Return to EMS Drills</a></p></div>`;
  }

  function setSeo(drill) {
    if (!drill) return;
    const title = `${drill.title} | EMS Drills | EMSCodeSim`;
    document.title = title;
    const description = drill.seoDescription || drill.summary;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', `https://emscodesim.com/ems-drill.html?id=${encodeURIComponent(drill.id)}`);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
  }

  async function boot() {
    await EmsDrillRoadmap.flushPending();
    await engine.loadCatalog();

    if (!requestedId) {
      location.replace('/ems-drills.html');
      return;
    }

    const drill = engine.getDrill(requestedId);
    if (!drill) {
      showError('That EMS drill could not be found.');
      return;
    }
    setSeo(drill);

    let roadmapContext = null;
    if (launch.fromRoadmap || launch.token) {
      const session = await EmsDrillRoadmap.validateSession(launch.token, drill.id);
      if (!session.ok) {
        showError(session.message || 'Invalid or expired Responder Roadmap launch token.');
        return;
      }
      if (!session.standalone) {
        if (session.session.drillId && session.session.drillId !== drill.id) {
          showError('This launch token is for a different drill than the one requested.');
          return;
        }
        roadmapContext = session.session;
      } else if (launch.source === 'roadmap' && !launch.token) {
        // Soft Roadmap context without secure completion credit.
        roadmapContext = {
          assignmentId: launch.assignmentId || null,
          returnUrl: launch.returnUrl || null,
          softLaunch: true
        };
      }
    }

    engine.onComplete = async (completion) => {
      const receipt = await EmsDrillRoadmap.syncCompletion(completion, {
        token: launch.token,
        returnUrl: roadmapContext?.returnUrl || launch.returnUrl,
        session: roadmapContext
      });
      document.getElementById('drillApp').hidden = true;
      const receiptRoot = document.getElementById('drillReceipt');
      receiptRoot.hidden = false;
      EmsDrillRoadmap.renderReceipt(receiptRoot, receipt);
      receiptRoot.querySelector('[data-action="restart"]')?.addEventListener('click', () => {
        location.href = `/ems-drill.html?id=${encodeURIComponent(drill.id)}`;
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return receipt;
    };

    engine.start(drill.id, roadmapContext && !roadmapContext.softLaunch ? roadmapContext : (roadmapContext?.softLaunch ? roadmapContext : null));

    // Prefer clean share URL without leaking soft params when standalone.
    if (!launch.token && drill.id && !params.get('token')) {
      history.replaceState({}, '', `/ems-drill.html?id=${encodeURIComponent(drill.id)}`);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch((error) => {
      console.error(error);
      showError('The drill could not start. Check your connection and try again.');
    });
  });
})();
