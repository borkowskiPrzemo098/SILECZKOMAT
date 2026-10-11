/* SIŁECZKOMAT — dane: sprzęt, mięśnie, ćwiczenia, rozciąganie, sesje, odznaki. */
window.SZ = (function () {
  'use strict';

  var EQUIPMENT = [
    { id: 'sztanga', name: 'Sztanga i talerze' },
    { id: 'hantle', name: 'Hantle' },
    { id: 'kettlebell', name: 'Kettlebell' },
    { id: 'lawka', name: 'Ławka płaska' },
    { id: 'skos', name: 'Ławka regulowana (skos)' },
    { id: 'stojaki', name: 'Stojaki / klatka do przysiadów' },
    { id: 'wyciag', name: 'Wyciąg linowy' },
    { id: 'maszyna', name: 'Maszyny na nogi' },
    { id: 'maszyna-gora', name: 'Maszyny na górę ciała' },
    { id: 'modlitewnik', name: 'Modlitewnik' },
    { id: 'drazek', name: 'Drążek do podciągania' },
    { id: 'porecze', name: 'Poręcze' },
    { id: 'trapbar', name: 'Sztanga trap bar' },
    { id: 'guma', name: 'Guma oporowa' },
    { id: 'kolo', name: 'Kółko do brzucha' },
    { id: 'skrzynia', name: 'Skrzynia / stopień' },
    { id: 'skakanka', name: 'Skakanka' },
    { id: 'rower', name: 'Rower stacjonarny' },
    { id: 'wioslarz', name: 'Ergometr wioślarski' }
  ];

  var MUSCLES = {
    klatka: 'klatka piersiowa', barki: 'barki', triceps: 'triceps', biceps: 'biceps', przedramiona: 'przedramiona',
    plecy: 'plecy (najszersze)', czworoboczny: 'czworoboczny', prostowniki: 'prostowniki grzbietu', brzuch: 'brzuch', skosne: 'mięśnie skośne',
    posladki: 'pośladki', czworoglowe: 'czworogłowe uda', dwuglowe: 'dwugłowe uda', przywodziciele: 'przywodziciele', lydki: 'łydki', serce: 'układ krążenia'
  };

  var GROUPS = [
    { id: 'klatka', name: 'Klatka', m: ['klatka'] },
    { id: 'plecy', name: 'Plecy', m: ['plecy', 'czworoboczny', 'prostowniki'] },
    { id: 'nogi', name: 'Nogi', m: ['czworoglowe', 'dwuglowe', 'posladki', 'lydki', 'przywodziciele'] },
    { id: 'barki', name: 'Barki', m: ['barki'] },
    { id: 'ramiona', name: 'Ramiona', m: ['biceps', 'triceps', 'przedramiona'] },
    { id: 'brzuch', name: 'Brzuch', m: ['brzuch', 'skosne'] },
    { id: 'kondycja', name: 'Kondycja', m: ['serce'] }
  ];

  var JOINTS = {
    szyja: 'szyja', bark: 'bark', lokiec: 'łokieć', nadgarstek: 'nadgarstek', piersiowy: 'odcinek piersiowy',
    ledzwie: 'odcinek lędźwiowy', biodro: 'biodro', kolano: 'kolano', kostka: 'kostka'
  };
  var SIDED = { bark: 1, lokiec: 1, nadgarstek: 1, biodro: 1, kolano: 1, kostka: 1 };

  /* Domyślne wskazówki i błędy dla ruchów (ćwiczenie może je nadpisać). */
  var MV = {
    squat: { cues: ['Stopy na szerokość barków, palce lekko na zewnątrz.', 'Kolana idą w linii palców, pięty zostają na podłodze.', 'Napięty brzuch, schodź co najmniej do równoległej.'], errs: ['Kolana uciekają do środka.', 'Pięty odrywają się od podłogi.', 'Plecy zaokrąglają się na dole.'] },
    hinge: { cues: ['Ruch zaczyna się w biodrach, nie w plecach.', 'Ciężar blisko nóg przez cały ruch.', 'Na górze ściśnij pośladki, bez odchylania się do tyłu.'], errs: ['Zaokrąglony odcinek lędźwiowy.', 'Ciężar odjeżdża od nóg.', 'Przeprost w lędźwiach na górze.'] },
    lunge: { cues: ['Tułów pionowo, napięty brzuch.', 'Oba kolana zginają się do ok. 90°.', 'Odpychaj się piętą przedniej nogi.'], errs: ['Przednie kolano ucieka do środka.', 'Za krótki krok, pięta się odrywa.', 'Tułów pada do przodu.'] },
    benchpress: { cues: ['Łopatki ściągnięte i wciśnięte w ławkę.', 'Opuszczaj kontrolowanie do klatki.', 'Stopy mocno w podłodze, nadgarstki prosto.'], errs: ['Łokcie rozłożone na 90° od tułowia.', 'Odbijanie ciężaru od klatki.', 'Pośladki odrywają się od ławki.'] },
    fly: { cues: ['Łokcie lekko ugięte i stałe przez cały ruch.', 'Prowadź ręce szerokim łukiem.', 'Zatrzymaj się przy wyraźnym rozciągnięciu klatki.'], errs: ['Prostowanie łokci, ruch zmienia się w wyciskanie.', 'Zbyt głębokie opuszczenie obciążające bark.', 'Za duży ciężar i szarpanie.'] },
    pushup: { cues: ['Ciało w jednej linii od głowy do pięt.', 'Dłonie pod barkami, łokcie ok. 45° od tułowia.', 'Klatka prawie dotyka podłogi.'], errs: ['Biodra opadają.', 'Głowa wysunięta do przodu.', 'Niepełny zakres ruchu.'] },
    ohpress: { cues: ['Ściśnij pośladki i brzuch.', 'Ciężar jedzie pionowo nad środek stopy.', 'Na górze ramiona przy uszach.'], errs: ['Przeprost w lędźwiach.', 'Ciężar wypychany przed twarz.', 'Barki uniesione do uszu na dole.'] },
    raise: { cues: ['Lekki ciężar, łokcie lekko ugięte.', 'Unoś do wysokości barków.', 'Bez bujania tułowiem.'], errs: ['Bujanie całym ciałem.', 'Unoszenie barków do uszu.', 'Za wysoko ponad linię barków.'] },
    row: { cues: ['Plecy proste, brzuch napięty.', 'Ciągnij łokcie w tył, blisko tułowia.', 'Ściągnij łopatki na końcu ruchu.'], errs: ['Szarpanie tułowiem.', 'Zaokrąglone plecy.', 'Ciągnięcie samymi rękami bez łopatek.'] },
    vpull: { cues: ['Klatka do góry, barki w dół.', 'Ciągnij łokcie w dół do żeber.', 'Wracaj do pełnego wyprostu ramion.'], errs: ['Bujanie i kipping.', 'Barki przy uszach.', 'Niepełny zakres na dole.'] },
    curl: { cues: ['Łokcie nieruchomo przy tułowiu.', 'Pełny wyprost na dole.', 'Opuszczaj wolniej niż unosisz.'], errs: ['Bujanie biodrami.', 'Łokcie wędrują do przodu.', 'Ucinanie dołu ruchu.'] },
    triceps: { cues: ['Ramię nieruchomo, pracuje tylko przedramię.', 'Prostuj łokieć do końca.', 'Kontrolowany powrót.'], errs: ['Łokcie się rozjeżdżają.', 'Pomaganie barkami.', 'Za szybkie opuszczanie.'] },
    dip: { cues: ['Barki nisko, z dala od uszu.', 'Opuszczaj do ok. 90° w łokciach.', 'Lekko pochyl tułów do przodu.'], errs: ['Za głębokie zejście obciążające bark.', 'Barki uciekają do uszu.', 'Bujanie nogami.'] },
    calf: { cues: ['Pełny zakres: pięty nisko, potem jak najwyżej.', 'Pauza 1 s na górze.', 'Kolana prawie proste.'], errs: ['Odbijanie się z dołu.', 'Za mały zakres.', 'Uginanie kolan.'] },
    bridge: { cues: ['Stopy blisko pośladków.', 'Wypchnij biodra do linii tułowia.', 'Żebra w dół, broda lekko do klatki.'], errs: ['Przeprost w lędźwiach na górze.', 'Kolana rozjeżdżają się.', 'Pchanie palcami zamiast pięt.'] },
    machine: { cues: ['Ustaw siedzisko tak, by oś maszyny była przy stawie.', 'Pełny zakres, bez blokowania stawów.', 'Wracaj powoli.'], errs: ['Szarpanie ciężarem.', 'Odrywanie bioder od siedziska.', 'Za mały zakres ruchu.'] },
    core: { cues: ['Lędźwie stabilnie, brzuch napięty.', 'Oddychaj spokojnie przez cały ruch.', 'Jakość ruchu ważniejsza od liczby powtórzeń.'], errs: ['Wyginanie lędźwi.', 'Wstrzymywanie oddechu.', 'Ciągnięcie głowy rękami.'] },
    carry: { cues: ['Wyprostowana sylwetka, barki w dół.', 'Krótkie, pewne kroki.', 'Napięty brzuch, nie przechylaj się.'], errs: ['Przechylanie w bok.', 'Garbienie się.', 'Za długie kroki.'] },
    cardio: { cues: ['Równe tempo, kontroluj oddech.', 'Miękkie lądowania.', 'Zwolnij, zanim technika się posypie.'], errs: ['Lądowanie na sztywnych kolanach.', 'Za szybkie tempo na starcie.', 'Garbienie się.'] }
  };

  /* E(id, nazwa, ruch, parametry animacji, sprzęt, główne, pomocnicze, stawy, poziom, dodatki) */
  function E(id, name, mv, p, eq, prim, sec, stress, lvl, x) {
    x = x || {};
    var o = { id: id, name: name, mv: mv, p: p || {}, eq: eq, prim: prim, sec: sec, stress: stress, lvl: lvl,
      kind: x.k || 'c', uni: !!x.uni, timed: x.t || 0, cues: x.cues, errs: x.errs, reg: x.reg, prog: x.prog, front: x.front || '' };
    o.unit = x.unit != null ? x.unit : (eq.indexOf('sztanga') > -1 || eq.indexOf('trapbar') > -1 ? 2.5 : eq.length && eq[0] !== 'skrzynia' && eq[0] !== 'skakanka' && eq[0] !== 'rower' && eq[0] !== 'wioslarz' ? 1 : 0);
    var key = { benchpress: 'benchpress', fly: 'fly', squat: 'squat', hinge: 'hinge', lunge: 'lunge', pushup: 'pushup', ohpress: 'ohpress', raise: 'raise', row: 'row', vpull: 'vpull', curl: 'curl', triceps: 'triceps', dip: 'dip', calf: 'calf', bridge: 'bridge', legcurl: 'machine', legext: 'machine', legpress: 'machine', abduct: 'machine', swing: 'hinge', shrug: 'carry', carry: 'carry', facepull: 'row', uprow: 'raise', pullover: 'fly' }[mv];
    var base = MV[key] || (/^c-/.test(mv) ? MV.cardio : MV.core);
    o.cues = o.cues || base.cues; o.errs = o.errs || base.errs;
    return o;
  }
  var B = ['sztanga'], D = ['hantle'], C = ['wyciag'], M = ['maszyna'], MG = ['maszyna-gora'];

  var EX = [
    /* ---------- KLATKA ---------- */
    E('bench', 'Wyciskanie sztangi na ławce płaskiej', 'benchpress', { a: 0, tool: 'bar' }, ['sztanga', 'lawka', 'stojaki'], ['klatka'], ['triceps', 'barki'], ['bark', 'lokiec', 'nadgarstek'], 2, { reg: 'bench-db', prog: 'bench-pause' }),
    E('bench-inc', 'Wyciskanie sztangi na skosie dodatnim', 'benchpress', { a: 30, tool: 'bar' }, ['sztanga', 'skos', 'stojaki'], ['klatka', 'barki'], ['triceps'], ['bark', 'lokiec'], 2, { cues: ['Ławka ustawiona na 30°.', 'Gryf opuszczaj na górną część klatki.', 'Łopatki ściągnięte, pośladki na ławce.'] }),
    E('bench-dec', 'Wyciskanie sztangi na skosie ujemnym', 'benchpress', { a: -15, tool: 'bar' }, ['sztanga', 'skos', 'stojaki'], ['klatka'], ['triceps'], ['bark', 'lokiec'], 2, { cues: ['Nogi zablokowane pod wałkami.', 'Gryf na dolną część klatki.', 'Krótszy zakres, pełna kontrola.'] }),
    E('bench-close', 'Wyciskanie wąskim chwytem', 'benchpress', { a: 0, tool: 'bar', close: 1 }, ['sztanga', 'lawka', 'stojaki'], ['triceps', 'klatka'], ['barki'], ['lokiec', 'nadgarstek'], 2, { cues: ['Chwyt na szerokość barków.', 'Łokcie blisko tułowia.', 'Gryf na dolną część mostka.'] }),
    E('bench-pause', 'Wyciskanie z pauzą na klatce', 'benchpress', { a: 0, tool: 'bar', pause: 1 }, ['sztanga', 'lawka', 'stojaki'], ['klatka'], ['triceps', 'barki'], ['bark', 'lokiec'], 3, { cues: ['Pauza 1–2 s z gryfem na klatce.', 'Utrzymaj napięcie w pauzie.', 'Wyciśnij bez odbicia.'] }),
    E('bench-db', 'Wyciskanie hantli na ławce płaskiej', 'benchpress', { a: 0, tool: 'db' }, ['hantle', 'lawka'], ['klatka'], ['triceps', 'barki'], ['bark'], 1, { prog: 'bench' }),
    E('bench-db-inc', 'Wyciskanie hantli na skosie dodatnim', 'benchpress', { a: 30, tool: 'db' }, ['hantle', 'skos'], ['klatka', 'barki'], ['triceps'], ['bark'], 1, { cues: ['Ławka na 30–45°.', 'Hantle opuszczaj do linii górnej klatki.', 'Wyciskaj lekko do środka, bez stukania hantlami.'] }),
    E('bench-db-dec', 'Wyciskanie hantli na skosie ujemnym', 'benchpress', { a: -15, tool: 'db' }, ['hantle', 'skos'], ['klatka'], ['triceps'], ['bark'], 2),
    E('bench-db-neutral', 'Wyciskanie hantli chwytem neutralnym', 'benchpress', { a: 0, tool: 'db', close: 1 }, ['hantle', 'lawka'], ['klatka', 'triceps'], ['barki'], [], 1, { cues: ['Kciuki skierowane do głowy.', 'Łokcie blisko tułowia.', 'Bezpieczne dla barków.'] }),
    E('fly-db', 'Rozpiętki z hantlami na ławce płaskiej', 'fly', { a: 0, tool: 'db' }, ['hantle', 'lawka'], ['klatka'], ['barki'], ['bark'], 1, { k: 'i' }),
    E('fly-db-inc', 'Rozpiętki z hantlami na skosie', 'fly', { a: 30, tool: 'db' }, ['hantle', 'skos'], ['klatka'], ['barki'], ['bark'], 1, { k: 'i' }),
    E('fly-machine', 'Rozpiętki na maszynie (butterfly)', 'fly', { a: 90, tool: 'machine', seated: 1 }, MG, ['klatka'], [], ['bark'], 1, { k: 'i', cues: ['Uchwyty na wysokości klatki.', 'Łokcie lekko ugięte.', 'Ściśnij klatkę z przodu, pauza 1 s.'] }),
    E('crossover-high', 'Crossover na wyciągu z góry', 'fly', { a: 90, tool: 'cable', from: 'high' }, C, ['klatka'], ['barki'], ['bark'], 1, { k: 'i', cues: ['Krok w przód, lekkie pochylenie.', 'Prowadź ręce w dół i do środka.', 'Dłonie spotykają się na wysokości pępka.'] }),
    E('crossover-low', 'Crossover na wyciągu z dołu', 'fly', { a: 90, tool: 'cable', from: 'low' }, C, ['klatka'], ['barki'], ['bark'], 1, { k: 'i', cues: ['Linki z dolnych bloczków.', 'Prowadź ręce w górę do wysokości brody.', 'Akcentuje górną część klatki.'] }),
    E('press-machine', 'Wyciskanie na maszynie siedząc', 'benchpress', { a: 90, tool: 'machine', seated: 1 }, MG, ['klatka'], ['triceps', 'barki'], ['bark'], 1, { cues: ['Uchwyty na wysokości środka klatki.', 'Łopatki przy oparciu.', 'Nie blokuj łokci na końcu.'] }),
    E('pushup', 'Pompki klasyczne', 'pushup', {}, [], ['klatka'], ['triceps', 'barki', 'brzuch'], ['bark', 'nadgarstek'], 1, { reg: 'pushup-inc', prog: 'pushup-dec' }),
    E('pushup-inc', 'Pompki z rękami na podwyższeniu', 'pushup', { hands: 16 }, ['lawka'], ['klatka'], ['triceps'], ['nadgarstek'], 1, { prog: 'pushup' }),
    E('pushup-dec', 'Pompki z nogami na podwyższeniu', 'pushup', { feet: 16 }, ['lawka'], ['klatka', 'barki'], ['triceps'], ['bark', 'nadgarstek'], 2, { reg: 'pushup' }),
    E('pushup-diamond', 'Pompki diamentowe', 'pushup', { close: 1 }, [], ['triceps', 'klatka'], ['barki'], ['lokiec', 'nadgarstek'], 2),
    E('pullover-db', 'Pullover z hantlem', 'pullover', { tool: 'db' }, ['hantle', 'lawka'], ['klatka', 'plecy'], ['triceps'], ['bark'], 2, { k: 'i', cues: ['Hantel trzymany oburącz nad klatką.', 'Opuszczaj łukiem za głowę.', 'Łokcie lekko ugięte, żebra w dół.'] }),
    E('dip-chest', 'Pompki na poręczach (klatka)', 'dip', { lean: 25 }, ['porecze'], ['klatka', 'triceps'], ['barki'], ['bark', 'lokiec'], 2, { reg: 'dip-bench' }),

    /* ---------- PLECY ---------- */
    E('deadlift', 'Martwy ciąg klasyczny', 'hinge', { knee: .5, tool: 'bar', floor: 1 }, ['sztanga'], ['posladki', 'dwuglowe', 'prostowniki'], ['plecy', 'przedramiona', 'czworoboczny'], ['ledzwie', 'biodro'], 3, { reg: 'trapbar', cues: ['Sztanga nad środkiem stopy.', 'Napnij plecy, „wyciśnij” podłogę nogami.', 'Gryf blisko nóg przez cały ruch.'] }),
    E('deadlift-sumo', 'Martwy ciąg sumo', 'hinge', { knee: .55, tool: 'bar', floor: 1, lean: .7, wide: 1 }, ['sztanga'], ['posladki', 'czworoglowe', 'przywodziciele'], ['prostowniki', 'plecy'], ['biodro', 'ledzwie'], 3, { cues: ['Szeroki rozstaw, palce na zewnątrz.', 'Chwyt wąski, między nogami.', 'Tułów bardziej pionowo niż w klasyku.'], front: 'squat' }),
    E('trapbar', 'Martwy ciąg z trap bar', 'hinge', { knee: .65, tool: 'bar', floor: 1, lean: .75 }, ['trapbar'], ['czworoglowe', 'posladki'], ['dwuglowe', 'prostowniki'], ['biodro'], 2, { prog: 'deadlift', cues: ['Stań w środku sztangi.', 'Biodra niżej niż w klasyku.', 'Wstań pchając podłogę, ramiona proste.'] }),
    E('row-bar', 'Wiosłowanie sztangą w opadzie', 'row', { lean: 55, tool: 'bar' }, ['sztanga'], ['plecy'], ['biceps', 'prostowniki', 'czworoboczny'], ['ledzwie'], 2, { reg: 'row-db' }),
    E('row-pendlay', 'Wiosłowanie Pendlay', 'row', { lean: 82, tool: 'bar', floor: 1 }, ['sztanga'], ['plecy', 'czworoboczny'], ['biceps', 'prostowniki'], ['ledzwie'], 3, { cues: ['Tułów równolegle do podłogi.', 'Każde powtórzenie od podłogi.', 'Dynamiczne ciągnięcie do dolnej części klatki.'] }),
    E('row-tbar', 'Wiosłowanie T-bar', 'row', { lean: 50, tool: 'bar', tbar: 1 }, ['sztanga'], ['plecy', 'czworoboczny'], ['biceps'], ['ledzwie'], 2),
    E('row-db', 'Wiosłowanie hantlem jednorącz', 'row', { lean: 80, tool: 'db', support: 1 }, ['hantle', 'lawka'], ['plecy'], ['biceps'], [], 1, { uni: 1, prog: 'row-bar' }),
    E('row-chest', 'Wiosłowanie hantlami na skosie (przodem)', 'row', { lean: 45, tool: 'db', chest: 1 }, ['hantle', 'skos'], ['plecy', 'czworoboczny'], ['biceps'], [], 1, { cues: ['Klatka oparta o ławkę na 30–45°.', 'Bez szarpania, odciąża lędźwie.', 'Ściągnij łopatki na górze.'] }),
    E('row-cable', 'Wiosłowanie na wyciągu siedząc', 'row', { seated: 1, tool: 'cable' }, C, ['plecy'], ['biceps', 'czworoboczny'], [], 1),
    E('row-machine', 'Wiosłowanie na maszynie', 'row', { seated: 1, tool: 'machine' }, MG, ['plecy'], ['biceps'], [], 1),
    E('row-band', 'Wiosłowanie z gumą', 'row', { seated: 1, tool: 'band' }, ['guma'], ['plecy'], ['biceps'], [], 1),
    E('pullup', 'Podciąganie nachwytem', 'vpull', { type: 'pull' }, ['drazek'], ['plecy'], ['biceps', 'przedramiona'], ['bark', 'lokiec'], 2, { reg: 'pulldown', prog: 'pullup-w' }),
    E('chinup', 'Podciąganie podchwytem', 'vpull', { type: 'pull', chin: 1 }, ['drazek'], ['plecy', 'biceps'], ['przedramiona'], ['lokiec'], 2, { reg: 'pulldown-close' }),
    E('pullup-w', 'Podciąganie z obciążeniem', 'vpull', { type: 'pull', weight: 1 }, ['drazek', 'hantle'], ['plecy'], ['biceps'], ['bark', 'lokiec'], 3, { reg: 'pullup' }),
    E('pullup-neg', 'Podciąganie negatywne', 'vpull', { type: 'pull', neg: 1 }, ['drazek'], ['plecy'], ['biceps'], ['bark'], 1, { prog: 'pullup', cues: ['Wskocz do góry, broda nad drążkiem.', 'Opuszczaj się 3–5 sekund.', 'Pełny zwis na dole.'] }),
    E('pulldown', 'Ściąganie drążka szerokim chwytem', 'vpull', { type: 'down' }, C, ['plecy'], ['biceps'], ['bark'], 1, { prog: 'pullup' }),
    E('pulldown-close', 'Ściąganie drążka wąskim chwytem neutralnym', 'vpull', { type: 'down', close: 1 }, C, ['plecy'], ['biceps'], [], 1),
    E('pullover-cable', 'Pullover na wyciągu stojąc', 'pullover', { tool: 'cable', stand: 1 }, C, ['plecy'], ['triceps'], ['bark'], 1, { k: 'i', cues: ['Ręce proste, lekko ugięte łokcie.', 'Prowadź drążek łukiem do ud.', 'Lekko pochylony tułów.'] }),
    E('hyperext', 'Wyprosty tułowia na ławce rzymskiej', 'hinge', { roman: 1 }, ['lawka'], ['prostowniki', 'posladki'], ['dwuglowe'], ['ledzwie'], 1, { cues: ['Biodra oparte o poduszkę.', 'Opuść tułów z prostymi plecami.', 'Wróć do linii prostej, bez przeprostu.'] }),
    E('goodmorning', 'Skłony ze sztangą (good morning)', 'hinge', { knee: .1, tool: 'bar', back: 1 }, ['sztanga', 'stojaki'], ['dwuglowe', 'prostowniki'], ['posladki'], ['ledzwie'], 3),
    E('shrug-bar', 'Szrugsy ze sztangą', 'shrug', { tool: 'bar' }, ['sztanga'], ['czworoboczny'], ['przedramiona'], ['szyja'], 1, { k: 'i' }),
    E('shrug-db', 'Szrugsy z hantlami', 'shrug', { tool: 'db' }, D, ['czworoboczny'], ['przedramiona'], ['szyja'], 1, { k: 'i' }),
    E('facepull', 'Face pull na wyciągu', 'facepull', { tool: 'cable' }, C, ['barki', 'czworoboczny'], ['plecy'], [], 1, { k: 'i', cues: ['Linka na wysokości twarzy.', 'Ciągnij do czoła, łokcie wysoko.', 'Na końcu rotuj ręce na zewnątrz.'] }),

    /* ---------- NOGI ---------- */
    E('squat', 'Przysiad ze sztangą (high bar)', 'squat', { lean: 28, load: 'back' }, ['sztanga', 'stojaki'], ['czworoglowe', 'posladki'], ['prostowniki', 'brzuch'], ['kolano', 'ledzwie', 'biodro'], 2, { reg: 'goblet', prog: 'squat-pause', front: 'squat' }),
    E('squat-low', 'Przysiad low bar', 'squat', { lean: 42, load: 'back' }, ['sztanga', 'stojaki'], ['posladki', 'czworoglowe'], ['dwuglowe', 'prostowniki'], ['ledzwie', 'bark'], 3, { cues: ['Gryf niżej, na tylnych aktonach barków.', 'Więcej pochylenia tułowia, biodra w tył.', 'Łokcie w tył, nadgarstki prosto.'], front: 'squat' }),
    E('squat-front', 'Przysiad przedni', 'squat', { lean: 12, load: 'front' }, ['sztanga', 'stojaki'], ['czworoglowe'], ['posladki', 'brzuch'], ['kolano', 'nadgarstek'], 3, { cues: ['Gryf na przednich aktonach barków.', 'Łokcie wysoko przez cały ruch.', 'Tułów prawie pionowo.'], front: 'squat' }),
    E('squat-pause', 'Przysiad z pauzą', 'squat', { lean: 28, load: 'back', pause: 1 }, ['sztanga', 'stojaki'], ['czworoglowe', 'posladki'], ['brzuch'], ['kolano', 'ledzwie'], 3),
    E('goblet', 'Przysiad goblet', 'squat', { lean: 16, load: 'goblet' }, D, ['czworoglowe', 'posladki'], ['brzuch'], ['kolano'], 1, { prog: 'squat', front: 'squat' }),
    E('squat-bw', 'Przysiad z masą ciała', 'squat', { lean: 20, load: 'arms' }, [], ['czworoglowe', 'posladki'], [], ['kolano'], 1, { prog: 'goblet', front: 'squat' }),
    E('squat-sumo-db', 'Przysiad sumo z hantlem', 'squat', { lean: 10, load: 'hang', wide: 1 }, D, ['przywodziciele', 'posladki', 'czworoglowe'], [], ['kolano', 'biodro'], 1, { front: 'squat' }),
    E('squat-box', 'Przysiad do skrzyni', 'squat', { lean: 30, load: 'back', box: 1 }, ['sztanga', 'stojaki', 'skrzynia'], ['posladki', 'czworoglowe'], [], ['ledzwie'], 2),
    E('hack', 'Hack przysiad na maszynie', 'squat', { lean: -20, load: 'machine', machine: 'hack' }, M, ['czworoglowe'], ['posladki'], ['kolano'], 1),
    E('legpress', 'Wypychanie nóg na suwnicy', 'legpress', {}, M, ['czworoglowe', 'posladki'], [], ['kolano'], 1),
    E('jump-squat', 'Przysiad z wyskokiem', 'squat', { lean: 22, load: 'arms', jump: 1 }, [], ['czworoglowe', 'posladki', 'serce'], ['lydki'], ['kolano', 'kostka'], 2, { k: 'i' }),
    E('lunge-db', 'Wykroki w przód z hantlami', 'lunge', { tool: 'db' }, D, ['czworoglowe', 'posladki'], ['dwuglowe'], ['kolano'], 1, { uni: 1 }),
    E('lunge-rev', 'Wykroki w tył', 'lunge', { tool: 'db', back: 1 }, D, ['posladki', 'czworoglowe'], [], ['kolano'], 1, { uni: 1, cues: ['Krok w tył, ciężar na przedniej nodze.', 'Tylne kolano prawie do podłogi.', 'Łagodniejsze dla kolan niż wykrok w przód.'] }),
    E('lunge-walk', 'Wykroki chodzone', 'lunge', { tool: 'db', walk: 1 }, D, ['czworoglowe', 'posladki'], ['dwuglowe'], ['kolano'], 2, { uni: 1 }),
    E('lunge-bar', 'Wykroki ze sztangą', 'lunge', { tool: 'bar' }, ['sztanga', 'stojaki'], ['czworoglowe', 'posladki'], [], ['kolano'], 2, { uni: 1 }),
    E('bulgarian', 'Przysiad bułgarski', 'lunge', { tool: 'db', rear: 1 }, ['hantle', 'lawka'], ['czworoglowe', 'posladki'], [], ['kolano', 'biodro'], 2, { uni: 1, cues: ['Tylna stopa na ławce.', 'Opadaj pionowo, tylne kolano prawie do ziemi.', 'Ciężar na pięcie przedniej nogi.'] }),
    E('stepup', 'Wejścia na skrzynię', 'lunge', { tool: 'db', step: 1 }, ['skrzynia'], ['czworoglowe', 'posladki'], [], ['kolano'], 1, { uni: 1, cues: ['Cała stopa na skrzyni.', 'Wchodź siłą nogi na skrzyni.', 'Schodź powoli.'] }),
    E('rdl', 'Rumuński martwy ciąg', 'hinge', { knee: .15, tool: 'bar' }, ['sztanga'], ['dwuglowe', 'posladki'], ['prostowniki'], ['ledzwie'], 2, { reg: 'rdl-db' }),
    E('rdl-db', 'Rumuński martwy ciąg z hantlami', 'hinge', { knee: .15, tool: 'db' }, D, ['dwuglowe', 'posladki'], ['prostowniki'], ['ledzwie'], 1, { prog: 'rdl' }),
    E('rdl-single', 'Martwy ciąg na jednej nodze', 'hinge', { knee: .1, tool: 'db', single: 1 }, D, ['dwuglowe', 'posladki'], ['brzuch'], ['biodro'], 2, { uni: 1, cues: ['Tylna noga w linii z tułowiem.', 'Biodra równo, nie rotuj.', 'Wolno, z kontrolą równowagi.'] }),
    E('hipthrust', 'Hip thrust ze sztangą', 'bridge', { bench: 1, tool: 'bar' }, ['sztanga', 'lawka'], ['posladki'], ['dwuglowe'], ['biodro'], 2, { reg: 'bridge' }),
    E('hipthrust-db', 'Hip thrust z hantlem', 'bridge', { bench: 1, tool: 'db' }, ['hantle', 'lawka'], ['posladki'], ['dwuglowe'], [], 1),
    E('bridge', 'Mostek biodrowy', 'bridge', {}, [], ['posladki'], ['dwuglowe'], [], 1, { prog: 'hipthrust' }),
    E('bridge-single', 'Mostek na jednej nodze', 'bridge', { single: 1 }, [], ['posladki'], ['dwuglowe'], [], 1, { uni: 1 }),
    E('legcurl-seat', 'Uginanie nóg siedząc', 'legcurl', { seated: 1 }, M, ['dwuglowe'], [], ['kolano'], 1, { k: 'i' }),
    E('legcurl-lie', 'Uginanie nóg leżąc', 'legcurl', {}, M, ['dwuglowe'], ['lydki'], ['kolano'], 1, { k: 'i' }),
    E('nordic', 'Nordic curl', 'legcurl', { nordic: 1 }, [], ['dwuglowe'], [], ['kolano'], 3, { k: 'i', cues: ['Pięty zablokowane (partner lub drążek).', 'Opadaj jak najwolniej z prostym ciałem.', 'Złap się rękami i odepchnij do góry.'] }),
    E('legext', 'Prostowanie nóg na maszynie', 'legext', {}, M, ['czworoglowe'], [], ['kolano'], 1, { k: 'i' }),
    E('abduct', 'Odwodzenie nóg na maszynie', 'abduct', { out: 1 }, M, ['posladki'], [], ['biodro'], 1, { k: 'i', front: 'abduct' }),
    E('adduct', 'Przywodzenie nóg na maszynie', 'abduct', {}, M, ['przywodziciele'], [], ['biodro'], 1, { k: 'i', front: 'adduct' }),
    E('calf-stand', 'Wspięcia na palce stojąc', 'calf', {}, [], ['lydki'], [], ['kostka'], 1, { k: 'i' }),
    E('calf-db', 'Wspięcia na palce z hantlem', 'calf', { tool: 'db', single: 1 }, D, ['lydki'], [], ['kostka'], 1, { k: 'i', uni: 1 }),
    E('calf-seat', 'Wspięcia na palce siedząc', 'calf', { seated: 1 }, M, ['lydki'], [], ['kostka'], 1, { k: 'i' }),
    E('swing', 'Swing kettlebell', 'swing', {}, ['kettlebell'], ['posladki', 'dwuglowe'], ['prostowniki', 'brzuch', 'serce'], ['ledzwie'], 2, { cues: ['Ruch to wyrzut bioder, nie unoszenie rękami.', 'Kettlebell leci do wysokości klatki.', 'Na górze napięte pośladki i brzuch.'] }),

    /* ---------- BARKI ---------- */
    E('ohp', 'Wyciskanie żołnierskie', 'ohpress', { tool: 'bar' }, ['sztanga', 'stojaki'], ['barki'], ['triceps', 'brzuch'], ['bark', 'ledzwie', 'nadgarstek'], 2, { reg: 'ohp-db-seat', front: 'ohp' }),
    E('ohp-db', 'Wyciskanie hantli nad głowę stojąc', 'ohpress', { tool: 'db' }, D, ['barki'], ['triceps', 'brzuch'], ['bark'], 1, { front: 'ohp' }),
    E('ohp-db-seat', 'Wyciskanie hantli siedząc', 'ohpress', { tool: 'db', seated: 1 }, ['hantle', 'skos'], ['barki'], ['triceps'], ['bark'], 1, { prog: 'ohp', front: 'ohp' }),
    E('arnold', 'Wyciskanie Arnolda', 'ohpress', { tool: 'db', seated: 1, arnold: 1 }, ['hantle', 'skos'], ['barki'], ['triceps'], ['bark'], 2, { cues: ['Start: dłonie zwrócone do siebie przed twarzą.', 'W trakcie obracaj dłonie na zewnątrz.', 'Na górze ramiona przy uszach.'] }),
    E('ohp-machine', 'Wyciskanie na maszynie na barki', 'ohpress', { tool: 'machine', seated: 1 }, MG, ['barki'], ['triceps'], ['bark'], 1),
    E('landmine', 'Wyciskanie landmine', 'ohpress', { tool: 'bar', landmine: 1 }, ['sztanga'], ['barki', 'klatka'], ['triceps', 'brzuch'], [], 1, { uni: 1, cues: ['Koniec gryfu w narożniku lub uchwycie.', 'Wypychaj po skosie w górę i w przód.', 'Przyjazne dla barków.'] }),
    E('raise-side', 'Unoszenie hantli bokiem', 'raise', { dir: 'side', tool: 'db' }, D, ['barki'], [], ['bark'], 1, { k: 'i', front: 'raise' }),
    E('raise-cable', 'Unoszenie bokiem na wyciągu', 'raise', { dir: 'side', tool: 'cable' }, C, ['barki'], [], ['bark'], 1, { k: 'i', uni: 1, front: 'raise' }),
    E('raise-front', 'Unoszenie hantli w przód', 'raise', { dir: 'front', tool: 'db' }, D, ['barki'], [], ['bark'], 1, { k: 'i' }),
    E('raise-rear', 'Odwrotne rozpiętki w opadzie', 'raise', { dir: 'rear', tool: 'db' }, D, ['barki', 'czworoboczny'], [], [], 1, { k: 'i', cues: ['Pochyl tułów, plecy proste.', 'Unoś ręce bokiem, ściągając łopatki.', 'Lekki ciężar, czysty ruch.'] }),
    E('reverse-fly-m', 'Odwrotne rozpiętki na maszynie', 'raise', { dir: 'rear', tool: 'machine', seated: 1 }, MG, ['barki', 'czworoboczny'], [], [], 1, { k: 'i' }),
    E('uprow', 'Wiosłowanie sztangą wzdłuż tułowia', 'uprow', { tool: 'bar' }, ['sztanga'], ['barki', 'czworoboczny'], ['biceps'], ['bark', 'nadgarstek'], 2, { k: 'i', cues: ['Chwyt na szerokość barków.', 'Łokcie prowadzą, unoś do wysokości barków.', 'Nie wyżej – chroni bark.'] }),

    /* ---------- RAMIONA ---------- */
    E('curl-bar', 'Uginanie ramion ze sztangą', 'curl', { tool: 'bar' }, ['sztanga'], ['biceps'], ['przedramiona'], ['lokiec', 'nadgarstek'], 1, { k: 'i' }),
    E('curl-ez', 'Uginanie ze sztangą łamaną', 'curl', { tool: 'bar', ez: 1 }, ['sztanga'], ['biceps'], ['przedramiona'], ['lokiec'], 1, { k: 'i' }),
    E('curl-db', 'Uginanie z hantlami z supinacją', 'curl', { tool: 'db' }, D, ['biceps'], [], ['lokiec'], 1, { k: 'i' }),
    E('curl-hammer', 'Uginanie młotkowe', 'curl', { tool: 'db', hammer: 1 }, D, ['biceps', 'przedramiona'], [], ['lokiec'], 1, { k: 'i' }),
    E('curl-incline', 'Uginanie hantli na skosie', 'curl', { tool: 'db', incline: 1 }, ['hantle', 'skos'], ['biceps'], [], ['bark', 'lokiec'], 2, { k: 'i', cues: ['Ławka na 45–60°, plecy oparte.', 'Ramiona zwisają za tułowiem.', 'Mocne rozciągnięcie bicepsa na dole.'] }),
    E('curl-preacher', 'Uginanie na modlitewniku', 'curl', { tool: 'bar', preacher: 1 }, ['sztanga', 'modlitewnik'], ['biceps'], [], ['lokiec'], 1, { k: 'i', cues: ['Pachy oparte o krawędź modlitewnika.', 'Nie prostuj łokcia do końca z ciężarem.', 'Wolne opuszczanie.'] }),
    E('curl-conc', 'Uginanie koncentryczne', 'curl', { tool: 'db', conc: 1 }, ['hantle', 'lawka'], ['biceps'], [], ['lokiec'], 1, { k: 'i', uni: 1 }),
    E('curl-cable', 'Uginanie na wyciągu', 'curl', { tool: 'cable' }, C, ['biceps'], [], ['lokiec'], 1, { k: 'i' }),
    E('curl-band', 'Uginanie z gumą', 'curl', { tool: 'band' }, ['guma'], ['biceps'], [], [], 1, { k: 'i' }),
    E('pushdown', 'Prostowanie ramion na wyciągu', 'triceps', { type: 'push', tool: 'cable' }, C, ['triceps'], [], ['lokiec'], 1, { k: 'i' }),
    E('pushdown-rope', 'Prostowanie z liną na wyciągu', 'triceps', { type: 'push', tool: 'cable', rope: 1 }, C, ['triceps'], [], ['lokiec'], 1, { k: 'i' }),
    E('oh-ext-cable', 'Prostowanie nad głową na wyciągu', 'triceps', { type: 'over', tool: 'cable' }, C, ['triceps'], [], ['lokiec', 'bark'], 1, { k: 'i' }),
    E('french-db', 'Wyciskanie francuskie hantla nad głową', 'triceps', { type: 'over', tool: 'db' }, D, ['triceps'], [], ['lokiec', 'bark'], 1, { k: 'i' }),
    E('skull', 'Wyciskanie francuskie leżąc', 'triceps', { type: 'skull', tool: 'bar' }, ['sztanga', 'lawka'], ['triceps'], [], ['lokiec'], 2, { k: 'i', cues: ['Ramiona pionowo lub lekko za głowę.', 'Opuszczaj gryf do czoła lub za głowę.', 'Łokcie wąsko, nieruchomo.'] }),
    E('kickback', 'Prostowanie ramienia w opadzie', 'triceps', { type: 'kick', tool: 'db' }, ['hantle', 'lawka'], ['triceps'], [], ['lokiec'], 1, { k: 'i', uni: 1 }),
    E('dip', 'Pompki na poręczach (triceps)', 'dip', { lean: 5 }, ['porecze'], ['triceps'], ['klatka', 'barki'], ['bark', 'lokiec'], 2, { reg: 'dip-bench' }),
    E('dip-bench', 'Pompki w podporze tyłem na ławce', 'dip', { bench: 1 }, ['lawka'], ['triceps'], ['barki'], ['bark', 'nadgarstek'], 1, { prog: 'dip' }),
    E('wrist-curl', 'Uginanie nadgarstków', 'curl', { tool: 'db', wrist: 1 }, ['hantle', 'lawka'], ['przedramiona'], [], ['nadgarstek'], 1, { k: 'i' }),

    /* ---------- BRZUCH ---------- */
    E('plank', 'Deska', 'plank', {}, [], ['brzuch'], ['barki'], [], 1, { k: 'i', t: 40, prog: 'plank-side' }),
    E('plank-side', 'Deska bokiem', 'plank', { side: 1 }, [], ['skosne', 'brzuch'], ['barki'], ['bark'], 1, { k: 'i', t: 30, uni: 1 }),
    E('crunch', 'Spięcia brzucha', 'crunch', {}, [], ['brzuch'], [], ['szyja'], 1, { k: 'i' }),
    E('crunch-cable', 'Spięcia na wyciągu klęcząc', 'crunch', { cable: 1 }, C, ['brzuch'], [], [], 1, { k: 'i' }),
    E('legraise', 'Unoszenie nóg leżąc', 'legraise', {}, [], ['brzuch'], [], ['ledzwie'], 1, { k: 'i' }),
    E('legraise-hang', 'Unoszenie nóg w zwisie', 'legraise', { hang: 1 }, ['drazek'], ['brzuch'], ['przedramiona'], ['bark'], 2, { k: 'i' }),
    E('abwheel', 'Rollout na kółku', 'abwheel', {}, ['kolo'], ['brzuch'], ['plecy', 'barki'], ['ledzwie', 'bark'], 2, { k: 'i' }),
    E('russian', 'Rosyjski skręt', 'russian', { tool: 'db' }, [], ['skosne'], ['brzuch'], ['ledzwie'], 1, { k: 'i' }),
    E('woodchop', 'Wood chop na wyciągu', 'woodchop', { tool: 'cable' }, C, ['skosne'], ['brzuch', 'barki'], [], 1, { k: 'i', uni: 1 }),
    E('hollow', 'Hollow hold', 'hollow', {}, [], ['brzuch'], [], [], 2, { k: 'i', t: 30 }),
    E('deadbug', 'Martwy robak', 'deadbug', {}, [], ['brzuch'], [], [], 1, { k: 'i' }),
    E('birddog', 'Bird-dog', 'birddog', {}, [], ['prostowniki', 'brzuch'], ['posladki'], [], 1, { k: 'i' }),
    E('pallof', 'Pallof press', 'pallof', { tool: 'cable' }, C, ['skosne', 'brzuch'], [], [], 1, { k: 'i', uni: 1 }),
    E('pallof-band', 'Pallof press z gumą', 'pallof', { tool: 'band' }, ['guma'], ['skosne', 'brzuch'], [], [], 1, { k: 'i', uni: 1 }),
    E('climber', 'Mountain climbers', 'climber', {}, [], ['brzuch', 'serce'], ['barki'], ['nadgarstek'], 1, { k: 'i', t: 30 }),
    E('farmer', 'Spacer farmera', 'carry', { tool: 'db' }, D, ['przedramiona', 'czworoboczny', 'brzuch'], [], [], 1, { k: 'i', t: 40 }),
    E('suitcase', 'Spacer z jednym hantlem', 'carry', { tool: 'db', one: 1 }, D, ['skosne', 'przedramiona'], ['brzuch'], [], 1, { k: 'i', t: 30, uni: 1 }),

    /* ---------- KONDYCJA ---------- */
    E('burpee', 'Burpees', 'burpee', {}, [], ['serce'], ['czworoglowe', 'klatka'], ['nadgarstek', 'kolano'], 2, { k: 'i', t: 40 }),
    E('rope', 'Skakanka', 'jumprope', {}, ['skakanka'], ['serce', 'lydki'], [], ['kostka'], 1, { k: 'i', t: 60 }),
    E('bike', 'Rower stacjonarny', 'bike', {}, ['rower'], ['serce'], ['czworoglowe'], [], 1, { k: 'i', t: 300 }),
    E('rower', 'Wioślarz', 'rowerg', {}, ['wioslarz'], ['serce'], ['plecy', 'czworoglowe'], ['ledzwie'], 1, { k: 'i', t: 300 }),
    E('jumpingjack', 'Pajacyki', 'jack', {}, [], ['serce'], ['lydki'], ['kostka'], 1, { k: 'i', t: 45, front: 'jack' })
  ];

  /* ---------- ROZCIĄGANIE I MOBILIZACJA (≈40) ---------- */
  function T(id, name, mv, p, regions, hold, cues) { return { id: id, name: name, mv: mv, p: p || {}, regions: regions, hold: hold, dur: /powt|zmian/.test(hold) ? 40 : (parseInt(hold, 10) || 30) * (/na stronę/.test(hold) ? 2 : 1), prim: [], sec: [], cues: cues }; }
  var STRETCH = [
    T('s-neck-side', 'Skłon głowy w bok', 's-neck', {}, ['szyja'], '30 s na stronę', ['Opuść bark po przeciwnej stronie.', 'Ucho w stronę barku, bez skrętu głowy.']),
    T('s-neck-chin', 'Cofanie brody', 's-chin', {}, ['szyja', 'piersiowy'], '30 s', ['Wsuń brodę w tył jak „podwójny podbródek”.', 'Głowa wysoko, wzrok przed siebie.']),
    T('s-cross', 'Bark przez klatkę', 's-cross', {}, ['bark'], '30 s na stronę', ['Przyciągnij ramię do klatki drugą ręką.', 'Bark nisko, nie unoś go do ucha.']),
    T('s-sleeper', 'Rotacja wewnętrzna barku leżąc', 's-sleeper', {}, ['bark'], '30 s na stronę', ['Leż na boku, ramię przed sobą.', 'Delikatnie dociskaj przedramię w dół.']),
    T('s-wall-pec', 'Klatka przy ścianie', 's-wall', {}, ['bark', 'piersiowy'], '30 s na stronę', ['Przedramię na ścianie na wysokości barku.', 'Delikatnie obróć tułów od ściany.']),
    T('s-doorway', 'Klatka w futrynie', 's-door', {}, ['bark', 'piersiowy'], '30 s', ['Oba przedramiona na futrynie.', 'Krok w przód, klatka do przodu.']),
    T('s-lat', 'Najszerszy grzbietu przy ławce', 's-lat', {}, ['bark', 'piersiowy'], '30 s', ['Łokcie na ławce, siad na piętach.', 'Opuszczaj klatkę w dół.']),
    T('s-tri', 'Triceps za głową', 's-tri', {}, ['bark', 'lokiec'], '30 s na stronę', ['Łokieć w górę, dłoń za łopatką.', 'Drugą ręką dociśnij łokieć.']),
    T('s-wrist-ext', 'Prostowniki przedramienia', 's-wrist', { flex: 1 }, ['lokiec', 'nadgarstek'], '20 s na stronę', ['Ręka prosta przed sobą, dłoń w dół.', 'Drugą ręką przyciągnij dłoń do siebie.']),
    T('s-wrist-flex', 'Zginacze przedramienia', 's-wrist', {}, ['lokiec', 'nadgarstek'], '20 s na stronę', ['Ręka prosta, dłoń do góry.', 'Odciągnij palce w dół i do siebie.']),
    T('s-thread', 'Nawlekanie igły', 's-thread', {}, ['piersiowy', 'bark'], '8 na stronę', ['Klęk podparty.', 'Przełóż rękę pod tułowiem, obróć klatkę.']),
    T('s-open-book', 'Otwarta książka', 's-book', {}, ['piersiowy'], '8 na stronę', ['Leż na boku, kolana zgięte.', 'Otwieraj górną rękę na drugą stronę.']),
    T('s-catcow', 'Koci grzbiet', 's-catcow', {}, ['piersiowy', 'ledzwie'], '10 powtórzeń', ['Na wydechu zaokrąglij plecy.', 'Na wdechu delikatnie je wygnij.']),
    T('s-child', 'Pozycja dziecka', 's-child', {}, ['ledzwie', 'piersiowy', 'biodro'], '40 s', ['Pośladki na piętach.', 'Ręce daleko przed sobą.']),
    T('s-hug', 'Kolana do klatki leżąc', 's-hug', {}, ['ledzwie', 'biodro'], '30 s', ['Przyciągnij oba kolana.', 'Delikatnie kołysz się na boki.']),
    T('s-twist', 'Skręt leżąc', 's-twist', {}, ['ledzwie', 'piersiowy'], '30 s na stronę', ['Kolano na drugą stronę.', 'Łopatki zostają na podłodze.']),
    T('s-cobra', 'Kobra', 's-cobra', {}, ['ledzwie'], '10 powtórzeń', ['Biodra na podłodze.', 'Unoś klatkę na rękach bez bólu.']),
    T('s-pelvic', 'Wahania miednicy leżąc', 's-pelvic', {}, ['ledzwie'], '12 powtórzeń', ['Kolana zgięte, stopy na podłodze.', 'Na zmianę dociskaj i odrywaj lędźwie.']),
    T('s-hipflex', 'Zginacze biodra w wykroku', 's-hipflex', {}, ['biodro', 'ledzwie'], '30 s na stronę', ['Tylne kolano na macie.', 'Ściśnij pośladek, biodra lekko w przód.']),
    T('s-pigeon', 'Gołąb', 's-pigeon', {}, ['biodro', 'ledzwie'], '40 s na stronę', ['Przednia goleń w poprzek maty.', 'Pochyl się nad przednią nogą.']),
    T('s-figure4', 'Czwórka leżąc', 's-fig4', {}, ['biodro', 'ledzwie'], '30 s na stronę', ['Kostka na przeciwległym kolanie.', 'Przyciągnij dolną nogę do klatki.']),
    T('s-butterfly', 'Motyl', 's-butter', {}, ['biodro'], '40 s', ['Stopy razem, kolana na boki.', 'Plecy proste, pochyl się lekko.']),
    T('s-frog', 'Żaba', 's-frog', {}, ['biodro'], '40 s', ['Kolana szeroko w klęku.', 'Biodra powoli w tył.']),
    T('s-9090', 'Pozycja 90/90', 's-9090', {}, ['biodro'], '8 zmian strony', ['Obie nogi zgięte pod kątem 90°.', 'Przenoś kolana na drugą stronę.']),
    T('s-quad', 'Czworogłowy stojąc', 's-quad', {}, ['kolano', 'biodro'], '30 s na stronę', ['Pięta do pośladka, kolana obok siebie.', 'Biodro lekko w przód.']),
    T('s-quad-lie', 'Czworogłowy leżąc na boku', 's-quadlie', {}, ['kolano', 'biodro'], '30 s na stronę', ['Leż na boku.', 'Przyciągnij piętę do pośladka.']),
    T('s-ham-seat', 'Tył ud w siadzie', 's-ham', {}, ['kolano', 'ledzwie'], '30 s', ['Nogi proste, palce do góry.', 'Pochylaj się z bioder.']),
    T('s-ham-band', 'Tył uda leżąc z gumą', 's-hamband', {}, ['kolano', 'ledzwie', 'biodro'], '30 s na stronę', ['Guma na stopie, noga prosta w górę.', 'Druga noga płasko na podłodze.']),
    T('s-ham-stand', 'Tył uda stojąc na podwyższeniu', 's-hamstand', {}, ['kolano'], '30 s na stronę', ['Pięta na stopniu, noga prosta.', 'Pochylaj się z prostymi plecami.']),
    T('s-adductor', 'Przywodziciele w rozkroku', 's-adduct', {}, ['biodro', 'kolano'], '30 s na stronę', ['Szeroki rozkrok.', 'Przenieś ciężar na jedną nogę, druga prosta.']),
    T('s-itb', 'Pasmo biodrowo-piszczelowe', 's-itb', {}, ['kolano', 'biodro'], '30 s na stronę', ['Skrzyżuj nogi stojąc.', 'Przechyl się w bok.']),
    T('s-calf-wall', 'Łydka przy ścianie', 's-calf', {}, ['kostka', 'kolano'], '30 s na stronę', ['Tylna noga prosta, pięta na podłodze.', 'Przenieś ciężar w stronę ściany.']),
    T('s-soleus', 'Łydka z ugiętym kolanem', 's-calf', { bent: 1 }, ['kostka'], '30 s na stronę', ['Jak przy ścianie, ale tylne kolano ugięte.', 'Rozciąga głębszy mięsień łydki.']),
    T('s-ankle', 'Mobilizacja kostki kolanem do ściany', 's-ankle', {}, ['kostka', 'kolano'], '10 na stronę', ['Stopa ok. 10 cm od ściany.', 'Pchaj kolano do ściany, pięta na ziemi.']),
    T('s-squat-hold', 'Głęboki przysiad z podparciem', 's-deepsq', {}, ['biodro', 'kostka', 'ledzwie'], '45 s', ['Trzymaj się framugi.', 'Łokcie rozpychają kolana.']),
    T('s-wgs', 'Najlepsze rozciąganie świata', 's-wgs', {}, ['biodro', 'piersiowy', 'kolano'], '5 na stronę', ['Wykrok, łokieć do stopy.', 'Otwórz rękę do sufitu.']),
    T('s-arm-circles', 'Krążenia ramion', 's-circles', {}, ['bark'], '20 powtórzeń', ['Duże, wolne koła.', 'W przód i w tył.']),
    T('s-band-pa', 'Rozciąganie gumy przed sobą', 's-pullapart', {}, ['bark', 'piersiowy'], '15 powtórzeń', ['Guma na wysokości barków.', 'Rozciągaj, ściągając łopatki.']),
    T('s-glute-bridge', 'Mostek aktywacyjny', 's-bridge', {}, ['biodro', 'ledzwie'], '12 powtórzeń', ['Unieś biodra i przytrzymaj 2 s.', 'Ściśnij pośladki.']),
    T('s-neck-rot', 'Rotacje głowy', 's-neckrot', {}, ['szyja'], '8 na stronę', ['Powoli patrz przez ramię.', 'Bez bólu, mały zakres na start.'])
  ];

  var SESSIONS = [
    { id: 'biurko', name: 'Po dniu przy biurku', min: 8, items: ['s-neck-chin', 's-doorway', 's-thread', 's-hipflex', 's-catcow', 's-ham-band'] },
    { id: 'nogi', name: 'Przed treningiem nóg', min: 6, items: ['s-ankle', 's-wgs', 's-squat-hold', 's-glute-bridge', 's-9090'] },
    { id: 'gora', name: 'Przed treningiem góry', min: 5, items: ['s-arm-circles', 's-band-pa', 's-thread', 's-open-book'] },
    { id: 'plecy', name: 'Na lędźwie', min: 7, items: ['s-pelvic', 's-catcow', 's-child', 's-hug', 's-twist', 's-figure4'] },
    { id: 'biodra', name: 'Otwarcie bioder', min: 8, items: ['s-9090', 's-pigeon', 's-butterfly', 's-frog', 's-adductor'] },
    { id: 'wieczor', name: 'Wieczorne wyciszenie', min: 10, items: ['s-child', 's-twist', 's-figure4', 's-ham-band', 's-hug', 's-neck-side'] },
    { id: 'barki', name: 'Barki i szyja', min: 6, items: ['s-neck-side', 's-neck-rot', 's-cross', 's-wall-pec', 's-sleeper', 's-tri'] }
  ];

  var BADGES = [
    { id: 'first', name: 'Pierwszy trening', d: 'Zapisz pierwszy trening.' },
    { id: 'w10', name: '10 treningów', d: 'Zapisz 10 treningów.' },
    { id: 'w50', name: '50 treningów', d: 'Zapisz 50 treningów.' },
    { id: 'w100', name: '100 treningów', d: 'Zapisz 100 treningów.' },
    { id: 'kg100', name: 'Pierwsza setka', d: 'Podnieś 100 kg w dowolnym ćwiczeniu.' },
    { id: 'bwbench', name: 'Własna masa na ławce', d: 'Wyciśnij na ławce tyle, ile ważysz.' },
    { id: 'pr1', name: 'Pierwszy rekord', d: 'Pobij pierwszy rekord.' },
    { id: 'pr10', name: '10 rekordów', d: 'Pobij 10 rekordów.' },
    { id: 'ton', name: 'Tona w jeden dzień', d: 'Zrób 10 000 kg objętości w jednym treningu.' },
    { id: 'streak4', name: 'Miesiąc bez przerwy', d: 'Trenuj 4 tygodnie z rzędu.' },
    { id: 'streak12', name: 'Kwartał bez przerwy', d: 'Trenuj 12 tygodni z rzędu.' },
    { id: 'mobility', name: 'Ruchomy', d: 'Ukończ 5 sesji rozciągania.' }
  ];

  var LEGS = ['czworoglowe', 'dwuglowe', 'posladki', 'lydki', 'przywodziciele'];
  var ARMS = ['barki', 'biceps', 'triceps', 'przedramiona'];
  function segOf(m) { return LEGS.indexOf(m) > -1 ? 'leg' : ARMS.indexOf(m) > -1 ? 'arm' : 'torso'; }
  function groupOf(m) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].m.indexOf(m) > -1) return GROUPS[i].id; return 'brzuch'; }

  return { EQUIPMENT: EQUIPMENT, MUSCLES: MUSCLES, GROUPS: GROUPS, JOINTS: JOINTS, SIDED: SIDED, MV: MV, EX: EX, STRETCH: STRETCH, SESSIONS: SESSIONS, BADGES: BADGES, segOf: segOf, groupOf: groupOf };
})();
