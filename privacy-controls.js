(function () {
  'use strict';

  const measurementId = 'G-5QLPK4025C';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: true
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.appendChild(script);

  // Product boundary: EMSCodeSim owns free learning, practice, and development
  // guidance. Responder Roadmap owns the durable personal/department record.
  document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    const isPlanner = path.endsWith('/ems-career-planner.html');
    const isProgress = path.endsWith('/ems-progress-tracker.html');
    if (!isPlanner && !isProgress) return;

    const notice = document.createElement('section');
    notice.setAttribute('aria-label', 'EMSCodeSim and Responder Roadmap');
    notice.style.cssText = 'max-width:1100px;margin:20px auto;padding:18px 20px;border:1px solid #b7d8e8;border-radius:16px;background:#eef7fb;color:#081626;box-sizing:border-box';
    notice.innerHTML = '<strong style="display:block;margin-bottom:6px">Practice here. Keep your professional record in Responder Roadmap.</strong>' +
      '<span>EMSCodeSim is for free learning, practice, self-assessment, and career-development guidance. Use Responder Roadmap for durable certifications, expiration dates, verified experience, official task books, evaluations, and records you intentionally share with your department.</span> ' +
      '<a href="https://responderroadmap.com/" style="font-weight:800;color:#075d87;white-space:nowrap">Open Responder Roadmap →</a>';

    const main = document.querySelector('main');
    if (main && main.parentNode) main.parentNode.insertBefore(notice, main);

    if (isPlanner) {
      document.title = 'EMS Career Pathway Planner | EMSCodeSim';
      const heroEyebrow = document.querySelector('.career-planner-hero .eyebrow');
      const heroTitle = document.querySelector('.career-planner-hero h1');
      const heroCopy = document.querySelector('.career-planner-hero h1 + p');
      if (heroEyebrow) heroEyebrow.textContent = 'Free EMS career planning and development guidance';
      if (heroTitle) heroTitle.textContent = 'Plan what to learn and practice next';
      if (heroCopy) heroCopy.textContent = 'Choose a career goal, explore state-aware pathways, identify development gaps, and build a practical learning plan. Keep your durable professional record in Responder Roadmap.';

      const labels = document.querySelectorAll('.planner-stat span');
      if (labels[0]) labels[0].textContent = 'Planning credentials';
      if (labels[1]) labels[1].textContent = 'Dates to review';
      const expirationHeading = Array.from(document.querySelectorAll('h2')).find(function (el) { return el.textContent.trim() === 'Upcoming expiration dates'; });
      if (expirationHeading) expirationHeading.textContent = 'Dates to review';
      const careerLogTab = document.querySelector('[data-tab="careerlog"]');
      const credentialsTab = document.querySelector('[data-tab="credentials"]');
      const reportsTab = document.querySelector('[data-tab="reports"]');
      if (careerLogTab) careerLogTab.textContent = 'Development notes';
      if (credentialsTab) credentialsTab.textContent = 'Planning checklist';
      if (reportsTab) reportsTab.textContent = 'Planning report & backup';
    }

    if (isProgress) {
      document.title = 'EMS Skill Practice Tracker | EMSCodeSim';
      const heroEyebrow = document.querySelector('.tracker-hero .eyebrow');
      const heroTitle = document.querySelector('.tracker-hero h1');
      const heroCopy = document.querySelector('.tracker-hero h1 + p');
      if (heroEyebrow) heroEyebrow.textContent = 'Private learning and practice tool';
      if (heroTitle) heroTitle.textContent = 'EMS Skill Practice Tracker';
      if (heroCopy) heroCopy.textContent = 'Use broad, non-identifying entries to reflect on skill repetitions, practice patterns, and learning goals. This is not your official experience or department record.';
    }
  });
})();
