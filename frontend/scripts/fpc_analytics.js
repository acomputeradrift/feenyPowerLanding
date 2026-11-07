/*
 * First-party, cookieless page analytics for the homeowner landing pages.
 * No cookies, no localStorage, no third parties. The session id lives in
 * sessionStorage (one tab visit). Do Not Track / Global Privacy Control → nothing is sent.
 *
 * Exposes window.fpcTrack(eventName, props?) and window.fpcSessionId.
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/analytics/event';
  var script = document.currentScript;
  var pageLocation = (script && script.getAttribute('data-location')) || '';
  var pageBrand = (script && script.getAttribute('data-brand')) || '';

  var optedOut = navigator.doNotTrack === '1'
    || window.doNotTrack === '1'
    || navigator.globalPrivacyControl === true;

  if (optedOut || !pageLocation || !pageBrand) {
    window.fpcSessionId = null;
    window.fpcTrack = function () {};
    return;
  }

  function randomId() {
    var bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var out = '';
    for (var j = 0; j < bytes.length; j++) out += ('0' + bytes[j].toString(16)).slice(-2);
    return out;
  }

  var sessionId;
  try {
    sessionId = sessionStorage.getItem('fpc_sid');
    if (!sessionId || !/^[a-f0-9]{32}$/.test(sessionId)) {
      sessionId = randomId();
      sessionStorage.setItem('fpc_sid', sessionId);
    }
  } catch (e) {
    sessionId = randomId();
  }
  window.fpcSessionId = sessionId;

  function send(payload) {
    payload.sid = sessionId;
    payload.loc = pageLocation;
    payload.brand = pageBrand;
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) { /* fall through to fetch */ }
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'text/plain' },
        keepalive: true,
        credentials: 'omit'
      }).catch(function () {});
    } catch (e) { /* analytics must never break the page */ }
  }

  window.fpcTrack = function (eventName, props) {
    if (typeof eventName !== 'string') return;
    var payload = { n: eventName };
    if (props && typeof props === 'object') payload.props = props;
    send(payload);
  };

  // Pageview
  var params = new URLSearchParams(window.location.search);
  var utm = {};
  ['source', 'medium', 'campaign', 'term', 'content'].forEach(function (key) {
    var v = params.get('utm_' + key);
    if (v) utm[key] = v.slice(0, 100);
  });
  var referrer = '';
  try {
    if (document.referrer) {
      var ref = new URL(document.referrer);
      referrer = ref.origin + ref.pathname;
    }
  } catch (e) { referrer = ''; }

  send({
    n: 'pageview',
    ref: referrer,
    utm: utm,
    gclid: params.has('gclid') || params.has('gbraid') || params.has('wbraid'),
    msclkid: params.has('msclkid'),
    sw: window.screen ? window.screen.width : 0
  });

  // Engagement: visible + focused time and max scroll depth, flushed as deltas
  // whenever the page is hidden or unloaded.
  var engagedMs = 0;
  var activeSince = null;
  var maxScroll = 0;
  var reportedScroll = -1;

  function isActive() {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  function updateTimer() {
    var now = Date.now();
    if (activeSince !== null) {
      engagedMs += now - activeSince;
      activeSince = null;
    }
    if (isActive()) activeSince = now;
  }

  function measureScroll() {
    var doc = document.documentElement;
    var height = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    var seen = (window.scrollY || doc.scrollTop || 0) + window.innerHeight;
    var pct = height > 0 ? Math.min(100, Math.round((seen / height) * 100)) : 100;
    if (pct > maxScroll) maxScroll = pct;
  }

  function flush() {
    updateTimer();
    measureScroll();
    var secs = Math.round(engagedMs / 1000);
    if (secs <= 0 && maxScroll === reportedScroll) return;
    send({ n: 'engagement', secs: secs, scroll: maxScroll });
    engagedMs -= secs * 1000;
    reportedScroll = maxScroll;
  }

  var scrollTicking = false;
  window.addEventListener('scroll', function () {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      measureScroll();
      scrollTicking = false;
    });
  }, { passive: true });

  window.addEventListener('focus', updateTimer);
  window.addEventListener('blur', updateTimer);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
    else updateTimer();
  });
  window.addEventListener('pagehide', flush);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { measureScroll(); updateTimer(); });
  } else {
    measureScroll();
    updateTimer();
  }
})();
