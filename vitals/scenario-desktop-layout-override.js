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
      .patient-desktop-workspace,
      .scenario-hero-layout{
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
        box-sizing:border-box!important;
      }

      .scenario-hero-layout{
        display:grid!important;
        grid-template-columns:minmax(220px,.80fr) minmax(360px,1.35fr) minmax(280px,.90fr)!important;
        gap:14px!important;
        align-items:start!important;
      }

      .scenario-hero-layout>.patient-stage{
        grid-column:1!important;
        min-width:0!important;
        width:auto!important;
        max-width:none!important;
      }

      .scenario-hero-layout>#clinicalInteractionColumn{
        grid-column:2!important;
        min-width:0!important;
        width:auto!important;
        max-width:none!important;
      }

      .scenario-hero-layout>.patient-control-column{
        grid-column:3!important;
        min-width:0!important;
        width:auto!important;
        max-width:none!important;
      }

      #desktopPatientHub{
        min-width:0!important;
        width:100%!important;
        box-sizing:border-box!important;
      }

      #desktopEncounterStream,
      #patientCommunicationStage,
      .patient-control-column .vp-panel,
      .patient-control-column .action-sheet{
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }
    }

    @media (min-width:1500px){
      .scenario-hero-layout{
        grid-template-columns:minmax(250px,.82fr) minmax(520px,1.55fr) minmax(320px,.90fr)!important;
      }
    }
  `;
  document.head.appendChild(style);
})();
