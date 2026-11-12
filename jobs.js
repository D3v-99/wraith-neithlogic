// Wraith job board. Reads the open roles the public groups have been sent
// from api.neithlogic.com/public/jobs and filters them in the browser.
// Everything from the feed goes into the page as text, never as HTML.
(function () {
  'use strict';

  var API = 'https://api.neithlogic.com/public/jobs';
  var CLICK = 'https://api.neithlogic.com/public/click';
  var PAGE = 40;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var state = { field: 'all', region: 'all', q: '', shown: PAGE };
  var data = null;

  var $ = function (id) { return document.getElementById(id); };
  var tabs = $('field-tabs'), list = $('job-list'), count = $('board-count'), more = $('board-more'), q = $('board-q');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function safeUrl(u) {
    try { var x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null; } catch (e) { return null; }
  }
  function nairobiDay(d) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  function short(iso) {
    var d = new Date(iso);
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'numeric' }).formatToParts(d);
    var day = '', mon = 0;
    p.forEach(function (x) { if (x.type === 'day') day = x.value; if (x.type === 'month') mon = Number(x.value) - 1; });
    return day + ' ' + MON[mon];
  }
  function ago(iso) {
    var days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
    return days === 0 ? 'Posted today' : days === 1 ? 'Posted yesterday' : 'Posted ' + days + ' days ago';
  }

  // ── state in the URL, so a filtered view can be shared ──
  function readHash() {
    var h = new URLSearchParams(location.hash.slice(1));
    state.field = h.get('field') || 'all';
    state.region = h.get('where') || 'all';
    state.q = h.get('q') || '';
    q.value = state.q;
  }
  function writeHash() {
    var h = new URLSearchParams();
    if (state.field !== 'all') h.set('field', state.field);
    if (state.region !== 'all') h.set('where', state.region);
    if (state.q) h.set('q', state.q);
    var s = h.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname);
  }

  function fieldById(id) {
    for (var i = 0; i < data.fields.length; i++) if (data.fields[i].id === id) return data.fields[i];
    return null;
  }

  function renderTabs() {
    var total = data.jobs.length;
    tabs.textContent = '';
    var all = el('button', 'field-tab', 'All');
    all.type = 'button'; all.dataset.field = 'all';
    all.appendChild(el('span', 'field-count', String(total)));
    tabs.appendChild(all);
    data.fields.forEach(function (f) {
      if (!f.count) return;
      var b = el('button', 'field-tab', f.name);
      b.type = 'button'; b.dataset.field = f.id;
      b.appendChild(el('span', 'field-count', String(f.count)));
      tabs.appendChild(b);
    });
    Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.field === state.field)); });
  }

  function matches(j) {
    if (state.field !== 'all' && j.fields.indexOf(state.field) === -1) return false;
    if (state.region !== 'all' && j.region !== state.region) return false;
    if (state.q) {
      var hay = (j.title + ' ' + (j.company || '') + ' ' + (j.location || '')).toLowerCase();
      var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) === -1) return false;
    }
    return true;
  }

  function row(j, today) {
    var url = safeUrl(j.url);
    var li = el('li', 'job-row');
    var copy = el('div', 'job-copy');

    var title = url ? el('a', 'job-title', j.title) : el('span', 'job-title', j.title);
    if (url) {
      title.href = url; title.target = '_blank'; title.rel = 'noopener noreferrer nofollow';
      // Counts the tap for the admin dashboard; the link itself goes straight to the employer.
      if (j.db && j.id) title.addEventListener('click', function () {
        try { fetch(CLICK + '?d=' + encodeURIComponent(j.db) + '&id=' + encodeURIComponent(j.id), { keepalive: true, mode: 'no-cors' }); } catch (e) { /* never block the link */ }
      });
    }
    copy.appendChild(title);

    var where = j.region === 'international' ? 'Remote' : (j.location || 'Kenya');
    copy.appendChild(el('span', 'job-meta', [j.company, where].filter(Boolean).join(' · ')));

    var tags = el('span', 'job-tags');
    if (j.sentAt && nairobiDay(new Date(j.sentAt)) === today) tags.appendChild(el('span', 'tag live', 'New today'));
    (state.field === 'all' ? j.fields : [state.field]).forEach(function (id) {
      var f = fieldById(id); if (f && state.field === 'all') tags.appendChild(el('span', 'tag', f.name));
    });
    (j.sections || []).slice(0, 1).forEach(function (s) { if (state.field !== 'all') tags.appendChild(el('span', 'tag', s)); });
    if (tags.children.length) copy.appendChild(tags);
    li.appendChild(copy);

    var when = el('div', 'job-when');
    if (j.closesAt) when.appendChild(el('span', 'job-closes', 'Closes ' + short(j.closesAt)));
    if (j.postedAt) when.appendChild(el('span', null, ago(j.postedAt)));
    li.appendChild(when);
    return li;
  }

  function render() {
    var today = nairobiDay(new Date());
    var hits = data.jobs.filter(matches);
    list.textContent = '';
    hits.slice(0, state.shown).forEach(function (j) { list.appendChild(row(j, today)); });

    if (!hits.length) {
      var empty = el('li', 'job-empty', 'No open roles match that. Try another field, or clear the search.');
      list.appendChild(empty);
    }
    count.textContent = hits.length === 1 ? '1 open role' : hits.length + ' open roles';
    more.hidden = hits.length <= state.shown;
    more.textContent = 'Show more roles (' + (hits.length - Math.min(hits.length, state.shown)) + ' more)';

    // The call to action follows the field being browsed.
    var f = state.field !== 'all' ? fieldById(state.field) : null;
    $('board-cta-title').textContent = f ? 'Get new ' + f.name.toLowerCase() + ' roles every morning' : 'Get new roles every morning';
    var link = $('board-cta-link');
    link.href = f && f.invite ? f.invite : '/#groups';
    link.textContent = f ? 'Join the group' : 'Join a group';
    if (f && f.invite) { link.target = '_blank'; link.rel = 'noopener noreferrer'; } else { link.removeAttribute('target'); link.removeAttribute('rel'); }

    Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.field === state.field)); });
    Array.prototype.forEach.call(document.querySelectorAll('.segmented button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.region === state.region)); });
  }

  // ── events ──
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-field]'); if (!b || !data) return;
    state.field = b.dataset.field; state.shown = PAGE; writeHash(); render();
  });
  document.querySelector('.segmented').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-region]'); if (!b || !data) return;
    state.region = b.dataset.region; state.shown = PAGE; writeHash(); render();
  });
  var t;
  q.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () { state.q = q.value.trim().slice(0, 80); state.shown = PAGE; writeHash(); if (data) render(); }, 150);
  });
  more.addEventListener('click', function () { state.shown += PAGE; render(); });

  readHash();
  fetch(API, { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      data = d;
      if (state.field !== 'all' && !fieldById(state.field)) state.field = 'all';
      renderTabs(); render();
    })
    .catch(function () {
      list.textContent = '';
      count.textContent = '';
      list.appendChild(el('li', 'job-empty', 'The job board could not load right now. The groups still receive every role each morning.'));
    });
})();
