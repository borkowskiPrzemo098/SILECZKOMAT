/* SIŁECZKOMAT — silnik sylwetek: kinematyka stawów (kąty), bryła ciała, sprzęt, tor ruchu, widok z przodu, atlas ciała. */
window.SZFIG = (function () {
  'use strict';
  var SZ = window.SZ;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = 94; // podłoga

  /* ---------- geometria ---------- */
  var L = { tr: 27, nk: 10, ua: 13.5, fa: 12.5, th: 19.5, sh: 19.5, ft: 6.5 };
  function rad(a) { return a * Math.PI / 180; }
  function v(a, l) { return [Math.sin(rad(a)) * l, -Math.cos(rad(a)) * l]; }
  function add(p, q) { return [p[0] + q[0], p[1] + q[1]]; }
  function sub(p, q) { return [p[0] - q[0], p[1] - q[1]]; }
  function ang(d) { return (Math.atan2(d[0], -d[1]) * 180 / Math.PI + 360) % 360; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(p, q, t) { return [lerp(p[0], q[0], t), lerp(p[1], q[1], t)]; }
  function ik(hip, tgt, l1, l2, dir) {        // dwuczłonowe IK: zwraca kolano
    var d = sub(tgt, hip), dist = Math.min(Math.hypot(d[0], d[1]), l1 + l2 - .01);
    var a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))));
    var base = Math.atan2(d[1], d[0]) - (dir || 1) * a;
    return [hip[0] + Math.cos(base) * l1, hip[1] + Math.sin(base) * l1];
  }

  /* poza (kąty) -> punkty */
  function solve(P) {
    var ls = P.ls || 1, ls2 = P.ls2 || ls, us = P.us == null ? 1 : P.us, us2 = P.us2 == null ? us : P.us2;
    var th2 = P.th2 == null ? P.th : P.th2, sh2 = P.sh2 == null ? P.sh : P.sh2;
    var ua2 = P.ua2 == null ? P.ua : P.ua2, fa2 = P.fa2 == null ? P.fa : P.fa2;
    var hip, sho, el, hand, kn, ank;
    if (P.base === 'stand') { ank = P.at; kn = sub(ank, v(P.sh, L.sh * ls)); hip = sub(kn, v(P.th, L.th * ls)); }
    else if (P.base === 'knee') { kn = P.at; hip = sub(kn, v(P.th, L.th * ls)); }
    else if (P.base === 'hand') { hand = P.at; el = sub(hand, v(P.fa, L.fa * us)); sho = sub(el, v(P.ua, L.ua * us)); hip = sub(sho, v(P.tr, L.tr)); }
    else if (P.base === 'shoulder') { sho = P.at; hip = sub(sho, v(P.tr, L.tr)); }
    else hip = P.at;
    sho = sho || add(hip, v(P.tr, L.tr));
    if (P.up) sho = add(sho, [0, -P.up]);
    var head = add(sho, v(P.hd == null ? P.tr : P.hd, L.nk));
    el = el || add(sho, v(P.ua, L.ua * us)); hand = hand || add(el, v(P.fa, L.fa * us));
    var el2 = add(sho, v(ua2, L.ua * us2)), hand2 = add(el2, v(fa2, L.fa * us2));
    if (P.legIK) { kn = ik(hip, P.legIK, L.th, L.sh, P.ikDir || 1); ank = P.legIK; }
    kn = kn || add(hip, v(P.th, L.th * ls)); ank = ank || add(kn, v(P.sh, L.sh * ls));
    var kn2, ank2;
    if (P.legIK2) { kn2 = ik(hip, P.legIK2, L.th, L.sh, P.ikDir || 1); ank2 = P.legIK2; }
    else { kn2 = add(hip, v(th2, L.th * ls2)); ank2 = add(kn2, v(sh2, L.sh * ls2)); }
    var ft = P.ft == null ? 90 : P.ft, ft2 = P.ft2 == null ? ft : P.ft2;
    var pts = { head: head, sho: sho, el: el, hand: hand, el2: el2, hand2: hand2, hip: hip, kn: kn, ank: ank, toe: add(ank, v(ft, L.ft)), kn2: kn2, ank2: ank2, toe2: add(ank2, v(ft2, L.ft)) };
    if (P.dy || P.dx) for (var k in pts) pts[k] = add(pts[k], [P.dx || 0, P.dy || 0]);
    return pts;
  }
  function mixPts(a, b, t) { var o = {}; for (var k in a) o[k] = mix(a[k], b[k], t); return o; }
  function bodyLine(P, foot) {   // ustaw tułów i nogi w jednej linii do punktu stóp (pompki, deska)
    var s = solve(Object.assign({}, P, { tr: 0, th: 0, sh: 0 }));
    P.tr = ang(sub(s.sho, foot)); P.th = P.tr + 180; P.sh = P.tr + 180; P.ft = P.tr + 270;
    return P;
  }

  /* ---------- ruchy: f(k, p, c) -> { P, props(pts), track } ---------- */
  var STAND = [50, G];
  function benchUnder(sho, hip, tr, len) {
    var off = v(tr + 270, 5.5), a = add(add(hip, v(tr + 180, 5)), off), b = add(add(hip, v(tr, len || 33)), off);
    return [['seg', a, b, 'f-bench f-bench--top'], ['seg', a, [a[0], G], 'f-bench'], ['seg', b, [b[0], G], 'f-bench']];
  }
  function toolAt(tool, pt, pt2) {
    if (tool === 'bar') return [['plate', pt]];
    if (tool === 'db') return [['db', pt]].concat(pt2 ? [['db', pt2, 'far']] : []);
    if (tool === 'kb') return [['kb', pt]];
    if (tool === 'machine') return [['handle', pt]];
    return [];
  }
  function cable(pt, anchor, band) { return [['cable', pt, anchor, band ? 'band' : ''], ['pulley', anchor]]; }
  function seat(x1, x2, back) { var o = [['seg', [x1, 68], [x2, 68], 'f-bench f-bench--top'], ['seg', [(x1 + x2) / 2, 68], [(x1 + x2) / 2, G], 'f-bench']]; if (back) o.push(['seg', [x1 + 2, 68], [x1 + 4, 20], 'f-bench']); return o; }
  function none() { return []; }

  var MOVES = {
    squat: function (k, p, c) {
      var kk = k * (p.box ? .82 : 1), lean = p.lean == null ? 25 : p.lean;
      var P = { base: 'stand', at: STAND, sh: 180 + 30 * kk, th: 180 - 84 * kk, tr: (lean + 14) * kk, ls: p.wide ? .86 : 1 };
      P.th2 = P.th - 3; P.sh2 = P.sh + 3;
      var tr = P.tr;
      if (p.load === 'back') { P.ua = tr + 205; P.fa = tr + 330; }
      else if (p.load === 'front') { P.ua = tr + 100; P.fa = tr + 290; }
      else if (p.load === 'goblet') { P.ua = tr + 165; P.fa = tr + 40; }
      else if (p.load === 'hang') { P.ua = 180; P.fa = 180; }
      else if (p.load === 'machine') { P.tr = 345; P.ua = 160; P.fa = 30; P.th = 180 - 95 * kk; P.sh = 180 + 34 * kk; P.th2 = P.th; P.sh2 = P.sh; }
      else { P.ua = lerp(170, 90, kk); P.fa = lerp(170, 90, kk); }
      if (p.jump) P.dy = -14 * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (c - .55) / .25))));
      return { P: P, track: 'hip', props: function (q) {
        var o = [];
        if (p.load === 'back') o.push(['plate', add(q.sho, v(tr + 260, 3))]);
        if (p.load === 'front') o.push(['plate', add(q.sho, v(tr + 80, 4))]);
        if (p.load === 'goblet' || p.load === 'hang') o.push(['db', q.hand, '', p.load === 'goblet' ? 90 : 0]);
        if (p.box) o.push(['rect', [22, 72, 22, 22], 'f-box']);
        if (p.load === 'machine') o.push(['seg', add(q.hip, v(165, 6)), add(q.sho, v(345, 6)), 'f-bench f-bench--top'], ['seg', [26, G], [60, 8], 'f-rail']);
        return o;
      } };
    },
    hinge: function (k, p) {
      if (p.roman) {
        var Pr = { base: 'hip', at: [50, 58], th: 238, sh: 238, ft: 330, tr: lerp(58, 168, k) };
        Pr.ua = Pr.tr + 150; Pr.fa = Pr.tr + 30;
        return { P: Pr, track: 'head', props: function () { return [['poly', [[42, 62], [56, 56], [58, 60], [46, 94], [42, 94]], 'f-box'], ['seg', [26, 80], [26, 94], 'f-bench']]; } };
      }
      var kn = p.knee || .3, lean = p.lean || 1;
      var P = { base: 'stand', at: STAND, tr: 88 * k * lean, th: 180 - kn * 95 * k, sh: 180 + kn * 42 * k, ua: 180, fa: 180 };
      P.th2 = P.th - 2; P.sh2 = P.sh + 2;
      if (p.single) { P.th2 = 180 + 88 * k; P.sh2 = P.th2; P.ft2 = P.th2 + 90; }
      if (p.back) { P.ua = P.tr + 205; P.fa = P.tr + 330; }
      return { P: P, track: p.back ? 'sho' : 'hand', props: function (q) {
        if (p.back) return [['plate', add(q.sho, v(P.tr + 260, 3))]];
        return toolAt(p.tool, q.hand, q.hand2);
      } };
    },
    swing: function (k) {
      var P = { base: 'stand', at: STAND, tr: 72 * k, th: 180 - 32 * k, sh: 180 + 14 * k };
      P.ua = lerp(85, 205, k); P.fa = P.ua;
      return { P: P, track: 'hand', props: function (q) { return [['kb', q.hand]]; } };
    },
    lunge: function (k, p) {
      if (p.step) {
        var Ps = { base: 'stand', at: [62, 74], th: lerp(108, 180, k), sh: lerp(198, 180, k), tr: lerp(14, 0, k), ua: 180, fa: 180, th2: lerp(205, 178, k), sh2: lerp(186, 200, k) };
        return { P: Ps, track: 'hip', props: function (q) { return [['rect', [52, 74, 30, 20], 'f-box']].concat(toolAt(p.tool, q.hand, q.hand2)); } };
      }
      var P = { base: 'stand', at: [61, G], sh: 180 + 14 * k, th: 180 - 84 * k, tr: 3 * k, ua: 180, fa: 180 };
      if (p.rear) { P.th2 = lerp(198, 188, k); P.sh2 = lerp(292, 300, k); P.ft2 = P.sh2 + 70; }
      else { P.th2 = lerp(206, 182, k); P.sh2 = lerp(206, 262, k); P.ft2 = lerp(120, 180, k); }
      if (p.tool === 'bar') { P.ua = 205; P.fa = 330; }
      return { P: P, track: 'hip', props: function (q) {
        var o = p.tool === 'bar' ? [['plate', add(q.sho, v(260, 3))]] : toolAt(p.tool, q.hand, q.hand2);
        if (p.rear) o.push(['rect', [4, 70, 24, 4], 'f-bench f-bench--top'], ['seg', [8, 74], [8, G], 'f-bench'], ['seg', [24, 74], [24, G], 'f-bench']);
        return o;
      } };
    },
    benchpress: function (k, p) {
      var a = p.a || 0, seated = p.seated || a >= 80;
      var tr = seated ? 0 : 270 + a, up = tr + 90;
      var P = { base: 'hip', at: seated ? [44, 66] : [58, 66], tr: tr, hd: tr };
      P.ua = up + (150 - (p.close ? 22 : 0)) * k; P.fa = up - 14 * k;
      if (seated) { P.th = 90; P.sh = 180; }
      else if (a < 0) { P.th = 62; P.sh = 150; }
      else { P.th = 100; P.sh = 168; }
      return { P: P, track: 'hand', props: function (q) {
        var o = seated ? seat(30, 58, 1) : benchUnder(q.sho, q.hip, tr, 34);
        if (p.tool === 'bar' && !seated) o.push(['seg', [q.sho[0] - 7, G], [q.sho[0] - 7, q.sho[1] - 30], 'f-rack']);
        return o.concat(toolAt(p.tool, q.hand, q.hand2));
      } };
    },
    fly: function (k, p) {
      var a = p.a || 0;
      if (p.tool === 'cable' || p.seated) {
        var standing = p.tool === 'cable';
        var P = standing ? { base: 'stand', at: [46, G], tr: 12, th: 186, sh: 180, th2: 166, sh2: 190 } : { base: 'hip', at: [44, 66], tr: 0, th: 90, sh: 180 };
        var dirA = p.from === 'high' ? 125 : p.from === 'low' ? 62 : 92;
        P.ua = dirA; P.fa = dirA + 8; P.us = 1 - .78 * k;
        return { P: P, track: 'hand', props: function (q) {
          if (standing) return cable(q.hand, p.from === 'low' ? [96, 90] : [96, -10]);
          return seat(30, 58, 1).concat([['handle', q.hand]]);
        } };
      }
      var tr = 270 + a, up = tr + 90;
      var Pf = { base: 'hip', at: [58, 66], tr: tr, th: 100, sh: 168, ua: up + 18 * k, fa: up + 26 * k, us: 1 - .72 * k };
      return { P: Pf, track: 'hand', props: function (q) { return benchUnder(q.sho, q.hip, tr, 34).concat(toolAt('db', q.hand)); } };
    },
    pullover: function (k, p) {
      if (p.stand) {
        var Ps = { base: 'stand', at: [44, G], tr: 28, th: 176, sh: 186, ua: lerp(28, 172, k), fa: lerp(32, 172, k) };
        return { P: Ps, track: 'hand', props: function (q) { return cable(q.hand, [96, -10]).concat([['handle', q.hand]]); } };
      }
      var P = { base: 'hip', at: [58, 66], tr: 270, th: 100, sh: 168, ua: lerp(0, 262, k), fa: lerp(4, 266, k) };
      return { P: P, track: 'hand', props: function (q) { return benchUnder(q.sho, q.hip, 270, 34).concat([['db', q.hand, '', 90]]); } };
    },
    pushup: function (k, p) {
      var hy = G - (p.hands || 0), fy = G - 2 - (p.feet || 0);
      var P = bodyLine({ base: 'hand', at: [76, hy], ua: lerp(180, 251, k), fa: lerp(180, 125, k) }, [14, fy]);
      return { P: P, track: 'sho', props: function () {
        var r = [];
        if (p.hands) r.push(['rect', [66, hy, 20, p.hands], 'f-box']);
        if (p.feet) r.push(['rect', [4, fy + 2, 20, p.feet], 'f-box']);
        return r;
      } };
    },
    plank: function (k, p) {
      var P = bodyLine({ base: 'hand', at: [84, G - 1.5], fa: 90, ua: 180, dy: -.6 * Math.sin(Math.PI * k) }, [16, G - 2]);
      if (p.side) { P.ua2 = P.tr + 150; P.fa2 = P.tr + 40; P.dy = -3 * Math.sin(Math.PI * k); }
      return { P: P, track: '', props: none };
    },
    dip: function (k, p) {
      if (p.bench) {
        var Pb = { base: 'hand', at: [34, 68], ua: lerp(196, 250, k), fa: lerp(196, 150, k), tr: 4, legIK: [84, G - 1], legIK2: [82, G - 1], ikDir: -1 };
        return { P: Pb, track: 'sho', props: function () { return [['seg', [18, 70], [42, 70], 'f-bench f-bench--top'], ['seg', [22, 70], [22, G], 'f-bench'], ['seg', [38, 70], [38, G], 'f-bench']]; } };
      }
      var P = { base: 'hand', at: [54, 48], ua: lerp(180, 244, k), fa: lerp(180, 132, k), tr: (p.lean || 5) + 10 * k, th: 192, sh: 232, th2: 188, sh2: 228, ft: 300 };
      return { P: P, track: 'sho', props: function () { return [['seg', [40, 49], [70, 49], 'f-bar'], ['seg', [66, 49], [66, G], 'f-bench']]; } };
    },
    ohpress: function (k, p) {
      var P = p.seated ? { base: 'hip', at: [48, 66], tr: 352, th: 90, sh: 180 } : { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, th2: 176, sh2: 184 };
      if (p.landmine) { P.ua = lerp(150, 48, k); P.fa = lerp(18, 48, k); P.th2 = 198; P.sh2 = 200; }
      else { P.ua = lerp(152, 4, k); P.fa = lerp(346, 0, k); }
      if (p.arnold) { P.us = lerp(.7, 1, k); }
      return { P: P, track: 'hand', props: function (q) {
        var o = p.seated ? seat(34, 58, 1) : [];
        if (p.landmine) o.push(['seg', q.hand, [8, G - 1], 'f-gryf'], ['plate', mix(q.hand, [8, G], .15)]);
        else o = o.concat(toolAt(p.tool, q.hand, q.hand2));
        return o;
      } };
    },
    raise: function (k, p) {
      if (p.dir === 'front') {
        var Pf = { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: lerp(178, 88, k), fa: lerp(178, 90, k), ua2: 178, fa2: 178 };
        return { P: Pf, track: 'hand', props: function (q) { return toolAt('db', q.hand, q.hand2); } };
      }
      if (p.dir === 'rear') {
        var Pr = p.seated ? { base: 'hip', at: [44, 66], tr: 8, th: 90, sh: 180, ua: 90, fa: 92, us: 1 - .72 * k } : { base: 'stand', at: STAND, tr: 78, th: 160, sh: 196, ua: lerp(180, 168, k), fa: lerp(180, 172, k), us: 1 - .7 * k };
        return { P: Pr, track: 'hand', props: function (q) { return p.seated ? seat(30, 56).concat([['seg', [70, 66], [70, 30], 'f-bench'], ['handle', q.hand]]) : toolAt('db', q.hand); } };
      }
      var P = { base: 'stand', at: STAND, tr: 2, th: 180, sh: 180, ua: lerp(176, 168, k), fa: lerp(176, 160, k), us: 1 - .74 * Math.sin(k * Math.PI / 2) };
      return { P: P, track: 'hand', props: function (q) { return p.tool === 'cable' ? cable(q.hand, [40, 92]) : toolAt('db', q.hand); } };
    },
    uprow: function (k) {
      var P = { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: lerp(180, 248, k), fa: lerp(180, 108, k), us: 1 - .25 * k };
      return { P: P, track: 'hand', props: function (q) { return [['plate', q.hand]]; } };
    },
    row: function (k, p) {
      if (p.seated) {
        var Ps = { base: 'hip', at: [36, 82], tr: lerp(8, 348, k), th: 84, sh: 112, ua: lerp(90, 205, k), fa: lerp(90, 82, k) };
        return { P: Ps, track: 'hand', props: function (q) {
          var o = [['rect', [24, 84, 26, 4], 'f-bench f-bench--top'], ['seg', [80, 72], [80, G], 'f-bench']];
          if (p.tool === 'machine') return o.concat([['seg', [70, 40], [70, 76], 'f-bench'], ['handle', q.hand]]);
          return o.concat(cable(q.hand, [94, 72], p.tool === 'band'), [['handle', q.hand]]);
        } };
      }
      if (p.chest) {
        var Pc = { base: 'stand', at: [30, G], sh: 204, th: 204, tr: 46, ua: 180 + k * 40, fa: 180 - 22 * k };
        return { P: Pc, track: 'hand', props: function (q) { return benchUnder(q.sho, q.hip, 46, 30).concat(toolAt('db', q.hand)); } };
      }
      var lean = p.lean || 55;
      var P = { base: 'stand', at: STAND, tr: lean, th: 166, sh: 194, ua: 180 + k * (lean - 5), fa: 180 - 26 * k };
      if (p.support) { P.ua2 = 180; P.fa2 = 180; P.th2 = 132; P.sh2 = 262; }
      return { P: P, track: 'hand', props: function (q) {
        var o = [];
        if (p.support) o.push(['rect', [56, 66, 30, 4], 'f-bench f-bench--top'], ['seg', [60, 70], [60, G], 'f-bench'], ['seg', [82, 70], [82, G], 'f-bench']);
        if (p.tbar) o.push(['seg', q.hand, [6, G - 1], 'f-gryf']);
        return o.concat(toolAt(p.tool, q.hand, p.support ? null : q.hand2));
      } };
    },
    vpull: function (k, p) {
      if (p.type === 'down') {
        var Pd = { base: 'hip', at: [46, 64], tr: lerp(0, 348, k), th: 92, sh: 176, ua: lerp(6, 166, k), fa: lerp(2, 14, k) };
        return { P: Pd, track: 'hand', props: function (q) { return [['seg', [32, 66], [58, 66], 'f-bench f-bench--top'], ['seg', [44, 66], [44, G], 'f-bench'], ['seg', [60, 58], [72, 58], 'f-bench'], ['seg', q.hand, [q.hand[0], -14], 'f-cable'], ['seg', [q.hand[0] - 9, q.hand[1]], [q.hand[0] + 9, q.hand[1]], 'f-gryf']]; } };
      }
      var P = { base: 'hand', at: [54, -4], ua: lerp(0, 160, k), fa: lerp(0, 6, k), tr: lerp(0, 350, k), th: lerp(180, 172, k), sh: 200, th2: 176, sh2: 204, ft: 160 };
      return { P: P, track: 'head', props: function (q) {
        var o = [['seg', [32, -4], [76, -4], 'f-bar'], ['seg', [34, -4], [34, -14], 'f-bench'], ['seg', [74, -4], [74, -14], 'f-bench']];
        if (p.weight) o.push(['db', add(q.hip, [0, 9]), '', 90]);
        return o;
      } };
    },
    shrug: function (k, p) {
      return { P: { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: 180, fa: 180, up: 3.5 * k }, track: 'sho', props: function (q) { return toolAt(p.tool, q.hand, q.hand2); } };
    },
    facepull: function (k) {
      var P = { base: 'stand', at: [44, G], tr: 354, th: 186, sh: 180, th2: 170, sh2: 186, ua: lerp(84, 268, k), fa: lerp(86, 24, k), us: 1 - .32 * k };
      return { P: P, track: 'hand', props: function (q) { return cable(q.hand, [96, 14]).concat([['handle', q.hand]]); } };
    },
    curl: function (k, p) {
      var P;
      if (p.preacher) P = { base: 'hip', at: [40, 66], tr: 28, th: 90, sh: 180, ua: 140, fa: lerp(140, 350, k) };
      else if (p.incline) P = { base: 'hip', at: [52, 66], tr: 322, th: 96, sh: 172, ua: 186, fa: lerp(186, 24, k) };
      else if (p.conc) P = { base: 'hip', at: [44, 66], tr: 40, th: 90, sh: 180, ua: 172, fa: lerp(172, 18, k) };
      else if (p.wrist) P = { base: 'hip', at: [40, 66], tr: 30, th: 90, sh: 180, ua: 140, fa: 92 };
      else P = { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, th2: 176, sh2: 184, ua: 178, fa: lerp(178, 22, k) };
      return { P: P, track: p.wrist ? '' : 'hand', props: function (q) {
        var o = [];
        if (p.preacher) o.push(['poly', [[50, 50], [62, 62], [58, 66], [46, 56]], 'f-box'], ['seg', [54, 64], [54, G], 'f-bench'], ['seg', [28, 68], [50, 68], 'f-bench f-bench--top']);
        if (p.incline) o = o.concat(benchUnder(q.sho, q.hip, 322, 32));
        if (p.conc || p.wrist) o.push(['seg', [26, 68], [56, 68], 'f-bench f-bench--top'], ['seg', [30, 68], [30, G], 'f-bench'], ['seg', [52, 68], [52, G], 'f-bench']);
        if (p.wrist) return o.concat([['db', add(q.hand, [0, -3.5 * k + 1.5]), '', 90]]);
        if (p.tool === 'cable' || p.tool === 'band') return o.concat(cable(q.hand, p.tool === 'band' ? [52, G] : [60, 90], p.tool === 'band'));
        return o.concat(toolAt(p.tool, q.hand, p.conc || p.preacher || p.incline ? null : q.hand2));
      } };
    },
    triceps: function (k, p) {
      var P;
      if (p.type === 'over') P = { base: 'stand', at: STAND, tr: p.tool === 'cable' ? 22 : 0, th: 180, sh: 180, th2: p.tool === 'cable' ? 200 : 176, sh2: 186, ua: p.tool === 'cable' ? 22 : 358, fa: lerp(205, 360, k) };
      else if (p.type === 'skull') P = { base: 'hip', at: [58, 66], tr: 270, th: 100, sh: 168, ua: 342, fa: lerp(236, 342, k) };
      else if (p.type === 'kick') P = { base: 'stand', at: [58, G], tr: 76, th: 166, sh: 194, ua: 254, fa: lerp(162, 254, k), ua2: 180, fa2: 180, th2: 132, sh2: 262 };
      else P = { base: 'stand', at: [48, G], tr: 8, th: 180, sh: 180, th2: 176, sh2: 184, ua: 172, fa: lerp(26, 176, k) };
      return { P: P, track: 'hand', props: function (q) {
        if (p.type === 'skull') return benchUnder(q.sho, q.hip, 270, 34).concat([['plate', q.hand]]);
        if (p.type === 'kick') return [['rect', [62, 66, 26, 4], 'f-bench f-bench--top'], ['seg', [66, 70], [66, G], 'f-bench'], ['seg', [84, 70], [84, G], 'f-bench'], ['db', q.hand]];
        if (p.tool === 'cable') return cable(q.hand, p.type === 'over' ? [8, 86] : [56, -12]).concat([['handle', q.hand]]);
        return [['db', q.hand, '', 90]];
      } };
    },
    calf: function (k, p) {
      var lift = 4.6 * k;
      var P = p.seated ? { base: 'hip', at: [44, 64 - lift], tr: 0, th: 90, sh: 180, ft: 90 + 44 * k, ua: 150, fa: 90 } : { base: 'stand', at: [50, G - lift], tr: 0, th: 180, sh: 180, ft: 90 + 44 * k, ua: 180, fa: 180 };
      if (p.single) { P.th2 = 186; P.sh2 = 262; }
      return { P: P, track: '', props: function (q) {
        var o = p.seated ? [['seg', [30, 66], [54, 66], 'f-bench f-bench--top'], ['seg', [40, 66], [40, G], 'f-bench'], ['rect', [q.kn[0] - 6, q.kn[1] - 6, 12, 3], 'f-box']] : [];
        return o.concat(p.tool === 'db' ? [['db', q.hand]] : []);
      } };
    },
    bridge: function (k, p) {
      var P = p.bench ? { base: 'shoulder', at: [24, 70], tr: lerp(300, 266, k), th: lerp(78, 92, k), sh: 170 } : { base: 'shoulder', at: [22, 88], tr: lerp(268, 236, k), th: lerp(66, 92, k), sh: 162 };
      P.hd = P.tr; P.ua = P.tr + 175; P.fa = P.tr + 150;
      if (p.single) { P.th2 = P.th - 40; P.sh2 = P.th2; }
      return { P: P, track: 'hip', props: function (q) {
        var o = p.bench ? [['rect', [4, 72, 26, 4], 'f-bench f-bench--top'], ['seg', [8, 76], [8, G], 'f-bench'], ['seg', [26, 76], [26, G], 'f-bench']] : [];
        if (p.tool === 'bar') o.push(['plate', add(q.hip, [0, -9])]);
        if (p.tool === 'db') o.push(['db', add(q.hip, [0, -5]), '', 0]);
        return o;
      } };
    },
    legcurl: function (k, p) {
      if (p.nordic) {
        var th = 180 + 66 * k;
        var Pn = { base: 'knee', at: [48, G - 2], th: th, sh: 270, ft: 270, tr: th - 180 };
        Pn.ua = Pn.tr + 168; Pn.fa = Pn.tr + 24;
        return { P: Pn, track: 'head', props: function () { return [['rect', [16, 84, 10, 6], 'f-box']]; } };
      }
      var P = p.seated ? { base: 'hip', at: [44, 64], tr: 354, th: 90, sh: lerp(92, 186, k), ua: 150, fa: 92 } : { base: 'hip', at: [50, 66], tr: 270, th: 90, sh: lerp(90, 8, k), ua: 220, fa: 220, hd: 270 };
      return { P: P, track: 'ank', props: function (q) {
        if (p.seated) return seat(30, 54, 1).concat([['circle', q.ank, 3.2, 'f-pad'], ['circle', add(q.kn, [0, -6]), 3, 'f-pad']]);
        return [['seg', [14, 72], [74, 72], 'f-bench f-bench--top'], ['seg', [20, 72], [20, G], 'f-bench'], ['seg', [68, 72], [68, G], 'f-bench'], ['circle', add(q.ank, [2, 3]), 3.2, 'f-pad']];
      } };
    },
    legext: function (k) {
      return { P: { base: 'hip', at: [44, 64], tr: 354, th: 90, sh: lerp(182, 96, k), ua: 150, fa: 92 }, track: 'ank', props: function (q) { return seat(30, 54, 1).concat([['circle', add(q.ank, [2, -3]), 3.2, 'f-pad']]); } };
    },
    legpress: function (k) {
      var foot = mix([82, 32], [62, 52], k);
      return { P: { base: 'hip', at: [36, 74], tr: 300, hd: 300, legIK: foot, legIK2: add(foot, [-2, 2]), ikDir: 1, ua: 150, fa: 120, ft: 30 }, track: 'ank', props: function () { return [['seg', [20, 66], [44, 80], 'f-bench f-bench--top'], ['seg', [16, 50], [30, 68], 'f-bench'], ['seg', add(foot, [-6, -8]), add(foot, [8, 6]), 'f-plateline'], ['seg', [60, 70], [96, 22], 'f-rail']]; } };
    },
    abduct: function (k) {
      return { P: { base: 'hip', at: [44, 64], tr: 350, th: 90, sh: 180, ua: 160, fa: 100, ls: 1 - .25 * k }, track: '', props: function () { return seat(30, 54, 1); } };
    },
    crunch: function (k, p) {
      if (p.cable) {
        var Pc = { base: 'knee', at: [58, G - 2], th: 180, sh: 270, ft: 270, tr: lerp(28, 118, k) };
        Pc.ua = Pc.tr + 172; Pc.fa = Pc.tr + 26;
        return { P: Pc, track: 'head', props: function (q) { return cable(q.hand, [60, -12]); } };
      }
      var P = { base: 'hip', at: [52, 90], th: 58, sh: 156, tr: lerp(270, 304, k), ft: 90 };
      P.hd = P.tr + 8; P.ua = P.tr + 50; P.fa = P.tr + 205;
      return { P: P, track: 'head', props: none };
    },
    legraise: function (k, p) {
      if (p.hang) return { P: { base: 'hand', at: [54, -4], ua: 0, fa: 0, tr: 0, th: lerp(180, 88, k), sh: lerp(190, 120, k) }, track: 'ank', props: function () { return [['seg', [32, -4], [76, -4], 'f-bar']]; } };
      return { P: { base: 'hip', at: [54, 90], tr: 270, ua: 90, fa: 90, th: lerp(93, 4, k), sh: lerp(93, 6, k), ft: lerp(30, 90, k) }, track: 'ank', props: none };
    },
    abwheel: function (k) {
      return { P: { base: 'knee', at: [36, G - 2], sh: 270, ft: 270, th: lerp(160, 236, k), tr: lerp(56, 80, k), ua: lerp(180, 96, k), fa: lerp(180, 96, k) }, track: 'hand', props: function (q) { return [['wheel', [q.hand[0], G - 4]]]; } };
    },
    russian: function (k) {
      return { P: { base: 'hip', at: [46, 88], tr: 330, th: 58, sh: 118, ua: 92, fa: 92, us: .35 + .65 * Math.abs(Math.cos(Math.PI * k)) }, track: '', props: function (q) { return [['db', q.hand, '', 90]]; } };
    },
    woodchop: function (k) {
      return { P: { base: 'stand', at: [46, G], tr: lerp(-6, 16, k), th: 186, sh: 178, th2: 170, sh2: 188, ua: lerp(32, 156, k), fa: lerp(34, 158, k) }, track: 'hand', props: function (q) { return cable(q.hand, [96, -10]).concat([['handle', q.hand]]); } };
    },
    hollow: function (k) { return { P: { base: 'hip', at: [50, 88], tr: 282 - 2 * k, th: 98 + 2 * k, sh: 98 + 2 * k, ua: 282, fa: 284, ft: 140 }, track: '', props: none }; },
    deadbug: function (k) { return { P: { base: 'hip', at: [52, 90], tr: 270, ua: 0, fa: 0, ua2: lerp(0, 272, k), fa2: lerp(0, 272, k), th: lerp(2, 84, k), sh: lerp(92, 86, k), th2: 2, sh2: 92 }, track: '', props: none }; },
    birddog: function (k) { return { P: { base: 'knee', at: [38, G - 2], th: 180, sh: 270, ft: 270, tr: 90, ua: lerp(180, 92, k), fa: lerp(180, 92, k), ua2: 180, fa2: 180, th2: lerp(180, 272, k), sh2: lerp(270, 272, k) }, track: 'hand', props: none }; },
    pallof: function (k, p) {
      return { P: { base: 'stand', at: [46, G], tr: 0, th: 188, sh: 180, th2: 172, sh2: 188, ua: lerp(160, 92, k), fa: lerp(28, 92, k) }, track: 'hand', props: function (q) { return cable(q.hand, [94, 30], p.tool === 'band'); } };
    },
    climber: function (k, p, c) {
      var s = Math.sin(c * Math.PI * 4);
      var P = bodyLine({ base: 'hand', at: [78, G], ua: 180, fa: 180 }, [16, G - 2]), tr = P.tr;
      P.th = tr + 180 - Math.max(0, s) * 110; P.sh = tr + 180 - Math.max(0, s) * 20; P.th2 = tr + 180 - Math.max(0, -s) * 110; P.sh2 = tr + 180 - Math.max(0, -s) * 20;
      return { P: P, track: '', props: none };
    },
    carry: function (k, p, c) {
      var s = Math.sin(c * Math.PI * 4) * 16;
      return { P: { base: 'hip', at: [50, 55], tr: 0, th: 180 - s, sh: 186 - s * .4, th2: 180 + s, sh2: 186 + s * .4, ua: 180, fa: 180, dy: -Math.abs(Math.cos(c * Math.PI * 4)) * 1.2 }, track: '', props: function (q) { return p.one ? [['db', q.hand]] : toolAt('db', q.hand, q.hand2); } };
    },
    burpee: function (k, p, c) {
      var stand = solve({ base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: 178, fa: 178 });
      var squat = solve({ base: 'stand', at: STAND, tr: 50, th: 70, sh: 214, ua: 176, fa: 176 });
      var plank = solve(MOVES.pushup(0, {}).P);
      var jump = solve({ base: 'stand', at: [50, G - 10], tr: 0, th: 180, sh: 182, ua: 8, fa: 4, ft: 140 });
      var seq = [stand, squat, plank, plank, squat, jump, stand], n = seq.length - 1, x = c * n, i = Math.min(n - 1, Math.floor(x));
      return { pts: mixPts(seq[i], seq[i + 1], ease(x - i)), track: '', props: none };
    },
    jumprope: function (k, p, c) {
      var hop = Math.abs(Math.sin(c * Math.PI * 6)) * 3;
      return { P: { base: 'stand', at: [50, G - hop], tr: 0, th: 180, sh: 182, th2: 178, sh2: 184, ua: 158, fa: 112, ft: 120 }, track: '', props: function (q) {
        var th = c * Math.PI * 6;
        return [['curve', q.hand, [50 + 26 * Math.sin(th), 48 + 54 * Math.cos(th)], q.hand2, 'f-rope']];
      } };
    },
    bike: function (k, p, c) {
      var cr = [60, 80], a = c * Math.PI * 4, ped = [cr[0] + 7 * Math.cos(a), cr[1] + 7 * Math.sin(a)], ped2 = [cr[0] - 7 * Math.cos(a), cr[1] - 7 * Math.sin(a)];
      return { P: { base: 'hip', at: [44, 52], tr: 30, ua: 118, fa: 100, legIK: ped, legIK2: ped2, ikDir: 1, ft: 100 }, track: '', props: function () { return [['seg', [40, 56], [50, 56], 'f-bench f-bench--top'], ['seg', [46, 56], cr, 'f-bench'], ['seg', cr, [74, 32], 'f-bench'], ['seg', [70, 32], [78, 32], 'f-bench'], ['circle', cr, 9, 'f-crank'], ['seg', [30, G], [84, G], 'f-bench']]; } };
    },
    rowerg: function (k, p, c) {
      var drive = c < .45 ? ease(c / .45) : 1 - ease((c - .45) / .55), arm = Math.max(0, drive * 1.4 - .4);
      var hip = [lerp(54, 34, drive), 82], foot = [74, 86];
      return { P: { base: 'hip', at: hip, tr: lerp(24, 342, drive), legIK: foot, legIK2: add(foot, [-1, 1]), ikDir: 1, ua: lerp(90, 208, arm), fa: lerp(90, 82, arm), ft: 30 }, track: '', props: function (q) { return [['seg', [20, 86], [76, 86], 'f-rail'], ['rect', [hip[0] - 7, 84, 14, 3], 'f-bench f-bench--top'], ['circle', [90, 80], 8, 'f-crank'], ['cable', q.hand, [86, 78], '']]; } };
    },
    jack: function (k) { return { P: { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: lerp(178, 10, k), fa: lerp(178, 8, k), ls: 1 - .08 * k }, track: '', props: none }; },

    /* ---------- rozciąganie ---------- */
    's-neck': function (k) { return { P: { base: 'stand', at: STAND, tr: 0, hd: 18 * k, th: 180, sh: 180, ua: 182, fa: 182 }, props: none }; },
    's-chin': function (k) { return { P: { base: 'stand', at: STAND, tr: 0, hd: -10 * k, th: 180, sh: 180, ua: 180, fa: 180 }, props: none }; },
    's-neckrot': function (k) { return { P: { base: 'stand', at: STAND, tr: 0, hd: 8 * Math.sin(k * Math.PI), th: 180, sh: 180, ua: 180, fa: 180 }, props: none }; },
    's-cross': function (k) { return { P: { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: 92, fa: 262 - 8 * k, ua2: 150, fa2: 60 }, props: none }; },
    's-sleeper': function (k) { return { P: { base: 'hip', at: [56, 86], tr: 270, th: 120, sh: 200, ua: 0, fa: lerp(90, 160, k) }, props: none }; },
    's-wall': function (k) { return { P: { base: 'stand', at: [44, G], tr: -6 * k, th: 184, sh: 180, th2: 172, sh2: 186, ua: 90, fa: 0 }, props: function () { return [['seg', [72, -10], [72, G], 'f-bench']]; } }; },
    's-door': function (k) { return { P: { base: 'stand', at: [48, G], tr: 8 * k, th: 172, sh: 186, th2: 198, sh2: 192, ua: 270, fa: 0, us: .7 }, props: function () { return [['seg', [42, -10], [42, G], 'f-bench']]; } }; },
    's-lat': function (k) { return { P: { base: 'knee', at: [34, G - 2], th: lerp(210, 220, k), sh: 270, ft: 270, tr: lerp(70, 88, k), ua: 82, fa: 82 }, props: function () { return [['rect', [62, 74, 24, 4], 'f-bench f-bench--top'], ['seg', [66, 78], [66, G], 'f-bench'], ['seg', [82, 78], [82, G], 'f-bench']]; } }; },
    's-tri': function (k) { return { P: { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: 352, fa: 190 + 8 * k, ua2: 30, fa2: 330 }, props: none }; },
    's-wrist': function (k) { return { P: { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: 90, fa: 90, ua2: 120, fa2: 60 + 8 * k }, props: none }; },
    's-thread': function (k) { return { P: { base: 'knee', at: [38, G - 2], th: 180, sh: 270, ft: 270, tr: lerp(90, 104, k), ua: lerp(180, 230, k), fa: lerp(180, 236, k), ua2: 180, fa2: 180, us: 1 - .3 * k }, props: none }; },
    's-book': function (k) { return { P: { base: 'hip', at: [52, 86], tr: 270, th: 60, sh: 150, ua: 90, fa: 90, ua2: lerp(90, 300, k), fa2: lerp(90, 300, k) }, props: none }; },
    's-catcow': function (k) { return { P: { base: 'knee', at: [38, G - 2], th: 180, sh: 270, ft: 270, tr: 90, hd: lerp(150, 50, k), ua: 180, fa: 180, up: lerp(3, -2, k) }, props: none }; },
    's-child': function (k) { return { P: { base: 'knee', at: [52, G - 2], th: 262, sh: 270, ft: 270, tr: lerp(104, 100, k), hd: 120, ua: 96, fa: 98 }, props: none }; },
    's-hug': function (k) { return { P: { base: 'hip', at: [52, 88], tr: 270, th: lerp(22, 10, k), sh: 140, ua: 60, fa: 110 }, props: none }; },
    's-twist': function (k) { return { P: { base: 'hip', at: [52, 88], tr: 270, th: 40, sh: 130, ls: lerp(1, .7, k), ua: 0, fa: 0, us: .4 }, props: none }; },
    's-cobra': function (k) { return { P: { base: 'hip', at: [46, 89], tr: lerp(270, 296, k), hd: lerp(270, 330, k), th: 92, sh: 92, ft: 180, ua: lerp(150, 180, k), fa: lerp(100, 180, k) }, props: none }; },
    's-pelvic': function (k) { return { P: { base: 'hip', at: [52, 89 - k], tr: 270, th: 58, sh: 156, ua: 90, fa: 90 }, props: none }; },
    's-hipflex': function (k) { return { P: { base: 'knee', at: [36, G - 2], th: lerp(176, 196, k), sh: 270, ft: 270, tr: 0, ua: 180, fa: 180, th2: 96, sh2: 180 }, props: none }; },
    's-pigeon': function (k) { return { P: { base: 'hip', at: [44, 84], tr: lerp(20, 70, k), th: 110, sh: 250, th2: 252, sh2: 268, ft2: 270, ua: 180, fa: 180 }, props: none }; },
    's-fig4': function (k) { return { P: { base: 'hip', at: [54, 88], tr: 270, th: lerp(30, 14, k), sh: 120, th2: lerp(40, 22, k), sh2: 40, ua: 50, fa: 80 }, props: none }; },
    's-butter': function (k) { return { P: { base: 'hip', at: [46, 88], tr: lerp(8, 30, k), th: 70, sh: 200, ls: .7, ua: 150, fa: 120 }, props: none }; },
    's-frog': function (k) { return { P: { base: 'knee', at: [52, G - 2], th: lerp(190, 214, k), sh: 270, ft: 270, tr: lerp(86, 96, k), ua: 180, fa: 90, ls: .8 }, props: none }; },
    's-9090': function (k) { return { P: { base: 'hip', at: [48, 86], tr: lerp(-10, 10, k), th: lerp(70, 110, k), sh: lerp(160, 200, k), th2: lerp(250, 290, k), sh2: lerp(160, 200, k), ua: 150, fa: 120 }, props: none }; },
    's-quad': function (k) { return { P: { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, th2: lerp(176, 192, k), sh2: 10, ft2: 270, ua: 180, fa: 180, ua2: 200, fa2: 160 }, props: none }; },
    's-quadlie': function (k) { return { P: { base: 'hip', at: [50, 88], tr: 270, th: 90, sh: 90, th2: lerp(96, 110, k), sh2: 300, ua: 0, fa: 0 }, props: none }; },
    's-ham': function (k) { return { P: { base: 'hip', at: [34, 88], tr: lerp(10, 50, k), th: 90, sh: 90, ft: 0, ua: lerp(120, 100, k), fa: lerp(110, 98, k) }, props: none }; },
    's-hamband': function (k) { return { P: { base: 'hip', at: [54, 89], tr: 270, th: lerp(30, 10, k), sh: lerp(30, 10, k), th2: 90, sh2: 90, ua: lerp(40, 22, k), fa: lerp(40, 20, k) }, props: function (q) { return [['cable', q.hand, q.ank, 'band']]; } }; },
    's-hamstand': function (k) { return { P: { base: 'stand', at: [40, G], tr: lerp(0, 40, k), th: 180, sh: 180, th2: 140, sh2: 140, ua: 150, fa: 150 }, props: function () { return [['rect', [62, 78, 18, 16], 'f-box']]; } }; },
    's-adduct': function (k) { return { P: { base: 'stand', at: [56, G], tr: 14 * k, th: lerp(180, 160, k), sh: lerp(180, 200, k), th2: 232, sh2: 232, ft2: 140, ua: 160, fa: 120 }, props: none }; },
    's-itb': function (k) { return { P: { base: 'stand', at: STAND, tr: lerp(0, -10, k), th: 180, sh: 180, th2: 168, sh2: 186, ua: lerp(180, 350, k), fa: lerp(180, 340, k) }, props: none }; },
    's-calf': function (k, p) { return { P: { base: 'stand', at: [60, G], tr: 22, th: 176, sh: 190, th2: 206, sh2: p.bent ? 200 : 206, ft2: 90, ua: 78, fa: 82, dx: lerp(0, 2, k) }, props: function () { return [['seg', [88, -10], [88, G], 'f-bench']]; } }; },
    's-ankle': function (k) { return { P: { base: 'stand', at: [62, G], tr: 6, th: lerp(150, 136, k), sh: lerp(190, 206, k), th2: 214, sh2: 260, ua: 90, fa: 90 }, props: function () { return [['seg', [82, -10], [82, G], 'f-bench']]; } }; },
    's-deepsq': function (k) { return { P: { base: 'stand', at: STAND, tr: 30, th: 70, sh: 212, ua: lerp(120, 130, k), fa: 80 }, props: function () { return [['seg', [76, -10], [76, G], 'f-bench']]; } }; },
    's-wgs': function (k) { return { P: { base: 'stand', at: [62, G], sh: 194, th: 98, tr: 70, th2: 210, sh2: 210, ua: 160, fa: 170, ua2: lerp(170, 20, k), fa2: lerp(170, 20, k) }, props: none }; },
    's-circles': function (k, p, c) { var a = c * 720; return { P: { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: a, fa: a, ua2: a + 180, fa2: a + 180 }, props: none }; },
    's-pullapart': function (k) { return { P: { base: 'stand', at: STAND, tr: 0, th: 180, sh: 180, ua: 90, fa: 90, us: 1 - .7 * k }, props: function (q) { return [['cable', q.hand, q.hand2, 'band']]; } }; },
    's-bridge': function (k) { return MOVES.bridge(k, {}); }
  };

  var CONT = { carry: 1, climber: 1, burpee: 1, jumprope: 1, bike: 1, rowerg: 1, 's-circles': 1 };
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function phase(ms, mv, pause) {
    if (CONT[mv]) return { k: 0, c: (ms % 3200) / 3200 };
    var d1 = 1.3, h1 = pause ? 1.1 : .35, d2 = .9, h0 = .45, T = d1 + h1 + d2 + h0, s = (ms / 1000) % T;
    var k = s < d1 ? ease(s / d1) : s < d1 + h1 ? 1 : s < d1 + h1 + d2 ? 1 - ease((s - d1 - h1) / d2) : 0;
    return { k: k, c: s / T };
  }

  /* ---------- rysowanie ---------- */
  var MSEG = { klatka: 'torso', plecy: 'torso', brzuch: 'torso', skosne: 'torso', prostowniki: 'torso', czworoboczny: 'torso', serce: 'torso', barki: 'delt', biceps: 'uarm', triceps: 'uarm', przedramiona: 'farm', posladki: 'glute', przywodziciele: 'thigh', czworoglowe: 'thigh', dwuglowe: 'thigh', lydki: 'shin' };
  function hlClass(ex) {
    var h = {};
    (ex.sec || []).forEach(function (m) { if (MSEG[m]) h[MSEG[m]] = ' is-sec'; });
    (ex.prim || []).forEach(function (m) { if (MSEG[m]) h[MSEG[m]] = ' is-prim'; });
    return h;
  }
  function P2(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
  function line(a, b, cls) { return '<path d="M' + P2(a) + 'L' + P2(b) + '" class="' + cls + '"/>'; }
  function circ(p, r, cls) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r + '" class="' + cls + '"/>'; }
  function prim(o) {
    var t = o[0];
    if (t === 'plate') return circ(o[1], 9.5, 'f-plate') + circ(o[1], 5.5, 'f-plate2') + circ(o[1], 1.8, 'f-hub');
    if (t === 'db') { var c = o[1], rot = o[3] || 0; return '<g transform="translate(' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ') rotate(' + rot + ')" class="f-dbg' + (o[2] === 'far' ? ' is-far' : '') + '"><rect x="-6.5" y="-1.2" width="13" height="2.4"/><rect x="-8" y="-4" width="4" height="8" rx="1"/><rect x="4" y="-4" width="4" height="8" rx="1"/></g>'; }
    if (t === 'kb') return circ([o[1][0], o[1][1] + 5], 5, 'f-kb') + '<path d="M' + (o[1][0] - 3).toFixed(1) + ' ' + (o[1][1] + 2).toFixed(1) + 'Q' + o[1][0].toFixed(1) + ' ' + (o[1][1] - 3).toFixed(1) + ' ' + (o[1][0] + 3).toFixed(1) + ' ' + (o[1][1] + 2).toFixed(1) + '" class="f-kbh"/>';
    if (t === 'handle') return '<rect x="' + (o[1][0] - 2.5).toFixed(1) + '" y="' + (o[1][1] - 4).toFixed(1) + '" width="5" height="8" rx="2" class="f-handle"/>';
    if (t === 'cable') return line(o[1], o[2], 'f-cable' + (o[3] === 'band' ? ' f-band' : ''));
    if (t === 'pulley') return circ(o[1], 2.6, 'f-pulley');
    if (t === 'seg') return line(o[1], o[2], o[3]);
    if (t === 'rect') return '<rect x="' + o[1][0] + '" y="' + o[1][1] + '" width="' + o[1][2] + '" height="' + o[1][3] + '" class="' + o[2] + '"/>';
    if (t === 'poly') return '<path d="M' + o[1].map(P2).join('L') + 'Z" class="' + o[2] + '"/>';
    if (t === 'circle') return circ(o[1], o[2], o[3]);
    if (t === 'wheel') return circ(o[1], 4, 'f-wheel');
    if (t === 'curve') return '<path d="M' + P2(o[1]) + 'Q' + P2(o[2]) + ' ' + P2(o[3]) + '" class="' + o[4] + '"/>';
    return '';
  }
  function body(q, h) {
    h = h || {};
    var s = '<g class="f-far">' + line(q.hip, q.kn2, 'f-seg f-thigh') + line(q.kn2, q.ank2, 'f-seg f-shin') + line(q.ank2, q.toe2, 'f-seg f-foot') +
      line(q.sho, q.el2, 'f-seg f-uarm') + line(q.el2, q.hand2, 'f-seg f-farm') + '</g>';
    s += line(q.hip, q.sho, 'f-seg f-torso' + (h.torso || ''));
    s += circ(q.hip, 5.6, 'f-joint f-glute' + (h.glute || ''));
    s += line(q.hip, q.kn, 'f-seg f-thigh' + (h.thigh || '')) + line(q.kn, q.ank, 'f-seg f-shin' + (h.shin || '')) + line(q.ank, q.toe, 'f-seg f-foot');
    s += line(q.sho, q.head, 'f-seg f-neck') + circ(q.head, 5.8, 'f-head');
    s += circ(q.sho, 4.6, 'f-joint f-delt' + (h.delt || ''));
    s += line(q.sho, q.el, 'f-seg f-uarm' + (h.uarm || '')) + line(q.el, q.hand, 'f-seg f-farm' + (h.farm || ''));
    return s;
  }
  function frameOf(mv, k, p, c) { var M = MOVES[mv] || MOVES.curl, r = M(k, p || {}, c || 0); return { q: r.pts || solve(r.P), r: r }; }
  function trackPath(mv, p, key) {
    if (!key) return '';
    var pts = [];
    for (var i = 0; i <= 12; i++) pts.push(frameOf(mv, i / 12, p, 0).q[key]);
    var a = pts[0], b = pts[pts.length - 1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 3) return '';
    return '<path d="M' + pts.map(P2).join('L') + '" class="f-track"/>' + circ(a, 1.6, 'f-tdot') + circ(b, 1.6, 'f-tdot');
  }
  var BACKCLS = /f-bench|f-box|f-rail|f-rack|f-bar|f-crank|f-pulley|f-gryf|f-plateline/;
  function scene(ex, k, c, hl) {
    var f = frameOf(ex.mv, k, ex.p, c), props = f.r.props ? f.r.props(f.q) : [], back = '', front = '';
    props.forEach(function (o) { var s = prim(o); if (o[0] !== 'cable' && BACKCLS.test(s)) back += s; else front += s; });
    return back + body(f.q, hl) + front;
  }

  /* ---------- widok z przodu ---------- */
  var FRONT = {
    squat: function (k) { return { knee: k * .9, armsA: 90 * k, armsE: 0, legA: 10 + 6 * k }; },
    ohp: function (k) { return { armsA: lerp(95, 172, k), armsE: lerp(90, 0, k), legA: 8 }; },
    raise: function (k) { return { armsA: lerp(12, 88, k), armsE: 10, legA: 6 }; },
    abduct: function (k) { return { seated: 1, legA: lerp(4, 34, k), armsA: 20, armsE: 30 }; },
    adduct: function (k) { return { seated: 1, legA: lerp(34, 4, k), armsA: 20, armsE: 30 }; },
    jack: function (k) { return { armsA: lerp(15, 170, k), armsE: 0, legA: lerp(5, 24, k) }; }
  };
  function frontScene(kind, k, ex, h) {
    var f = FRONT[kind](k), cx = 50; h = h || {};
    var hipY = f.seated ? 62 : 54 + (f.knee || 0) * 14, shY = hipY - 26, head = [cx, shY - 10];
    var sL = [cx - 11, shY], sR = [cx + 11, shY], hL = [cx - 6, hipY], hR = [cx + 6, hipY];
    function arm(s, dir) { var a = f.armsA, el = add(s, [dir * Math.sin(rad(a)) * L.ua, Math.cos(rad(a)) * L.ua]), a2 = a + (f.armsE || 0); return [el, add(el, [dir * Math.sin(rad(a2)) * L.fa, Math.cos(rad(a2)) * L.fa])]; }
    function leg(hp, dir) {
      if (f.seated) { var k0 = [hp[0] + dir * Math.sin(rad(f.legA)) * 16, hipY + 4]; return [k0, [k0[0], G]]; }
      var kd = f.knee || 0, len = L.th * (1 - kd * .45);
      return [add(hp, [dir * (Math.sin(rad(f.legA)) * len + kd * 9), len]), [hp[0] + dir * Math.sin(rad(f.legA)) * (L.th + L.sh) * .9, G]];
    }
    var aL = arm(sL, -1), aR = arm(sR, 1), lL = leg(hL, -1), lR = leg(hR, 1);
    var s = '<path d="M2 94H98" class="f-ground"/>';
    if (f.seated) s += '<path d="M30 66H70" class="f-bench f-bench--top"/>';
    s += line(sL, sR, 'f-seg f-shoulders') + line([cx, shY], [cx, hipY], 'f-seg f-torso' + (h.torso || '')) + line(hL, hR, 'f-seg f-pelvis' + (h.glute || ''));
    [[hL, lL], [hR, lR]].forEach(function (x) { s += line(x[0], x[1][0], 'f-seg f-thigh' + (h.thigh || h.glute || '')) + line(x[1][0], x[1][1], 'f-seg f-shin' + (h.shin || '')); });
    s += circ(head, 5.8, 'f-head');
    [[sL, aL], [sR, aR]].forEach(function (x) { s += circ(x[0], 4.6, 'f-joint f-delt' + (h.delt || '')) + line(x[0], x[1][0], 'f-seg f-uarm' + (h.uarm || '')) + line(x[1][0], x[1][1], 'f-seg f-farm' + (h.farm || '')); });
    if (ex.p && ex.p.tool === 'db') s += prim(['db', aL[1], '', 90]) + prim(['db', aR[1], '', 90]);
    if (ex.p && ex.p.tool === 'cable') s += line(aR[1], [cx - 30, G - 2], 'f-cable');
    if (ex.p && ex.p.tool === 'bar' && kind === 'ohp') s += line([aL[1][0] - 8, aL[1][1]], [aR[1][0] + 8, aR[1][1]], 'f-gryf');
    if (kind === 'squat' && ex.p && ex.p.load === 'back') s += line([sL[0] - 14, shY - 1], [sR[0] + 14, shY - 1], 'f-gryf');
    return s;
  }

  /* ---------- API ---------- */
  var REG = {};
  SZ.EX.concat(SZ.STRETCH).forEach(function (e) { REG[e.id] = e; });
  function figure(ex, opts) {
    opts = opts || {};
    var still = !!opts.still, frontAuto = ex.front && /raise|abduct|adduct|jack/.test(ex.front);
    var view = opts.view || (frontAuto ? 'front' : 'side');
    var hl = hlClass(ex), inner, ghost = '', trk = '';
    if (view === 'front' && ex.front && FRONT[ex.front]) {
      inner = frontScene(ex.front, still ? 1 : 0, ex, hl);
      if (still) ghost = '<g class="f-ghost">' + frontScene(ex.front, 0, ex, {}) + '</g>';
    } else {
      view = 'side';
      inner = '<path d="M2 94H98" class="f-ground"/>' + scene(ex, still ? 1 : 0, still ? .3 : 0, hl);
      if (!CONT[ex.mv]) ghost = '<g class="f-ghost">' + body(frameOf(ex.mv, still ? 0 : 1, ex.p, 0).q, {}) + '</g>';
      if (!still && opts.track !== false && !CONT[ex.mv]) trk = trackPath(ex.mv, ex.p, frameOf(ex.mv, 0, ex.p, 0).r.track);
    }
    return '<svg class="fig' + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="0 -14 100 110" role="img" aria-label="' + (opts.label || ('Animacja: ' + ex.name)) + '"' +
      (still ? '' : ' data-fig="' + ex.id + '" data-view="' + view + '"') + '>' + ghost + trk + '<g class="f-live">' + inner + '</g></svg>';
  }

  var live = new Set();
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); }); }) : null;
  function watch(root) { (root || document).querySelectorAll('svg[data-fig]').forEach(function (s) { if (s.__w) return; s.__w = 1; if (io) io.observe(s); else live.add(s); }); }
  function tick(ms) {
    live.forEach(function (s) {
      if (!s.isConnected) { live.delete(s); return; }
      var ex = REG[s.getAttribute('data-fig')]; if (!ex) return;
      var ph = phase(ms, ex.mv, ex.p && ex.p.pause), g = s.querySelector('.f-live'), hl = hlClass(ex);
      g.innerHTML = s.getAttribute('data-view') === 'front' ? frontScene(ex.front, ph.k, ex, hl) : '<path d="M2 94H98" class="f-ground"/>' + scene(ex, ph.k, ph.c, hl);
    });
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);

  /* ---------- atlas ciała ---------- */
  var FR = [
    ['barki', 'e', 34, 52, 10, 9], ['barki', 'e', 86, 52, 10, 9],
    ['klatka', 'r', 41, 45, 18, 20, 6], ['klatka', 'r', 61, 45, 18, 20, 6],
    ['biceps', 'e', 28, 75, 6.5, 13], ['biceps', 'e', 92, 75, 6.5, 13],
    ['przedramiona', 'e', 24, 103, 5.5, 14], ['przedramiona', 'e', 96, 103, 5.5, 14],
    ['brzuch', 'r', 49, 68, 10, 11, 3], ['brzuch', 'r', 61, 68, 10, 11, 3], ['brzuch', 'r', 49, 81, 10, 11, 3], ['brzuch', 'r', 61, 81, 10, 11, 3], ['brzuch', 'r', 49, 94, 10, 11, 3], ['brzuch', 'r', 61, 94, 10, 11, 3],
    ['skosne', 'e', 42, 88, 4.5, 15], ['skosne', 'e', 78, 88, 4.5, 15],
    ['czworoglowe', 'e', 47, 145, 9, 28], ['czworoglowe', 'e', 73, 145, 9, 28],
    ['przywodziciele', 'e', 56, 132, 3.5, 14], ['przywodziciele', 'e', 64, 132, 3.5, 14],
    ['lydki', 'e', 47, 200, 6.5, 20], ['lydki', 'e', 73, 200, 6.5, 20]
  ];
  var BK = [
    ['czworoboczny', 'p', 'M60 36L76 46L60 66L44 46Z'],
    ['barki', 'e', 34, 52, 10, 9], ['barki', 'e', 86, 52, 10, 9],
    ['plecy', 'e', 45, 78, 9, 19], ['plecy', 'e', 75, 78, 9, 19], ['plecy', 'r', 54, 66, 12, 18, 3],
    ['prostowniki', 'r', 52, 86, 7, 20, 3], ['prostowniki', 'r', 61, 86, 7, 20, 3],
    ['triceps', 'e', 28, 75, 6.5, 13], ['triceps', 'e', 92, 75, 6.5, 13],
    ['przedramiona', 'e', 24, 103, 5.5, 14], ['przedramiona', 'e', 96, 103, 5.5, 14],
    ['posladki', 'e', 50, 120, 10.5, 11], ['posladki', 'e', 70, 120, 10.5, 11],
    ['dwuglowe', 'e', 49, 152, 8.5, 22], ['dwuglowe', 'e', 71, 152, 8.5, 22],
    ['lydki', 'e', 48, 198, 7.5, 18], ['lydki', 'e', 72, 198, 7.5, 18]
  ];
  /* przód: prawa strona ciała jest po lewej stronie rysunku */
  var HOT = {
    front: [['szyja', '', 60, 34], ['bark', 'P', 36, 44], ['bark', 'L', 84, 44], ['lokiec', 'P', 26, 89], ['lokiec', 'L', 94, 89], ['nadgarstek', 'P', 22, 119], ['nadgarstek', 'L', 98, 119], ['biodro', 'P', 45, 113], ['biodro', 'L', 75, 113], ['kolano', 'P', 47, 176], ['kolano', 'L', 73, 176], ['kostka', 'P', 47, 222], ['kostka', 'L', 73, 222]],
    back: [['szyja', '', 60, 33], ['piersiowy', '', 60, 58], ['ledzwie', '', 60, 100], ['bark', 'L', 36, 44], ['bark', 'P', 84, 44], ['lokiec', 'L', 26, 89], ['lokiec', 'P', 94, 89], ['kolano', 'L', 48, 176], ['kolano', 'P', 72, 176], ['kostka', 'L', 47, 222], ['kostka', 'P', 73, 222]]
  };
  var SIL = '<g class="b-sil"><circle cx="60" cy="16" r="12"/><rect x="53" y="26" width="14" height="12" rx="4"/>' +
    '<path d="M38 40Q60 34 82 40L92 60L100 116L92 120L84 70L80 112L84 170L80 232L66 234L62 168L58 168L54 234L40 232L36 170L40 112L36 70L28 120L20 116L28 60Z"/></g>';
  function shape(s, cls, heat) {
    var st = heat != null ? ' style="--heat:' + heat.toFixed(2) + '"' : '';
    if (s[1] === 'e') return '<ellipse class="' + cls + '"' + st + ' cx="' + s[2] + '" cy="' + s[3] + '" rx="' + s[4] + '" ry="' + s[5] + '"/>';
    if (s[1] === 'r') return '<rect class="' + cls + '"' + st + ' x="' + s[2] + '" y="' + s[3] + '" width="' + s[4] + '" height="' + s[5] + '" rx="' + s[6] + '"/>';
    return '<path class="' + cls + '"' + st + ' d="' + s[2] + '"/>';
  }
  function jointLabel(j, sd) {
    var base = SZ.JOINTS[j];
    if (!sd) return base;
    var fem = j === 'kostka' ? 1 : 0, neu = j === 'biodro' ? 1 : 0;
    return base + (sd === 'L' ? (fem ? ' lewa' : neu ? ' lewe' : ' lewy') : (fem ? ' prawa' : neu ? ' prawe' : ' prawy'));
  }
  function side(list, view, o) {
    var prim = o.prim || [], sec = o.sec || [], pain = o.pain || {}, heat = o.heat;
    var html = '<svg class="atlas__svg" viewBox="0 0 120 240" role="img" aria-label="' + (view === 'front' ? 'Przód ciała' : 'Tył ciała') + '">' + SIL;
    list.forEach(function (s) {
      if (heat) html += shape(s, 'b-m b-heat', heat[s[0]] || 0);
      else html += shape(s, 'b-m' + (prim.indexOf(s[0]) > -1 ? ' is-prim' : sec.indexOf(s[0]) > -1 ? ' is-sec' : ''));
    });
    if (o.mode === 'pain') {
      HOT[view].forEach(function (h) {
        var key = h[1] ? h[0] + '-' + h[1] : h[0], it = pain[key], on = !!it;
        html += '<g class="b-hot' + (on ? ' is-on' : '') + '" data-pain="' + key + '" role="button" tabindex="0" aria-pressed="' + on + '" aria-label="' + jointLabel(h[0], h[1]) + (on ? ', ból ' + it.lvl + ' na 10' : '') + '">' +
          '<circle cx="' + h[2] + '" cy="' + h[3] + '" r="10" class="b-hit"/><circle cx="' + h[2] + '" cy="' + h[3] + '" r="' + (on ? 7.5 : 5.5) + '" class="b-dot"/>' +
          (on ? '<text x="' + h[2] + '" y="' + (h[3] + 3.4) + '" text-anchor="middle" class="b-lvl">' + it.lvl + '</text>' : '') + '</g>';
      });
    } else if (o.pain) {
      HOT[view].forEach(function (h) { if (pain[h[1] ? h[0] + '-' + h[1] : h[0]]) html += '<circle cx="' + h[2] + '" cy="' + h[3] + '" r="5" class="b-painmark"/>'; });
    }
    return html + '</svg>';
  }
  function atlas(o) {
    o = o || {};
    return '<div class="atlas' + (o.mode === 'pain' ? ' atlas--pain' : '') + (o.small ? ' atlas--sm' : '') + '"><figure>' + side(FR, 'front', o) + '<figcaption>przód</figcaption></figure><figure>' + side(BK, 'back', o) + '<figcaption>tył</figcaption></figure></div>';
  }

  return { figure: figure, watch: watch, atlas: atlas, jointLabel: jointLabel, hasFront: function (ex) { return !!(ex.front && FRONT[ex.front]); } };
})();
