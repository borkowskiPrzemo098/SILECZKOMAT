/* SIŁECZKOMAT — logika aplikacji. Dane zapisywane wyłącznie na tym urządzeniu. */
(function () {
  'use strict';
  var SZ = window.SZ, FIG = window.SZFIG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var view = $('#view');
  var EXI = {}; SZ.EX.forEach(function (e) { EXI[e.id] = e; });
  var nf = function (n, d) { return Number(n).toFixed(d || 0).replace('.', ','); };
  var kg = function (n) { return (Math.round(n * 10) / 10).toString().replace('.', ',') + ' kg'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  var MON = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  var dshort = function (t) { var d = new Date(t); return d.getDate() + ' ' + MON[d.getMonth()]; };

  /* ================= PAMIĘĆ ================= */
  var DB_NAME = 'silczkomat', KEY = 'silczkomat-state';
  function idb() {
    return new Promise(function (res, rej) {
      if (!('indexedDB' in window)) return rej();
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet() {
    return idb().then(function (db) { return new Promise(function (res) { var q = db.transaction('kv').objectStore('kv').get('state'); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; });
  }
  function idbPut(v) {
    return idb().then(function (db) { return new Promise(function (res) { var t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, 'state'); t.oncomplete = res; t.onerror = res; }); }).catch(function () {});
  }
  var S = null;
  function fresh() {
    var eq = {}; SZ.EQUIPMENT.forEach(function (e) { eq[e.id] = true; });
    return { v: 1, onboarded: false, profile: { name: '', age: 30, height: 178, weight: 80, level: 1, days: 3, minutes: 60, sex: 'm' },
      goal: { type: 'masa', targets: {} }, equipment: eq, pain: [], sessions: [], prs: {}, dayIdx: 0, focus: 'plan',
      active: null, prDraft: null, settings: { theme: 'dark' }, demo: false, savedAt: 0 };
  }
  var saveT;
  function save(now) {
    S.savedAt = Date.now();
    var json = JSON.stringify(S);
    try { localStorage.setItem(KEY, json); } catch (e) {}
    clearTimeout(saveT);
    if (now) return idbPut(json);
    saveT = setTimeout(function () { idbPut(json); }, 250);
  }
  function load() {
    var ls = null; try { ls = localStorage.getItem(KEY); } catch (e) {}
    return idbGet().then(function (v) {
      var a = null, b = null;
      try { a = v ? JSON.parse(v) : null; } catch (e) {}
      try { b = ls ? JSON.parse(ls) : null; } catch (e) {}
      var best = a && b ? (a.savedAt >= b.savedAt ? a : b) : (a || b);   // wygrywa nowsza kopia
      var base = fresh();
      if (best) for (var k in base) if (!(k in best)) best[k] = base[k];
      return best || base;
    });
  }
  function askPersist() {
    if (navigator.storage && navigator.storage.persist) return navigator.storage.persist().catch(function () { return false; });
    return Promise.resolve(false);
  }

  /* ================= LOGIKA TRENINGU ================= */
  var GOALS = {
    sila: { name: 'Siła', desc: 'Mniej powtórzeń, większy ciężar, długie przerwy.', main: [5, 5, 5, 180], acc: [3, 6, 8, 90] },
    masa: { name: 'Masa mięśniowa', desc: 'Średni zakres powtórzeń, dużo objętości.', main: [4, 6, 8, 120], acc: [3, 8, 12, 75] },
    redukcja: { name: 'Redukcja', desc: 'Więcej powtórzeń, krótsze przerwy, utrzymanie siły.', main: [3, 8, 10, 90], acc: [3, 12, 15, 45] },
    kondycja: { name: 'Kondycja', desc: 'Lżej i szybciej, tętno wysoko.', main: [3, 12, 15, 60], acc: [3, 15, 20, 40] },
    plecy: { name: 'Zdrowy kręgosłup', desc: 'Stabilizacja, kontrola i ruchy bez obciążania lędźwi.', main: [3, 10, 12, 75], acc: [3, 10, 12, 60] }
  };
  var TPL = {
    'Cały trening A': ['czworoglowe', 'klatka', 'plecy', 'dwuglowe', 'barki', 'brzuch', 'biceps'],
    'Cały trening B': ['dwuglowe', 'barki', 'plecy', 'czworoglowe', 'klatka', 'triceps', 'brzuch'],
    'Cały trening C': ['czworoglowe', 'plecy', 'klatka', 'posladki', 'czworoboczny', 'brzuch', 'lydki'],
    'Góra': ['klatka', 'plecy', 'barki', 'plecy', 'triceps', 'biceps', 'czworoboczny'],
    'Dół': ['czworoglowe', 'dwuglowe', 'posladki', 'czworoglowe', 'lydki', 'brzuch', 'prostowniki'],
    'Pchanie': ['klatka', 'barki', 'klatka', 'triceps', 'barki', 'brzuch', 'triceps'],
    'Przyciąganie': ['plecy', 'plecy', 'czworoboczny', 'biceps', 'prostowniki', 'przedramiona', 'biceps'],
    'Nogi': ['czworoglowe', 'dwuglowe', 'posladki', 'czworoglowe', 'lydki', 'brzuch', 'dwuglowe']
  };
  var SPLITS = { 2: ['Cały trening A', 'Cały trening B'], 3: ['Cały trening A', 'Cały trening B', 'Cały trening C'], 4: ['Góra', 'Dół', 'Góra', 'Dół'], 5: ['Pchanie', 'Przyciąganie', 'Nogi', 'Góra', 'Dół'], 6: ['Pchanie', 'Przyciąganie', 'Nogi', 'Pchanie', 'Przyciąganie', 'Nogi'] };
  var FOCUS = {
    klatka: ['klatka', 'klatka', 'klatka', 'triceps', 'barki', 'brzuch', 'triceps'],
    plecy: ['plecy', 'plecy', 'plecy', 'czworoboczny', 'prostowniki', 'biceps', 'brzuch'],
    nogi: ['czworoglowe', 'dwuglowe', 'posladki', 'czworoglowe', 'dwuglowe', 'lydki', 'brzuch'],
    barki: ['barki', 'barki', 'barki', 'czworoboczny', 'triceps', 'brzuch', 'barki'],
    ramiona: ['biceps', 'triceps', 'biceps', 'triceps', 'przedramiona', 'barki', 'brzuch'],
    brzuch: ['brzuch', 'brzuch', 'prostowniki', 'brzuch', 'posladki', 'brzuch', 'brzuch']
  };
  var TIMED = { deska: 's', farmer: 's' };
  function hasEq(ex) { return ex.eq.every(function (q) { return S.equipment[q]; }); }
  function painHit(ex) { return ex.stress.filter(function (j) { return S.pain.indexOf(j) > -1; }); }
  function levelOk(ex) { return ex.lvl <= S.profile.level + 1; }
  function goalOk(ex) { return S.goal.type !== 'plecy' || ex.stress.indexOf('ledzwie') < 0; }
  function usable(ex) { return hasEq(ex) && !painHit(ex).length && levelOk(ex) && goalOk(ex); }
  function whyNot(ex) {
    var r = [];
    var miss = ex.eq.filter(function (q) { return !S.equipment[q]; });
    if (miss.length) r.push('brak sprzętu: ' + miss.map(function (q) { return SZ.EQUIPMENT.filter(function (e) { return e.id === q; })[0].name.toLowerCase(); }).join(', '));
    var p = painHit(ex); if (p.length) r.push('omijamy: ' + p.map(function (j) { return SZ.JOINTS[j]; }).join(', '));
    if (!goalOk(ex)) r.push('obciąża lędźwie');
    if (!levelOk(ex)) r.push('za trudne na start');
    return r.join(' · ');
  }
  function countFor(min) { return min <= 30 ? 4 : min <= 45 ? 5 : min <= 60 ? 6 : 7; }
  function buildSession(title, slots, avoid) {
    var used = {}, items = [], g = GOALS[S.goal.type] || GOALS.masa, n = countFor(S.profile.minutes);
    slots.forEach(function (m) {
      if (items.length >= n) return;
      var cands = SZ.EX.filter(function (e) { return e.prim.indexOf(m) > -1 && !used[e.id]; });
      var ideal = cands.filter(function (e) { return levelOk(e); })[0];
      var ok = cands.filter(usable);
      var pick = ok.filter(function (e) { return !avoid || avoid.indexOf(e.id) < 0; })[0] || ok[0];
      if (!pick) return;
      used[pick.id] = 1;
      var main = items.length < 2 && pick.eq.length > 0 && !TIMED[pick.id];
      var sc = main ? g.main : g.acc;
      var it = { ex: pick.id, sets: sc[0], lo: sc[1], hi: sc[2], rest: sc[3] };
      if (TIMED[pick.id]) { it.lo = it.hi = pick.id === 'deska' ? 40 : 30; it.unit = 's'; }
      if (ideal && ideal.id !== pick.id && !used[ideal.id] && !usable(ideal)) it.note = 'Zamiast „' + ideal.name + '”: ' + whyNot(ideal);
      items.push(it);
    });
    return { title: title, items: items };
  }
  function weekPlan() { return SPLITS[S.profile.days] || SPLITS[3]; }
  function today() {
    if (S.focus && S.focus !== 'plan') {
      var gname = SZ.GROUPS.filter(function (g) { return g.id === S.focus; })[0];
      return buildSession('Dziś: ' + gname.name.toLowerCase(), FOCUS[S.focus]);
    }
    var wk = weekPlan(), i = S.dayIdx % wk.length, prev = wk[(i + wk.length - 1) % wk.length];
    var prevS = buildSession(prev, TPL[prev]);
    return buildSession(wk[i], TPL[wk[i]], prevS.items.map(function (x) { return x.ex; }));
  }
  function e1rm(w, r) { return r <= 1 ? w : w * (1 + r / 30); }
  function history(exId) {
    var out = [];
    S.sessions.forEach(function (s) { s.items.forEach(function (it) { if (it.ex === exId) out.push({ date: s.date, sets: it.sets.filter(function (x) { return x.done; }) }); }); });
    return out.filter(function (h) { return h.sets.length; });
  }
  function best(exId) {
    var b = null;
    history(exId).forEach(function (h) { h.sets.forEach(function (x) { var v = e1rm(x.w, x.r); if (x.w > 0 && (!b || v > b.e)) b = { e: v, w: x.w, r: x.r, date: h.date }; }); });
    var pr = S.prs[exId]; if (pr && (!b || pr.e > b.e)) b = pr;
    return b;
  }
  function suggest(it) {
    var ex = EXI[it.ex], h = history(it.ex), last = h[h.length - 1];
    if (!ex.eq.length || it.unit === 's') return 0;
    if (!last) {   // bez historii: ostrożna propozycja na start z masy ciała i poziomu
      var F = { squat: .5, legpress: .9, lunge: .12, hinge: .6, bridge: .6, legcurl: .3, legext: .3, bench: .4, fly: .1, dip: 0, ohp: .25, raise: .05, facepull: .15, row: .35, pullup: 0, pulldown: .45, curl: .2, pushdown: .2, ohext: .1, pallof: 0, shrug: .2, carry: .25 };
      var f = F[ex.pat] == null ? .2 : F[ex.pat];
      if (ex.eq.indexOf('hantle') > -1 && ex.pat !== 'squat') f = Math.min(f, .15);
      if (ex.eq.indexOf('hantle') > -1 && ex.pat === 'squat') f = .2;
      return f ? round(S.profile.weight * f * (0.85 + S.profile.level * 0.15), ex.unit || 2.5) : 0;
    }
    var top = last.sets.reduce(function (a, x) { return x.w > a.w ? x : a; }, last.sets[0]);
    var allHit = last.sets.every(function (x) { return x.r >= it.hi; });
    return allHit ? top.w + (ex.unit || 2.5) : top.w;
  }
  function round(w, u) { u = u || 2.5; return Math.round(w / u) * u; }

  /* ================= WIDOKI ================= */
  var routes = {};
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function render() {
    if (!S.onboarded) { view.innerHTML = vOnboard(); after(); setNav(''); return; }
    var h = location.hash.replace(/^#\/?/, '') || 'dzis', parts = h.split('/');
    var fn = routes[parts[0]] || routes.dzis;
    view.innerHTML = fn(parts[1]);
    setNav(parts[0]);
    after();
    document.body.classList.toggle('is-run', parts[0] === 'trening' || parts[0] === 'pr');
  }
  function after() {
    FIG.watch(view);
    var h1 = $('h1', view); if (h1 && document.activeElement === document.body) h1.setAttribute('tabindex', '-1');
    window.scrollTo(0, 0);
  }
  function setNav(r) { $$('.tabs a').forEach(function (a) { var on = a.getAttribute('data-r') === r || (r === 'cw' && a.getAttribute('data-r') === 'cwiczenia'); a.classList.toggle('is-on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  function muscles(list) { return list.map(function (m) { return SZ.MUSCLES[m]; }).join(', '); }
  function repsTxt(it) { return it.unit === 's' ? it.lo + ' s' : it.lo === it.hi ? it.lo + '' : it.lo + '–' + it.hi; }
  function demoBar() { return S.demo ? '<p class="demo">Przeglądasz przykładowe dane. Usuniesz je w Profilu.</p>' : ''; }

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
      '<fieldset><legend>Ile dni w tygodniu?</legend><div class="seg">' + [2, 3, 4, 5, 6].map(function (d) { return '<label><input type="radio" name="days" value="' + d + '"' + (p.days == d ? ' checked' : '') + '><span>' + d + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset><legend>Ile trwa trening?</legend><div class="seg">' + [30, 45, 60, 90].map(function (d) { return '<label><input type="radio" name="minutes" value="' + d + '"' + (p.minutes == d ? ' checked' : '') + '><span>' + d + ' min</span></label>'; }).join('') + '</div></fieldset>';
    if (ob === 3) body = '<h1>Jaki masz sprzęt?</h1><p class="lead">Odznacz to, czego nie ma. Ćwiczenia wymagające brakującego sprzętu zamienimy na odpowiedniki.</p>' + eqPresets() + eqChips();
    if (ob === 4) body = '<h1>Czy coś Cię boli?</h1><p class="lead">Dotknij miejsca na sylwetce. Pominiemy ćwiczenia, które je obciążają, i podpowiemy rozciąganie. Możesz to zmienić w każdej chwili.</p>' +
      FIG.atlas({ mode: 'pain', pain: S.pain }) + painChips() + medNote();
    return '<section class="ob">' +
      '<div class="ob__dots" aria-label="Krok ' + (ob + 1) + ' z ' + steps + '">' + Array.from({ length: steps }, function (_, i) { return '<i class="' + (i <= ob ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<form class="ob__form" data-ob>' + body + '</form>' +
      '<div class="ob__nav">' + (ob ? '<button class="btn btn--ghost" data-act="ob-back">Wstecz</button>' : '<button class="btn btn--ghost" data-act="demo">Zobacz demo</button>') +
      '<button class="btn btn--main" data-act="ob-next">' + (ob === steps - 1 ? 'Ułóż mój plan' : 'Dalej') + '</button></div></section>';
  }
  function num(n, l, v, u) { return '<label class="field"><span>' + l + '</span><div class="unitbox"><input name="' + n + '" type="number" inputmode="numeric" value="' + v + '"><em>' + u + '</em></div></label>'; }
  function opt(n, v, t, d, on) { return '<label class="opt"><input type="radio" name="' + n + '" value="' + v + '"' + (on ? ' checked' : '') + '><span><b>' + t + '</b><small>' + d + '</small></span></label>'; }
  function eqPresets() { return '<div class="chips chips--presets"><button type="button" class="chip" data-act="eq-preset" data-v="all">Pełna siłownia</button><button type="button" class="chip" data-act="eq-preset" data-v="home">Dom z hantlami</button><button type="button" class="chip" data-act="eq-preset" data-v="none">Bez sprzętu</button></div>'; }
  function eqChips() {
    return '<div class="eqlist">' + SZ.EQUIPMENT.map(function (e) { var on = S.equipment[e.id]; return '<button type="button" class="eq' + (on ? ' is-on' : '') + '" data-act="eq" data-v="' + e.id + '" aria-pressed="' + !!on + '"><i aria-hidden="true"></i>' + e.name + '</button>'; }).join('') + '</div>';
  }
  function painChips() {
    return '<div class="chips" aria-live="polite">' + (S.pain.length ? S.pain.map(function (j) { return '<button type="button" class="chip chip--pain" data-pain="' + j + '">' + SZ.JOINTS[j] + ' <span aria-hidden="true">×</span><span class="sr">usuń</span></button>'; }).join('') : '<p class="muted">Nic nie zaznaczono.</p>') + '</div>';
  }
  function medNote() { return '<p class="med">To wskazówki treningowe, nie porada medyczna. Jeśli ból jest ostry, narasta albo trwa dłużej niż kilka dni, skonsultuj się z fizjoterapeutą lub lekarzem.</p>'; }
  function readOb() {
    var f = $('[data-ob]'); if (!f) return;
    var g = function (n) { var el = f.elements[n]; return el ? (el.value !== undefined ? el.value : null) : null; };
    if (f.elements.name) S.profile.name = g('name').trim();
    ['age', 'height', 'weight'].forEach(function (k) { if (f.elements[k]) S.profile[k] = +g(k) || S.profile[k]; });
    if (f.elements.level) S.profile.level = +g('level');
    if (f.elements.goal) S.goal.type = g('goal');
    if (f.elements.days) S.profile.days = +g('days');
    if (f.elements.minutes) S.profile.minutes = +g('minutes');
  }

  /* ---------- DZIŚ ---------- */
  routes.dzis = function () {
    var t = today(), d = new Date(), name = S.profile.name;
    var stretches = stretchFor(S.pain).slice(0, 3);
    var excl = SZ.EX.filter(function (e) { return painHit(e).length; }).length;
    return demoBar() + '<header class="page"><p class="page__date">' + DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()] + '</p><h1>' + (name ? 'Cześć, ' + esc(name) + '.' : 'Dzisiejszy trening') + '</h1></header>' +
      (S.active ? '<a class="resume" href="#/trening"><b>Trening w toku</b><span>Wróć do ćwiczenia ' + (S.active.i + 1) + ' z ' + S.active.items.length + '</span></a>' : '') +
      '<div class="focus" role="group" aria-label="Partia na dziś"><button class="chip' + (S.focus === 'plan' ? ' is-on' : '') + '" data-act="focus" data-v="plan" aria-pressed="' + (S.focus === 'plan') + '">Wg planu</button>' +
      SZ.GROUPS.map(function (g) { return '<button class="chip' + (S.focus === g.id ? ' is-on' : '') + '" data-act="focus" data-v="' + g.id + '" aria-pressed="' + (S.focus === g.id) + '">' + g.name + '</button>'; }).join('') + '</div>' +
      '<section class="today">' +
        '<div class="today__head"><h2>' + esc(t.title) + '</h2><p>' + t.items.length + ' ćwiczeń · ok. ' + S.profile.minutes + ' min · cel: ' + GOALS[S.goal.type].name.toLowerCase() + '</p></div>' +
        (t.items.length ? '<ol class="exlist">' + t.items.map(function (it, i) {
          var ex = EXI[it.ex], sg = suggest(it);
          return '<li><a class="exrow" href="#/cw/' + ex.id + '">' + FIG.figure(ex, { cls: 'fig--sm', label: ex.name }) +
            '<span class="exrow__main"><b>' + ex.name + '</b><span>' + it.sets + ' × ' + repsTxt(it) + (sg ? ' · ' + kg(sg) : '') + ' · przerwa ' + it.rest + ' s</span>' +
            (it.note ? '<em class="swap">' + esc(it.note) + '</em>' : '') + '</span></a></li>';
        }).join('') + '</ol>' : '<p class="empty">Z tym sprzętem i zaznaczonym bólem nie ma bezpiecznych ćwiczeń na tę partię. Zmień partię albo sprzęt w Profilu.</p>') +
        '<button class="btn btn--main btn--wide" data-act="start"' + (t.items.length ? '' : ' disabled') + '>' + (S.active ? 'Zacznij od nowa' : 'Zacznij trening') + '</button>' +
      '</section>' +
      '<a class="prcta" href="#/pr"><span><b>Dzień rekordu</b><small>Chcesz dziś pobić PR? Przygotujemy rozgrzewkę i podejścia.</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></a>' +
      (S.pain.length ? '<section class="card care"><h2>Omijamy: ' + S.pain.map(function (j) { return SZ.JOINTS[j]; }).join(', ') + '</h2><p>' + excl + ' ćwiczeń wypadło z planu. Zrób przed treningiem:</p>' +
        '<ul class="stlist">' + stretches.map(stretchRow).join('') + '</ul><a class="link" href="#/cialo">Zmień zaznaczenie</a></section>' : '');
  };
  function stretchFor(pain) {
    var out = [];
    SZ.STRETCH.forEach(function (s) { if (s.regions.some(function (r) { return pain.indexOf(r) > -1; })) out.push(s); });
    return out;
  }
  function stretchRow(s) {
    return '<li class="strow">' + FIG.figure({ name: s.name, pat: s.pat, prim: [], sec: [], prop: '' }, { cls: 'fig--sm fig--stretch', label: s.name }) +
      '<span><b>' + s.name + '</b><small>' + s.hold + '</small><span class="strow__cue">' + s.cues.join(' ') + '</span></span></li>';
  }

  /* ---------- TRENING NA ŻYWO ---------- */
  function startSession() {
    var t = today();
    S.active = { title: t.title, focus: S.focus, started: Date.now(), i: 0, items: t.items.map(function (it) {
      var sg = suggest(it);
      var sets = []; for (var k = 0; k < it.sets; k++) sets.push({ w: sg == null ? 0 : sg, r: it.hi, done: false });
      return { ex: it.ex, lo: it.lo, hi: it.hi, rest: it.rest, unit: it.unit || '', sets: sets };
    }) };
    save(); go('#/trening');
  }
  routes.trening = function () {
    var A = S.active;
    if (!A) return '<header class="page"><h1>Brak treningu w toku</h1></header><a class="btn btn--main" href="#/">Wróć do planu</a>';
    var it = A.items[A.i], ex = EXI[it.ex], b = best(it.ex);
    var doneSets = it.sets.filter(function (x) { return x.done; }).length;
    var cur = it.sets.findIndex(function (x) { return !x.done; });
    var bw = !ex.eq.length && it.unit !== 's';
    return '<div class="run">' +
      '<header class="run__top"><button class="iconbtn" data-act="end" aria-label="Zakończ trening"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<div class="run__prog"><span>Ćwiczenie ' + (A.i + 1) + ' z ' + A.items.length + '</span><div class="bar"><i style="--w:' + ((A.i + doneSets / it.sets.length) / A.items.length) + '"></i></div></div></header>' +
      '<div class="run__fig">' + FIG.figure(ex, { cls: 'fig--lg' }) + '</div>' +
      '<h1 class="run__name">' + ex.name + '</h1>' +
      '<p class="run__meta">' + muscles(ex.prim) + (b ? ' · rekord: ' + kg(b.w) + ' × ' + b.r : '') + '</p>' +
      '<details class="cues"><summary>Technika</summary><ol>' + ex.cues.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ol></details>' +
      '<div class="sets" role="table" aria-label="Serie">' +
      '<div class="sets__row sets__row--head" role="row"><span role="columnheader">Seria</span><span role="columnheader">' + (bw ? 'Dociążenie' : it.unit === 's' ? '—' : 'Ciężar') + '</span><span role="columnheader">' + (it.unit === 's' ? 'Sekundy' : 'Powt. (' + it.lo + (it.lo !== it.hi ? '–' + it.hi : '') + ')') + '</span><span role="columnheader"><span class="sr">Gotowe</span></span></div>' +
      it.sets.map(function (x, k) {
        return '<div class="sets__row' + (x.done ? ' is-done' : k === cur ? ' is-cur' : '') + '" role="row">' +
          '<b role="cell">' + (k + 1) + '</b>' +
          (it.unit === 's' ? '<span role="cell" class="muted">—</span>' : step('w', k, x.w, kg(x.w).replace(' kg', ''), 'kg')) +
          step('r', k, x.r, x.r, it.unit === 's' ? 's' : '') +
          '<span role="cell"><button class="check" data-act="set" data-k="' + k + '" aria-pressed="' + x.done + '" aria-label="Seria ' + (k + 1) + (x.done ? ' zrobiona, cofnij' : ', oznacz jako zrobioną') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></button></span></div>';
      }).join('') + '</div>' +
      '<div class="run__nav">' + (A.i > 0 ? '<button class="btn btn--ghost" data-act="prev">Poprzednie</button>' : '<span></span>') +
      (A.i < A.items.length - 1 ? '<button class="btn btn--main" data-act="next">Następne ćwiczenie</button>' : '<button class="btn btn--main" data-act="finish">Zakończ trening</button>') + '</div></div>';
  };
  function step(f, k, v, label, unit) {
    return '<span role="cell" class="stepper"><button data-act="dec" data-f="' + f + '" data-k="' + k + '" aria-label="Mniej"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg></button>' +
      '<output>' + label + (unit ? '<small>' + unit + '</small>' : '') + '</output>' +
      '<button data-act="inc" data-f="' + f + '" data-k="' + k + '" aria-label="Więcej"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg></button></span>';
  }

  /* minutnik przerwy */
  var restT = null;
  function startRest(sec, nextLabel) {
    var end = Date.now() + sec * 1000, box = $('#rest');
    box.hidden = false; box.classList.add('is-on');
    $('[data-rest-next]', box).textContent = nextLabel || '';
    clearInterval(restT);
    function upd() {
      var left = Math.max(0, Math.round((end - Date.now()) / 1000));
      $('[data-rest-t]', box).textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      $('[data-rest-bar]', box).style.setProperty('--w', 1 - left / sec);
      if (left <= 0) { clearInterval(restT); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); $('[data-rest-t]', box).textContent = 'Czas!'; box.classList.add('is-end'); }
    }
    box.__add = function (s) { end += s * 1000; sec += s; box.classList.remove('is-end'); clearInterval(restT); restT = setInterval(upd, 250); upd(); };
    box.classList.remove('is-end');
    restT = setInterval(upd, 250); upd();
    setTimeout(function () { var b = $('[data-act="rest-skip"]'); if (b) b.focus(); }, 50);
  }
  function stopRest() { clearInterval(restT); var box = $('#rest'); box.classList.remove('is-on', 'is-end'); box.hidden = true; }

  function finishSession() {
    var A = S.active; if (!A) return;
    var items = A.items.map(function (it) { return { ex: it.ex, unit: it.unit, sets: it.sets.filter(function (x) { return x.done; }) }; }).filter(function (it) { return it.sets.length; });
    var newPR = [];
    items.forEach(function (it) {
      if (it.unit === 's') return;
      var before = best(it.ex);
      it.sets.forEach(function (x) { if (x.w > 0) { var v = e1rm(x.w, x.r); if (!before || v > before.e + 0.01) { if (!newPR.filter(function (p) { return p.ex === it.ex; }).length || v > newPR.filter(function (p) { return p.ex === it.ex; })[0].e) { newPR = newPR.filter(function (p) { return p.ex !== it.ex; }); newPR.push({ ex: it.ex, e: v, w: x.w, r: x.r }); } } } });
    });
    var sess = { id: 's' + Date.now(), date: Date.now(), title: A.title, dur: Math.round((Date.now() - A.started) / 60000), items: items };
    if (items.length) S.sessions.push(sess);
    newPR.forEach(function (p) { S.prs[p.ex] = { e: p.e, w: p.w, r: p.r, date: sess.date }; });
    if (A.focus === 'plan' && items.length) S.dayIdx++;
    S.active = null; S.lastSummary = { sess: sess, prs: newPR };
    save(true); stopRest(); go('#/podsumowanie');
  }
  routes.podsumowanie = function () {
    var L = S.lastSummary; if (!L) return routes.dzis();
    var vol = 0, sets = 0; L.sess.items.forEach(function (it) { it.sets.forEach(function (x) { sets++; vol += (x.w || 0) * x.r; }); });
    return '<header class="page"><h1>Trening zapisany</h1><p class="lead">' + esc(L.sess.title) + ' · ' + L.sess.dur + ' min</p></header>' +
      '<dl class="ledger"><div><dt>Serie</dt><dd>' + sets + '</dd></div><div><dt>Objętość</dt><dd>' + nf(vol) + ' kg</dd></div><div><dt>Ćwiczenia</dt><dd>' + L.sess.items.length + '</dd></div></dl>' +
      (L.prs.length ? '<section class="card win"><h2>Nowe rekordy</h2><ul class="rows">' + L.prs.map(function (p) { return '<li><b>' + EXI[p.ex].name + '</b><span>' + kg(p.w) + ' × ' + p.r + ' · szac. 1RM ' + kg(p.e) + '</span></li>'; }).join('') + '</ul></section>' : '') +
      '<div class="stack"><a class="btn btn--main btn--wide" href="#/postepy">Zobacz postępy</a><a class="btn btn--ghost btn--wide" href="#/">Wróć do planu</a></div>';
  };

  /* ---------- DZIEŃ REKORDU ---------- */
  var PR_POOL = ['przysiad', 'martwy', 'wyciskanie', 'ohp', 'rdl', 'hipthrust', 'wioslowanie', 'podciaganie', 'legpress', 'goblet', 'wyciskanie-db', 'ohp-db', 'biceps', 'porecze'];
  routes.pr = function () {
    var D = S.prDraft || (S.prDraft = { step: 0 });
    if (D.step === 0) {
      var list = PR_POOL.map(function (id) { return EXI[id]; }).filter(function (e) { return hasEq(e); });
      return '<header class="page"><a class="back" href="#/">Plan</a><h1>Dzień rekordu</h1><p class="lead">Wybierz ćwiczenie. Na podstawie Twojej historii policzymy szacowany maks i ułożymy rozgrzewkę oraz trzy podejścia jak na zawodach.</p></header>' +
        '<ul class="rows rows--pick">' + list.map(function (e) {
          var b = best(e.id), hit = painHit(e);
          return '<li><button class="pick" data-act="pr-pick" data-v="' + e.id + '"' + (hit.length ? ' data-warn="1"' : '') + '>' + FIG.figure(e, { cls: 'fig--sm', label: e.name }) +
            '<span><b>' + e.name + '</b><small>' + (b ? 'szac. maks ' + kg(b.e) + ' · najlepiej ' + kg(b.w) + ' × ' + b.r : 'brak historii, podasz wynik') + (hit.length ? ' · <em class="bad">ból: ' + hit.map(function (j) { return SZ.JOINTS[j]; }).join(', ') + '</em>' : '') + '</small></span></button></li>';
        }).join('') + '</ul>';
    }
    var ex = EXI[D.ex], hit = painHit(ex);
    if (D.step === 1) {
      var b = best(ex.id);
      return '<header class="page"><button class="back" data-act="pr-back">Wybór</button><h1>' + ex.name + '</h1></header>' +
        (hit.length ? '<section class="card stop"><h2>Odradzamy dziś próbę rekordu</h2><p>Zaznaczyłeś ból: ' + hit.map(function (j) { return SZ.JOINTS[j]; }).join(', ') + '. To ćwiczenie mocno obciąża to miejsce, a maksymalny ciężar zwiększa ryzyko kontuzji. Wybierz inne ćwiczenie albo zrób dziś rozciąganie.</p><ul class="stlist">' + stretchFor(hit).slice(0, 2).map(stretchRow).join('') + '</ul><button class="btn btn--ghost" data-act="pr-back">Wybierz inne ćwiczenie</button></section>' :
        '<form class="card" data-prform>' + (b ? '<p class="big"><span>Szacowany maks</span><b>' + kg(b.e) + '</b></p><p class="muted">Na podstawie ' + kg(b.w) + ' × ' + b.r + ' z ' + dshort(b.date) + '. Możesz go poprawić, jeśli wiesz lepiej.</p>' : '<p>Nie masz jeszcze zapisanej serii w tym ćwiczeniu. Podaj najlepszą serię z ostatnich tygodni.</p>') +
          '<div class="grid2">' + num('pw', 'Ciężar', b ? b.w : 60, 'kg') + num('pr', 'Powtórzenia', b ? b.r : 5, 'x') + '</div></form>' +
          '<section class="card"><h2>Gotowość</h2><p class="muted">Zaznacz uczciwie. Każde „nie” obniża dzisiejszy cel.</p><div class="checks">' +
          [['sen', 'Spałem co najmniej 7 godzin'], ['jedz', 'Jadłem 1,5–3 godziny temu'], ['woda', 'Jestem nawodniony'], ['bol', 'Nic mnie dziś nie boli w tej partii'], ['ase', 'Mam asekurację lub zabezpieczenia (stojaki, ograniczniki)']].map(function (c) {
            return '<label class="check-row"><input type="checkbox" name="' + c[0] + '"' + (D.checks && D.checks[c[0]] ? ' checked' : '') + '><span>' + c[1] + '</span></label>';
          }).join('') + '</div></section>' +
          '<button class="btn btn--main btn--wide" data-act="pr-plan">Ułóż plan podejścia</button>');
    }
    if (D.step === 2) {
      var P = D.plan;
      return '<header class="page"><button class="back" data-act="pr-back1">Gotowość</button><h1>' + ex.name + ': plan</h1><p class="lead">Cel dnia: <b>' + kg(P.attempts[2]) + '</b>' + (P.pen ? ' (obniżony o ' + P.pen + '% przez gotowość)' : '') + '.</p></header>' +
        '<ol class="prsteps">' + P.steps.map(function (s, i) {
          var st = D.log[i] || '';
          return '<li class="prs prs--' + s.kind + (st ? ' is-' + st : '') + '"><div class="prs__main"><span class="prs__k">' + s.label + '</span><b>' + s.what + '</b>' + (s.tip ? '<small>' + s.tip + '</small>' : '') + '</div>' +
            (s.kind === 'att' ? '<div class="lights" role="group" aria-label="Wynik podejścia"><button class="light light--ok' + (st === 'ok' ? ' is-on' : '') + '" data-act="pr-res" data-i="' + i + '" data-v="ok" aria-pressed="' + (st === 'ok') + '">Zaliczone</button><button class="light light--no' + (st === 'no' ? ' is-on' : '') + '" data-act="pr-res" data-i="' + i + '" data-v="no" aria-pressed="' + (st === 'no') + '">Nie wyszło</button></div>' :
              '<button class="check" data-act="pr-done" data-i="' + i + '" aria-pressed="' + (st === 'done') + '" aria-label="Zrobione: ' + esc(s.what) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></button>') +
            (s.rest ? '<button class="restbtn" data-act="pr-rest" data-s="' + s.rest + '">Przerwa ' + (s.rest >= 60 ? s.rest / 60 + ' min' : s.rest + ' s') + '</button>' : '') + '</li>';
        }).join('') + '</ol>' +
        '<section class="card"><h2>Na podejściu</h2><ul class="tips"><li>Oddech i napięcie brzucha przed każdym zejściem.</li>' + ex.cues.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '<li>Jeśli 2. podejście szło wyraźnie wolno, zostań przy nim. Rekord poczeka tydzień.</li></ul></section>' +
        '<button class="btn btn--main btn--wide" data-act="pr-finish">Zapisz wynik</button>';
    }
    return '';
  };
  function buildPr(ex, w, r, checks) {
    var e = e1rm(w, r), u = ex.unit || 2.5;
    var neg = ['sen', 'jedz', 'woda', 'bol', 'ase'].filter(function (k) { return !checks[k]; }).length;
    var pen = Math.min(neg * 2, 8);
    var base = e * (1 - pen / 100);
    var a1 = round(base * 0.93, u), a2 = round(base * 0.99, u), a3 = Math.max(round(base * 1.025, u), a2 + u);
    var stretches = stretchFor(ex.stress).slice(0, 2).map(function (s) { return s.name.toLowerCase(); });
    var steps = [
      { kind: 'prep', label: 'Rozgrzewka', what: '5–8 min roweru, skakanki lub szybkiego marszu', tip: 'Do lekkiego spocenia, tętno w górę.' },
      { kind: 'prep', label: 'Mobilizacja', what: stretches.length ? 'Dynamicznie: ' + stretches.join(', ') : 'Krążenia stawów i 10 lekkich powtórzeń ruchu', tip: 'Ruch, nie długie trzymanie, żeby nie stracić napięcia.' }
    ];
    if (ex.eq.indexOf('sztanga') > -1) steps.push({ kind: 'warm', label: 'Seria rozgrzewkowa', what: 'Pusta sztanga × 10', rest: 60 });
    [[0.4, 5, 60], [0.55, 3, 90], [0.7, 2, 120], [0.8, 1, 150], [0.87, 1, 180]].forEach(function (p) {
      var ww = round(base * p[0], u); if (ww > 0) steps.push({ kind: 'warm', label: 'Seria rozgrzewkowa', what: kg(ww) + ' × ' + p[1], rest: p[2] });
    });
    [[a1, '1. podejście', 'Pewniak: ma pójść gładko.'], [a2, '2. podejście', 'Okolice Twojego obecnego maksa.'], [a3, '3. podejście', 'Próba rekordu. Idź tylko, jeśli 2. było szybkie.']].forEach(function (a, i) {
      steps.push({ kind: 'att', label: a[1], what: kg(a[0]) + ' × 1', tip: a[2], rest: i < 2 ? 240 : 0, w: a[0] });
    });
    return { e: e, pen: pen, attempts: [a1, a2, a3], steps: steps };
  }

  /* ---------- ĆWICZENIA ---------- */
  var libFilter = 'all';
  routes.cwiczenia = function () {
    var list = SZ.EX.filter(function (e) { if (libFilter === 'all') return true; var g = SZ.GROUPS.filter(function (x) { return x.id === libFilter; })[0]; return e.prim.some(function (m) { return g.m.indexOf(m) > -1; }); });
    return '<header class="page"><h1>Ćwiczenia</h1><p class="lead">' + SZ.EX.filter(usable).length + ' z ' + SZ.EX.length + ' pasuje do Twojego sprzętu i ciała.</p></header>' +
      '<div class="focus" role="group" aria-label="Partia"><button class="chip' + (libFilter === 'all' ? ' is-on' : '') + '" data-act="lib" data-v="all" aria-pressed="' + (libFilter === 'all') + '">Wszystkie</button>' +
      SZ.GROUPS.map(function (g) { return '<button class="chip' + (libFilter === g.id ? ' is-on' : '') + '" data-act="lib" data-v="' + g.id + '" aria-pressed="' + (libFilter === g.id) + '">' + g.name + '</button>'; }).join('') + '</div>' +
      '<ul class="lib">' + list.map(function (e) {
        var ok = usable(e);
        return '<li><a class="libcard' + (ok ? '' : ' is-off') + '" href="#/cw/' + e.id + '">' + FIG.figure(e, { cls: 'fig--md', label: e.name }) + '<b>' + e.name + '</b><small>' + (ok ? muscles(e.prim) : whyNot(e)) + '</small></a></li>';
      }).join('') + '</ul>';
  };
  routes.cw = function (id) {
    var e = EXI[id]; if (!e) return routes.cwiczenia();
    var b = best(id), h = history(id), ok = usable(e);
    var alts = SZ.EX.filter(function (x) { return x.id !== id && x.prim[0] === e.prim[0] && usable(x); }).slice(0, 3);
    return '<header class="page"><a class="back" href="#/cwiczenia">Ćwiczenia</a><h1>' + e.name + '</h1></header>' +
      (ok ? '' : '<p class="warnline">Nie w Twoim planie: ' + whyNot(e) + '</p>') +
      '<div class="plate">' + FIG.figure(e, { cls: 'fig--xl' }) + '</div>' +
      '<section class="card"><h2>Technika</h2><ol class="cuelist">' + e.cues.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ol></section>' +
      '<section class="card"><h2>Pracujące mięśnie</h2>' + FIG.atlas({ prim: e.prim, sec: e.sec, pain: S.pain }) +
      '<p class="legend"><span class="lg lg--p"></span>' + muscles(e.prim) + (e.sec.length ? ' <span class="lg lg--s"></span>' + muscles(e.sec) : '') + '</p></section>' +
      '<dl class="ledger"><div><dt>Sprzęt</dt><dd>' + (e.eq.length ? e.eq.map(function (q) { return SZ.EQUIPMENT.filter(function (x) { return x.id === q; })[0].name; }).join(', ') : 'bez sprzętu') + '</dd></div>' +
      '<div><dt>Obciąża</dt><dd>' + (e.stress.length ? e.stress.map(function (j) { return SZ.JOINTS[j]; }).join(', ') : 'nic szczególnie') + '</dd></div>' +
      '<div><dt>Twój rekord</dt><dd>' + (b ? kg(b.w) + ' × ' + b.r : '—') + '</dd></div><div><dt>Treningi</dt><dd>' + h.length + '</dd></div></dl>' +
      (alts.length ? '<section class="card"><h2>Zamienniki</h2><ul class="rows">' + alts.map(function (a) { return '<li><a href="#/cw/' + a.id + '"><b>' + a.name + '</b><span>' + muscles(a.prim) + '</span></a></li>'; }).join('') + '</ul></section>' : '');
  };

  /* ---------- POSTĘPY ---------- */
  var chartEx = null;
  routes.postepy = function () {
    var withH = SZ.EX.filter(function (e) { return history(e.id).some(function (h) { return h.sets.some(function (x) { return x.w > 0; }); }); });
    if (!chartEx || !withH.filter(function (e) { return e.id === chartEx; }).length) chartEx = withH[0] ? withH[0].id : null;
    var weekAgo = Date.now() - 7 * 864e5;
    var thisWeek = S.sessions.filter(function (s) { return s.date > weekAgo; }).length;
    var targets = Object.keys(S.goal.targets || {}).filter(function (k) { return S.goal.targets[k] > 0 && EXI[k]; });
    var prs = Object.keys(S.prs).map(function (k) { return { ex: k, p: S.prs[k] }; }).sort(function (a, b) { return b.p.date - a.p.date; });
    if (!S.sessions.length) return '<header class="page"><h1>Postępy</h1></header><section class="card empty"><p>Tu pojawią się wykresy po pierwszym zapisanym treningu.</p><a class="btn btn--main" href="#/">Zacznij trening</a><button class="btn btn--ghost" data-act="demo-load">Wczytaj przykładowe dane</button></section>';
    return demoBar() + '<header class="page"><h1>Postępy</h1></header>' +
      '<dl class="ledger ledger--3"><div><dt>W tym tygodniu</dt><dd>' + thisWeek + ' / ' + S.profile.days + '</dd></div><div><dt>Seria tygodni</dt><dd>' + streak() + '</dd></div><div><dt>Rekordy</dt><dd>' + prs.length + '</dd></div></dl>' +
      '<section class="card"><div class="card__head"><h2>Cel: ' + GOALS[S.goal.type].name.toLowerCase() + '</h2><a class="link" href="#/profil">Zmień</a></div>' +
      (targets.length ? '<ul class="goals">' + targets.map(function (k) {
        var t = S.goal.targets[k], b = best(k), start = (S.goal.starts || {})[k] || (b ? b.e * 0.85 : 0), cur = b ? b.e : 0;
        var p = Math.max(0, Math.min(1, (cur - start) / Math.max(t - start, 1)));
        return '<li><div class="goals__top"><b>' + EXI[k].name + '</b><span>' + (b ? kg(cur) : '—') + ' / ' + kg(t) + '</span></div><div class="bar bar--goal"><i style="--w:' + p + '"></i></div><small>' + (cur >= t ? 'Cel osiągnięty.' : 'Brakuje ' + kg(t - cur) + ' szacowanego maksa.') + '</small></li>';
      }).join('') + '</ul>' : '<p class="muted">Ustaw liczby, do których dążysz (np. przysiad 120 kg), a pokażemy postęp.</p><a class="btn btn--ghost" href="#/profil">Ustaw cele</a>') + '</section>' +
      (chartEx ? '<section class="card"><h2>Szacowany maks (1RM)</h2><div class="chips chips--scroll">' + withH.map(function (e) { return '<button class="chip' + (e.id === chartEx ? ' is-on' : '') + '" data-act="chart" data-v="' + e.id + '" aria-pressed="' + (e.id === chartEx) + '">' + e.name + '</button>'; }).join('') + '</div>' + lineChart(chartEx) + '</section>' : '') +
      '<section class="card"><h2>Objętość tygodniowa</h2>' + volChart() + '</section>' +
      (prs.length ? '<section class="card"><h2>Rekordy</h2><ul class="rows">' + prs.map(function (x) { return '<li><b>' + EXI[x.ex].name + '</b><span>' + kg(x.p.w) + ' × ' + x.p.r + ' · szac. ' + kg(x.p.e) + ' · ' + dshort(x.p.date) + '</span></li>'; }).join('') + '</ul></section>' : '') +
      '<section class="card"><h2>Historia</h2><ul class="rows">' + S.sessions.slice(-8).reverse().map(function (s) { return '<li><b>' + esc(s.title) + '</b><span>' + dshort(s.date) + ' · ' + s.items.length + ' ćw. · ' + (s.dur || '—') + ' min</span></li>'; }).join('') + '</ul></section>';
  };
  function streak() {
    var n = 0, now = Date.now();
    for (var w = 0; w < 52; w++) {
      var a = now - (w + 1) * 7 * 864e5, b = now - w * 7 * 864e5;
      if (S.sessions.some(function (s) { return s.date > a && s.date <= b; })) n++; else if (w > 0) break;
    }
    return n + (n === 1 ? ' tydzień' : n > 1 && n < 5 ? ' tygodnie' : ' tygodni');
  }
  function lineChart(id) {
    var pts = history(id).map(function (h) { var m = 0, top = null; h.sets.forEach(function (x) { var v = e1rm(x.w, x.r); if (v > m) { m = v; top = x; } }); return { d: h.date, v: m, top: top }; }).filter(function (p) { return p.v > 0; }).slice(-16);
    if (pts.length < 2) return '<p class="muted">Za mało danych na wykres. Zrób jeszcze jeden trening z tym ćwiczeniem.</p>';
    var W = 340, H = 180, L = 40, R = 10, T = 14, B = 26;
    var lo = Math.min.apply(null, pts.map(function (p) { return p.v; })), hi = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    var pad = Math.max((hi - lo) * 0.2, 5); lo = Math.floor((lo - pad) / 5) * 5; hi = Math.ceil((hi + pad) / 5) * 5;
    var x = function (i) { return L + (W - L - R) * i / (pts.length - 1); }, y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join('');
    var grid = ''; for (var g = 0; g <= 3; g++) { var v = lo + (hi - lo) * g / 3, yy = y(v); grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" class="c-grid"/><text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end" class="c-ax">' + Math.round(v) + '</text>'; }
    var last = pts[pts.length - 1], first = pts[0];
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Szacowany maks w ' + EXI[id].name + ': od ' + kg(first.v) + ' do ' + kg(last.v) + '">' + grid +
      '<path d="' + d + '" class="c-line"/>' + pts.map(function (p, i) { return '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="' + (i === pts.length - 1 ? 5 : 3) + '" class="c-dot' + (i === pts.length - 1 ? ' is-last' : '') + '"/>'; }).join('') +
      '<text x="' + L + '" y="' + (H - 6) + '" class="c-ax">' + dshort(first.d) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end" class="c-ax">' + dshort(last.d) + '</text></svg>' +
      '<p class="chart__sum"><b>' + kg(last.v) + '</b> teraz · ' + (last.v >= first.v ? '+' : '') + nf(last.v - first.v, 1) + ' kg od ' + dshort(first.d) + '</p>';
  }
  function volChart() {
    var weeks = [], now = Date.now();
    for (var w = 7; w >= 0; w--) {
      var a = now - (w + 1) * 7 * 864e5, b = now - w * 7 * 864e5, v = 0;
      S.sessions.forEach(function (s) { if (s.date > a && s.date <= b) s.items.forEach(function (it) { it.sets.forEach(function (x) { v += (x.w || 0) * x.r; }); }); });
      weeks.push({ v: v, a: a });
    }
    var max = Math.max.apply(null, weeks.map(function (x) { return x.v; })) || 1;
    return '<div class="vol" role="img" aria-label="Objętość w ostatnich 8 tygodniach">' + weeks.map(function (x, i) {
      return '<div class="vol__col"><span class="vol__v">' + (x.v ? nf(x.v / 1000, 1) : '') + '</span><i style="--h:' + (x.v / max) + '"' + (i === 7 ? ' class="is-now"' : '') + '></i><small>' + (i === 7 ? 'teraz' : '−' + (7 - i)) + '</small></div>';
    }).join('') + '</div><p class="muted">Tony (ciężar × powtórzenia) w kolejnych tygodniach.</p>';
  }

  /* ---------- CIAŁO ---------- */
  routes.cialo = function () {
    var excl = SZ.EX.filter(function (e) { return painHit(e).length; });
    var st = stretchFor(S.pain);
    return '<header class="page"><h1>Ciało</h1><p class="lead">Dotknij miejsca, które boli. Plan od razu omija ćwiczenia, które je obciążają.</p></header>' +
      '<section class="card">' + FIG.atlas({ mode: 'pain', pain: S.pain }) + painChips() + '</section>' +
      (S.pain.length ? '<section class="card"><h2>Rozciąganie i mobilizacja</h2><ul class="stlist">' + st.map(stretchRow).join('') + '</ul></section>' +
        '<section class="card"><details class="excl"><summary>Pominięte ćwiczenia (' + excl.length + ')</summary><ul class="rows">' + excl.map(function (e) { return '<li><a href="#/cw/' + e.id + '"><b>' + e.name + '</b><span>obciąża: ' + painHit(e).map(function (j) { return SZ.JOINTS[j]; }).join(', ') + '</span></a></li>'; }).join('') + '</ul></details></section>' : '') +
      medNote();
  };

  /* ---------- PROFIL ---------- */
  routes.profil = function () {
    var p = S.profile;
    var tgt = ['przysiad', 'wyciskanie', 'martwy', 'ohp', 'podciaganie'].filter(function (k) { return hasEq(EXI[k]); });
    return '<header class="page"><h1>Profil</h1></header>' +
      '<form class="card" data-profile><h2>O Tobie</h2><label class="field"><span>Imię</span><input name="name" value="' + esc(p.name) + '"></label><div class="grid2">' +
      num('age', 'Wiek', p.age, 'lat') + num('height', 'Wzrost', p.height, 'cm') + num('weight', 'Masa ciała', p.weight, 'kg') + '</div>' +
      '<fieldset><legend>Doświadczenie</legend><div class="seg seg--3">' + [[1, 'Początek'], [2, 'Średnio'], [3, 'Zaawans.']].map(function (o) { return '<label><input type="radio" name="level" value="' + o[0] + '"' + (p.level == o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset><legend>Cel</legend><div class="opts">' + Object.keys(GOALS).map(function (k) { return opt('goal', k, GOALS[k].name, GOALS[k].desc, S.goal.type === k); }).join('') + '</div></fieldset>' +
      '<fieldset><legend>Dni w tygodniu</legend><div class="seg">' + [2, 3, 4, 5, 6].map(function (d) { return '<label><input type="radio" name="days" value="' + d + '"' + (p.days == d ? ' checked' : '') + '><span>' + d + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset><legend>Czas treningu</legend><div class="seg">' + [30, 45, 60, 90].map(function (d) { return '<label><input type="radio" name="minutes" value="' + d + '"' + (p.minutes == d ? ' checked' : '') + '><span>' + d + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset><legend>Liczby, do których dążysz</legend><p class="muted">Szacowany maks na jedno powtórzenie. Zostaw puste, jeśli nie chcesz.</p><div class="grid2">' +
      tgt.map(function (k) { return '<label class="field"><span>' + EXI[k].name + '</span><div class="unitbox"><input name="t-' + k + '" type="number" inputmode="decimal" value="' + ((S.goal.targets || {})[k] || '') + '"><em>kg</em></div></label>'; }).join('') + '</div></fieldset>' +
      '<button class="btn btn--main btn--wide" data-act="profile-save">Zapisz</button></form>' +
      '<section class="card"><h2>Sprzęt</h2>' + eqPresets() + eqChips() + '</section>' +
      '<section class="card"><h2>Wygląd</h2><div class="seg seg--2"><label><input type="radio" name="theme" value="dark"' + (S.settings.theme !== 'light' ? ' checked' : '') + ' data-act="theme"><span>Ciemny</span></label><label><input type="radio" name="theme" value="light"' + (S.settings.theme === 'light' ? ' checked' : '') + ' data-act="theme"><span>Jasny</span></label></div></section>' +
      '<section class="card"><h2>Twoje dane</h2><p class="muted">Wszystko jest zapisane tylko na tym urządzeniu: w bazie przeglądarki i w kopii zapasowej obok niej.</p><dl class="ledger" data-storage><div><dt>Pamięć trwała</dt><dd data-persist>sprawdzam…</dd></div><div><dt>Treningi</dt><dd>' + S.sessions.length + '</dd></div><div><dt>Ostatni zapis</dt><dd>' + (S.savedAt ? dshort(S.savedAt) + ' ' + new Date(S.savedAt).toTimeString().slice(0, 5) : '—') + '</dd></div></dl>' +
      '<div class="stack"><button class="btn btn--main btn--wide" data-act="export">Pobierz kopię zapasową</button><label class="btn btn--ghost btn--wide filebtn">Wczytaj kopię z pliku<input type="file" accept="application/json,.json" data-import></label></div>' +
      '<p class="muted">Pamiętaj: wyczyszczenie danych przeglądarki usuwa też dane aplikacji. Pobieraj kopię raz w miesiącu.</p></section>' +
      '<section class="card"><h2>Inne</h2><div class="stack">' + (S.demo ? '<button class="btn btn--ghost btn--wide" data-act="demo-clear">Usuń przykładowe dane</button>' : '<button class="btn btn--ghost btn--wide" data-act="demo-load">Wczytaj przykładowe dane</button>') +
      '<button class="btn btn--danger btn--wide" data-act="reset">Usuń wszystkie dane</button></div></section>';
  };

  /* ================= DANE PRZYKŁADOWE ================= */
  function demoData() {
    var sessions = [], now = Date.now(), base = { przysiad: 80, wyciskanie: 62.5, martwy: 100, wioslowanie: 55, ohp: 40, 'wyciskanie-db': 24, goblet: 24, podciaganie: 0 };
    var plan = [['Cały trening A', ['przysiad', 'wyciskanie', 'wioslowanie', 'deska']], ['Cały trening B', ['martwy', 'ohp', 'podciaganie', 'goblet']], ['Cały trening C', ['przysiad', 'wyciskanie-db', 'wioslowanie', 'spiecia']]];
    for (var i = 0; i < 22; i++) {
      var d = now - (56 - i * 2.6) * 864e5, p = plan[i % 3], prog = Math.floor(i / 3);
      sessions.push({ id: 'd' + i, date: Math.round(d), title: p[0], dur: 52 + (i % 4) * 4, items: p[1].map(function (id) {
        var w = base[id] == null ? 0 : base[id] + prog * (EXI[id].unit === 1 ? 1 : 2.5);
        var reps = id === 'deska' ? 40 : id === 'podciaganie' ? 6 + Math.floor(prog / 2) : id === 'spiecia' ? 15 : 8 - (i % 2);
        return { ex: id, unit: id === 'deska' ? 's' : '', sets: [0, 1, 2].map(function () { return { w: w, r: reps, done: true }; }) };
      }) });
    }
    return sessions;
  }
  function loadDemo() {
    S.sessions = demoData().concat(S.sessions.filter(function (s) { return s.id[0] !== 'd'; }));
    S.demo = true;
    if (!Object.keys(S.goal.targets || {}).length) S.goal.targets = { przysiad: 135, wyciskanie: 105, martwy: 165 };
    S.prs = {}; ['przysiad', 'wyciskanie', 'martwy', 'wioslowanie', 'ohp', 'goblet'].forEach(function (id) { var b = best(id); if (b) S.prs[id] = { e: b.e, w: b.w, r: b.r, date: b.date }; });
    S.goal.starts = { przysiad: 100, wyciskanie: 78, martwy: 125 };
  }

  /* ================= ZDARZENIA ================= */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) {
      var pc = e.target.closest('[data-pain]'); if (pc) { togglePain(pc.getAttribute('data-pain')); }
      return;
    }
    var a = b.getAttribute('data-act'), v = b.getAttribute('data-v');
    if (b.tagName === 'BUTTON' && b.form) e.preventDefault();
    switch (a) {
      case 'ob-next':
        readOb();
        if (ob < 4) { ob++; render(); } else { S.onboarded = true; save(true); askPersist().then(function () { go('#/'); }); }
        break;
      case 'ob-back': readOb(); ob = Math.max(0, ob - 1); render(); break;
      case 'demo':
        readOb(); if (!S.profile.name) S.profile.name = 'Ola';
        S.profile.level = 2; S.onboarded = true; loadDemo(); save(true); askPersist(); go('#/'); break;
      case 'eq': S.equipment[v] = !S.equipment[v]; save(); rerenderKeep(); break;
      case 'eq-preset':
        SZ.EQUIPMENT.forEach(function (q) { S.equipment[q.id] = v === 'all' || (v === 'home' && ['hantle', 'guma', 'lawka'].indexOf(q.id) > -1); });
        save(); rerenderKeep(); break;
      case 'focus': S.focus = v; save(); render(); break;
      case 'start': startSession(); break;
      case 'set': {
        var A = S.active, it = A.items[A.i], k = +b.getAttribute('data-k'), x = it.sets[k];
        x.done = !x.done; save(); render();
        if (x.done) {
          var more = it.sets.some(function (s) { return !s.done; });
          var nxt = more ? 'Następna: seria ' + (it.sets.findIndex(function (s) { return !s.done; }) + 1) : A.i < A.items.length - 1 ? 'Następne: ' + EXI[A.items[A.i + 1].ex].name : 'To była ostatnia seria.';
          if (more || A.i < A.items.length - 1) startRest(it.rest, nxt);
        }
        break;
      }
      case 'inc': case 'dec': {
        var A2 = S.active, it2 = A2.items[A2.i], k2 = +b.getAttribute('data-k'), f = b.getAttribute('data-f'), ex2 = EXI[it2.ex];
        var stp = f === 'w' ? (ex2.unit || 2.5) : (it2.unit === 's' ? 5 : 1), sgn = a === 'inc' ? 1 : -1;
        var nv = Math.max(0, Math.round((it2.sets[k2][f] + sgn * stp) * 10) / 10);
        it2.sets[k2][f] = nv;
        if (f === 'w') it2.sets.forEach(function (s, j) { if (j > k2 && !s.done) s.w = nv; });   // kolejne serie dziedziczą ciężar
        save(); render(); var again = $('[data-act="' + a + '"][data-f="' + f + '"][data-k="' + k2 + '"]'); if (again) again.focus();
        break;
      }
      case 'next': S.active.i++; save(); stopRest(); render(); break;
      case 'prev': S.active.i--; save(); stopRest(); render(); break;
      case 'finish': finishSession(); break;
      case 'end':
        if (S.active.items.some(function (it) { return it.sets.some(function (x) { return x.done; }); })) { if (confirm('Zakończyć i zapisać zrobione serie?')) finishSession(); }
        else if (confirm('Przerwać trening? Nic nie zostało zrobione.')) { S.active = null; save(); stopRest(); go('#/'); }
        break;
      case 'rest-skip': stopRest(); break;
      case 'rest-add': { var box = $('#rest'); if (box.__add) box.__add(30); break; }
      case 'pr-pick': S.prDraft = { step: 1, ex: v, checks: {}, log: {} }; save(); render(); break;
      case 'pr-back': S.prDraft = { step: 0 }; save(); render(); break;
      case 'pr-back1': S.prDraft.step = 1; save(); render(); break;
      case 'pr-plan': {
        var f2 = $('[data-prform]'), ch = {};
        $$('.checks input').forEach(function (c) { ch[c.name] = c.checked; });
        var w = parseFloat(f2.elements.pw.value.replace(',', '.')) || 0, r = parseInt(f2.elements.pr.value, 10) || 1;
        if (w <= 0) { f2.elements.pw.focus(); toast('Podaj ciężar większy od zera.'); break; }
        S.prDraft.checks = ch; S.prDraft.w = w; S.prDraft.r = r; S.prDraft.plan = buildPr(EXI[S.prDraft.ex], w, r, ch); S.prDraft.step = 2; S.prDraft.log = {};
        save(); render(); break;
      }
      case 'pr-done': { var i = b.getAttribute('data-i'); S.prDraft.log[i] = S.prDraft.log[i] === 'done' ? '' : 'done'; save(); render(); break; }
      case 'pr-res': { var i2 = b.getAttribute('data-i'); S.prDraft.log[i2] = S.prDraft.log[i2] === v ? '' : v; save(); render(); break; }
      case 'pr-rest': startRest(+b.getAttribute('data-s'), 'Następny krok planu'); break;
      case 'pr-finish': {
        var D = S.prDraft, P = D.plan, okW = 0;
        P.steps.forEach(function (s, j) { if (s.kind === 'att' && D.log[j] === 'ok') okW = Math.max(okW, s.w); });
        var bb = best(D.ex);
        if (okW > 0) {
          S.sessions.push({ id: 'p' + Date.now(), date: Date.now(), title: 'Dzień rekordu: ' + EXI[D.ex].name, dur: 0, items: [{ ex: D.ex, sets: [{ w: okW, r: 1, done: true }] }] });
          var isPr = !bb || okW > bb.e;
          if (isPr) S.prs[D.ex] = { e: okW, w: okW, r: 1, date: Date.now() };
          S.lastSummary = { sess: S.sessions[S.sessions.length - 1], prs: isPr ? [{ ex: D.ex, w: okW, r: 1, e: okW }] : [] };
          S.prDraft = null; save(true); go('#/podsumowanie');
        } else { toast('Zaznacz wynik przynajmniej jednego podejścia (zaliczone lub nie).'); if (P.steps.some(function (s, j) { return s.kind === 'att' && D.log[j] === 'no'; })) { S.prDraft = null; save(true); toast('Zapisane. Następnym razem zacznij od niższego ciężaru.'); go('#/'); } }
        break;
      }
      case 'lib': libFilter = v; render(); break;
      case 'chart': chartEx = v; render(); break;
      case 'profile-save': {
        var fp = $('[data-profile]'), el = fp.elements;
        S.profile.name = el.name.value.trim();
        ['age', 'height', 'weight'].forEach(function (k3) { S.profile[k3] = +el[k3].value || S.profile[k3]; });
        S.profile.level = +fp.querySelector('[name=level]:checked').value;
        S.goal.type = fp.querySelector('[name=goal]:checked').value;
        S.profile.days = +fp.querySelector('[name=days]:checked').value;
        S.profile.minutes = +fp.querySelector('[name=minutes]:checked').value;
        S.goal.targets = S.goal.targets || {}; S.goal.starts = S.goal.starts || {};
        $$('input[name^="t-"]', fp).forEach(function (inp) { var id = inp.name.slice(2), val = parseFloat(inp.value.replace(',', '.')); if (val > 0) { S.goal.targets[id] = val; if (!S.goal.starts[id]) { var bb2 = best(id); S.goal.starts[id] = bb2 ? bb2.e : 0; } } else delete S.goal.targets[id]; });
        save(true); toast('Zapisano. Plan dopasowany do zmian.'); break;
      }
      case 'export': exportData(); break;
      case 'demo-load': loadDemo(); save(true); render(); toast('Wczytano 8 tygodni przykładowych treningów.'); break;
      case 'demo-clear': S.sessions = S.sessions.filter(function (s) { return s.id[0] !== 'd'; }); S.demo = false; save(true); render(); break;
      case 'reset':
        if (confirm('Usunąć wszystkie dane z tego telefonu? Tego nie da się cofnąć. Najpierw możesz pobrać kopię.')) { var th = S.settings.theme; S = fresh(); S.settings.theme = th; ob = 0; save(true); go('#/'); }
        break;
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-act="theme"]')) { S.settings.theme = e.target.value; applyTheme(); save(); }
    if (e.target.matches('[data-import]')) importData(e.target.files[0]);
  });
  document.addEventListener('keydown', function (e) {
    var h = e.target.closest && e.target.closest('[data-pain]');
    if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); togglePain(h.getAttribute('data-pain')); }
  });
  function togglePain(j) {
    if (!S.onboarded) readOb();
    var i = S.pain.indexOf(j); if (i > -1) S.pain.splice(i, 1); else S.pain.push(j);
    save(); rerenderKeep();
    var again = $('[data-pain="' + j + '"].b-hot'); if (again) again.focus();
  }
  function rerenderKeep() { var y = window.scrollY; render(); window.scrollTo(0, y); }

  function exportData() {
    var blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    var a = document.createElement('a'), d = new Date();
    a.href = URL.createObjectURL(blob); a.download = 'silczkomat-kopia-' + d.toISOString().slice(0, 10) + '.json';
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
        var base = fresh(); for (var k in base) if (!(k in d)) d[k] = base[k];
        S = d; save(true); applyTheme(); render(); toast('Kopia wczytana.');
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
  window.addEventListener('hashchange', function () { stopRestIfLeaving(); render(); });
  function stopRestIfLeaving() { if (!/trening|pr/.test(location.hash)) stopRest(); }
  setInterval(function () { var p = $('[data-persist]'); if (p && navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (x) { p.textContent = x ? 'włączona' : 'nie przyznana (zrób kopię)'; }); }, 1000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && S) save(true); });

  load().then(function (st) {
    S = st; applyTheme(); render();
    if (S.onboarded) askPersist();
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
