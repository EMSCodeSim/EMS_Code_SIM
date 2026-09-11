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

  // Site-wide share helper for tools, simulators, and hubs.
  if (!document.querySelector('script[src*="share-tool.js"]')) {
    const share = document.createElement('script');
    share.src = '/scripts/share-tool.js';
    document.head.appendChild(share);
  }
})();
