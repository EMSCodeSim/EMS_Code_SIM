(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const raw = String(params.get('case') || window.EMSCodeSimScenarioSession?.requestedCaseId?.() || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '').replace(/-/g,'_').toLowerCase();
  if (!['asthma','respiratory'].includes(raw)) return;

  if (document.getElementById('scenarioDesktopLayoutOverride')) return;
  const style = document.createElement('style');
  style.id = 'scenarioDesktopLayoutOverride';
  style.textContent = `
    @media (min-width:980px){
      body.asthma-video-only .patient-desktop-workspace,
      body.asthma-video-only .scenario-hero-layout{
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
        box-sizing:border-box!important;
      }

      body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .scenario-hero-layout,
      body.asthma-video-only .scenario-hero-layout{
        display:grid!important;
        grid-template-columns:minmax(220px,.72fr) minmax(0,1.85fr) minmax(280px,.82fr)!important;
        gap:14px!important;
        align-items:start!important;
      }

      body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .scenario-hero-layout>.patient-stage,
      body.asthma-video-only .scenario-hero-layout>.patient-stage{
        grid-column:1!important;
        min-width:0!important;
        width:auto!important;
        max-width:none!important;
      }

      body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #clinicalInteractionColumn,
      body.asthma-video-only #clinicalInteractionColumn{
        grid-column:2!important;
        min-width:0!important;
        width:auto!important;
        max-width:none!important;
      }

      body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .patient-control-column,
      body.asthma-video-only .patient-control-column{
        grid-column:3!important;
        min-width:0!important;
        width:auto!important;
        max-width:none!important;
      }

      body.asthma-video-only #desktopPatientHub{
        min-width:0!important;
        width:100%!important;
        box-sizing:border-box!important;
      }

      body.asthma-video-only #desktopEncounterStream,
      body.asthma-video-only #patientCommunicationStage,
      body.asthma-video-only .patient-control-column .vp-panel,
      body.asthma-video-only .patient-control-column .action-sheet{
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }

      @media (min-width:1500px){
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .scenario-hero-layout,
        body.asthma-video-only .scenario-hero-layout{
          grid-template-columns:minmax(250px,.72fr) minmax(0,2fr) minmax(320px,.84fr)!important;
        }
      }
    }
  `;
  document.head.appendChild(style);
})();
