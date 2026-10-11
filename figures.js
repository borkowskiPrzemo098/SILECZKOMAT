/* SIŁECZKOMAT — rysunki: animowana sylwetka ćwiczenia i atlas ciała (przód/tył). */
window.SZFIG = (function () {
  'use strict';
  var SZ = window.SZ;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- sylwetka ---------- */
  function pts(a) { var p = []; for (var i = 0; i < a.length; i += 2) p.push([a[i], a[i + 1]]); return p; }
  function lerp(a, b, t) { var o = []; for (var i = 0; i < a.length; i++) o.push(a[i] + (b[i] - a[i]) * t); return o; }
  function anchorFor(pat) {
    if (pat === 'pushdown' || pat === 'pulldown') return [50, -12];
    if (pat === 'facepull') return [96, 12];
    if (pat === 'fly') return [96, 22];
    if (pat === 'pallof') return [96, 34];
    return [96, 58];
  }
  function geometry(f, pat, prop) {
    var p = pts(f), head = p[0], neck = p[1], el = p[2], hand = p[3], hip = p[4], kn = p[5], ft = p[6], kn2 = p[7], ft2 = p[8];
    var sh = [neck[0], neck[1] + 2];
    var g = {
      head: head, torso: 'M' + neck + 'L' + hip,
      arm: 'M' + sh + 'L' + el + 'L' + hand,
      leg: 'M' + hip + 'L' + kn + 'L' + ft,
      leg2: 'M' + hip + 'L' + kn2 + 'L' + ft2,
      prop: ''
    };
    var h = hand;
    if (prop === 'bar') g.prop = '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="8.5" class="f-plate"/><circle cx="' + h[0] + '" cy="' + h[1] + '" r="2" class="f-hub"/>';
    else if (prop === 'db') g.prop = '<rect x="' + (h[0] - 5) + '" y="' + (h[1] - 2.6) + '" width="10" height="5.2" rx="1.6" class="f-db"/>';
    else if (prop === 'kb') g.prop = '<circle cx="' + h[0] + '" cy="' + (h[1] + 5) + '" r="5" class="f-db"/>';
    else if (prop === 'cable' || prop === 'band') { var a = anchorFor(pat); g.prop = '<path d="M' + h + 'L' + a + '" class="f-cable' + (prop === 'band' ? ' f-band' : '') + '"/><circle cx="' + a[0] + '" cy="' + a[1] + '" r="2.4" class="f-hub"/>'; }
    return g;
  }
  function staticProps(pat, prop) {
    var s = '';
    if (pat === 'bench') s += '<path d="M16 61H62M22 61V94M56 61V94" class="f-bench"/>';
    if (pat === 'legcurl' || pat === 'legext' || pat === 'pulldown') s += '<path d="M34 66H62M40 66V94M58 66V94M36 66V36" class="f-bench"/>';
    if (pat === 'legpress') s += '<path d="M44 80L22 52M36 94L50 80M70 40L84 54" class="f-bench"/>';
    if (pat === 'pullup' || prop === 'pullbar') s += '<path d="M30 1H72" class="f-bench"/>';
    if (pat === 'dip') s += '<path d="M36 47H64M40 47V94M60 47V94" class="f-bench"/>';
    if (pat === 's-wall' || pat === 's-calf') s += '<path d="M82 -10V94" class="f-bench"/>';
    return s;
  }
  function figure(ex, opts) {
    opts = opts || {};
    var pat = ex.pat, poses = SZ.POSES[pat] || SZ.POSES.curl;
    var hl = { leg: '', arm: '', torso: '' };
    (ex.sec || []).forEach(function (m) { hl[SZ.segOf(m)] = 'is-sec'; });
    (ex.prim || []).forEach(function (m) { hl[SZ.segOf(m)] = 'is-prim'; });
    var g = geometry(poses[0], pat, ex.prop);
    return '<svg class="fig' + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="0 -14 100 110" data-fig="' + pat + '" data-prop="' + (ex.prop || '') + '" role="img" aria-label="' + (opts.label || ('Animacja ruchu: ' + ex.name)) + '">' +
      '<path d="M2 94H98" class="f-ground"/>' + staticProps(pat, ex.prop) + '<g class="f-prop">' + g.prop + '</g>' +
      '<path class="f-limb f-leg2 ' + hl.leg + '" d="' + g.leg2 + '"/>' +
      '<path class="f-limb f-torso ' + hl.torso + '" d="' + g.torso + '"/>' +
      '<path class="f-limb f-leg ' + hl.leg + '" d="' + g.leg + '"/>' +
      '<circle class="f-head" r="5.6" cx="' + g.head[0] + '" cy="' + g.head[1] + '"/>' +
      '<path class="f-limb f-arm ' + hl.arm + '" d="' + g.arm + '"/></svg>';
  }

  /* jedna pętla animacji dla widocznych sylwetek */
  var live = new Set();
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); });
  }) : null;
  function watch(root) {
    (root || document).querySelectorAll('svg[data-fig]').forEach(function (s) {
      if (s.__w) return; s.__w = 1;
      if (io) io.observe(s); else live.add(s);
    });
  }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function phase(ms) {
    var c = (ms % 3200) / 3200;          // 0..1: ruch, pauza, powrót, pauza
    if (c < .38) return ease(c / .38);
    if (c < .5) return 1;
    if (c < .88) return 1 - ease((c - .5) / .38);
    return 0;
  }
  function tick(ms) {
    var t = phase(ms);
    live.forEach(function (s) {
      if (!s.isConnected) { live.delete(s); return; }
      var pat = s.getAttribute('data-fig'), poses = SZ.POSES[pat]; if (!poses) return;
      var g = geometry(lerp(poses[0], poses[1], t), pat, s.getAttribute('data-prop'));
      s.querySelector('.f-torso').setAttribute('d', g.torso);
      s.querySelector('.f-arm').setAttribute('d', g.arm);
      s.querySelector('.f-leg').setAttribute('d', g.leg);
      s.querySelector('.f-leg2').setAttribute('d', g.leg2);
      var hd = s.querySelector('.f-head'); hd.setAttribute('cx', g.head[0]); hd.setAttribute('cy', g.head[1]);
      s.querySelector('.f-prop').innerHTML = g.prop;
    });
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);

  /* ---------- atlas ciała ---------- */
  var FRONT = [
    ['barki', 'e', 34, 52, 10, 9], ['barki', 'e', 86, 52, 10, 9],
    ['klatka', 'r', 41, 45, 18, 20, 6], ['klatka', 'r', 61, 45, 18, 20, 6],
    ['biceps', 'e', 28, 75, 6.5, 13], ['biceps', 'e', 92, 75, 6.5, 13],
    ['przedramiona', 'e', 24, 103, 5.5, 14], ['przedramiona', 'e', 96, 103, 5.5, 14],
    ['brzuch', 'r', 49, 68, 10, 11, 3], ['brzuch', 'r', 61, 68, 10, 11, 3], ['brzuch', 'r', 49, 81, 10, 11, 3], ['brzuch', 'r', 61, 81, 10, 11, 3], ['brzuch', 'r', 49, 94, 10, 11, 3], ['brzuch', 'r', 61, 94, 10, 11, 3],
    ['brzuch', 'e', 42, 88, 4.5, 15], ['brzuch', 'e', 78, 88, 4.5, 15],
    ['czworoglowe', 'e', 48, 145, 10, 28], ['czworoglowe', 'e', 72, 145, 10, 28],
    ['lydki', 'e', 47, 200, 6.5, 20], ['lydki', 'e', 73, 200, 6.5, 20]
  ];
  var BACK = [
    ['czworoboczny', 'p', 'M60 36L76 46L60 66L44 46Z'],
    ['barki', 'e', 34, 52, 10, 9], ['barki', 'e', 86, 52, 10, 9],
    ['plecy', 'e', 45, 78, 9, 19], ['plecy', 'e', 75, 78, 9, 19],
    ['plecy', 'r', 54, 66, 12, 18, 3],
    ['prostowniki', 'r', 52, 86, 7, 20, 3], ['prostowniki', 'r', 61, 86, 7, 20, 3],
    ['triceps', 'e', 28, 75, 6.5, 13], ['triceps', 'e', 92, 75, 6.5, 13],
    ['przedramiona', 'e', 24, 103, 5.5, 14], ['przedramiona', 'e', 96, 103, 5.5, 14],
    ['posladki', 'e', 50, 120, 10.5, 11], ['posladki', 'e', 70, 120, 10.5, 11],
    ['dwuglowe', 'e', 49, 152, 8.5, 22], ['dwuglowe', 'e', 71, 152, 8.5, 22],
    ['lydki', 'e', 48, 198, 7.5, 18], ['lydki', 'e', 72, 198, 7.5, 18]
  ];
  var HOT = {
    front: [['szyja', 60, 34], ['bark', 36, 44], ['bark', 84, 44], ['lokiec', 26, 89], ['lokiec', 94, 89], ['nadgarstek', 22, 119], ['nadgarstek', 98, 119], ['biodro', 45, 113], ['biodro', 75, 113], ['kolano', 48, 176], ['kolano', 72, 176], ['kostka', 47, 222], ['kostka', 73, 222]],
    back: [['szyja', 60, 33], ['piersiowy', 60, 58], ['ledzwie', 60, 100], ['bark', 36, 44], ['bark', 84, 44], ['lokiec', 26, 89], ['lokiec', 94, 89], ['kolano', 48, 176], ['kolano', 72, 176], ['kostka', 47, 222], ['kostka', 73, 222]]
  };
  var SIL = '<g class="b-sil"><circle cx="60" cy="16" r="12"/><rect x="53" y="26" width="14" height="12" rx="4"/>' +
    '<path d="M38 40Q60 34 82 40L92 60L100 116L92 120L84 70L80 112L84 170L80 232L66 234L62 168L58 168L54 234L40 232L36 170L40 112L36 70L28 120L20 116L28 60Z"/></g>';
  function shape(s, cls) {
    if (s[1] === 'e') return '<ellipse class="' + cls + '" cx="' + s[2] + '" cy="' + s[3] + '" rx="' + s[4] + '" ry="' + s[5] + '"/>';
    if (s[1] === 'r') return '<rect class="' + cls + '" x="' + s[2] + '" y="' + s[3] + '" width="' + s[4] + '" height="' + s[5] + '" rx="' + s[6] + '"/>';
    return '<path class="' + cls + '" d="' + s[2] + '"/>';
  }
  function side(list, view, o) {
    var prim = o.prim || [], sec = o.sec || [], pain = o.pain || [];
    var html = '<svg class="atlas__svg" viewBox="0 0 120 240" role="img" aria-label="' + (view === 'front' ? 'Przód ciała' : 'Tył ciała') + '">' + SIL;
    list.forEach(function (s) {
      var c = 'b-m' + (prim.indexOf(s[0]) > -1 ? ' is-prim' : sec.indexOf(s[0]) > -1 ? ' is-sec' : '');
      html += shape(s, c);
    });
    if (o.mode === 'pain') {
      HOT[view].forEach(function (h) {
        var on = pain.indexOf(h[0]) > -1;
        html += '<g class="b-hot' + (on ? ' is-on' : '') + '" data-pain="' + h[0] + '" role="button" tabindex="0" aria-pressed="' + on + '" aria-label="' + SZ.JOINTS[h[0]] + (on ? ', zaznaczone' : '') + '">' +
          '<circle cx="' + h[1] + '" cy="' + h[2] + '" r="10" class="b-hit"/><circle cx="' + h[1] + '" cy="' + h[2] + '" r="5.5" class="b-dot"/></g>';
      });
    } else if (pain.length) {
      HOT[view].forEach(function (h) { if (pain.indexOf(h[0]) > -1) html += '<circle cx="' + h[1] + '" cy="' + h[2] + '" r="5" class="b-painmark"/>'; });
    }
    return html + '</svg>';
  }
  function atlas(o) {
    o = o || {};
    return '<div class="atlas' + (o.mode === 'pain' ? ' atlas--pain' : '') + '"><figure>' + side(FRONT, 'front', o) + '<figcaption>przód</figcaption></figure><figure>' + side(BACK, 'back', o) + '<figcaption>tył</figcaption></figure></div>';
  }

  return { figure: figure, watch: watch, atlas: atlas };
})();
