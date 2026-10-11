/* SIŁECZKOMAT — logika aplikacji. Dane zapisywane wyłącznie na tym urządzeniu. */
(function () {
  'use strict';
  var SZ = window.SZ, FIG = window.SZFIG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var view = $('#view');
  var EXI = {}; SZ.EX.forEach(function (e) { EXI[e.id] = e; });
  var DAY = 864e5;
  var nf = function (n, d) { return Number(n).toFixed(d || 0).replace('.', ','); };
  var kg = function (n) { return (Math.round(n * 10) / 10).toString().replace('.', ',') + ' kg'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  var WD = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
  var WDL = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
  var MON = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  var MONF = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  var dshort = function (t) { var d = new Date(t); return d.getDate() + ' ' + MON[d.getMonth()]; };
  var dayKey = function (t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var weekday = function (t) { return (new Date(t || Date.now()).getDay() + 6) % 7; };
  var ago = function (t) { var n = Math.round((Date.now() - t) / DAY); return n <= 0 ? 'dziś' : n === 1 ? 'wczoraj' : n + ' dni temu'; };
  var ICON = {
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
    skip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l8 6-8 6V6ZM17 6v12"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7V5Z"/></svg>',
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10l4 4v12H5V4Z"/><path d="M8 11h8M8 15h6"/></svg>'
  };

  /* ================= PAMIĘĆ ================= */
  var DB_NAME = 'silczkomat', KEY = 'silczkomat-state', dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!('indexedDB' in window)) return rej();
      var r = indexedDB.open(DB_NAME, 2);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function idbReq(store, mode, fn) {
    return idb().then(function (db) { return new Promise(function (res) { var t = db.transaction(store, mode), q = fn(t.objectStore(store)); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { res(null); }; }); }).catch(function () { return null; });
  }
  var S = null;
  function mondayOf(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - weekday(t)); return d.getTime(); }
  function defaultSchedule(days) {
    var split = SPLITS[days] || SPLITS[3], slots = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] }[days] || [0, 2, 4];
    var s = ['', '', '', '', '', '', '']; slots.forEach(function (d, i) { s[d] = split[i]; }); return s;
  }
  function fresh() {
    var eq = {}; SZ.EQUIPMENT.forEach(function (e) { eq[e.id] = true; });
    return { v: 2, onboarded: false, profile: { name: '', age: 30, height: 178, weight: 80, level: 1, days: 3, minutes: 60 },
      goal: { type: 'masa', targets: {}, deadlines: {}, starts: {} }, equipment: eq, plates: [25, 20, 15, 10, 5, 2.5, 1.25], bar: 20,
      pain: {}, painLog: [], schedule: defaultSchedule(3), custom: {}, overrides: {}, cycleStart: mondayOf(Date.now()), method: 'double',
      sessions: [], prs: {}, notes: {}, readiness: null, measures: [], stretchLog: [], focus: null, extraDay: null,
      active: null, prDraft: null, peak: null, settings: { theme: 'dark', sound: true, wake: true }, demo: false, savedAt: 0 };
  }
  var OLD = { przysiad: 'squat', 'przysiad-bw': 'squat-bw', bulgarski: 'bulgarian', wykroki: 'lunge-db', martwy: 'deadlift', mostek: 'bridge', legcurl: 'legcurl-seat', lydki: 'calf-stand', wyciskanie: 'bench', 'wyciskanie-db': 'bench-db', pompki: 'pushup', rozpietki: 'crossover-high', porecze: 'dip', bokiem: 'raise-side', odwrotne: 'raise-rear', wioslowanie: 'row-bar', 'wioslowanie-db': 'row-db', 'wioslowanie-wyciag': 'row-cable', 'wioslowanie-guma': 'row-band', podciaganie: 'pullup', sciaganie: 'pulldown', biceps: 'curl-bar', mlotkowe: 'curl-hammer', francuskie: 'french-db', deska: 'plank', spiecia: 'crunch', szrugsy: 'shrug-db' };
  function migrate(d) {
    var base = fresh();
    for (var k in base) if (!(k in d)) d[k] = base[k];
    if (Array.isArray(d.pain)) { var o = {}; d.pain.forEach(function (j) { o[j] = { lvl: 5, date: Date.now() }; }); d.pain = o; }
    var map = function (id) { return OLD[id] || id; };
    (d.sessions || []).forEach(function (s) { s.items.forEach(function (it) { it.ex = map(it.ex); }); s.items = s.items.filter(function (it) { return EXI[it.ex]; }); });
    var prs = {}; Object.keys(d.prs || {}).forEach(function (k2) { if (EXI[map(k2)]) prs[map(k2)] = d.prs[k2]; }); d.prs = prs;
    d.goal = d.goal || base.goal;
    ['targets', 'starts', 'deadlines'].forEach(function (f) { var o2 = {}; Object.keys(d.goal[f] || {}).forEach(function (k3) { o2[map(k3)] = d.goal[f][k3]; }); d.goal[f] = o2; });
    if (d.active && d.active.items) d.active.items = d.active.items.filter(function (it) { it.ex = map(it.ex); return EXI[it.ex]; });
    if (d.active && !d.active.items.length) d.active = null;
    if (!d.schedule || d.schedule.length !== 7) d.schedule = defaultSchedule(d.profile.days);
    d.equipment = Object.assign({}, base.equipment, d.equipment);
    d.settings = Object.assign({}, base.settings, d.settings);
    if (d.prDraft && d.prDraft.ex && !EXI[d.prDraft.ex]) d.prDraft = null;
    d.v = 2;
    return d;
  }
  var saveT;
  function save(now) {
    S.savedAt = Date.now();
    var json = JSON.stringify(S);
    try { localStorage.setItem(KEY, json); } catch (e) {}
    clearTimeout(saveT);
    var put = function () { return idbReq('kv', 'readwrite', function (st) { return st.put(json, 'state'); }); };
    if (now) return put();
    saveT = setTimeout(put, 250);
  }
  function load() {
    var ls = null; try { ls = localStorage.getItem(KEY); } catch (e) {}
    return idbReq('kv', 'readonly', function (st) { return st.get('state'); }).then(function (v) {
      var a = null, b = null;
      try { a = v ? JSON.parse(v) : null; } catch (e) {}
      try { b = ls ? JSON.parse(ls) : null; } catch (e) {}
      var best = a && b ? (a.savedAt >= b.savedAt ? a : b) : (a || b);
      return best ? migrate(best) : fresh();
    });
  }
  function askPersist() { return navigator.storage && navigator.storage.persist ? navigator.storage.persist().catch(function () { return false; }) : Promise.resolve(false); }

  /* ================= LOGIKA PLANU ================= */
  var GOALS = {
    sila: { name: 'Siła', desc: 'Mniej powtórzeń, większy ciężar, długie przerwy.', main: [5, 3, 5, 180], acc: [3, 6, 8, 90] },
    masa: { name: 'Masa mięśniowa', desc: 'Średni zakres powtórzeń, dużo objętości.', main: [4, 6, 8, 120], acc: [3, 8, 12, 75] },
    redukcja: { name: 'Redukcja', desc: 'Więcej powtórzeń, superserie, krótsze przerwy.', main: [3, 8, 10, 90], acc: [3, 12, 15, 45], ss: 1 },
    kondycja: { name: 'Kondycja', desc: 'Lżej i szybciej, superserie, tętno wysoko.', main: [3, 12, 15, 60], acc: [3, 15, 20, 30], ss: 1 },
    plecy: { name: 'Zdrowy kręgosłup', desc: 'Stabilizacja i kontrola, bez obciążania lędźwi.', main: [3, 10, 12, 75], acc: [3, 10, 12, 60] }
  };
  var TPL = {
    'Cały trening A': ['czworoglowe', 'klatka', 'plecy', 'dwuglowe', 'barki', 'brzuch', 'biceps', 'lydki'],
    'Cały trening B': ['dwuglowe', 'barki', 'plecy', 'czworoglowe', 'klatka', 'triceps', 'skosne', 'czworoboczny'],
    'Cały trening C': ['czworoglowe', 'plecy', 'klatka', 'posladki', 'barki', 'brzuch', 'triceps', 'biceps'],
    'Góra A': ['klatka', 'plecy', 'barki', 'plecy', 'klatka', 'triceps', 'biceps', 'czworoboczny'],
    'Dół A': ['czworoglowe', 'dwuglowe', 'posladki', 'czworoglowe', 'lydki', 'brzuch', 'przywodziciele', 'skosne'],
    'Góra B': ['barki', 'plecy', 'klatka', 'plecy', 'barki', 'biceps', 'triceps', 'brzuch'],
    'Dół B': ['dwuglowe', 'czworoglowe', 'posladki', 'dwuglowe', 'lydki', 'skosne', 'prostowniki', 'brzuch'],
    'Pchanie': ['klatka', 'barki', 'klatka', 'triceps', 'barki', 'triceps', 'brzuch', 'klatka'],
    'Przyciąganie': ['plecy', 'plecy', 'czworoboczny', 'biceps', 'prostowniki', 'biceps', 'przedramiona', 'barki'],
    'Nogi': ['czworoglowe', 'dwuglowe', 'posladki', 'czworoglowe', 'lydki', 'brzuch', 'dwuglowe', 'przywodziciele']
  };
  var SPLITS = { 2: ['Cały trening A', 'Cały trening B'], 3: ['Cały trening A', 'Cały trening B', 'Cały trening C'], 4: ['Góra A', 'Dół A', 'Góra B', 'Dół B'], 5: ['Pchanie', 'Przyciąganie', 'Nogi', 'Góra A', 'Dół A'], 6: ['Pchanie', 'Przyciąganie', 'Nogi', 'Góra B', 'Dół B', 'Cały trening C'] };
  var FOCUS = {
    klatka: ['klatka', 'klatka', 'klatka', 'klatka', 'triceps', 'barki', 'triceps', 'brzuch'],
    plecy: ['plecy', 'plecy', 'plecy', 'czworoboczny', 'prostowniki', 'biceps', 'biceps', 'brzuch'],
    nogi: ['czworoglowe', 'dwuglowe', 'posladki', 'czworoglowe', 'dwuglowe', 'lydki', 'przywodziciele', 'brzuch'],
    barki: ['barki', 'barki', 'barki', 'czworoboczny', 'barki', 'triceps', 'brzuch', 'barki'],
    ramiona: ['biceps', 'triceps', 'biceps', 'triceps', 'przedramiona', 'biceps', 'triceps', 'brzuch'],
    brzuch: ['brzuch', 'skosne', 'brzuch', 'prostowniki', 'skosne', 'brzuch', 'posladki', 'brzuch'],
    kondycja: ['serce', 'czworoglowe', 'serce', 'klatka', 'serce', 'brzuch', 'serce', 'posladki']
  };
  var CYCLE = [
    { name: 'Wprowadzenie', d: 'Ciężary z zapasem 2–3 powtórzeń.' },
    { name: 'Objętość', d: 'Dodatkowa seria w ćwiczeniach pomocniczych.' },
    { name: 'Intensywność', d: 'Ćwiczenia główne: mniej powtórzeń, więcej kilogramów.' },
    { name: 'Odciążenie', d: 'Mniej serii i lżej. Ciało nadrabia regenerację.' }
  ];
  function weekIdx() { return Math.max(0, Math.floor((Date.now() - (S.cycleStart || Date.now())) / (7 * DAY))); }
  function cycleWeek() { return weekIdx() % 4; }
  function blockIdx() { return Math.floor(weekIdx() / 4); }

  function hasEq(ex) { return ex.eq.every(function (q) { return S.equipment[q]; }); }
  function painJoints(min) { var o = {}; Object.keys(S.pain).forEach(function (k) { var j = k.split('-')[0]; if (S.pain[k].lvl >= (min || 4)) o[j] = Math.max(o[j] || 0, S.pain[k].lvl); }); return o; }
  function painHit(ex, min) { var pj = painJoints(min); return ex.stress.filter(function (j) { return pj[j]; }); }
  function levelOk(ex) { return ex.lvl <= S.profile.level + 1; }
  function goalOk(ex) { return S.goal.type !== 'plecy' || ex.stress.indexOf('ledzwie') < 0; }
  function usable(ex) { return hasEq(ex) && !painHit(ex).length && levelOk(ex) && goalOk(ex); }
  function eqName(q) { return SZ.EQUIPMENT.filter(function (e) { return e.id === q; })[0].name.toLowerCase(); }
  function whyNot(ex) {
    var r = [], miss = ex.eq.filter(function (q) { return !S.equipment[q]; });
    if (miss.length) r.push('brak: ' + miss.map(eqName).join(', '));
    var p = painHit(ex); if (p.length) r.push('ból: ' + p.map(function (j) { return SZ.JOINTS[j]; }).join(', '));
    if (!goalOk(ex)) r.push('obciąża lędźwie');
    if (!levelOk(ex)) r.push('za trudne na start');
    return r.join(' · ');
  }
  function alternatives(exId, muscle) {
    var ex = EXI[exId], m = muscle || (ex && ex.prim[0]);
    return SZ.EX.filter(function (e) { return e.id !== exId && e.prim.indexOf(m) > -1 && usable(e); });
  }
  function countFor(min) { return min <= 30 ? 4 : min <= 45 ? 5 : min <= 60 ? 6 : 8; }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function buildSession(tpl, slots, opts) {
    opts = opts || {};
    var g = GOALS[S.goal.type] || GOALS.masa, n = countFor(S.profile.minutes), used = {}, items = [], cw = cycleWeek(), blk = blockIdx();
    if (S.custom[tpl] && !opts.focus) {
      items = S.custom[tpl].filter(function (x) { return EXI[x.ex]; }).map(function (x, i) { return Object.assign({}, x, { custom: 1, slot: i }); });
    } else {
      slots.forEach(function (m, si) {
        if (items.length >= n) return;
        var key = tpl + '|' + si, ov = S.overrides[key];
        var cands = SZ.EX.filter(function (e) { return e.prim.indexOf(m) > -1 && !used[e.id] && usable(e); });
        cands = cands.filter(function (e) { return e.prim[0] === m; }).concat(cands.filter(function (e) { return e.prim[0] !== m; }));
        if (si < 2) { var comp = cands.filter(function (e) { return e.kind === 'c' && e.eq.length; }); if (comp.length) cands = comp; }
        if (!cands.length) return;
        var pick;
        if (ov && EXI[ov] && usable(EXI[ov]) && !used[ov]) pick = EXI[ov];
        else if (si < 2) { var PREF = { czworoglowe: ['squat', 'goblet', 'legpress'], dwuglowe: ['rdl', 'deadlift', 'rdl-db'], posladki: ['hipthrust', 'bridge'], klatka: ['bench', 'bench-db', 'pushup'], plecy: ['row-bar', 'pullup', 'row-db', 'pulldown'], barki: ['ohp', 'ohp-db', 'ohp-db-seat'] }[m] || []; pick = PREF.map(function (id) { return cands.filter(function (e) { return e.id === id; })[0]; }).filter(Boolean)[0] || cands[0]; }
        else pick = cands[(blk + hash(tpl + si)) % cands.length];
        used[pick.id] = 1;
        var ideal = SZ.EX.filter(function (e) { return e.prim.indexOf(m) > -1 && levelOk(e); })[0];
        var main = si < 2 && pick.kind === 'c' && !pick.timed;
        var sc = main ? g.main : g.acc;
        var it = { ex: pick.id, slot: si, sets: sc[0], lo: sc[1], hi: sc[2], rest: sc[3], main: main };
        if (pick.timed) { it.lo = it.hi = pick.timed; it.unit = 's'; }
        if (ideal && ideal.id !== pick.id && !usable(ideal) && !ov) it.note = 'Zamiast „' + ideal.name + '”: ' + whyNot(ideal);
        if (ov && pick.id === ov) it.note = 'Twoja zamiana';
        items.push(it);
      });
    }
    items.forEach(function (it) { var w = painHit(EXI[it.ex], 1); if (w.length) it.warn = 'Uważaj: ' + w.map(function (j) { return SZ.JOINTS[j]; }).join(', ') + ' (lekki ból)'; });
    items.forEach(function (it) {
      if (it.unit === 's') return;
      if (cw === 1 && !it.main) it.sets += 1;
      if (cw === 2 && it.main) { it.lo = Math.max(3, it.lo - 2); it.hi = Math.max(4, it.hi - 2); it.inten = 1.05; }
      if (cw === 3) { it.sets = Math.max(2, it.sets - 1); it.inten = .85; }
    });
    var rd = readinessToday();
    if (rd && rd.score <= 4) items.forEach(function (it) { if (!it.main) it.sets = Math.max(2, it.sets - 1); it.inten = (it.inten || 1) * .95; });
    if (g.ss) { var letter = 0; for (var i = 2; i + 1 < items.length; i += 2) { var L = String.fromCharCode(65 + letter++); items[i].ss = L + '1'; items[i + 1].ss = L + '2'; items[i].rest = items[i + 1].rest = Math.round(items[i].rest * .8); } }
    var pk = peakToday();
    if (pk && !opts.focus && !opts.noPeak) { items = items.filter(function (it) { return it.ex !== pk.ex; }); items.unshift({ ex: pk.ex, sets: pk.sets, lo: pk.reps, hi: pk.reps, rest: 180, main: true, peakW: pk.w, slot: -1, note: 'Przygotowanie do rekordu: ' + pk.label }); }
    return { title: opts.title || tpl, tpl: tpl, items: items };
  }
  function todayPlan() {
    var key = dayKey();
    if (S.focus && S.focus.date === key) {
      var gname = SZ.GROUPS.filter(function (g) { return g.id === S.focus.id; })[0];
      return buildSession('focus-' + S.focus.id, FOCUS[S.focus.id], { focus: 1, title: 'Dziś: ' + gname.name.toLowerCase() });
    }
    var tpl = S.schedule[weekday()];
    if (!tpl && S.extraDay && S.extraDay.date === key) tpl = S.extraDay.tpl;
    if (!tpl) return null;
    return buildSession(tpl, TPL[tpl] || TPL['Cały trening A']);
  }
  function nextTemplate() {
    var w = weekday();
    for (var i = 1; i <= 7; i++) { var t = S.schedule[(w + i) % 7]; if (t) return t; }
    return 'Cały trening A';
  }
  function e1rm(w, r) { return r <= 1 ? w : w * (1 + r / 30); }
  function history(exId) {
    var out = [];
    S.sessions.forEach(function (s) { s.items.forEach(function (it) { if (it.ex === exId) out.push({ date: s.date, sets: it.sets.filter(function (x) { return x.done && !x.warm; }) }); }); });
    return out.filter(function (h) { return h.sets.length; });
  }
  function best(exId) {
    var b = null;
    history(exId).forEach(function (h) { h.sets.forEach(function (x) { var v = e1rm(x.w, x.r); if (x.w > 0 && (!b || v > b.e)) b = { e: v, w: x.w, r: x.r, date: h.date }; }); });
    var pr = S.prs[exId]; if (pr && (!b || pr.e > b.e)) b = pr;
    return b;
  }
  function round(w, u) { u = u || 2.5; return Math.round(w / u) * u; }
  function guessStart(ex) {
    var F = { squat: .5, legpress: .9, lunge: .12, hinge: .6, bridge: .6, legcurl: .3, legext: .3, benchpress: .4, fly: .1, dip: 0, ohpress: .25, raise: .05, facepull: .15, row: .35, vpull: 0, curl: .15, triceps: .15, shrug: .2, carry: .25, swing: .2, abduct: .3, calf: .3, uprow: .2, pullover: .1, pallof: 0, woodchop: .1, crunch: .2 };
    var f = F[ex.mv] == null ? .15 : F[ex.mv];
    if (ex.eq.indexOf('hantle') > -1) f = Math.min(f, ex.mv === 'squat' ? .2 : .14);
    if (ex.p && ex.p.type === 'down') f = .45;
    return f ? round(S.profile.weight * f * (.85 + S.profile.level * .15), ex.unit || 2.5) : 0;
  }
  function suggest(it) {
    var ex = EXI[it.ex]; if (!ex || !ex.unit || it.unit === 's') return 0;
    if (it.peakW) return it.peakW;
    var h = history(it.ex), last = h[h.length - 1], u = ex.unit || 2.5, w;
    if (!last) w = guessStart(ex);
    else {
      var top = last.sets.reduce(function (a, x) { return x.w > a.w ? x : a; }, last.sets[0]);
      if (S.method === 'rpe') { var rpe = top.rpe || 8; w = top.w + (rpe <= 7 ? 2 * u : rpe <= 8 ? u : rpe >= 10 ? -u : 0); }
      else if (S.method === 'percent') { var b = best(it.ex); w = b ? b.e / (1 + it.hi / 30) : top.w; }
      else w = last.sets.every(function (x) { return x.r >= it.hi; }) ? top.w + u : top.w;
    }
    return Math.max(0, round(w * (it.inten || 1), u));
  }
  function lastSets(exId) {
    var h = history(exId), l = h[h.length - 1];
    if (!l) return '';
    return 'Ostatnio (' + ago(l.date) + '): ' + l.sets.map(function (x) { return (x.w ? nf(x.w, x.w % 1 ? 1 : 0) + '×' : '') + x.r; }).join(', ');
  }
  function readinessToday() { return S.readiness && S.readiness.date === dayKey() ? S.readiness : null; }
  function peakToday() {
    var P = S.peak; if (!P || !EXI[P.ex]) return null;
    var days = Math.round((P.date - Date.now()) / DAY);
    if (days <= 0 || !S.schedule[weekday()]) return null;
    var wLeft = Math.floor(days / 7), b = best(P.ex), e = b ? b.e : 0, u = EXI[P.ex].unit || 2.5;
    var presc = [{ sets: 2, reps: 1, p: .9, label: 'tydzień rekordu, lekkie otwarcie' }, { sets: 3, reps: 2, p: .88, label: 'ostatni mocny tydzień' }, { sets: 4, reps: 3, p: .84, label: 'budowanie siły' }][Math.min(wLeft, 2)];
    return { ex: P.ex, sets: presc.sets, reps: presc.reps, w: round(e * presc.p, u), label: presc.label + ' (' + presc.sets + '×' + presc.reps + ' @ ' + Math.round(presc.p * 100) + '%)', days: days };
  }
  function fatigue() {
    var heat = {}, now = Date.now();
    S.sessions.forEach(function (s) {
      var h = (now - s.date) / 36e5; if (h > 96 || h < 0) return;
      var dec = Math.exp(-h / 36);
      s.items.forEach(function (it) { var ex = EXI[it.ex]; if (!ex) return; var n = it.sets.filter(function (x) { return x.done && !x.warm; }).length;
        ex.prim.forEach(function (m) { heat[m] = (heat[m] || 0) + n * dec; }); ex.sec.forEach(function (m) { heat[m] = (heat[m] || 0) + n * dec * .5; }); });
    });
    Object.keys(heat).forEach(function (m) { heat[m] = Math.min(1, heat[m] / 9); });
    return heat;
  }
  function weekBalance() {
    var out = {};
    SZ.GROUPS.forEach(function (g) { out[g.id] = 0; });
    S.schedule.forEach(function (tpl) {
      if (!tpl) return;
      buildSession(tpl, TPL[tpl] || [], { noPeak: 1 }).items.forEach(function (it) { var ex = EXI[it.ex]; if (!ex) return; var gid = SZ.groupOf(ex.prim[0]); out[gid] = (out[gid] || 0) + it.sets; });
    });
    return out;
  }

  /* ================= DŹWIĘK, BLOKADA EKRANU ================= */
  var actx = null;
  function beep(f, d) {
    if (!S.settings.sound) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f || 880; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(.18, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + (d || .18)); o.start(); o.stop(actx.currentTime + (d || .18)); } catch (e) {}
  }
  var wake = null;
  function wakeOn() { if (!S.settings.wake || !('wakeLock' in navigator) || wake) return; navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }).catch(function () {}); }
  function wakeOff() { if (wake) { wake.release().catch(function () {}); wake = null; } }

  /* ================= WIDOKI: wspólne ================= */
  var routes = {};
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function render() {
    closeSheet(true);
    if (!S.onboarded) { view.innerHTML = vOnboard(); after(); setNav(''); return; }
    var h = location.hash.replace(/^#\/?/, '') || 'dzis', parts = h.split('/');
    var fn = routes[parts[0]] || routes.dzis;
    view.innerHTML = fn(parts[1], parts[2]);
    setNav(parts[0]);
    after();
    var run = parts[0] === 'trening' || parts[0] === 'pr';
    document.body.classList.toggle('is-run', run);
    if (run) wakeOn(); else wakeOff();
  }
  function after() { FIG.watch(view); window.scrollTo(0, 0); }
  function setNav(r) {
    var map = { cw: 'cwiczenia', plan: 'dzis', pomiary: 'postepy', zdjecia: 'postepy', odznaki: 'postepy', podsumowanie: 'postepy' };
    var cur = map[r] || r;
    $$('.tabs a').forEach(function (a) { var on = a.getAttribute('data-r') === cur; a.classList.toggle('is-on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  function muscles(list) { return list.map(function (m) { return SZ.MUSCLES[m]; }).join(', '); }
  function repsTxt(it) { return it.unit === 's' ? it.lo + ' s' : it.lo === it.hi ? it.lo + '' : it.lo + '–' + it.hi; }
  function demoBar() { return S.demo ? '<p class="demo">Przeglądasz przykładowe dane. Usuniesz je w Profilu.</p>' : ''; }
  function thumb(ex, cls) { return FIG.figure(ex, { cls: cls || 'fig--sm', label: ex.name, still: true }); }
  function num(n, l, v, u, extra) { return '<label class="field"><span>' + l + '</span><div class="unitbox"><input name="' + n + '" type="number" inputmode="decimal" step="any" value="' + (v == null ? '' : v) + '"' + (extra || '') + '><em>' + u + '</em></div></label>'; }
  function opt(n, v, t, d, on) { return '<label class="opt"><input type="radio" name="' + n + '" value="' + v + '"' + (on ? ' checked' : '') + '><span><b>' + t + '</b><small>' + d + '</small></span></label>'; }
  function seg(n, list, cur, cls) { return '<div class="seg' + (cls ? ' ' + cls : '') + '">' + list.map(function (o) { return '<label><input type="radio" name="' + n + '" value="' + o[0] + '"' + (String(cur) === String(o[0]) ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div>'; }
  function medNote() { return '<p class="med">To wskazówki treningowe, nie porada medyczna. Jeśli ból jest ostry, narasta albo trwa dłużej niż kilka dni, skonsultuj się z fizjoterapeutą lub lekarzem.</p>'; }

  /* ---------- arkusz (bottom sheet) ---------- */
  var sheetCb = null, sheetFocus = null;
  function openSheet(title, html, onClick) {
    var sh = $('#sheet');
    $('[data-sheet-title]', sh).textContent = title;
    $('[data-sheet-body]', sh).innerHTML = html;
    sheetCb = onClick || null; sheetFocus = document.activeElement;
    sh.hidden = false; requestAnimationFrame(function () { sh.classList.add('is-on'); });
    FIG.watch(sh);
    setTimeout(function () { var f = $('[data-sheet-body] button, [data-sheet-body] input', sh) || $('.sheet__close', sh); if (f) f.focus(); }, 60);
  }
  function closeSheet(silent) {
    var sh = $('#sheet'); if (!sh || sh.hidden) return;
    sh.classList.remove('is-on'); sh.hidden = true; sheetCb = null;
    if (!silent && sheetFocus && sheetFocus.isConnected) sheetFocus.focus();
  }
  function exPicker(title, list, cb, opts) {
    opts = opts || {};
    var groups = '<div class="chips chips--scroll" role="group" aria-label="Partia"><button class="chip is-on" data-pick-g="all" aria-pressed="true">Wszystkie</button>' + SZ.GROUPS.map(function (g) { return '<button class="chip" data-pick-g="' + g.id + '" aria-pressed="false">' + g.name + '</button>'; }).join('') + '</div>';
    var html = (opts.search ? '<label class="search"><span class="sr">Szukaj ćwiczenia</span><input type="search" placeholder="Szukaj ćwiczenia…" data-pick-q></label>' + groups : '') +
      (list.length ? '<ul class="picklist">' + list.map(function (e) {
        var ok = usable(e);
        return '<li data-g="' + SZ.groupOf(e.prim[0]) + '" data-n="' + esc(e.name.toLowerCase()) + '"><button class="pickrow' + (ok ? '' : ' is-off') + '" data-pick="' + e.id + '">' + thumb(e) + '<span><b>' + e.name + '</b><small>' + (ok ? muscles(e.prim) : whyNot(e)) + '</small></span></button></li>';
      }).join('') + '</ul>' : '<p class="empty">Brak dostępnych zamienników z Twoim sprzętem.</p>');
    openSheet(title, html, function (t) { var b = t.closest('[data-pick]'); if (b) { closeSheet(); cb(b.getAttribute('data-pick')); } });
  }

  /* ---------- onboarding ---------- */
  var ob = 0;
  function vOnboard() {
    var steps = 5, p = S.profile, body = '';
    if (ob === 0) body = '<div class="ob__hero"><p class="ob__logo">SIŁECZKO<span>MAT</span></p><h1>Plan, który zna Twoje ciało i Twoją siłownię.</h1><p class="lead">Kilka pytań: cel, sprzęt i co Cię boli. Dobierzemy ćwiczenia, poprowadzimy trening i przygotujemy Cię do rekordu.</p></div>' +
      '<label class="field"><span>Jak masz na imię?</span><input name="name" value="' + esc(p.name) + '" autocomplete="given-name" placeholder="np. Ola"></label>' +
      '<p class="note">Wszystko zostaje na tym telefonie. Nie zakładasz konta, nic nie wysyłamy.</p>';
    if (ob === 1) body = '<h1>O Tobie</h1><p class="lead">Przyda się do doboru obciążeń i trudności ćwiczeń.</p><div class="grid2">' +
      num('age', 'Wiek', p.age, 'lat') + num('height', 'Wzrost', p.height, 'cm') + num('weight', 'Masa ciała', p.weight, 'kg') +
      '</div><fieldset><legend>Doświadczenie</legend><div class="opts">' +
      [[1, 'Początkujący', 'do roku treningów'], [2, 'Średnio zaawansowany', '1–3 lata'], [3, 'Zaawansowany', 'ponad 3 lata']].map(function (o) { return opt('level', o[0], o[1], o[2], p.level == o[0]); }).join('') + '</div></fieldset>';
    if (ob === 2) body = '<h1>Co chcesz osiągnąć?</h1><div class="opts">' + Object.keys(GOALS).map(function (k) { return opt('goal', k, GOALS[k].name, GOALS[k].desc, S.goal.type === k); }).join('') + '</div>' +
      '<fieldset><legend>Ile dni w tygodniu?</legend>' + seg('days', [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6]], p.days) + '</fieldset>' +
      '<fieldset><legend>Ile trwa trening?</legend>' + seg('minutes', [[30, '30 min'], [45, '45 min'], [60, '60 min'], [90, '90 min']], p.minutes) + '</fieldset>';
    if (ob === 3) body = '<h1>Jaki masz sprzęt?</h1><p class="lead">Odznacz to, czego nie ma. Ćwiczenia wymagające brakującego sprzętu zamienimy na odpowiedniki.</p>' + eqPresets() + eqChips();
    if (ob === 4) body = '<h1>Czy coś Cię boli?</h1><p class="lead">Dotknij miejsca na sylwetce i oceń ból. Od 4/10 pominiemy ćwiczenia, które je obciążają.</p>' +
      FIG.atlas({ mode: 'pain', pain: S.pain }) + painChips() + medNote();
    return '<section class="ob">' +
      '<div class="ob__dots" aria-label="Krok ' + (ob + 1) + ' z ' + steps + '">' + Array.from({ length: steps }, function (_, i) { return '<i class="' + (i <= ob ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<form class="ob__form" data-ob onsubmit="return false">' + body + '</form>' +
      '<div class="ob__nav">' + (ob ? '<button class="btn btn--ghost" data-act="ob-back">Wstecz</button>' : '<button class="btn btn--ghost" data-act="demo">Demo</button>') +
      '<button class="btn btn--main" data-act="ob-next">' + (ob === steps - 1 ? 'Ułóż mój plan' : 'Dalej') + '</button></div></section>';
  }
  function eqPresets() { return '<div class="chips chips--presets"><button type="button" class="chip" data-act="eq-preset" data-v="all">Pełna siłownia</button><button type="button" class="chip" data-act="eq-preset" data-v="home">Dom z hantlami</button><button type="button" class="chip" data-act="eq-preset" data-v="none">Bez sprzętu</button></div>'; }
  function eqChips() { return '<div class="eqlist">' + SZ.EQUIPMENT.map(function (e) { var on = S.equipment[e.id]; return '<button type="button" class="eq' + (on ? ' is-on' : '') + '" data-act="eq" data-v="' + e.id + '" aria-pressed="' + !!on + '"><i aria-hidden="true"></i>' + e.name + '</button>'; }).join('') + '</div>'; }
  function painChips() {
    var keys = Object.keys(S.pain);
    return '<div class="chips" aria-live="polite">' + (keys.length ? keys.map(function (k) { var pp = k.split('-'); return '<button type="button" class="chip chip--pain" data-pain="' + k + '">' + FIG.jointLabel(pp[0], pp[1]) + ' · ' + S.pain[k].lvl + '/10' + ICON.x + '<span class="sr">zmień</span></button>'; }).join('') : '<p class="muted">Nic nie zaznaczono.</p>') + '</div>';
  }
  function readOb() {
    var f = $('[data-ob]'); if (!f) return;
    var g = function (n) { var el = f.elements[n]; return el ? el.value : null; };
    if (f.elements.name) S.profile.name = g('name').trim();
    ['age', 'height', 'weight'].forEach(function (k) { if (f.elements[k]) S.profile[k] = +g(k) || S.profile[k]; });
    if (f.elements.level) S.profile.level = +g('level');
    if (f.elements.goal) S.goal.type = g('goal');
    if (f.elements.days) { var nd = +g('days'); if (nd !== S.profile.days) { S.profile.days = nd; S.schedule = defaultSchedule(nd); } }
    if (f.elements.minutes) S.profile.minutes = +g('minutes');
  }

  /* ---------- DZIŚ ---------- */
  routes.dzis = function () {
    var t = todayPlan(), d = new Date(), name = S.profile.name, cw = cycleWeek(), rd = readinessToday(), heat = fatigue();
    var tired = Object.keys(heat).filter(function (m) { return heat[m] > .65; });
    var stale = Object.keys(S.pain).filter(function (k) { return Date.now() - S.pain[k].date > 3 * DAY; });
    var pk = S.peak ? Math.ceil((S.peak.date - Date.now()) / DAY) : null;
    var focusOn = S.focus && S.focus.date === dayKey();
    var html = demoBar() + '<header class="page"><p class="page__date">' + DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()] + ' · tydzień ' + (cw + 1) + '/4: ' + CYCLE[cw].name.toLowerCase() + '</p><h1>' + (name ? 'Cześć, ' + esc(name) + '.' : 'Dzisiejszy trening') + '</h1></header>';
    if (S.active) html += '<a class="resume" href="#/trening"><b>Trening w toku</b><span>Wróć do ćwiczenia ' + (S.active.i + 1) + ' z ' + S.active.items.length + '</span></a>';
    if (stale.length) html += '<button class="nudge" data-act="pain-open" data-v="' + stale[0] + '"><b>Jak się ma ' + FIG.jointLabel.apply(null, stale[0].split('-')) + '?</b><span>Ostatnia ocena ' + ago(S.pain[stale[0]].date) + '. Zaktualizuj, żeby plan był aktualny.</span></button>';
    if (pk != null && pk >= 0 && EXI[S.peak.ex]) html += '<a class="nudge nudge--pr" href="#/pr"><b>Do rekordu: ' + (pk === 0 ? 'dziś' : pk + ' dni') + '</b><span>' + EXI[S.peak.ex].name + ' · ' + S.peak.type + '</span></a>';
    html += '<div class="focus" role="group" aria-label="Partia na dziś"><button class="chip' + (!focusOn ? ' is-on' : '') + '" data-act="focus" data-v="" aria-pressed="' + !focusOn + '">Wg planu</button>' +
      SZ.GROUPS.map(function (g) { var on = focusOn && S.focus.id === g.id; return '<button class="chip' + (on ? ' is-on' : '') + '" data-act="focus" data-v="' + g.id + '" aria-pressed="' + !!on + '">' + g.name + '</button>'; }).join('') + '</div>';
    if (!t) {
      var nt = nextTemplate();
      html += '<section class="today today--rest"><div class="today__head"><h2>Dzień odpoczynku</h2><p>Regeneracja to też trening. Następny: ' + esc(nt) + '.</p></div>' +
                '<div class="stack"><button class="btn btn--ghost btn--wide" data-act="extra-day">Trenuj mimo to: ' + esc(nt) + '</button><a class="btn btn--ghost btn--wide" href="#/plan">Zmień kalendarz</a></div></section>';
    } else {
      if (!rd && !S.active) html += '<section class="card ready"><h2>Jak się dziś czujesz?</h2>' +
        '<div class="ready__row"><span>Sen</span>' + seg('r-s', [[1, 'Słabo'], [2, 'OK'], [3, 'Dobrze']], 2) + '</div>' +
        '<div class="ready__row"><span>Energia</span>' + seg('r-e', [[1, 'Niska'], [2, 'OK'], [3, 'Wysoka']], 2) + '</div>' +
        '<div class="ready__row"><span>Stres</span>' + seg('r-t', [[1, 'Duży'], [2, 'Średni'], [3, 'Mały']], 2) + '</div>' +
        '<button class="btn btn--ghost btn--wide" data-act="ready">Zapisz i dopasuj trening</button></section>';
      else if (rd) html += '<p class="readyline ' + (rd.score <= 4 ? 'is-low' : rd.score >= 8 ? 'is-high' : '') + '">' + (rd.score <= 4 ? 'Gorszy dzień: zrobimy lżej (mniej serii, −5% ciężaru).' : rd.score >= 8 ? 'Świetna forma. Jeśli serie idą łatwo, dołóż ciężar.' : 'Forma w normie, trenujemy według planu.') + '</p>';
      html += '<section class="today"><div class="today__head"><h2>' + esc(t.title) + '</h2><p>' + t.items.length + ' ćwiczeń · ok. ' + S.profile.minutes + ' min · ' + GOALS[S.goal.type].name.toLowerCase() + '</p></div>' +
        (t.items.length ? '<ol class="exlist">' + t.items.map(function (it) {
          var ex = EXI[it.ex], sg = suggest(it);
          return '<li>' + (it.ss ? '<span class="ssbadge">' + it.ss + '</span>' : '') + '<div class="exrow"><a class="exrow__link" href="#/cw/' + ex.id + '">' + thumb(ex) +
            '<span class="exrow__main"><b>' + ex.name + '</b><span>' + it.sets + ' × ' + repsTxt(it) + (sg ? ' · ' + kg(sg) : '') + ' · ' + it.rest + ' s</span>' +
            (it.note ? '<em class="swap">' + esc(it.note) + '</em>' : '') + (it.warn ? '<em class="swap swap--warn">' + esc(it.warn) + '</em>' : '') + '</span></a>' +
            (it.custom || focusOn || it.slot < 0 ? '' : '<button class="iconbtn iconbtn--sm" data-act="swap-plan" data-tpl="' + esc(t.tpl) + '" data-slot="' + it.slot + '" data-ex="' + ex.id + '" aria-label="Wymień ' + esc(ex.name) + '">' + ICON.swap + '</button>') + '</div></li>';
        }).join('') + '</ol>' : '<p class="empty">Z tym sprzętem i zaznaczonym bólem nie ma bezpiecznych ćwiczeń. Zmień partię albo sprzęt w Profilu.</p>') +
        '<div class="sticky-cta"><button class="btn btn--main btn--wide" data-act="start"' + (t.items.length ? '' : ' disabled') + '>' + (S.active ? 'Zacznij od nowa' : 'Zacznij trening') + ' · ' + t.items.length + ' ćw.</button></div></section>';
    }
    html += '<div class="duo"><a class="tile" href="#/plan"><b>Plan tygodnia</b><small>Kalendarz, edycja, bilans partii</small></a><a class="tile tile--pr" href="#/pr"><b>Dzień rekordu</b><small>Rozgrzewka i podejścia</small></a></div>';
    if (tired.length) html += '<section class="card"><div class="card__head"><h2>Zmęczenie mięśni</h2><span class="muted">ostatnie 4 dni</span></div>' + FIG.atlas({ heat: heat, small: 1 }) + '<p class="muted">Najbardziej zmęczone: ' + tired.map(function (m) { return SZ.MUSCLES[m]; }).join(', ') + '. Jeśli wybierasz partię sam, daj im dzień przerwy.</p></section>';
    return html;
  };

  /* ---------- PLAN TYGODNIA ---------- */
  var planOpen = null;
  function ensureCustom(tpl) {
    if (!S.custom[tpl]) S.custom[tpl] = buildSession(tpl, TPL[tpl] || [], { noPeak: 1 }).items.map(function (it) { return { ex: it.ex, sets: it.sets, lo: it.lo, hi: it.hi, rest: it.rest, main: it.main, unit: it.unit }; });
    return S.custom[tpl];
  }
  routes.plan = function () {
    var cw = cycleWeek(), bal = weekBalance(), tpls = [], seen = {}, allT = Object.keys(TPL);
    S.schedule.forEach(function (t) { if (t && !seen[t]) { seen[t] = 1; tpls.push(t); } });
    var lowAny = SZ.GROUPS.some(function (g) { return g.id !== 'kondycja' && (bal[g.id] || 0) < 8; });
    return '<header class="page"><a class="back" href="#/">Dziś</a><h1>Plan tygodnia</h1></header>' +
      '<section class="card cycle"><div class="cycle__bar">' + CYCLE.map(function (c, i) { return '<span class="' + (i === cw ? 'is-on' : i < cw ? 'is-past' : '') + '"><b>' + (i + 1) + '</b>' + c.name + '</span>'; }).join('') + '</div><p class="muted">' + CYCLE[cw].d + ' Ćwiczenia pomocnicze zmieniają się co 4 tygodnie (blok ' + (blockIdx() + 1) + ').</p></section>' +
      '<section class="card"><div class="card__head"><h2>Kalendarz</h2><span class="muted">przeciągnij lub strzałki</span></div><ol class="week">' +
      S.schedule.map(function (t, i) {
        return '<li class="day' + (t ? '' : ' is-rest') + (i === weekday() ? ' is-today' : '') + '" draggable="' + (!!t) + '" data-day="' + i + '"><span class="day__wd">' + WD[i] + '</span>' +
          '<label class="day__sel"><span class="sr">Trening na ' + WDL[i] + '</span><select data-act-sel="day" data-day="' + i + '"><option value="">Odpoczynek</option>' + allT.map(function (x) { return '<option' + (x === t ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
          '<span class="day__mv"><button class="iconbtn iconbtn--xs" data-act="day-mv" data-day="' + i + '" data-v="-1" aria-label="Zamień z dniem wcześniej"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button><button class="iconbtn iconbtn--xs" data-act="day-mv" data-day="' + i + '" data-v="1" aria-label="Zamień z dniem później"' + (i === 6 ? ' disabled' : '') + '>' + ICON.down + '</button></span></li>';
      }).join('') + '</ol></section>' +
      '<section class="card"><div class="card__head"><h2>Bilans partii</h2><span class="muted">serie w tygodniu</span></div><ul class="balance">' +
      SZ.GROUPS.filter(function (g) { return g.id !== 'kondycja'; }).map(function (g) { var n = bal[g.id] || 0; return '<li class="' + (n < 8 ? 'is-low' : '') + '"><span>' + g.name + '</span><div class="bar"><i style="--w:' + Math.min(1, n / 20) + '"></i></div><b>' + n + '</b></li>'; }).join('') + '</ul>' +
      (lowAny ? '<p class="muted">Partie poniżej 8 serii tygodniowo rosną wolniej. Dodaj ćwiczenie w edytorze poniżej albo dzień treningowy.</p>' : '') + '</section>' +
      '<section class="card"><h2>Treningi</h2><div class="tpls">' + tpls.map(function (tpl) {
        var s = buildSession(tpl, TPL[tpl] || [], { noPeak: 1 }), open = planOpen === tpl;
        return '<div class="tpl' + (open ? ' is-open' : '') + '"><button class="tpl__head" data-act="tpl-open" data-v="' + esc(tpl) + '" aria-expanded="' + open + '"><b>' + esc(tpl) + '</b><span>' + s.items.length + ' ćw.' + (S.custom[tpl] ? ' · własny' : '') + '</span>' + ICON.down + '</button>' +
          (open ? '<ol class="tpl__list">' + s.items.map(function (it, i) {
            var ex = EXI[it.ex], tp = esc(tpl);
            return '<li class="tpl__it">' + thumb(ex) + '<div class="tpl__main"><b>' + ex.name + '</b><div class="tpl__ctl">' +
              '<span class="mini"><button class="iconbtn iconbtn--xs" data-act="ed-sets" data-tpl="' + tp + '" data-i="' + i + '" data-v="-1" aria-label="Mniej serii">' + ICON.minus + '</button><output>' + it.sets + ' serie</output><button class="iconbtn iconbtn--xs" data-act="ed-sets" data-tpl="' + tp + '" data-i="' + i + '" data-v="1" aria-label="Więcej serii">' + ICON.plus + '</button></span>' +
              (it.unit === 's' ? '' : '<span class="mini"><button class="iconbtn iconbtn--xs" data-act="ed-reps" data-tpl="' + tp + '" data-i="' + i + '" data-v="-1" aria-label="Mniej powtórzeń">' + ICON.minus + '</button><output>' + repsTxt(it) + ' powt.</output><button class="iconbtn iconbtn--xs" data-act="ed-reps" data-tpl="' + tp + '" data-i="' + i + '" data-v="1" aria-label="Więcej powtórzeń">' + ICON.plus + '</button></span>') + '</div></div>' +
              '<div class="tpl__acts"><button class="iconbtn iconbtn--xs" data-act="ed-mv" data-tpl="' + tp + '" data-i="' + i + '" aria-label="Przesuń wyżej"' + (i ? '' : ' disabled') + '>' + ICON.up + '</button><button class="iconbtn iconbtn--xs" data-act="ed-swap" data-tpl="' + tp + '" data-i="' + i + '" aria-label="Wymień">' + ICON.swap + '</button><button class="iconbtn iconbtn--xs" data-act="ed-del" data-tpl="' + tp + '" data-i="' + i + '" aria-label="Usuń">' + ICON.trash + '</button></div></li>';
          }).join('') + '</ol><div class="tpl__foot"><button class="btn btn--ghost" data-act="ed-add" data-tpl="' + esc(tpl) + '">' + ICON.plus + ' Dodaj ćwiczenie</button>' + (S.custom[tpl] ? '<button class="btn btn--ghost" data-act="ed-reset" data-tpl="' + esc(tpl) + '">Przywróć automatyczny</button>' : '') + '</div>' : '') + '</div>';
      }).join('') + '</div></section>' +
      '<section class="card"><h2>Progresja ciężaru</h2>' + seg('method', [['double', 'Podwójna'], ['rpe', 'RPE'], ['percent', '% maksa']], S.method, 'seg--3') +
      '<p class="muted">' + { double: 'Gdy zrobisz górny zakres powtórzeń we wszystkich seriach, następnym razem dokładamy ciężar.', rpe: 'Ciężar zależy od tego, jak ciężka była ostatnia seria (skala RPE 6–10).', percent: 'Ciężar liczony jako procent Twojego szacowanego maksa dla danej liczby powtórzeń.' }[S.method] + '</p></section>';
  };

  /* ---------- TRENING NA ŻYWO ---------- */
  function mkItem(it) {
    var sg = suggest(it), ex = EXI[it.ex], sets = [];
    for (var k = 0; k < it.sets; k++) sets.push({ w: sg || 0, r: it.hi, done: false });
    if (it.main && ex.unit && sg >= 30) {
      var u = ex.unit, warm = [];
      if (ex.eq.indexOf('sztanga') > -1) warm.push({ w: S.bar || 20, r: 10 });
      [[.5, 6], [.7, 3], [.85, 1]].forEach(function (p) { var w = round(sg * p[0], u); if (w > (warm.length ? warm[warm.length - 1].w : 0)) warm.push({ w: w, r: p[1] }); });
      sets = warm.map(function (x) { return { w: x.w, r: x.r, done: false, warm: true }; }).concat(sets);
    }
    return { ex: it.ex, lo: it.lo, hi: it.hi, rest: it.rest, unit: it.unit || '', ss: it.ss || '', sets: sets };
  }
  function startSession() {
    var t = todayPlan() || buildSession(nextTemplate(), TPL[nextTemplate()]);
    S.active = { title: t.title, tpl: t.tpl, started: Date.now(), i: 0, items: t.items.map(mkItem) };
    save(); go('#/trening');
  }
  function step(f, k, v, label, unit) {
    return '<span role="cell" class="stepper"><button data-act="dec" data-f="' + f + '" data-k="' + k + '" aria-label="Mniej">' + ICON.minus + '</button>' +
      '<output>' + label + (unit ? '<small>' + unit + '</small>' : '') + '</output><button data-act="inc" data-f="' + f + '" data-k="' + k + '" aria-label="Więcej">' + ICON.plus + '</button></span>';
  }
  routes.trening = function () {
    var A = S.active;
    if (!A) return '<header class="page"><h1>Brak treningu w toku</h1></header><a class="btn btn--main" href="#/">Wróć do planu</a>';
    var it = A.items[A.i], ex = EXI[it.ex], b = best(it.ex);
    var real = it.sets.filter(function (x) { return !x.warm; }), doneSets = real.filter(function (x) { return x.done; }).length;
    var cur = it.sets.findIndex(function (x) { return !x.done && !x.skip; });
    var bw = !ex.unit && it.unit !== 's';
    var partner = it.ss ? A.items.findIndex(function (o, j) { return j !== A.i && o.ss && o.ss[0] === it.ss[0]; }) : -1;
    return '<div class="run">' +
      '<header class="run__top"><button class="iconbtn" data-act="end" aria-label="Zakończ trening">' + ICON.x + '</button>' +
      '<div class="run__prog"><span>Ćwiczenie ' + (A.i + 1) + ' z ' + A.items.length + (it.ss ? ' · superseria ' + it.ss : '') + '</span><div class="bar"><i style="--w:' + ((A.i + doneSets / Math.max(1, real.length)) / A.items.length) + '"></i></div></div></header>' +
      '<div class="run__fig">' + FIG.figure(ex, { cls: 'fig--lg' }) + '<div class="run__atlas">' + FIG.atlas({ prim: ex.prim, sec: ex.sec, small: 1 }) + '</div></div>' +
      '<h1 class="run__name">' + ex.name + '</h1>' +
      '<p class="run__meta">' + muscles(ex.prim) + (b ? ' · rekord ' + kg(b.w) + ' × ' + b.r : '') + '</p>' +
      (lastSets(it.ex) ? '<p class="run__last">' + lastSets(it.ex) + '</p>' : '') +
      (partner > -1 ? '<p class="run__ss">Superseria z: <b>' + EXI[A.items[partner].ex].name + '</b>. Po serii od razu drugie ćwiczenie, przerwa po parze.</p>' : '') +
      '<div class="run__tools">' + (ex.eq.indexOf('sztanga') > -1 ? '<button class="toolbtn" data-act="plates">Talerze</button>' : '') +
        '<button class="toolbtn" data-act="run-swap">' + ICON.swap + 'Zamień</button><button class="toolbtn" data-act="run-skip">' + ICON.skip + 'Pomiń</button><button class="toolbtn" data-act="run-add">' + ICON.plus + 'Dodaj</button></div>' +
      '<details class="cues"><summary>Technika i błędy</summary><ol>' + ex.cues.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ol><ul class="errs">' + ex.errs.map(function (c) { return '<li>' + ICON.x + c + '</li>'; }).join('') + '</ul></details>' +
      '<div class="sets" role="table" aria-label="Serie">' +
      '<div class="sets__row sets__row--head" role="row"><span role="columnheader">#</span><span role="columnheader">' + (bw ? 'Dociążenie' : it.unit === 's' ? 'Czas' : 'Ciężar') + '</span><span role="columnheader">' + (it.unit === 's' ? 'Sekundy' : 'Powt. ' + it.lo + (it.lo !== it.hi ? '–' + it.hi : '')) + '</span><span role="columnheader"><span class="sr">Gotowe</span></span></div>' +
      it.sets.map(function (x, k) {
        var n = it.sets.slice(0, k + 1).filter(function (y) { return !y.warm; }).length;
        var row = '<div class="sets__row' + (x.warm ? ' is-warm' : '') + (x.done ? ' is-done' : x.skip ? ' is-skip' : k === cur ? ' is-cur' : '') + '" role="row">' +
          '<b role="cell">' + (x.warm ? 'R' : n) + '</b>' +
          (it.unit === 's' ? '<span role="cell"><button class="timerbtn" data-act="set-timer" data-k="' + k + '" data-s="' + x.r + '">' + ICON.play + '<span data-tleft="' + k + '">' + x.r + ' s</span></button></span>' : step('w', k, x.w, nf(x.w, x.w % 1 ? 1 : 0), 'kg')) +
          step('r', k, x.r, x.r, it.unit === 's' ? 's' : '') +
          '<span role="cell"><button class="check" data-act="set" data-k="' + k + '" aria-pressed="' + !!x.done + '" aria-label="' + (x.warm ? 'Seria rozgrzewkowa' : 'Seria ' + n) + (x.done ? ' zrobiona, cofnij' : ', oznacz jako zrobioną') + '">' + ICON.check + '</button></span></div>';
        if (x.done && !x.warm && it.unit !== 's') row += '<div class="rpe" role="group" aria-label="Jak ciężka była seria ' + n + ' (RPE)"><span>Jak ciężko?</span>' + [6, 7, 8, 9, 10].map(function (r) { return '<button class="rpe__b' + (x.rpe === r ? ' is-on' : '') + '" data-act="rpe" data-k="' + k + '" data-v="' + r + '" aria-pressed="' + (x.rpe === r) + '" title="' + { 6: 'zapas 4+ powtórzeń', 7: 'zapas 3', 8: 'zapas 2', 9: 'zapas 1', 10: 'do upadku' }[r] + '">' + r + '</button>'; }).join('') + '</div>';
        return row;
      }).join('') + '</div>' +
      '<label class="notefield">' + ICON.note + '<span class="sr">Notatka do ćwiczenia</span><textarea data-note="' + ex.id + '" rows="2" placeholder="Notatka, np. ustawienie siedziska 4">' + esc(S.notes[ex.id] || '') + '</textarea></label>' +
      '<div class="run__nav' + (A.i > 0 ? '' : ' run__nav--one') + '">' + (A.i > 0 ? '<button class="btn btn--ghost" data-act="prev">Wstecz</button>' : '') +
      (A.i < A.items.length - 1 ? '<button class="btn btn--main" data-act="next">Dalej: ' + EXI[A.items[A.i + 1].ex].name.split(' ')[0].toLowerCase() + '</button>' : '<button class="btn btn--main" data-act="finish">Zakończ trening</button>') + '</div></div>';
  };
  function platesFor(total) {
    var per = (total - (S.bar || 20)) / 2, out = [], rest = per;
    if (per < 0) return null;
    S.plates.slice().sort(function (a, b) { return b - a; }).forEach(function (p) { while (rest >= p - 1e-6) { out.push(p); rest -= p; } });
    return { per: per, plates: out, rest: Math.round(rest * 100) / 100 };
  }
  var restT = null;
  function startRest(sec, nextLabel) {
    var end = Date.now() + sec * 1000, box = $('#rest'), beeped = {};
    box.hidden = false; box.classList.add('is-on');
    $('[data-rest-next]', box).textContent = nextLabel || '';
    clearInterval(restT);
    function upd() {
      var left = Math.max(0, Math.round((end - Date.now()) / 1000));
      $('[data-rest-t]', box).textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      $('[data-rest-bar]', box).style.setProperty('--w', 1 - left / sec);
      if (left <= 3 && left > 0 && !beeped[left]) { beeped[left] = 1; beep(660, .09); }
      if (left <= 0) { clearInterval(restT); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); beep(990, .35); $('[data-rest-t]', box).textContent = 'Czas!'; box.classList.add('is-end'); }
    }
    box.__add = function (s) { end += s * 1000; sec += s; box.classList.remove('is-end'); clearInterval(restT); restT = setInterval(upd, 250); upd(); };
    box.classList.remove('is-end');
    restT = setInterval(upd, 250); upd();
    setTimeout(function () { var b = $('[data-act="rest-skip"]'); if (b) b.focus(); }, 50);
  }
  function stopRest() { clearInterval(restT); var box = $('#rest'); box.classList.remove('is-on', 'is-end'); box.hidden = true; }
  var setTimer = null;
  function runSetTimer(k, sec) {
    clearInterval(setTimer);
    var end = Date.now() + sec * 1000, beeped = {};
    beep(880, .1);
    setTimer = setInterval(function () {
      var left = Math.max(0, Math.ceil((end - Date.now()) / 1000)), el = $('[data-tleft="' + k + '"]');
      if (el) el.textContent = left + ' s';
      if (left <= 3 && left > 0 && !beeped[left]) { beeped[left] = 1; beep(660, .06); }
      if (left <= 0) { clearInterval(setTimer); beep(990, .35); if (navigator.vibrate) navigator.vibrate(300); var b = $('[data-act="set"][data-k="' + k + '"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }
    }, 250);
  }
  function finishSession() {
    var A = S.active; if (!A) return;
    var items = A.items.map(function (it) { return { ex: it.ex, unit: it.unit, sets: it.sets.filter(function (x) { return x.done; }) }; }).filter(function (it) { return it.sets.length; });
    var newPR = [];
    items.forEach(function (it) {
      if (it.unit === 's') return;
      var before = best(it.ex), top = null;
      it.sets.forEach(function (x) { if (x.w > 0 && !x.warm) { var v = e1rm(x.w, x.r); if ((!before || v > before.e + .01) && (!top || v > top.e)) top = { ex: it.ex, e: v, w: x.w, r: x.r }; } });
      if (top) newPR.push(top);
    });
    var sess = { id: 's' + Date.now(), date: Date.now(), title: A.title, tpl: A.tpl, dur: Math.round((Date.now() - A.started) / 60000), items: items };
    var before = earnedBadges().map(function (b) { return b.id; });
    if (items.length) S.sessions.push(sess);
    newPR.forEach(function (p) { S.prs[p.ex] = { e: p.e, w: p.w, r: p.r, date: sess.date }; });
    S.active = null; S.lastSummary = { sess: sess, prs: newPR, badges: earnedBadges().filter(function (b) { return before.indexOf(b.id) < 0; }) };
    save(true); stopRest(); wakeOff(); go('#/podsumowanie');
  }
  routes.podsumowanie = function () {
    var L = S.lastSummary; if (!L) return routes.dzis();
    var vol = 0, sets = 0; L.sess.items.forEach(function (it) { it.sets.forEach(function (x) { if (x.warm) return; sets++; vol += (x.w || 0) * x.r; }); });
    return '<header class="page"><h1>Trening zapisany</h1><p class="lead">' + esc(L.sess.title) + ' · ' + L.sess.dur + ' min</p></header>' +
      '<dl class="ledger ledger--3"><div><dt>Serie</dt><dd>' + sets + '</dd></div><div><dt>Objętość</dt><dd>' + nf(vol) + '<small> kg</small></dd></div><div><dt>Ćwiczenia</dt><dd>' + L.sess.items.length + '</dd></div></dl>' +
      (L.prs.length ? '<section class="card win"><h2>Nowe rekordy</h2><ul class="rows">' + L.prs.map(function (p) { return '<li><b>' + EXI[p.ex].name + '</b><span>' + kg(p.w) + ' × ' + p.r + ' · szac. 1RM ' + kg(p.e) + '</span></li>'; }).join('') + '</ul></section>' : '') +
      ((L.badges || []).length ? '<section class="card win"><h2>Nowa odznaka</h2><ul class="rows">' + L.badges.map(function (b) { return '<li><b>' + b.name + '</b><span>' + b.d + '</span></li>'; }).join('') + '</ul></section>' : '') +
      '<div class="stack"><a class="btn btn--main btn--wide" href="#/postepy">Zobacz postępy</a><a class="btn btn--ghost btn--wide" href="#/">Wróć do planu</a></div>';
  };

  /* ---------- DZIEŃ REKORDU ---------- */
  var PR_POOL = ['squat', 'squat-front', 'deadlift', 'deadlift-sumo', 'trapbar', 'bench', 'bench-inc', 'ohp', 'row-bar', 'pullup-w', 'hipthrust', 'rdl', 'legpress', 'goblet', 'bench-db', 'ohp-db', 'curl-bar', 'dip'];
  var PRT = { '1RM': { reps: 1, name: 'Maks na 1 powtórzenie' }, '3RM': { reps: 3, name: 'Rekord na 3 powtórzenia' }, '5RM': { reps: 5, name: 'Rekord na 5 powtórzeń' }, 'reps': { reps: 0, name: 'Rekord powtórzeń z danym ciężarem' } };
  routes.pr = function () {
    var D = S.prDraft || (S.prDraft = { step: 0, type: '1RM' });
    if (D.step === 0) {
      var list = PR_POOL.map(function (id) { return EXI[id]; }).filter(function (e) { return e && hasEq(e); });
      return '<header class="page"><a class="back" href="#/">Dziś</a><h1>Dzień rekordu</h1><p class="lead">Wybierz rodzaj rekordu i ćwiczenie. Z historii policzymy szacowany maks, ułożymy rozgrzewkę i podejścia.</p></header>' +
        '<fieldset><legend>Rodzaj rekordu</legend><div class="opts opts--2">' + Object.keys(PRT).map(function (k) { return opt('prtype', k, k === 'reps' ? 'Powtórzenia' : k, PRT[k].name, D.type === k); }).join('') + '</div></fieldset>' +
        (S.peak && EXI[S.peak.ex] ? '<section class="card"><h2>Przygotowanie w toku</h2><p>' + EXI[S.peak.ex].name + ' · ' + S.peak.type + ' · ' + dshort(S.peak.date) + '</p><button class="btn btn--ghost" data-act="peak-cancel">Anuluj przygotowanie</button></section>' : '') +
        '<ul class="rows--pick">' + list.map(function (e) {
          var b = best(e.id), hit = painHit(e);
          return '<li><button class="pick" data-act="pr-pick" data-v="' + e.id + '">' + thumb(e) +
            '<span><b>' + e.name + '</b><small>' + (b ? 'szac. maks ' + kg(b.e) + ' · najlepiej ' + kg(b.w) + ' × ' + b.r : 'brak historii, podasz wynik') + (hit.length ? ' · <em class="bad">ból: ' + hit.map(function (j) { return SZ.JOINTS[j]; }).join(', ') + '</em>' : '') + '</small></span></button></li>';
        }).join('') + '</ul>';
    }
    var ex = EXI[D.ex], hit = painHit(ex);
    if (D.step === 1) {
      var b = best(ex.id);
      if (hit.length) return '<header class="page"><button class="back" data-act="pr-back">Wybór</button><h1>' + ex.name + '</h1></header><section class="card stop"><h2>Odradzamy dziś próbę rekordu</h2><p>Zaznaczyłeś ból: ' + hit.map(function (j) { return SZ.JOINTS[j]; }).join(', ') + '. To ćwiczenie mocno obciąża to miejsce, a maksymalny ciężar zwiększa ryzyko kontuzji.</p><button class="btn btn--ghost" data-act="pr-back">Wybierz inne ćwiczenie</button></section>';
      return '<header class="page"><button class="back" data-act="pr-back">Wybór</button><h1>' + ex.name + '</h1><p class="lead">' + PRT[D.type].name + '</p></header>' +
        '<form class="card" data-prform onsubmit="return false">' + (b ? '<p class="big"><b>' + kg(b.e) + '</b></p><p class="muted">Twój szacowany maks na 1 powtórzenie, wyliczony z ' + kg(b.w) + ' × ' + b.r + ' (' + dshort(b.date) + '). Popraw, jeśli wiesz lepiej.</p>' : '<p>Nie masz jeszcze zapisanej serii w tym ćwiczeniu. Podaj najlepszą serię z ostatnich tygodni.</p>') +
        '<div class="grid2">' + num('pw', 'Ciężar', b ? b.w : round(guessStart(ex) * 1.3, ex.unit || 2.5), 'kg') + num('pr', 'Powtórzenia', b ? b.r : 5, '×') + '</div>' +
        (D.type === 'reps' ? num('rw', 'Ciężar próby', b ? round(b.e * .75, ex.unit || 2.5) : '', 'kg') : '') + '</form>' +
        '<section class="card"><h2>Gotowość</h2><p class="muted">Zaznacz uczciwie. Każde „nie” obniża dzisiejszy cel.</p><div class="checks">' +
        [['sen', 'Spałem co najmniej 7 godzin'], ['jedz', 'Jadłem 1,5–3 godziny temu'], ['woda', 'Jestem nawodniony'], ['bol', 'Nic mnie dziś nie boli w tej partii'], ['ase', 'Mam asekurację lub zabezpieczenia (stojaki, ograniczniki)']].map(function (c) {
          return '<label class="check-row"><input type="checkbox" name="' + c[0] + '"><span>' + c[1] + '</span></label>';
        }).join('') + '</div></section>' +
        '<div class="stack"><button class="btn btn--main btn--wide" data-act="pr-plan">Ułóż plan na dziś</button><button class="btn btn--ghost btn--wide" data-act="peak-open">Przygotuj mnie w 1–3 tygodnie</button></div>';
    }
    var P = D.plan;
    return '<header class="page"><button class="back" data-act="pr-back1">Gotowość</button><h1>' + ex.name + ': plan</h1><p class="lead">Cel: <b>' + P.goalTxt + '</b>' + (P.pen ? ' (obniżony o ' + P.pen + '% przez gotowość)' : '') + '.</p></header>' +
      ramp(P) +
      '<ol class="prsteps">' + P.steps.map(function (s, i) {
        var st = D.log[i] || '';
        return '<li class="prs prs--' + s.kind + (st ? ' is-' + st : '') + '"><div class="prs__main"><b>' + s.what + '</b><small>' + s.label + (s.tip ? ' · ' + s.tip : '') + '</small></div>' +
          (s.kind === 'att' ? '<div class="lights" role="group" aria-label="Wynik podejścia"><button class="light light--ok' + (st === 'ok' ? ' is-on' : '') + '" data-act="pr-res" data-i="' + i + '" data-v="ok" aria-pressed="' + (st === 'ok') + '">Zaliczone</button><button class="light light--no' + (st === 'no' ? ' is-on' : '') + '" data-act="pr-res" data-i="' + i + '" data-v="no" aria-pressed="' + (st === 'no') + '">Nie wyszło</button></div>' :
            '<button class="check" data-act="pr-done" data-i="' + i + '" aria-pressed="' + (st === 'done') + '" aria-label="Zrobione: ' + esc(s.what) + '">' + ICON.check + '</button>') +
          (s.rest ? '<button class="restbtn" data-act="pr-rest" data-s="' + s.rest + '">Przerwa ' + (s.rest >= 60 ? nf(s.rest / 60, s.rest % 60 ? 1 : 0) + ' min' : s.rest + ' s') + '</button>' : '') +
          (s.kind === 'att' && i === P.firstAtt ? '<div class="prs__tech">' + FIG.figure(ex, { cls: 'fig--md' }) + '<ul class="tips">' + ex.cues.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '<li>Oddech i napięcie brzucha przed każdym zejściem.</li></ul></div>' : '') + '</li>';
      }).join('') + '</ol>' +
      '<button class="btn btn--main btn--wide" data-act="pr-finish">Zapisz wynik</button>';
  };
  function ramp(P) {
    var pts = P.steps.filter(function (s) { return s.w; }), top = Math.max.apply(null, pts.map(function (s) { return s.w; }));
    return '<div class="ramp" role="img" aria-label="Narastanie ciężaru od rozgrzewki do próby rekordu">' + pts.map(function (s) {
      return '<span class="ramp__b' + (s.kind === 'att' ? ' is-att' : '') + '" style="--h:' + (s.w / top) + '"><em>' + Math.round(s.w) + '</em></span>';
    }).join('') + '</div>';
  }
  function buildPr(ex, w, r, checks, type, rw) {
    var e = e1rm(w, r), u = ex.unit || 2.5;
    var neg = ['sen', 'jedz', 'woda', 'bol', 'ase'].filter(function (k) { return !checks[k]; }).length, pen = Math.min(neg * 2, 8), base = e * (1 - pen / 100);
    var steps = [
      { kind: 'prep', label: 'rozgrzewka ogólna', what: '5–8 min roweru, skakanki lub szybkiego marszu', tip: 'Do lekkiego spocenia.' },
      { kind: 'prep', label: 'mobilizacja', what: 'Krążenia stawów i 10 lekkich powtórzeń ruchu z samym gryfem', tip: 'Ruch, nie długie trzymanie.' }
    ];
    var reps = PRT[type].reps, target, goalTxt, atts;
    if (type === 'reps') {
      var ww = rw || round(base * .75, u), pred = Math.max(1, Math.floor(30 * (base / ww - 1)));
      target = ww; goalTxt = kg(ww) + ' × ' + (pred + 1);
      atts = [[ww, 'podejście', 'Rób powtórzenia, dopóki technika jest czysta. Cel: ' + (pred + 1) + '.', 0, pred + 1]];
    } else {
      var xr = base / (1 + (reps > 1 ? reps / 30 : 0));
      var a1 = round(xr * .93, u), a2 = round(xr * .99, u), a3 = Math.max(round(xr * 1.025, u), a2 + u);
      target = a3; goalTxt = kg(a3) + ' × ' + reps;
      atts = [[a1, 'podejście 1', 'Pewniak: ma pójść gładko.', 240, reps], [a2, 'podejście 2', 'Okolice Twojego obecnego maksa.', 240, reps], [a3, 'podejście 3', 'Próba rekordu. Idź tylko, jeśli 2. było szybkie.', 0, reps]];
    }
    if (ex.eq.indexOf('sztanga') > -1) steps.push({ kind: 'warm', label: 'rozgrzewka', what: 'Pusta sztanga × 10', rest: 60, w: S.bar || 20 });
    [[.4, 5, 60], [.55, 3, 90], [.7, 2, 120], [.8, 1, 150], [.88, 1, 180]].forEach(function (p) { var w2 = round(target * p[0], u); if (w2 > 0) steps.push({ kind: 'warm', label: 'rozgrzewka', what: kg(w2) + ' × ' + (type === 'reps' ? Math.max(1, p[1] - 1) : p[1]), rest: p[2], w: w2 }); });
    var firstAtt = steps.length;
    atts.forEach(function (a) { steps.push({ kind: 'att', label: a[1], what: kg(a[0]) + ' × ' + a[4], tip: a[2], rest: a[3], w: a[0], reps: a[4] }); });
    return { e: e, pen: pen, goalTxt: goalTxt, steps: steps, firstAtt: firstAtt, type: type };
  }

  /* ---------- ĆWICZENIA ---------- */
  var libFilter = 'all', libQ = '', libOk = false, detailView = {};
  function repPRs(exId) {
    var out = {};
    history(exId).forEach(function (h) { h.sets.forEach(function (x) { [1, 3, 5, 10].forEach(function (n) { if (x.r >= n && x.w > 0 && (!out[n] || x.w > out[n].w)) out[n] = { w: x.w, date: h.date }; }); }); });
    return out;
  }
  function libList() {
    return SZ.EX.filter(function (e) {
      if (libOk && !usable(e)) return false;
      if (libQ && e.name.toLowerCase().indexOf(libQ) < 0) return false;
      if (libFilter === 'all') return true;
      var g = SZ.GROUPS.filter(function (x) { return x.id === libFilter; })[0]; return e.prim.some(function (m) { return g.m.indexOf(m) > -1; });
    });
  }
  function libItems(list) {
    return list.map(function (e) {
      var ok = usable(e);
      return '<li><a class="libcard' + (ok ? '' : ' is-off') + '" href="#/cw/' + e.id + '">' + thumb(e, 'fig--md') + '<b>' + e.name + '</b><small>' + (ok ? muscles(e.prim) : whyNot(e)) + '</small>' + FIG.atlas({ prim: e.prim, sec: e.sec, small: 1 }) + '</a></li>';
    }).join('');
  }
  routes.cwiczenia = function () {
    var list = libList();
    return '<header class="page"><h1>Ćwiczenia</h1><p class="lead">' + SZ.EX.filter(usable).length + ' z ' + SZ.EX.length + ' pasuje do Twojego sprzętu i ciała.</p></header>' +
      '<div class="libtools"><label class="search"><span class="sr">Szukaj</span><input type="search" placeholder="Szukaj, np. skos, wyciąg…" value="' + esc(libQ) + '" data-lib-q></label><label class="toggle"><input type="checkbox" data-lib-ok' + (libOk ? ' checked' : '') + '><span>Tylko dostępne</span></label></div>' +
      '<div class="focus" role="group" aria-label="Partia"><button class="chip' + (libFilter === 'all' ? ' is-on' : '') + '" data-act="lib" data-v="all" aria-pressed="' + (libFilter === 'all') + '">Wszystkie</button>' +
      SZ.GROUPS.map(function (g) { return '<button class="chip' + (libFilter === g.id ? ' is-on' : '') + '" data-act="lib" data-v="' + g.id + '" aria-pressed="' + (libFilter === g.id) + '">' + g.name + '</button>'; }).join('') + '</div>' +
      '<p class="muted" data-lib-n>' + list.length + ' ćwiczeń</p><ul class="lib" data-lib>' + libItems(list) + '</ul>';
  };
  routes.cw = function (id) {
    var e = EXI[id]; if (!e) return routes.cwiczenia();
    var b = best(id), h = history(id), ok = usable(e), vw = detailView[id] || (FIG.hasFront(e) && /raise|abduct|adduct|jack/.test(e.front) ? 'front' : 'side');
    var alts = alternatives(id).slice(0, 4), reg = e.reg && EXI[e.reg], prog = e.prog && EXI[e.prog], rp = repPRs(id);
    return '<header class="page"><a class="back" href="#/cwiczenia">Ćwiczenia</a><h1>' + e.name + '</h1></header>' +
      (ok ? '' : '<p class="warnline">Nie w Twoim planie: ' + whyNot(e) + '</p>') +
      '<div class="plate">' + FIG.figure(e, { cls: 'fig--xl', view: vw }) +
      (FIG.hasFront(e) ? seg('view', [['side', 'Z boku'], ['front', 'Z przodu']], vw, 'seg--2 seg--view') : '') + '<p class="plate__legend"><i class="lg lg--p"></i>pracuje <i class="lg lg--trk"></i>tor ruchu <i class="lg lg--gh"></i>druga pozycja</p></div>' +
      '<section class="card"><h2>Technika</h2><ol class="cuelist">' + e.cues.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ol></section>' +
      '<section class="card card--err"><h2>Najczęstsze błędy</h2><ul class="errs">' + e.errs.map(function (c) { return '<li>' + ICON.x + c + '</li>'; }).join('') + '</ul></section>' +
      '<section class="card"><h2>Pracujące mięśnie</h2>' + FIG.atlas({ prim: e.prim, sec: e.sec, pain: S.pain }) +
      '<p class="legend"><span class="lg lg--p"></span>' + muscles(e.prim) + (e.sec.length ? ' <span class="lg lg--s"></span>' + muscles(e.sec) : '') + '</p></section>' +
      '<dl class="ledger"><div><dt>Sprzęt</dt><dd>' + (e.eq.length ? e.eq.map(eqName).join(', ') : 'bez sprzętu') + '</dd></div>' +
      '<div><dt>Obciąża</dt><dd>' + (e.stress.length ? e.stress.map(function (j) { return SZ.JOINTS[j]; }).join(', ') : 'nic szczególnie') + '</dd></div>' +
      '<div><dt>Rodzaj</dt><dd>' + (e.kind === 'c' ? 'wielostawowe' : 'izolowane') + (e.uni ? ', jednostronne' : '') + '</dd></div><div><dt>Poziom</dt><dd>' + ['', 'łatwe', 'średnie', 'trudne'][e.lvl] + '</dd></div></dl>' +
      (reg || prog ? '<section class="card"><h2>Łatwiej i trudniej</h2><ul class="rows">' + (reg ? '<li><a href="#/cw/' + reg.id + '"><b>Łatwiej: ' + reg.name + '</b><span>' + muscles(reg.prim) + '</span></a></li>' : '') + (prog ? '<li><a href="#/cw/' + prog.id + '"><b>Trudniej: ' + prog.name + '</b><span>' + muscles(prog.prim) + '</span></a></li>' : '') + '</ul></section>' : '') +
      (alts.length ? '<section class="card"><h2>Zamienniki</h2><ul class="rows">' + alts.map(function (a) { return '<li><a href="#/cw/' + a.id + '"><b>' + a.name + '</b><span>' + muscles(a.prim) + '</span></a></li>'; }).join('') + '</ul></section>' : '') +
      (S.notes[id] ? '<section class="card"><h2>Twoja notatka</h2><p>' + esc(S.notes[id]) + '</p></section>' : '') +
      '<section class="card"><div class="card__head"><h2>Twoja historia</h2><span class="muted">' + h.length + ' treningów</span></div>' +
      (b ? '<div class="reps4">' + [1, 3, 5, 10].map(function (n) { return '<div><span>' + n + ' powt.</span><b>' + (rp[n] ? kg(rp[n].w) : '—') + '</b></div>'; }).join('') + '</div>' : '') +
      (h.length ? '<ul class="rows">' + h.slice(-12).reverse().map(function (x) { return '<li><b>' + dshort(x.date) + '</b><span>' + x.sets.map(function (s) { return (s.w ? nf(s.w, s.w % 1 ? 1 : 0) + '×' : '') + s.r + (s.rpe ? ' @' + s.rpe : ''); }).join(', ') + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">Jeszcze nie robiłeś tego ćwiczenia.</p>') + '</section>' +
      (S.active ? '<button class="btn btn--ghost btn--wide" data-act="add-to-active" data-v="' + id + '">Dodaj do trwającego treningu</button>' : '');
  };

  /* ---------- CIAŁO ---------- */
  function painHint(l) { return l <= 3 ? 'Lekki ból: zostawiamy ćwiczenia, ale oznaczymy je „uważaj”.' : l <= 6 ? 'Umiarkowany: pomijamy ćwiczenia obciążające to miejsce.' : 'Silny: pomijamy ćwiczenia i radzimy konsultację ze specjalistą.'; }
  function painSheet(key) {
    var pp = key.split('-'), it = S.pain[key], lvl = it ? it.lvl : 4;
    openSheet(FIG.jointLabel(pp[0], pp[1]), '<p class="muted">Jak mocno boli przy codziennym ruchu?</p>' +
      '<div class="painscale"><input type="range" min="1" max="10" value="' + lvl + '" data-pain-range aria-label="Ból od 1 do 10"><output data-pain-out>' + lvl + '/10</output></div>' +
      '<p class="muted" data-pain-hint>' + painHint(lvl) + '</p>' +
      '<div class="stack"><button class="btn btn--main btn--wide" data-sheet="pain-save">Zapisz</button>' + (it ? '<button class="btn btn--ghost btn--wide" data-sheet="pain-del">Już nie boli</button>' : '') + '</div>', function (t) {
      var b = t.closest('[data-sheet]'); if (!b) return;
      if (b.getAttribute('data-sheet') === 'pain-save') { var v = +$('[data-pain-range]').value; S.pain[key] = { lvl: v, date: Date.now() }; S.painLog.push({ key: key, lvl: v, date: Date.now() }); }
      else { delete S.pain[key]; S.painLog.push({ key: key, lvl: 0, date: Date.now() }); }
      save(); closeSheet(); render();
    });
  }
  routes.cialo = function () {
    var excl = SZ.EX.filter(function (e) { return painHit(e).length; }), keys = Object.keys(S.pain);
    return '<header class="page"><h1>Ciało</h1><p class="lead">Dotknij miejsca, które boli, i oceń ból od 1 do 10. Od 4/10 plan omija ćwiczenia, które je obciążają.</p></header>' +
      '<section class="card">' + FIG.atlas({ mode: 'pain', pain: S.pain }) + painChips() + '</section>' +
      (keys.length ? '<section class="card"><h2>Dziennik bólu</h2><ul class="painlog">' + keys.map(function (k) {
        var log = S.painLog.filter(function (x) { return x.key === k && x.lvl > 0; }).slice(-6), first = log[0], last = log[log.length - 1];
        var trend = log.length > 1 ? (last.lvl < first.lvl ? 'lepiej' : last.lvl > first.lvl ? 'gorzej' : 'bez zmian') : 'pierwszy wpis';
        return '<li><button class="painrow" data-act="pain-open" data-v="' + k + '"><b>' + FIG.jointLabel.apply(null, k.split('-')) + '</b><span class="spark" aria-hidden="true">' + log.map(function (x) { return '<i style="--v:' + (x.lvl / 10) + '"></i>'; }).join('') + '</span><span class="painrow__t is-' + (trend === 'lepiej' ? 'up' : trend === 'gorzej' ? 'down' : 'flat') + '">' + S.pain[k].lvl + '/10 · ' + trend + '</span><small>ocena ' + ago(S.pain[k].date) + '</small></button></li>';
      }).join('') + '</ul></section>' +
        '<section class="card"><details class="excl"><summary>Pominięte ćwiczenia (' + excl.length + ')</summary><ul class="rows">' + excl.map(function (e) { return '<li><a href="#/cw/' + e.id + '"><b>' + e.name + '</b><span>obciąża: ' + painHit(e).map(function (j) { return SZ.JOINTS[j]; }).join(', ') + '</span></a></li>'; }).join('') + '</ul></details></section>' : '') +
      '<section class="card"><div class="card__head"><h2>Zmęczenie mięśni</h2><span class="muted">ostatnie 4 dni</span></div>' + FIG.atlas({ heat: fatigue() }) + '<p class="legend"><span class="lg lg--heat"></span>im mocniejszy kolor, tym więcej serii ostatnio</p></section>' +
      medNote();
  };

  /* ---------- ROZCIĄGANIE ---------- */

  /* ---------- POSTĘPY ---------- */
  var chartEx = null;
  var STD = { squat: [.75, 1.25, 1.75, 2.25], bench: [.5, .9, 1.25, 1.6], deadlift: [1, 1.5, 2, 2.5], ohp: [.35, .55, .8, 1] };
  function quickLinks() { return '<div class="duo duo--3"><a class="tile" href="#/pomiary"><b>Pomiary</b><small>Waga i obwody</small></a><a class="tile" href="#/zdjecia"><b>Zdjęcia</b><small>Przed i po</small></a><a class="tile" href="#/odznaki"><b>Odznaki</b><small>' + earnedBadges().length + ' z ' + SZ.BADGES.length + '</small></a></div>'; }
  routes.postepy = function () {
    var withH = SZ.EX.filter(function (e) { return history(e.id).some(function (h) { return h.sets.some(function (x) { return x.w > 0; }); }); });
    if (!chartEx || !withH.filter(function (e) { return e.id === chartEx; }).length) chartEx = withH[0] ? withH[0].id : null;
    var thisWeek = S.sessions.filter(function (s) { return s.date >= mondayOf(Date.now()); }).length;
    var targets = Object.keys(S.goal.targets || {}).filter(function (k) { return S.goal.targets[k] > 0 && EXI[k]; });
    var prs = Object.keys(S.prs).filter(function (k) { return EXI[k]; }).map(function (k) { return { ex: k, p: S.prs[k] }; }).sort(function (a, b) { return b.p.date - a.p.date; });
    if (!S.sessions.length) return '<header class="page"><h1>Postępy</h1></header><section class="card empty"><p>Tu pojawią się wykresy po pierwszym zapisanym treningu.</p><a class="btn btn--main" href="#/">Zacznij trening</a><button class="btn btn--ghost" data-act="demo-load">Wczytaj przykładowe dane</button></section>' + quickLinks();
    var mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
    var month = S.sessions.filter(function (s) { return s.date >= mStart.getTime(); }), mVol = 0, mMin = 0;
    month.forEach(function (s) { mMin += s.dur || 0; s.items.forEach(function (it) { it.sets.forEach(function (x) { if (!x.warm) mVol += (x.w || 0) * x.r; }); }); });
    return demoBar() + '<header class="page"><h1>Postępy</h1></header>' +
      '<dl class="ledger ledger--3 ledger--big"><div><dt>Tydzień</dt><dd>' + thisWeek + '<small>/' + S.profile.days + '</small></dd></div><div><dt>Seria</dt><dd>' + streakWeeks() + '<small> tyg.</small></dd></div><div><dt>Rekordy</dt><dd>' + prs.length + '</dd></div></dl>' +
      '<section class="card"><div class="card__head"><h2>Aktywność</h2><span class="muted">18 tygodni</span></div>' + heatmap() +
      '<p class="muted">' + MONF[mStart.getMonth()] + ': ' + month.length + ' treningów · ' + nf(mVol / 1000, 1) + ' t objętości · ' + nf(mMin / 60, 1) + ' h</p></section>' +
      '<section class="card"><div class="card__head"><h2>Cele</h2><a class="link" href="#/profil">Zmień</a></div>' +
      (targets.length ? '<ul class="goals">' + targets.map(goalRow).join('') + '</ul>' : '<p class="muted">Ustaw liczby, do których dążysz (np. przysiad 120 kg do marca), a pokażemy postęp i prognozę.</p><a class="btn btn--ghost" href="#/profil">Ustaw cele</a>') + '</section>' +
      (chartEx ? '<section class="card"><h2>Szacowany maks (1RM)</h2><div class="chips chips--scroll">' + withH.map(function (e) { return '<button class="chip' + (e.id === chartEx ? ' is-on' : '') + '" data-act="chart" data-v="' + e.id + '" aria-pressed="' + (e.id === chartEx) + '">' + e.name + '</button>'; }).join('') + '</div>' + lineChart(chartEx) + '</section>' : '') +
      strengthCard() +
      '<section class="card"><h2>Objętość tygodniowa</h2>' + volChart() + '</section>' +
      (prs.length ? '<section class="card"><h2>Rekordy</h2><ul class="rows">' + prs.slice(0, 10).map(function (x) { return '<li><a href="#/cw/' + x.ex + '"><b>' + EXI[x.ex].name + '</b><span>' + kg(x.p.w) + ' × ' + x.p.r + ' · szac. ' + kg(x.p.e) + ' · ' + dshort(x.p.date) + '</span></a></li>'; }).join('') + '</ul></section>' : '') +
      quickLinks() +
      '<section class="card"><h2>Historia</h2><ul class="rows">' + S.sessions.slice(-10).reverse().map(function (s) { return '<li><b>' + esc(s.title) + '</b><span>' + dshort(s.date) + ' · ' + s.items.length + ' ćw. · ' + (s.dur || '—') + ' min</span></li>'; }).join('') + '</ul></section>';
  };
  function forecast(k, t) {
    var pts = history(k).map(function (h) { var m = 0; h.sets.forEach(function (x) { m = Math.max(m, e1rm(x.w, x.r)); }); return [h.date, m]; }).filter(function (p) { return p[1] > 0 && Date.now() - p[0] < 70 * DAY; });
    if (pts.length < 3) return null;
    var n = pts.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
    pts.forEach(function (p) { var x = p[0] / DAY; sx += x; sy += p[1]; sxy += x * p[1]; sxx += x * x; });
    var slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), icp = (sy - slope * sx) / n;
    if (!(slope > .01)) return null;
    return Math.max(Date.now(), (t - icp) / slope * DAY);
  }
  function goalRow(k) {
    var t = S.goal.targets[k], b = best(k), start = (S.goal.starts || {})[k] || (b ? b.e * .85 : 0), cur = b ? b.e : 0;
    var p = Math.max(0, Math.min(1, (cur - start) / Math.max(t - start, 1)));
    var dl = S.goal.deadlines && S.goal.deadlines[k], fc = forecast(k, t), txt;
    if (cur >= t) txt = 'Cel osiągnięty.';
    else if (fc) txt = 'W tym tempie: ok. ' + dshort(fc) + (dl ? (fc <= new Date(dl).getTime() ? ' · zdążysz przed ' + dshort(new Date(dl)) : ' · nie zdążysz do ' + dshort(new Date(dl)) + ', dodaj trening tej partii') : '') + '.';
    else txt = 'Brakuje ' + kg(t - cur) + '. Za mało danych na prognozę.';
    return '<li><div class="goals__top"><b>' + EXI[k].name + '</b><span>' + (b ? kg(cur) : '—') + ' / ' + kg(t) + '</span></div><div class="bar bar--goal"><i style="--w:' + p + '"></i></div><small class="' + (dl && fc && fc > new Date(dl).getTime() ? 'is-late' : '') + '">' + txt + '</small></li>';
  }
  function strengthCard() {
    var rows = Object.keys(STD).filter(function (k) { return best(k); });
    if (!rows.length) return '';
    var lbl = ['początkujący', 'średni', 'zaawansowany', 'bardzo zaawansowany', 'elitarny'];
    return '<section class="card"><h2>Siła względem masy ciała</h2><ul class="rel">' + rows.map(function (k) {
      var r = best(k).e / S.profile.weight, s = STD[k], lv = s.filter(function (x) { return r >= x; }).length;
      return '<li><div class="goals__top"><b>' + EXI[k].name + '</b><span>' + nf(r, 2) + '× masy ciała</span></div><div class="relbar" aria-hidden="true">' + [0, 1, 2, 3, 4].map(function (i) { return '<i class="' + (i <= lv ? 'on' : '') + '"></i>'; }).join('') + '</div><small>Poziom: ' + lbl[lv] + '</small></li>';
    }).join('') + '</ul><p class="muted">Orientacyjne progi dla trenujących amatorsko. Oceniają wynik, nie technikę.</p></section>';
  }
  function streakWeeks() {
    var n = 0, m = mondayOf(Date.now());
    for (var w = 0; w < 104; w++) { var a = m - w * 7 * DAY, b = a + 7 * DAY; if (S.sessions.some(function (s) { return s.date >= a && s.date < b; })) n++; else if (w > 0) break; }
    return n;
  }
  function heatmap() {
    var start = mondayOf(Date.now()) - 17 * 7 * DAY, cells = '', byDay = {};
    S.sessions.forEach(function (s) { byDay[dayKey(s.date)] = 1; });
    for (var w = 0; w < 18; w++) for (var d = 0; d < 7; d++) {
      var t = start + (w * 7 + d) * DAY, v = byDay[dayKey(t)], fut = t > Date.now();
      cells += '<i style="grid-column:' + (w + 1) + ';grid-row:' + (d + 1) + '" class="' + (fut ? 'is-fut' : v ? 'is-on' : '') + '"></i>';
    }
    return '<div class="hm" role="img" aria-label="Kalendarz treningów z ostatnich 18 tygodni: ' + Object.keys(byDay).length + ' dni treningowych">' + cells + '</div>';
  }
  function lineChart(id) {
    var pts = history(id).map(function (h) { var m = 0; h.sets.forEach(function (x) { var v = e1rm(x.w, x.r); if (v > m) m = v; }); return { d: h.date, v: m }; }).filter(function (p) { return p.v > 0; }).slice(-16);
    if (pts.length < 2) return '<p class="muted">Za mało danych na wykres. Zrób jeszcze jeden trening z tym ćwiczeniem.</p>';
    var W = 340, H = 180, L = 40, R = 10, T = 14, B = 26;
    var lo = Math.min.apply(null, pts.map(function (p) { return p.v; })), hi = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    var tl = S.goal.targets && S.goal.targets[id]; if (tl) hi = Math.max(hi, tl);
    var pad = Math.max((hi - lo) * .15, 5); lo = Math.floor((lo - pad) / 5) * 5; hi = Math.ceil((hi + pad) / 5) * 5;
    var x = function (i) { return L + (W - L - R) * i / (pts.length - 1); }, y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join('');
    var grid = ''; for (var g = 0; g <= 3; g++) { var v = lo + (hi - lo) * g / 3, yy = y(v); grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" class="c-grid"/><text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end" class="c-ax">' + Math.round(v) + '</text>'; }
    if (tl) grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(tl) + '" y2="' + y(tl) + '" class="c-goal"/><text x="' + (W - R) + '" y="' + (y(tl) - 4) + '" text-anchor="end" class="c-ax c-ax--goal">cel ' + tl + '</text>';
    var last = pts[pts.length - 1], first = pts[0];
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Szacowany maks w ' + EXI[id].name + ': od ' + kg(first.v) + ' do ' + kg(last.v) + '">' + grid +
      '<path d="' + d + '" class="c-line"/>' + pts.map(function (p, i) { return '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="' + (i === pts.length - 1 ? 5 : 3) + '" class="c-dot' + (i === pts.length - 1 ? ' is-last' : '') + '"/>'; }).join('') +
      '<text x="' + L + '" y="' + (H - 6) + '" class="c-ax">' + dshort(first.d) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end" class="c-ax">' + dshort(last.d) + '</text></svg>' +
      '<p class="chart__sum"><b>' + kg(last.v) + '</b> teraz · ' + (last.v >= first.v ? '+' : '') + nf(last.v - first.v, 1) + ' kg od ' + dshort(first.d) + '</p>';
  }
  function volChart() {
    var weeks = [], m = mondayOf(Date.now());
    for (var w = 7; w >= 0; w--) {
      var a = m - w * 7 * DAY, b = a + 7 * DAY, v = 0;
      S.sessions.forEach(function (s) { if (s.date >= a && s.date < b) s.items.forEach(function (it) { it.sets.forEach(function (x) { if (!x.warm) v += (x.w || 0) * x.r; }); }); });
      weeks.push({ v: v });
    }
    var max = Math.max.apply(null, weeks.map(function (x) { return x.v; })) || 1;
    return '<div class="vol" role="img" aria-label="Objętość w ostatnich 8 tygodniach">' + weeks.map(function (x, i) {
      return '<div class="vol__col"><span class="vol__v">' + (x.v ? nf(x.v / 1000, 1) : '') + '</span><i style="--h:' + (x.v / max) + '"' + (i === 7 ? ' class="is-now"' : '') + '></i><small>' + (i === 7 ? 'teraz' : '−' + (7 - i)) + '</small></div>';
    }).join('') + '</div><p class="muted">Tony (ciężar × powtórzenia) w kolejnych tygodniach.</p>';
  }

  /* ---------- POMIARY ---------- */
  var MEAS = [['weight', 'Masa ciała', 'kg'], ['waist', 'Talia', 'cm'], ['chest', 'Klatka', 'cm'], ['hips', 'Biodra', 'cm'], ['arm', 'Ramię', 'cm'], ['thigh', 'Udo', 'cm']];
  function simpleLine(pts, unit) {
    var W = 340, H = 150, L = 38, R = 10, T = 12, B = 24;
    var lo = Math.min.apply(null, pts.map(function (p) { return p.v; })) - 1, hi = Math.max.apply(null, pts.map(function (p) { return p.v; })) + 1;
    var x = function (i) { return L + (W - L - R) * i / Math.max(1, pts.length - 1); }, y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Od ' + nf(pts[0].v, 1) + ' do ' + nf(pts[pts.length - 1].v, 1) + ' ' + unit + '"><line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(lo + 1) + '" y2="' + y(lo + 1) + '" class="c-grid"/><line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(hi - 1) + '" y2="' + y(hi - 1) + '" class="c-grid"/><text x="' + (L - 6) + '" y="' + (y(hi - 1) + 4) + '" text-anchor="end" class="c-ax">' + nf(hi - 1, 1) + '</text><text x="' + (L - 6) + '" y="' + (y(lo + 1) + 4) + '" text-anchor="end" class="c-ax">' + nf(lo + 1, 1) + '</text>' +
      '<path d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join('') + '" class="c-line"/>' + pts.map(function (p, i) { return '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="3" class="c-dot"/>'; }).join('') +
      '<text x="' + L + '" y="' + (H - 6) + '" class="c-ax">' + dshort(pts[0].d) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end" class="c-ax">' + dshort(pts[pts.length - 1].d) + '</text></svg>';
  }
  routes.pomiary = function () {
    var last = S.measures[S.measures.length - 1] || {}, ws = S.measures.filter(function (m) { return m.weight; });
    return '<header class="page"><a class="back" href="#/postepy">Postępy</a><h1>Pomiary</h1></header>' +
      '<form class="card" data-meas onsubmit="return false"><h2>Nowy pomiar</h2><div class="grid2">' + MEAS.map(function (m) { return num(m[0], m[1], '', m[2], last[m[0]] ? ' placeholder="' + nf(last[m[0]], 1) + '"' : ''); }).join('') + '</div><button class="btn btn--main btn--wide" data-act="meas-save">Zapisz pomiar</button></form>' +
      (ws.length > 1 ? '<section class="card"><h2>Masa ciała</h2>' + simpleLine(ws.map(function (m) { return { d: m.date, v: m.weight }; }), 'kg') + '</section>' : '') +
      (S.measures.length ? '<section class="card"><h2>Historia</h2><div class="table-wrap"><table class="mtable"><thead><tr><th>Data</th>' + MEAS.map(function (m) { return '<th>' + m[1] + '</th>'; }).join('') + '<th><span class="sr">Usuń</span></th></tr></thead><tbody>' +
        S.measures.map(function (m, i) { return [m, i]; }).reverse().map(function (x) { var m = x[0]; return '<tr><td>' + dshort(m.date) + '</td>' + MEAS.map(function (f) { return '<td>' + (m[f[0]] ? nf(m[f[0]], m[f[0]] % 1 ? 1 : 0) : '—') + '</td>'; }).join('') + '<td><button class="iconbtn iconbtn--xs" data-act="meas-del" data-i="' + x[1] + '" aria-label="Usuń pomiar z ' + dshort(m.date) + '">' + ICON.trash + '</button></td></tr>'; }).join('') + '</tbody></table></div></section>' : '');
  };

  /* ---------- ZDJĘCIA ---------- */
  var photoCache = null, cmpSel = [];
  function loadPhotos() {
    return idb().then(function (db) { return new Promise(function (res) { var out = [], c = db.transaction('photos').objectStore('photos').openCursor(); c.onsuccess = function () { var cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out); }; c.onerror = function () { res([]); }; }); }).catch(function () { return []; });
  }
  routes.zdjecia = function () {
    if (!photoCache) { loadPhotos().then(function (p) { photoCache = p.sort(function (a, b) { return a.date - b.date; }); if (/zdjecia/.test(location.hash)) render(); }); return '<p class="loading">Wczytuję zdjęcia…</p>'; }
    photoCache.forEach(function (p) { if (!p.url) p.url = URL.createObjectURL(p.blob); });
    var cmp = cmpSel.length === 2 ? cmpSel.map(function (id) { return photoCache.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean).sort(function (a, b) { return a.date - b.date; }) : [];
    return '<header class="page"><a class="back" href="#/postepy">Postępy</a><h1>Zdjęcia sylwetki</h1><p class="lead">Zdjęcia zostają tylko na tym telefonie i nie trafiają do kopii w pliku.</p></header>' +
      '<label class="btn btn--main btn--wide filebtn">' + ICON.camera + ' Dodaj zdjęcie<input type="file" accept="image/*" capture="environment" data-photo></label>' +
      (cmp.length === 2 ? '<section class="card"><h2>Porównanie</h2><div class="cmp">' + cmp.map(function (p) { return '<figure><img src="' + p.url + '" alt="Zdjęcie sylwetki z ' + dshort(p.date) + '"><figcaption>' + dshort(p.date) + '</figcaption></figure>'; }).join('') + '</div><button class="btn btn--ghost" data-act="cmp-clear">Wyczyść wybór</button></section>' : '') +
      (photoCache.length ? (photoCache.length > 1 ? '<p class="muted">Dotknij dwóch zdjęć, żeby je porównać obok siebie.</p>' : '') + '<ul class="photos">' + photoCache.slice().reverse().map(function (p) {
        var on = cmpSel.indexOf(p.id) > -1;
        return '<li><button class="photo' + (on ? ' is-on' : '') + '" data-act="cmp" data-v="' + p.id + '" aria-pressed="' + on + '"><img src="' + p.url + '" alt="Zdjęcie z ' + dshort(p.date) + '" loading="lazy"><span>' + dshort(p.date) + '</span></button><button class="iconbtn iconbtn--xs photo__del" data-act="photo-del" data-v="' + p.id + '" aria-label="Usuń zdjęcie z ' + dshort(p.date) + '">' + ICON.trash + '</button></li>';
      }).join('') + '</ul>' : '<p class="empty">Brak zdjęć. Rób je w tym samym miejscu i świetle, np. co 4 tygodnie.</p>');
  };
  function addPhoto(file) {
    if (!file) return;
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var max = 1400, sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (blob) {
        var rec = { id: 'p' + Date.now(), date: Date.now(), blob: blob };
        idbReq('photos', 'readwrite', function (st) { return st.put(rec, rec.id); }).then(function () { photoCache = null; render(); toast('Zdjęcie zapisane na telefonie.'); });
      }, 'image/jpeg', .85);
    };
    img.onerror = function () { toast('Nie udało się wczytać zdjęcia.'); };
    img.src = url;
  }

  /* ---------- ODZNAKI ---------- */
  function earnedBadges() {
    var n = S.sessions.length, prs = Object.keys(S.prs).length, maxW = 0, benchB = best('bench'), tonDay = 0;
    S.sessions.forEach(function (s) { var v = 0; s.items.forEach(function (it) { it.sets.forEach(function (x) { if (x.warm) return; maxW = Math.max(maxW, x.w || 0); v += (x.w || 0) * x.r; }); }); tonDay = Math.max(tonDay, v); });
    var st = streakWeeks(), ok = { first: n >= 1, w10: n >= 10, w50: n >= 50, w100: n >= 100, kg100: maxW >= 100, bwbench: !!(benchB && benchB.w >= S.profile.weight), pr1: prs >= 1, pr10: prs >= 10, ton: tonDay >= 10000, streak4: st >= 4, streak12: st >= 12 };
    return SZ.BADGES.filter(function (b) { return ok[b.id]; });
  }
  routes.odznaki = function () {
    var got = earnedBadges().map(function (b) { return b.id; });
    return '<header class="page"><a class="back" href="#/postepy">Postępy</a><h1>Odznaki</h1><p class="lead">' + got.length + ' z ' + SZ.BADGES.length + ' zdobytych.</p></header>' +
      '<ul class="badges">' + SZ.BADGES.map(function (b) { var on = got.indexOf(b.id) > -1; return '<li class="badge' + (on ? ' is-on' : '') + '"><span class="badge__mark" aria-hidden="true">' + (on ? ICON.check : '') + '</span><b>' + b.name + '</b><small>' + b.d + (on ? '' : '') + '</small><span class="sr">' + (on ? 'zdobyta' : 'jeszcze nie') + '</span></li>'; }).join('') + '</ul>';
  };

  /* ---------- PROFIL ---------- */
  routes.profil = function () {
    var p = S.profile, tgt = ['squat', 'bench', 'deadlift', 'ohp', 'pullup-w', 'hipthrust'].filter(function (k) { return hasEq(EXI[k]); });
    return '<header class="page"><h1>Profil</h1></header>' +
      '<form class="card" data-profile onsubmit="return false"><h2>O Tobie</h2><label class="field"><span>Imię</span><input name="name" value="' + esc(p.name) + '"></label><div class="grid2">' +
      num('age', 'Wiek', p.age, 'lat') + num('height', 'Wzrost', p.height, 'cm') + num('weight', 'Masa ciała', p.weight, 'kg') + '</div>' +
      '<fieldset><legend>Doświadczenie</legend>' + seg('level', [[1, 'Początek'], [2, 'Średnio'], [3, 'Zaawans.']], p.level, 'seg--3') + '</fieldset>' +
      '<fieldset><legend>Cel</legend><div class="opts">' + Object.keys(GOALS).map(function (k) { return opt('goal', k, GOALS[k].name, GOALS[k].desc, S.goal.type === k); }).join('') + '</div></fieldset>' +
      '<fieldset><legend>Dni w tygodniu</legend>' + seg('days', [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6]], p.days) + '<p class="muted">Zmiana liczby dni ustawi nowy kalendarz i wyczyści własne treningi.</p></fieldset>' +
      '<fieldset><legend>Czas treningu (min)</legend>' + seg('minutes', [[30, 30], [45, 45], [60, 60], [90, 90]], p.minutes) + '</fieldset>' +
      '<fieldset><legend>Cele liczbowe</legend><p class="muted">Szacowany maks na jedno powtórzenie i termin. Zostaw puste, jeśli nie chcesz.</p><div class="goalgrid">' +
      tgt.map(function (k) { return '<div class="goalgrid__row"><b>' + EXI[k].name + '</b>' + num('t-' + k, 'Cel', (S.goal.targets || {})[k] || '', 'kg') + '<label class="field"><span>Do kiedy</span><input type="date" name="d-' + k + '" value="' + ((S.goal.deadlines || {})[k] || '') + '"></label></div>'; }).join('') + '</div></fieldset>' +
      '<button class="btn btn--main btn--wide" data-act="profile-save">Zapisz</button></form>' +
      '<section class="card"><h2>Sprzęt</h2>' + eqPresets() + eqChips() + '</section>' +
      '<section class="card"><h2>Talerze i gryf</h2><p class="muted">Do kalkulatora talerzy. Zaznacz talerze dostępne na Twojej siłowni.</p><div class="chips">' + [25, 20, 15, 10, 5, 2.5, 1.25, .5].map(function (pl) { var on = S.plates.indexOf(pl) > -1; return '<button class="chip' + (on ? ' is-on' : '') + '" data-act="plate-tog" data-v="' + pl + '" aria-pressed="' + on + '">' + String(pl).replace('.', ',') + ' kg</button>'; }).join('') + '</div>' +
      '<fieldset><legend>Gryf</legend>' + seg('bar', [[20, '20 kg'], [15, '15 kg'], [10, '10 kg']], S.bar, 'seg--3') + '</fieldset></section>' +
      '<section class="card"><h2>Trening</h2><label class="check-row"><input type="checkbox" data-set="sound"' + (S.settings.sound ? ' checked' : '') + '><span>Dźwięk na koniec przerwy</span></label><label class="check-row"><input type="checkbox" data-set="wake"' + (S.settings.wake ? ' checked' : '') + '><span>Ekran nie gaśnie podczas treningu</span></label></section>' +
      '<section class="card"><h2>Wygląd</h2>' + seg('theme', [['dark', 'Ciemny'], ['light', 'Jasny']], S.settings.theme === 'light' ? 'light' : 'dark', 'seg--2') + '</section>' +
      '<section class="card"><h2>Twoje dane</h2><p class="muted">Wszystko jest zapisane tylko na tym urządzeniu: w bazie przeglądarki i w kopii obok niej.</p><dl class="ledger"><div><dt>Pamięć trwała</dt><dd data-persist>sprawdzam…</dd></div><div><dt>Treningi</dt><dd>' + S.sessions.length + '</dd></div><div><dt>Ostatni zapis</dt><dd>' + (S.savedAt ? dshort(S.savedAt) + ' ' + new Date(S.savedAt).toTimeString().slice(0, 5) : '—') + '</dd></div><div><dt>Pomiary</dt><dd>' + S.measures.length + '</dd></div></dl>' +
      '<div class="stack"><button class="btn btn--main btn--wide" data-act="export">Pobierz kopię zapasową</button><label class="btn btn--ghost btn--wide filebtn">Wczytaj kopię z pliku<input type="file" accept="application/json,.json" data-import></label></div>' +
      '<p class="muted">Wyczyszczenie danych przeglądarki usuwa też dane aplikacji. Pobieraj kopię raz w miesiącu.</p></section>' +
      '<section class="card"><h2>Inne</h2><div class="stack">' + (S.demo ? '<button class="btn btn--ghost btn--wide" data-act="demo-clear">Usuń przykładowe dane</button>' : '<button class="btn btn--ghost btn--wide" data-act="demo-load">Wczytaj przykładowe dane</button>') +
      '<button class="btn btn--danger btn--wide" data-act="reset">Usuń wszystkie dane</button></div></section>';
  };

  /* ================= DANE PRZYKŁADOWE ================= */
  function demoData() {
    var sessions = [], now = Date.now(), base = { squat: 80, bench: 62.5, deadlift: 100, 'row-bar': 55, ohp: 40, 'bench-db-inc': 22, pullup: 0, 'lunge-db': 16, 'curl-db': 12, 'raise-side': 8, rdl: 70, pulldown: 50 };
    var plan = [['Cały trening A', ['squat', 'bench', 'row-bar', 'raise-side', 'plank']], ['Cały trening B', ['deadlift', 'ohp', 'pulldown', 'lunge-db', 'curl-db']], ['Cały trening C', ['squat', 'bench-db-inc', 'pullup', 'rdl', 'crunch']]];
    for (var i = 0; i < 24; i++) {
      var d = now - (60 - i * 2.4) * DAY, p = plan[i % 3], prog = Math.floor(i / 3);
      sessions.push({ id: 'd' + i, date: Math.round(d), title: p[0], tpl: p[0], dur: 52 + (i % 4) * 4, items: p[1].map(function (id) {
        var ex = EXI[id], w = base[id] == null ? 0 : base[id] + prog * (ex.unit === 1 ? 1 : 2.5);
        var reps = id === 'plank' ? 40 : id === 'pullup' ? 6 + Math.floor(prog / 2) : id === 'crunch' ? 15 : 8 - (i % 2);
        return { ex: id, unit: id === 'plank' ? 's' : '', sets: [0, 1, 2].map(function (k) { return { w: w, r: reps, done: true, rpe: 7 + (k === 2 ? 1 : 0) }; }) };
      }) });
    }
    return sessions;
  }
  function loadDemo() {
    S.sessions = demoData().concat(S.sessions.filter(function (s) { return s.id[0] !== 'd'; }));
    S.demo = true;
    if (!Object.keys(S.goal.targets || {}).length) S.goal.targets = { squat: 135, bench: 105, deadlift: 165 };
    S.goal.starts = { squat: 100, bench: 78, deadlift: 125 };
    S.goal.deadlines = { squat: dayKey(Date.now() + 120 * DAY), bench: dayKey(Date.now() + 45 * DAY) };
    if (!S.measures.length) S.measures = [0, 1, 2, 3, 4, 5].map(function (i) { return { date: Date.now() - (50 - i * 10) * DAY, weight: 82.4 - i * .5, waist: 88 - i * .6, chest: 102, arm: 36 + i * .1, thigh: 58, hips: 98 }; });
    S.prs = {}; Object.keys(EXI).forEach(function (id) { var b = best(id); if (b) S.prs[id] = { e: b.e, w: b.w, r: b.r, date: b.date }; });
    S.cycleStart = mondayOf(Date.now() - 7 * DAY);
  }

  /* ================= ZDARZENIA ================= */
  function data(b, k) { return b.getAttribute('data-' + k); }
  document.addEventListener('click', function (e) {
    var sh = e.target.closest('#sheet');
    if (sh) {
      if (e.target.closest('[data-close-sheet]')) { closeSheet(); return; }
      var gch = e.target.closest('[data-pick-g]');
      if (gch) { var gv = data(gch, 'pick-g'); $$('[data-pick-g]', sh).forEach(function (c) { var on = c === gch; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); }); $$('.picklist li', sh).forEach(function (li) { li.hidden = gv !== 'all' && li.getAttribute('data-g') !== gv; }); return; }
      if (sheetCb) sheetCb(e.target);
      return;
    }
    var b = e.target.closest('[data-act]');
    if (!b) { var pc = e.target.closest('[data-pain]'); if (pc) { if (!S.onboarded) readOb(); painSheet(data(pc, 'pain')); } return; }
    var a = data(b, 'act'), v = data(b, 'v'), A = S.active;
    if (b.tagName === 'BUTTON') e.preventDefault();
    switch (a) {
      case 'ob-next': readOb(); if (ob < 4) { ob++; render(); } else { S.onboarded = true; S.cycleStart = mondayOf(Date.now()); save(true); askPersist().then(function () { go('#/'); }); } break;
      case 'ob-back': readOb(); ob = Math.max(0, ob - 1); render(); break;
      case 'demo': readOb(); if (!S.profile.name) S.profile.name = 'Ola'; S.profile.level = 2; S.onboarded = true; loadDemo(); save(true); askPersist(); go('#/'); break;
      case 'eq': if (!S.onboarded) readOb(); S.equipment[v] = !S.equipment[v]; save(); rerenderKeep(); break;
      case 'eq-preset': SZ.EQUIPMENT.forEach(function (q) { S.equipment[q.id] = v === 'all' || (v === 'home' && ['hantle', 'guma', 'lawka', 'skos', 'skakanka'].indexOf(q.id) > -1); }); save(); rerenderKeep(); break;
      case 'pain-open': painSheet(v); break;
      case 'focus': S.focus = v ? { id: v, date: dayKey() } : null; save(); rerenderKeep(); break;
      case 'extra-day': S.extraDay = { date: dayKey(), tpl: nextTemplate() }; save(); render(); break;
      case 'ready': { var sv = function (n) { return +($('[name="' + n + '"]:checked') || { value: 2 }).value; }; var r = { date: dayKey(), s: sv('r-s'), e: sv('r-e'), t: sv('r-t') }; r.score = r.s + r.e + r.t; S.readiness = r; save(); rerenderKeep(); break; }
      case 'swap-plan': {
        var tpl = data(b, 'tpl'), slot = data(b, 'slot'), exid = data(b, 'ex');
        exPicker('Wymień: ' + EXI[exid].name, alternatives(exid), function (id) { S.overrides[tpl + '|' + slot] = id; save(); render(); toast('Zamienione na stałe w tym treningu.'); });
        break;
      }
      case 'start': startSession(); break;
      case 'set': {
        var it = A.items[A.i], k = +data(b, 'k'), x = it.sets[k];
        x.done = !x.done; delete x.skip;
        if (x.done && it.unit === 's') clearInterval(setTimer);
        save(); render();
        if (x.done && !x.warm) {
          var partner = it.ss ? A.items.findIndex(function (o, j) { return j !== A.i && o.ss && o.ss[0] === it.ss[0]; }) : -1;
          if (partner > -1 && it.ss[1] === '1' && A.items[partner].sets.some(function (s) { return !s.done; })) { A.i = partner; save(); render(); toast('Superseria: od razu drugie ćwiczenie.'); break; }
          if (partner > -1 && it.ss[1] === '2' && A.items[partner].sets.some(function (s) { return !s.done; })) { A.i = partner; save(); render(); startRest(it.rest, 'Następna para superserii'); break; }
          var more = it.sets.some(function (s) { return !s.done && !s.skip; });
          var nxt = more ? 'Następna seria' : A.i < A.items.length - 1 ? 'Następne: ' + EXI[A.items[A.i + 1].ex].name : 'To była ostatnia seria.';
          if (more || A.i < A.items.length - 1) startRest(it.rest, nxt);
        } else if (x.done && x.warm) startRest(60, 'Następna seria');
        break;
      }
      case 'rpe': {
        var it2 = A.items[A.i], k2 = +data(b, 'k'), r2 = +v, u = EXI[it2.ex].unit || 2.5;
        it2.sets[k2].rpe = it2.sets[k2].rpe === r2 ? null : r2;
        var nextS = it2.sets.filter(function (s, j) { return j > k2 && !s.done && !s.warm; }), msg = '';
        if (it2.sets[k2].rpe && r2 >= 10 && nextS.length) { nextS.forEach(function (s) { s.w = Math.max(0, s.w - u); }); msg = 'Seria do upadku: kolejne serie lżej o ' + kg(u) + '.'; }
        if (it2.sets[k2].rpe && r2 <= 7 && it2.sets[k2].r >= it2.hi && nextS.length) { nextS.forEach(function (s) { s.w += u; }); msg = 'Lekko poszło: kolejne serie +' + kg(u) + '.'; }
        save(); render(); if (msg) toast(msg);
        break;
      }
      case 'inc': case 'dec': {
        var it3 = A.items[A.i], k3 = +data(b, 'k'), f = data(b, 'f'), ex3 = EXI[it3.ex];
        var stp = f === 'w' ? (ex3.unit || 2.5) : (it3.unit === 's' ? 5 : 1), sgn = a === 'inc' ? 1 : -1;
        var nv = Math.max(0, Math.round((it3.sets[k3][f] + sgn * stp) * 100) / 100);
        it3.sets[k3][f] = nv;
        if (f === 'w' && !it3.sets[k3].warm) it3.sets.forEach(function (s, j) { if (j > k3 && !s.done && !s.warm) s.w = nv; });
        save(); render(); var again = $('[data-act="' + a + '"][data-f="' + f + '"][data-k="' + k3 + '"]'); if (again) again.focus();
        break;
      }
      case 'set-timer': runSetTimer(+data(b, 'k'), +data(b, 's')); break;
      case 'plates': {
        var it4 = A.items[A.i], cur = it4.sets.filter(function (s) { return !s.done; })[0] || it4.sets[it4.sets.length - 1], pl = platesFor(cur.w);
        var fmt = function (p) { return String(p).replace('.', ','); };
        openSheet('Talerze na ' + kg(cur.w), pl ? '<p class="muted">Na każdą stronę gryfu (' + kg(S.bar) + '):</p><div class="platevis" aria-hidden="true">' + pl.plates.map(function (p) { return '<span class="pl" style="--h:' + (34 + p * 2.6) + 'px">' + fmt(p) + '</span>'; }).join('') + '<span class="pl pl--sleeve"></span></div><p class="big2">' + (pl.plates.length ? pl.plates.map(fmt).join(' + ') + ' kg' : 'Sam gryf') + '</p>' + (pl.rest ? '<p class="warnline">Brakuje ' + kg(pl.rest) + ' na stronę: nie masz takich talerzy.</p>' : '') : '<p>Ciężar mniejszy niż sam gryf.</p>');
        break;
      }
      case 'run-swap': exPicker('Zamień ćwiczenie', alternatives(A.items[A.i].ex), function (id) { var old = A.items[A.i]; A.items[A.i] = mkItem({ ex: id, sets: old.sets.filter(function (s) { return !s.warm; }).length, lo: old.lo, hi: old.hi, rest: old.rest, unit: EXI[id].timed ? 's' : '' }); save(); render(); }); break;
      case 'run-skip': A.items[A.i].sets.forEach(function (s) { if (!s.done) s.skip = true; }); if (A.i < A.items.length - 1) A.i++; save(); stopRest(); render(); break;
      case 'run-add': exPicker('Dodaj ćwiczenie', SZ.EX.filter(usable), function (id) { var g2 = GOALS[S.goal.type].acc, tm = EXI[id].timed; A.items.splice(A.i + 1, 0, mkItem({ ex: id, sets: g2[0], lo: tm || g2[1], hi: tm || g2[2], rest: g2[3], unit: tm ? 's' : '' })); save(); render(); toast('Dodano jako następne ćwiczenie.'); }, { search: 1 }); break;
      case 'add-to-active': { var g3 = GOALS[S.goal.type].acc, tm3 = EXI[v].timed; A.items.push(mkItem({ ex: v, sets: g3[0], lo: tm3 || g3[1], hi: tm3 || g3[2], rest: g3[3], unit: tm3 ? 's' : '' })); save(); toast('Dodano na koniec treningu.'); break; }
      case 'next': A.i++; save(); stopRest(); clearInterval(setTimer); render(); break;
      case 'prev': A.i--; save(); stopRest(); clearInterval(setTimer); render(); break;
      case 'finish': finishSession(); break;
      case 'end':
        if (A.items.some(function (it5) { return it5.sets.some(function (x5) { return x5.done; }); })) { if (confirm('Zakończyć i zapisać zrobione serie?')) finishSession(); }
        else if (confirm('Przerwać trening? Nic nie zostało zrobione.')) { S.active = null; save(); stopRest(); go('#/'); }
        break;
      case 'rest-skip': stopRest(); break;
      case 'rest-add': { var box = $('#rest'); if (box.__add) box.__add(30); break; }
      case 'tpl-open': planOpen = planOpen === v ? null : v; rerenderKeep(); break;
      case 'day-mv': { var d1 = +data(b, 'day'), d2 = d1 + +v; var tmp = S.schedule[d1]; S.schedule[d1] = S.schedule[d2]; S.schedule[d2] = tmp; save(); rerenderKeep(); var nb = $('[data-act="day-mv"][data-day="' + d2 + '"][data-v="' + v + '"]'); if (nb && !nb.disabled) nb.focus(); break; }
      case 'ed-sets': case 'ed-reps': case 'ed-mv': case 'ed-del': {
        var tp = data(b, 'tpl'), list = ensureCustom(tp), i6 = +data(b, 'i'), dv = +v;
        if (a === 'ed-sets') list[i6].sets = Math.max(1, Math.min(8, list[i6].sets + dv));
        if (a === 'ed-reps') { list[i6].lo = Math.max(1, list[i6].lo + dv); list[i6].hi = Math.max(list[i6].lo, list[i6].hi + dv); }
        if (a === 'ed-mv' && i6 > 0) { var t6 = list[i6]; list[i6] = list[i6 - 1]; list[i6 - 1] = t6; }
        if (a === 'ed-del') list.splice(i6, 1);
        save(); rerenderKeep(); break;
      }
      case 'ed-swap': { var tp2 = data(b, 'tpl'), l2 = ensureCustom(tp2), i7 = +data(b, 'i'); exPicker('Wymień: ' + EXI[l2[i7].ex].name, alternatives(l2[i7].ex), function (id) { l2[i7].ex = id; if (EXI[id].timed) { l2[i7].unit = 's'; l2[i7].lo = l2[i7].hi = EXI[id].timed; } save(); render(); }); break; }
      case 'ed-add': { var tp3 = data(b, 'tpl'); exPicker('Dodaj do: ' + tp3, SZ.EX.filter(usable), function (id) { var g4 = GOALS[S.goal.type].acc, tm4 = EXI[id].timed; ensureCustom(tp3).push({ ex: id, sets: g4[0], lo: tm4 || g4[1], hi: tm4 || g4[2], rest: g4[3], unit: tm4 ? 's' : '' }); save(); render(); }, { search: 1 }); break; }
      case 'ed-reset': delete S.custom[data(b, 'tpl')]; save(); rerenderKeep(); break;
      case 'pr-pick': { var ty = ($('[name="prtype"]:checked') || { value: '1RM' }).value; S.prDraft = { step: 1, ex: v, type: ty, log: {} }; save(); render(); break; }
      case 'pr-back': S.prDraft = { step: 0, type: (S.prDraft || {}).type || '1RM' }; save(); render(); break;
      case 'pr-back1': S.prDraft.step = 1; save(); render(); break;
      case 'pr-plan': {
        var f2 = $('[data-prform]'), ch = {};
        $$('.checks input').forEach(function (c) { ch[c.name] = c.checked; });
        var w = parseFloat(String(f2.elements.pw.value).replace(',', '.')) || 0, r3 = parseInt(f2.elements.pr.value, 10) || 1, rw = f2.elements.rw ? parseFloat(String(f2.elements.rw.value).replace(',', '.')) : 0;
        if (w <= 0) { f2.elements.pw.focus(); toast('Podaj ciężar większy od zera.'); break; }
        S.prDraft.plan = buildPr(EXI[S.prDraft.ex], w, r3, ch, S.prDraft.type, rw); S.prDraft.step = 2; S.prDraft.log = {};
        save(); render(); break;
      }
      case 'peak-open': {
        var exP = S.prDraft.ex, typeP = S.prDraft.type;
        openSheet('Przygotowanie do rekordu', '<p><b>' + EXI[exP].name + '</b> · ' + typeP + '</p><p class="muted">W kolejnych tygodniach pierwsze ćwiczenie Twoich treningów zamienimy na serie przygotowujące: 4×3 przy 84% maksa, potem 3×2 przy 88%, a w tygodniu rekordu lekkie 2×1. Objętość spada, siła rośnie.</p>' +
          '<fieldset><legend>Za ile tygodni rekord?</legend>' + seg('pk-w', [[1, '1'], [2, '2'], [3, '3']], 2, 'seg--3') + '</fieldset><button class="btn btn--main btn--wide" data-sheet="peak-go">Zaplanuj</button>', function (t) {
          if (!t.closest('[data-sheet="peak-go"]')) return;
          var wk = +($('[name="pk-w"]:checked') || { value: 2 }).value;
          S.peak = { ex: exP, type: typeP, date: Date.now() + wk * 7 * DAY, start: Date.now() }; S.prDraft = { step: 0, type: typeP }; save(); closeSheet(); toast('Zaplanowane. Dzień rekordu: ' + dshort(S.peak.date) + '.'); go('#/');
        });
        break;
      }
      case 'peak-cancel': S.peak = null; save(); render(); break;
      case 'pr-done': { var i8 = data(b, 'i'); S.prDraft.log[i8] = S.prDraft.log[i8] === 'done' ? '' : 'done'; save(); rerenderKeep(); break; }
      case 'pr-res': { var i9 = data(b, 'i'); S.prDraft.log[i9] = S.prDraft.log[i9] === v ? '' : v; save(); rerenderKeep(); break; }
      case 'pr-rest': startRest(+data(b, 's'), 'Następny krok planu'); break;
      case 'pr-finish': {
        var D = S.prDraft, P = D.plan, okW = 0, okR = 1, anyNo = false;
        P.steps.forEach(function (s, j) { if (s.kind === 'att' && D.log[j] === 'ok' && s.w >= okW) { okW = s.w; okR = s.reps; } if (s.kind === 'att' && D.log[j] === 'no') anyNo = true; });
        if (okW > 0) {
          var bb = best(D.ex), v2 = e1rm(okW, okR), isPr = !bb || v2 > bb.e, before2 = earnedBadges().map(function (x) { return x.id; });
          S.sessions.push({ id: 'p' + Date.now(), date: Date.now(), title: 'Dzień rekordu: ' + EXI[D.ex].name, dur: 0, items: [{ ex: D.ex, sets: [{ w: okW, r: okR, done: true }] }] });
          if (isPr) S.prs[D.ex] = { e: v2, w: okW, r: okR, date: Date.now() };
          if (S.peak && S.peak.ex === D.ex) S.peak = null;
          S.lastSummary = { sess: S.sessions[S.sessions.length - 1], prs: isPr ? [{ ex: D.ex, w: okW, r: okR, e: v2 }] : [], badges: earnedBadges().filter(function (x) { return before2.indexOf(x.id) < 0; }) };
          S.prDraft = null; save(true); go('#/podsumowanie');
        } else if (anyNo) { S.prDraft = null; save(true); toast('Zapisane. Następnym razem zacznij od niższego ciężaru.'); go('#/'); }
        else toast('Zaznacz wynik przynajmniej jednego podejścia.');
        break;
      }
      case 'lib': libFilter = v; rerenderKeep(); break;
      case 'chart': chartEx = v; rerenderKeep(); break;
      case 'meas-save': {
        var fm = $('[data-meas]'), rec = { date: Date.now() }, any = false;
        MEAS.forEach(function (m) { var val = parseFloat(String(fm.elements[m[0]].value).replace(',', '.')); if (val > 0) { rec[m[0]] = val; any = true; } });
        if (!any) { toast('Wpisz przynajmniej jedną wartość.'); break; }
        S.measures.push(rec); if (rec.weight) S.profile.weight = rec.weight; save(); render(); toast('Pomiar zapisany.'); break;
      }
      case 'meas-del': S.measures.splice(+data(b, 'i'), 1); save(); rerenderKeep(); break;
      case 'cmp': { var ix = cmpSel.indexOf(v); if (ix > -1) cmpSel.splice(ix, 1); else { cmpSel.push(v); if (cmpSel.length > 2) cmpSel.shift(); } rerenderKeep(); break; }
      case 'cmp-clear': cmpSel = []; render(); break;
      case 'photo-del': if (confirm('Usunąć to zdjęcie z telefonu?')) idbReq('photos', 'readwrite', function (st) { return st.delete(v); }).then(function () { photoCache = null; cmpSel = cmpSel.filter(function (x) { return x !== v; }); render(); }); break;
      case 'plate-tog': { var pv = +v, pi = S.plates.indexOf(pv); if (pi > -1) S.plates.splice(pi, 1); else S.plates.push(pv); save(); rerenderKeep(); break; }
      case 'profile-save': {
        var fp = $('[data-profile]'), el = fp.elements;
        S.profile.name = el.name.value.trim();
        ['age', 'height', 'weight'].forEach(function (k4) { S.profile[k4] = +el[k4].value || S.profile[k4]; });
        S.profile.level = +fp.querySelector('[name=level]:checked').value;
        S.goal.type = fp.querySelector('[name=goal]:checked').value;
        var nd = +fp.querySelector('[name=days]:checked').value; if (nd !== S.profile.days) { S.profile.days = nd; S.schedule = defaultSchedule(nd); S.custom = {}; }
        S.profile.minutes = +fp.querySelector('[name=minutes]:checked').value;
        $$('input[name^="t-"]', fp).forEach(function (inp) { var id = inp.name.slice(2), val = parseFloat(String(inp.value).replace(',', '.')); if (val > 0) { S.goal.targets[id] = val; if (!S.goal.starts[id]) { var bb2 = best(id); S.goal.starts[id] = bb2 ? bb2.e : 0; } } else delete S.goal.targets[id]; });
        $$('input[name^="d-"]', fp).forEach(function (inp) { var id = inp.name.slice(2); if (inp.value) S.goal.deadlines[id] = inp.value; else delete S.goal.deadlines[id]; });
        save(true); toast('Zapisano. Plan dopasowany do zmian.'); break;
      }
      case 'export': exportData(); break;
      case 'demo-load': loadDemo(); save(true); render(); toast('Wczytano 8 tygodni przykładowych treningów.'); break;
      case 'demo-clear': S.sessions = S.sessions.filter(function (s) { return s.id[0] !== 'd'; }); S.demo = false; S.prs = {}; save(true); render(); break;
      case 'reset':
        if (confirm('Usunąć wszystkie dane z tego telefonu? Tego nie da się cofnąć. Najpierw możesz pobrać kopię.')) { var th = S.settings.theme; S = fresh(); S.settings.theme = th; ob = 0; save(true); go('#/'); }
        break;
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'theme') { S.settings.theme = t.value; applyTheme(); save(); }
    if (t.name === 'method') { S.method = t.value; save(); rerenderKeep(); }
    if (t.name === 'bar' && t.closest('.card')) { S.bar = +t.value; save(); }
    if (t.name === 'view') { var id = location.hash.split('/')[2]; detailView[id] = t.value; rerenderKeep(); }
    if (t.matches('[data-act-sel="day"]')) { S.schedule[+t.getAttribute('data-day')] = t.value; save(); rerenderKeep(); }
    if (t.matches('[data-set]')) { S.settings[t.getAttribute('data-set')] = t.checked; save(); }
    if (t.matches('[data-import]')) importData(t.files[0]);
    if (t.matches('[data-photo]')) addPhoto(t.files[0]);
    if (t.matches('[data-lib-ok]')) { libOk = t.checked; updateLib(); }
  });
  function updateLib() { var list = libList(), ul = $('[data-lib]'); if (!ul) return; ul.innerHTML = libItems(list); $('[data-lib-n]').textContent = list.length + ' ćwiczeń'; }
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches('[data-note]')) { var id = t.getAttribute('data-note'); if (t.value.trim()) S.notes[id] = t.value; else delete S.notes[id]; save(); }
    if (t.matches('[data-pain-range]')) { $('[data-pain-out]').textContent = t.value + '/10'; $('[data-pain-hint]').textContent = painHint(+t.value); }
    if (t.matches('[data-lib-q]')) { libQ = t.value.trim().toLowerCase(); updateLib(); }
    if (t.matches('[data-pick-q]')) { var q = t.value.trim().toLowerCase(); $$('.picklist li').forEach(function (li) { li.hidden = !!q && li.getAttribute('data-n').indexOf(q) < 0; }); }
  });
  document.addEventListener('keydown', function (e) {
    var h = e.target.closest && e.target.closest('g[data-pain]');
    if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); painSheet(h.getAttribute('data-pain')); }
    if (e.key === 'Escape') closeSheet();
  });
  var dragDay = null;
  document.addEventListener('dragstart', function (e) { var d = e.target.closest && e.target.closest('.day'); if (d) { dragDay = +d.getAttribute('data-day'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(dragDay)); } catch (x) {} d.classList.add('is-drag'); } });
  document.addEventListener('dragover', function (e) { var d = e.target.closest && e.target.closest('.day'); if (d && dragDay != null) { e.preventDefault(); $$('.day').forEach(function (x) { x.classList.toggle('is-over', x === d); }); } });
  document.addEventListener('drop', function (e) { var d = e.target.closest && e.target.closest('.day'); if (d && dragDay != null) { e.preventDefault(); var to = +d.getAttribute('data-day'), tmp = S.schedule[to]; S.schedule[to] = S.schedule[dragDay]; S.schedule[dragDay] = tmp; dragDay = null; save(); rerenderKeep(); } });
  document.addEventListener('dragend', function () { dragDay = null; $$('.day').forEach(function (x) { x.classList.remove('is-over', 'is-drag'); }); });

  function rerenderKeep() { var y = window.scrollY, ae = document.activeElement, sel = ae && ae.getAttribute && (ae.getAttribute('data-act') ? '[data-act="' + ae.getAttribute('data-act') + '"]' + (ae.getAttribute('data-v') != null ? '[data-v="' + ae.getAttribute('data-v') + '"]' : '') : null); render(); window.scrollTo(0, y); if (sel) { var n = $(sel); if (n) n.focus({ preventScroll: true }); } }
  function exportData() {
    var blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'silczkomat-kopia-' + dayKey() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast('Kopia pobrana. Zachowaj plik w bezpiecznym miejscu.');
  }
  function importData(file) {
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || !d.profile || !Array.isArray(d.sessions)) throw 0;
        if (!confirm('Wczytać kopię z ' + (d.savedAt ? dshort(d.savedAt) : 'pliku') + ' (' + d.sessions.length + ' treningów)? Obecne dane zostaną zastąpione.')) return;
        S = migrate(d); save(true); applyTheme(); render(); toast('Kopia wczytana.');
      } catch (x) { toast('To nie jest plik kopii SIŁECZKOMATU.'); }
    };
    r.readAsText(file);
  }

  /* ================= RESZTA ================= */
  var tt;
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('is-on'); }, 3200); }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.settings.theme === 'light' ? 'light' : 'dark');
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', S.settings.theme === 'light' ? '#f3f0e8' : '#0e1215');
  }
  $('[data-act-theme]').addEventListener('click', function () { S.settings.theme = S.settings.theme === 'light' ? 'dark' : 'light'; applyTheme(); save(); if (location.hash.indexOf('profil') > -1) render(); });
  window.addEventListener('hashchange', function () { if (!/trening|pr/.test(location.hash)) stopRest(); clearInterval(setTimer); render(); });
  setInterval(function () { var p = $('[data-persist]'); if (p && navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (x) { p.textContent = x ? 'włączona' : 'nie przyznana (rób kopię)'; }); }, 1500);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && S) save(true); if (document.visibilityState === 'visible' && document.body.classList.contains('is-run')) { wake = null; wakeOn(); } });

  load().then(function (st) { S = st; applyTheme(); render(); if (S.onboarded) askPersist(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
