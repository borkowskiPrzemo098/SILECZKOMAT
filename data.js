/* SIŁECZKOMAT — dane: ćwiczenia, rozciąganie, pozy sylwetki. */
window.SZ = (function () {
  'use strict';

  var EQUIPMENT = [
    { id: 'sztanga', name: 'Sztanga i talerze' },
    { id: 'hantle', name: 'Hantle' },
    { id: 'kettlebell', name: 'Kettlebell' },
    { id: 'lawka', name: 'Ławka' },
    { id: 'wyciag', name: 'Wyciąg linowy' },
    { id: 'maszyna', name: 'Maszyny na nogi' },
    { id: 'drazek', name: 'Drążek do podciągania' },
    { id: 'porecze', name: 'Poręcze' },
    { id: 'guma', name: 'Guma oporowa' }
  ];

  var MUSCLES = {
    klatka: 'klatka piersiowa', barki: 'barki', triceps: 'triceps', biceps: 'biceps', przedramiona: 'przedramiona',
    plecy: 'plecy (najszersze)', czworoboczny: 'czworoboczny', prostowniki: 'prostowniki grzbietu', brzuch: 'brzuch',
    posladki: 'pośladki', czworoglowe: 'czworogłowe uda', dwuglowe: 'dwugłowe uda', lydki: 'łydki'
  };

  var GROUPS = [
    { id: 'klatka', name: 'Klatka', m: ['klatka'] },
    { id: 'plecy', name: 'Plecy', m: ['plecy', 'czworoboczny', 'prostowniki'] },
    { id: 'nogi', name: 'Nogi', m: ['czworoglowe', 'dwuglowe', 'posladki', 'lydki'] },
    { id: 'barki', name: 'Barki', m: ['barki'] },
    { id: 'ramiona', name: 'Ramiona', m: ['biceps', 'triceps', 'przedramiona'] },
    { id: 'brzuch', name: 'Brzuch', m: ['brzuch'] }
  ];

  var JOINTS = {
    szyja: 'szyja', bark: 'barki', lokiec: 'łokcie', nadgarstek: 'nadgarstki', piersiowy: 'odcinek piersiowy',
    ledzwie: 'odcinek lędźwiowy', biodro: 'biodra', kolano: 'kolana', kostka: 'kostki'
  };

  /* ex: id, nazwa, wzorzec ruchu (poza), sprzęt (wszystkie wymagane), mięśnie główne, pomocnicze, obciążane stawy, poziom, wskazówki, rekwizyt */
  function E(id, name, pat, eq, prim, sec, stress, lvl, cues, prop, unit) {
    return { id: id, name: name, pat: pat, eq: eq, prim: prim, sec: sec, stress: stress, lvl: lvl, cues: cues, prop: prop || '', unit: unit || (eq.indexOf('sztanga') > -1 ? 2.5 : eq.length ? 1 : 0) };
  }
  var EX = [
    E('przysiad', 'Przysiad ze sztangą', 'squat', ['sztanga'], ['czworoglowe', 'posladki'], ['prostowniki', 'brzuch'], ['kolano', 'ledzwie', 'biodro'], 2,
      ['Sztanga na górze czworobocznego, łokcie pod gryfem.', 'Kolana idą w linii palców, pięty zostają na podłodze.', 'Schodź co najmniej do równoległej, napięty brzuch przez cały ruch.'], 'bar'),
    E('goblet', 'Przysiad goblet', 'squat', ['hantle'], ['czworoglowe', 'posladki'], ['brzuch'], ['kolano'], 1,
      ['Hantel przy mostku, łokcie w dół.', 'Siadaj między pięty, tułów wyprostowany.', 'Wstając wypychaj podłogę całą stopą.'], 'db'),
    E('legpress', 'Wypychanie nóg na maszynie', 'legpress', ['maszyna'], ['czworoglowe', 'posladki'], [], ['kolano'], 1,
      ['Lędźwie przyklejone do oparcia.', 'Opuszczaj do kąta ok. 90° w kolanach.', 'Nie blokuj kolan na górze.'], 'machine'),
    E('przysiad-bw', 'Przysiad z masą ciała', 'squat', [], ['czworoglowe', 'posladki'], [], ['kolano'], 1,
      ['Ręce przed sobą dla równowagi.', 'Biodra w tył i w dół jak na krzesło.', 'Kontrolowane tempo, 2 s w dół.'], ''),
    E('bulgarski', 'Przysiad bułgarski', 'lunge', ['hantle', 'lawka'], ['czworoglowe', 'posladki'], [], ['kolano', 'biodro'], 2,
      ['Tylna stopa na ławce, przednia ok. metr przed nią.', 'Opadaj pionowo, tylne kolano prawie do ziemi.', 'Ciężar na pięcie przedniej nogi.'], 'db'),
    E('wykroki', 'Wykroki z hantlami', 'lunge', ['hantle'], ['czworoglowe', 'posladki'], ['dwuglowe'], ['kolano'], 1,
      ['Długi krok, tułów pionowo.', 'Oba kolana zginają się do ok. 90°.', 'Odepchnij się przednią piętą.'], 'db'),
    E('stepup', 'Wejścia na ławkę', 'lunge', ['lawka'], ['czworoglowe', 'posladki'], [], ['kolano'], 1,
      ['Cała stopa na ławce.', 'Wchodź siłą nogi na ławce, nie odbijaj się tylną.', 'Schodź powoli.'], ''),
    E('martwy', 'Martwy ciąg klasyczny', 'hinge', ['sztanga'], ['posladki', 'dwuglowe', 'prostowniki'], ['plecy', 'przedramiona'], ['ledzwie', 'biodro'], 3,
      ['Sztanga nad środkiem stopy, łopatki nad gryfem.', 'Napnij plecy i „wyciśnij” podłogę nogami.', 'Gryf blisko nóg przez cały ruch.'], 'bar'),
    E('rdl', 'Rumuński martwy ciąg', 'hinge', ['sztanga'], ['dwuglowe', 'posladki'], ['prostowniki'], ['ledzwie'], 2,
      ['Lekko ugięte kolana, biodra w tył.', 'Gryf zjeżdża po udach do połowy piszczeli.', 'Plecy proste, czuj rozciąganie z tyłu ud.'], 'bar'),
    E('rdl-db', 'Martwy ciąg rumuński z hantlami', 'hinge', ['hantle'], ['dwuglowe', 'posladki'], ['prostowniki'], ['ledzwie'], 1,
      ['Hantle blisko nóg.', 'Ruch z bioder, nie z pleców.', 'Wracając, ściśnij pośladki.'], 'db'),
    E('swing', 'Swing kettlebell', 'hinge', ['kettlebell'], ['posladki', 'dwuglowe'], ['prostowniki', 'brzuch'], ['ledzwie'], 2,
      ['Ruch to wyrzut bioder, nie unoszenie rękami.', 'Kettlebell leci do wysokości klatki.', 'Na górze napięte pośladki i brzuch.'], 'kb'),
    E('hipthrust', 'Hip thrust ze sztangą', 'bridge', ['sztanga', 'lawka'], ['posladki'], ['dwuglowe'], ['biodro'], 2,
      ['Łopatki na krawędzi ławki, gryf na biodrach.', 'Wypchnij biodra do linii tułowia.', 'Broda lekko do klatki, żebra w dół.'], 'bar'),
    E('mostek', 'Mostek biodrowy', 'bridge', [], ['posladki'], ['dwuglowe'], [], 1,
      ['Stopy blisko pośladków.', 'Unieś biodra, ściśnij pośladki na 2 s.', 'Nie wyginaj lędźwi.'], ''),
    E('legcurl', 'Uginanie nóg na maszynie', 'legcurl', ['maszyna'], ['dwuglowe'], [], ['kolano'], 1,
      ['Oś maszyny na wysokości kolana.', 'Zginaj do końca, wracaj powoli.', 'Biodra przyciśnięte do siedziska.'], 'machine'),
    E('legext', 'Prostowanie nóg na maszynie', 'legext', ['maszyna'], ['czworoglowe'], [], ['kolano'], 1,
      ['Wałek nad kostkami.', 'Prostuj do końca i przytrzymaj 1 s.', 'Opuszczaj w 2–3 s.'], 'machine'),
    E('lydki', 'Wspięcia na palce', 'calf', [], ['lydki'], [], ['kostka'], 1,
      ['Pełny zakres: pięty w dół, potem jak najwyżej.', 'Pauza 1 s na górze.', 'Trzymaj się ściany dla równowagi.'], ''),
    E('wyciskanie', 'Wyciskanie sztangi na ławce', 'bench', ['sztanga', 'lawka'], ['klatka'], ['triceps', 'barki'], ['bark', 'lokiec', 'nadgarstek'], 2,
      ['Łopatki ściągnięte i wciśnięte w ławkę.', 'Gryf opuszczaj na dolną część mostka.', 'Łokcie ok. 45–70° od tułowia.'], 'bar'),
    E('wyciskanie-db', 'Wyciskanie hantli na ławce', 'bench', ['hantle', 'lawka'], ['klatka'], ['triceps', 'barki'], ['bark'], 1,
      ['Hantle nad barkami, nadgarstki prosto.', 'Opuszczaj do linii klatki.', 'Wyciskaj lekko do środka.'], 'db'),
    E('pompki', 'Pompki', 'pushup', [], ['klatka'], ['triceps', 'barki', 'brzuch'], ['bark', 'nadgarstek'], 1,
      ['Ciało w jednej linii od głowy do pięt.', 'Klatka prawie do podłogi.', 'Łokcie lekko przy tułowiu.'], ''),
    E('rozpietki', 'Rozpiętki na wyciągu', 'fly', ['wyciag'], ['klatka'], ['barki'], ['bark'], 1,
      ['Lekko ugięte łokcie przez cały ruch.', 'Prowadź ręce łukiem przed klatkę.', 'Wracaj powoli do rozciągnięcia.'], 'cable'),
    E('porecze', 'Pompki na poręczach', 'dip', ['porecze'], ['triceps', 'klatka'], ['barki'], ['bark', 'lokiec'], 2,
      ['Barki nisko, z dala od uszu.', 'Opuszczaj do ok. 90° w łokciach.', 'Lekko pochyl tułów do przodu.'], 'dip'),
    E('ohp', 'Wyciskanie żołnierskie', 'ohp', ['sztanga'], ['barki'], ['triceps', 'brzuch'], ['bark', 'ledzwie', 'nadgarstek'], 2,
      ['Ściśnij pośladki i brzuch.', 'Gryf jedzie pionowo, głowa „przechodzi” pod nim.', 'Na górze gryf nad środkiem stopy.'], 'bar'),
    E('ohp-db', 'Wyciskanie hantli nad głowę', 'ohp', ['hantle'], ['barki'], ['triceps'], ['bark'], 1,
      ['Start: hantle na wysokości uszu.', 'Wyciskaj w górę bez wyginania lędźwi.', 'Opuszczaj kontrolowanie.'], 'db'),
    E('bokiem', 'Unoszenie hantli bokiem', 'raise', ['hantle'], ['barki'], [], ['bark'], 1,
      ['Lekki ciężar, łokcie lekko ugięte.', 'Unoś do wysokości barków.', 'Bez bujania tułowiem.'], 'db'),
    E('facepull', 'Face pull na wyciągu', 'facepull', ['wyciag'], ['barki', 'czworoboczny'], ['plecy'], [], 1,
      ['Linka na wysokości twarzy.', 'Ciągnij do czoła, łokcie wysoko.', 'Na końcu rotuj ręce na zewnątrz.'], 'cable'),
    E('odwrotne', 'Odwrotne rozpiętki z hantlami', 'row', ['hantle'], ['barki', 'czworoboczny'], [], [], 1,
      ['Pochyl tułów, plecy proste.', 'Unoś ręce bokiem, ściągając łopatki.', 'Lekki ciężar, czysty ruch.'], 'db'),
    E('wioslowanie', 'Wiosłowanie sztangą', 'row', ['sztanga'], ['plecy'], ['biceps', 'prostowniki'], ['ledzwie'], 2,
      ['Tułów pochylony ok. 45°, plecy proste.', 'Ciągnij gryf do pępka.', 'Łopatki ściągnij na górze.'], 'bar'),
    E('wioslowanie-db', 'Wiosłowanie hantlem', 'row', ['hantle', 'lawka'], ['plecy'], ['biceps'], [], 1,
      ['Ręka i kolano na ławce.', 'Ciągnij hantel do biodra.', 'Nie rotuj tułowia.'], 'db'),
    E('wioslowanie-wyciag', 'Wiosłowanie na wyciągu siedząc', 'row', ['wyciag'], ['plecy'], ['biceps'], [], 1,
      ['Siedź prosto, lekko ugięte kolana.', 'Ciągnij uchwyt do brzucha.', 'Wracaj, pozwalając łopatkom się rozsunąć.'], 'cable'),
    E('wioslowanie-guma', 'Wiosłowanie z gumą', 'row', ['guma'], ['plecy'], ['biceps'], [], 1,
      ['Guma zaczepiona na wysokości brzucha.', 'Łokcie blisko tułowia.', 'Pauza z ściągniętymi łopatkami.'], 'band'),
    E('podciaganie', 'Podciąganie na drążku', 'pullup', ['drazek'], ['plecy'], ['biceps'], ['bark', 'lokiec'], 2,
      ['Chwyt nieco szerzej niż barki.', 'Ciągnij łokcie w dół do żeber.', 'Broda nad drążek, potem pełny zwis.'], 'pullbar'),
    E('sciaganie', 'Ściąganie drążka wyciągu', 'pulldown', ['wyciag'], ['plecy'], ['biceps'], ['bark'], 1,
      ['Uda zablokowane pod wałkami.', 'Drążek do górnej części klatki.', 'Klatka do góry, bez odchylania się.'], 'cable'),
    E('biceps', 'Uginanie ramion ze sztangą', 'curl', ['sztanga'], ['biceps'], ['przedramiona'], ['lokiec', 'nadgarstek'], 1,
      ['Łokcie przy tułowiu.', 'Bez bujania biodrami.', 'Opuszczaj do pełnego wyprostu.'], 'bar'),
    E('mlotkowe', 'Uginanie młotkowe z hantlami', 'curl', ['hantle'], ['biceps', 'przedramiona'], [], ['lokiec'], 1,
      ['Kciuki do góry.', 'Łokcie nieruchomo.', 'Kontrolowane opuszczanie.'], 'db'),
    E('pushdown', 'Prostowanie ramion na wyciągu', 'pushdown', ['wyciag'], ['triceps'], [], ['lokiec'], 1,
      ['Łokcie przyklejone do boków.', 'Prostuj do końca.', 'Wracaj tylko do 90°.'], 'cable'),
    E('francuskie', 'Wyciskanie francuskie hantla', 'ohext', ['hantle'], ['triceps'], [], ['lokiec', 'bark'], 1,
      ['Hantel trzymany oburącz za głową.', 'Łokcie wskazują sufit.', 'Prostuj ramiona nad głowę.'], 'db'),
    E('deska', 'Deska', 'plank', [], ['brzuch'], ['barki'], [], 1,
      ['Łokcie pod barkami.', 'Napięte pośladki i brzuch.', 'Oddychaj spokojnie, licz sekundy.'], ''),
    E('spiecia', 'Spięcia brzucha', 'crunch', [], ['brzuch'], [], ['szyja'], 1,
      ['Lędźwie przy podłodze.', 'Unosisz tylko łopatki.', 'Nie ciągnij głowy rękami.'], ''),
    E('birddog', 'Bird-dog', 'birddog', [], ['prostowniki', 'brzuch'], ['posladki'], [], 1,
      ['Klęk podparty, plecy jak stół.', 'Wyciągnij przeciwną rękę i nogę.', 'Biodra nie rotują, pauza 2 s.'], ''),
    E('pallof', 'Pallof press z gumą', 'pallof', ['guma'], ['brzuch'], [], [], 1,
      ['Guma z boku na wysokości klatki.', 'Wypchnij ręce przed siebie.', 'Nie pozwól, by guma obróciła tułów.'], 'band'),
    E('szrugsy', 'Szrugsy z hantlami', 'shrug', ['hantle'], ['czworoboczny'], [], ['szyja'], 1,
      ['Unoś barki prosto do uszu.', 'Pauza 1 s na górze.', 'Bez krążenia barkami.'], 'db'),
    E('farmer', 'Spacer farmera', 'carry', ['hantle'], ['przedramiona', 'czworoboczny', 'brzuch'], [], [], 1,
      ['Ciężkie hantle, wyprostowana sylwetka.', 'Krótkie, szybkie kroki.', 'Barki w dół i w tył.'], 'db')
  ];

  var STRETCH = [
    { id: 's-szyja', name: 'Skłon głowy w bok', pat: 's-neck', regions: ['szyja', 'bark'], hold: '2 × 30 s na stronę', cues: ['Opuść bark po przeciwnej stronie.', 'Ucho w stronę barku, bez skrętu głowy.'] },
    { id: 's-bark', name: 'Rozciąganie barku przez klatkę', pat: 's-cross', regions: ['bark', 'piersiowy'], hold: '2 × 30 s na stronę', cues: ['Przyciągnij ramię do klatki drugą ręką.', 'Bark nisko, nie unoś go do ucha.'] },
    { id: 's-klatka', name: 'Klatka przy ścianie', pat: 's-wall', regions: ['bark', 'piersiowy'], hold: '2 × 30 s na stronę', cues: ['Przedramię na ścianie na wysokości barku.', 'Delikatnie obróć tułów od ściany.'] },
    { id: 's-przedramie', name: 'Rozciąganie przedramion', pat: 's-wrist', regions: ['lokiec', 'nadgarstek'], hold: '2 × 20 s na stronę', cues: ['Wyprostuj rękę przed sobą.', 'Drugą ręką odciągnij palce do siebie.'] },
    { id: 's-koci', name: 'Koci grzbiet', pat: 's-catcow', regions: ['piersiowy', 'ledzwie'], hold: '10 powolnych powtórzeń', cues: ['Na wydechu zaokrąglij plecy.', 'Na wdechu delikatnie je wygnij.'] },
    { id: 's-dziecko', name: 'Pozycja dziecka', pat: 's-child', regions: ['ledzwie', 'piersiowy', 'biodro'], hold: '2 × 40 s', cues: ['Pośladki na piętach.', 'Ręce daleko przed sobą, oddychaj w plecy.'] },
    { id: 's-kolana', name: 'Kolana do klatki leżąc', pat: 's-hug', regions: ['ledzwie', 'biodro'], hold: '2 × 30 s', cues: ['Przyciągnij oba kolana.', 'Delikatnie kołysz się na boki.'] },
    { id: 's-biodro', name: 'Zginacze biodra w wykroku', pat: 's-hipflex', regions: ['biodro', 'ledzwie', 'kolano'], hold: '2 × 30 s na stronę', cues: ['Tylne kolano na macie.', 'Ściśnij pośladek i przesuń biodra lekko w przód.'] },
    { id: 's-czworoglowy', name: 'Czworogłowy uda stojąc', pat: 's-quad', regions: ['kolano', 'biodro'], hold: '2 × 30 s na stronę', cues: ['Pięta do pośladka, kolana obok siebie.', 'Biodro lekko w przód.'] },
    { id: 's-dwuglowe', name: 'Tył ud w siadzie', pat: 's-ham', regions: ['kolano', 'ledzwie', 'biodro'], hold: '2 × 30 s', cues: ['Nogi proste, palce do góry.', 'Pochylaj się z bioder, nie garb się.'] },
    { id: 's-lydka', name: 'Łydka przy ścianie', pat: 's-calf', regions: ['kostka', 'kolano'], hold: '2 × 30 s na stronę', cues: ['Tylna noga prosta, pięta na podłodze.', 'Przenieś ciężar w stronę ściany.'] }
  ];

  /* Pozy: [głowa, szyja, łokieć, dłoń, biodro, kolano, stopa, kolano2, stopa2] — widok z boku, viewBox 0 -14 100 110 */
  function S(a) { return a; }
  var STAND = [50, 13, 50, 21, 51, 36, 52, 51, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93];
  var POSES = {
    squat: [[50, 13, 50, 21, 44, 31, 51, 25, 50, 51, 52, 72, 51, 93, 48, 72, 47, 93], [57, 36, 53, 43, 46, 52, 54, 46, 36, 66, 58, 70, 51, 93, 55, 71, 48, 93]],
    legpress: [[24, 52, 30, 56, 40, 60, 48, 56, 50, 76, 62, 60, 76, 46, 60, 61, 74, 47], [24, 52, 30, 56, 40, 60, 48, 56, 50, 76, 54, 54, 66, 56, 53, 55, 65, 57]],
    lunge: [[50, 13, 50, 21, 50, 36, 50, 51, 50, 51, 56, 72, 60, 93, 44, 72, 38, 93], [50, 27, 50, 35, 50, 50, 50, 64, 50, 64, 65, 67, 64, 93, 40, 86, 28, 93]],
    hinge: [[50, 13, 50, 21, 51, 36, 52, 51, 50, 51, 51, 72, 50, 93, 49, 72, 49, 93], [76, 36, 70, 39, 70, 54, 70, 69, 46, 50, 53, 71, 50, 93, 51, 71, 49, 93]],
    bridge: [[14, 86, 22, 87, 30, 92, 40, 92, 48, 89, 63, 73, 70, 93, 62, 74, 69, 93], [14, 86, 22, 85, 30, 92, 40, 92, 47, 73, 63, 70, 70, 93, 62, 71, 69, 93]],
    legcurl: [[42, 26, 43, 34, 46, 48, 50, 60, 46, 63, 63, 63, 81, 65, 63, 64, 80, 66], [42, 26, 43, 34, 46, 48, 50, 60, 46, 63, 63, 63, 63, 84, 63, 64, 62, 85]],
    legext: [[42, 26, 43, 34, 46, 48, 50, 60, 46, 63, 63, 63, 63, 84, 63, 64, 62, 85], [42, 26, 43, 34, 46, 48, 50, 60, 46, 63, 63, 63, 81, 65, 63, 64, 80, 66]],
    calf: [STAND, [50, 9, 50, 17, 51, 32, 52, 47, 50, 47, 51, 68, 53, 91, 49, 68, 50, 91]],
    bench: [[18, 55, 26, 57, 26, 43, 27, 29, 58, 58, 70, 62, 72, 92, 68, 62, 70, 92], [18, 55, 26, 57, 20, 66, 28, 50, 58, 58, 70, 62, 72, 92, 68, 62, 70, 92]],
    fly: [[50, 13, 50, 21, 62, 30, 72, 34, 50, 51, 52, 72, 52, 93, 48, 72, 46, 93], [50, 13, 50, 21, 60, 34, 70, 42, 50, 51, 52, 72, 52, 93, 48, 72, 46, 93]],
    pushup: [[80, 60, 73, 63, 73, 78, 73, 93, 46, 74, 32, 82, 18, 91, 32, 82, 18, 91], [80, 76, 73, 79, 62, 84, 73, 93, 46, 84, 32, 88, 18, 92, 32, 88, 18, 92]],
    dip: [[50, 12, 50, 20, 50, 33, 50, 46, 50, 50, 44, 68, 52, 82, 45, 68, 53, 82], [50, 24, 50, 32, 40, 38, 50, 46, 50, 62, 44, 80, 52, 92, 45, 80, 53, 92]],
    ohp: [[50, 13, 50, 21, 44, 30, 53, 21, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93], [50, 13, 50, 21, 52, 7, 53, -7, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    raise: [[50, 13, 50, 21, 52, 36, 53, 50, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93], [50, 13, 50, 21, 63, 23, 77, 22, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    facepull: [[50, 13, 50, 21, 62, 22, 74, 16, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93], [50, 13, 50, 21, 40, 16, 53, 10, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    row: [[74, 34, 68, 37, 68, 52, 68, 66, 44, 50, 50, 71, 49, 93, 48, 71, 47, 93], [74, 34, 68, 37, 56, 42, 62, 54, 44, 50, 50, 71, 49, 93, 48, 71, 47, 93]],
    pullup: [[50, 16, 50, 24, 52, 12, 52, 1, 50, 52, 51, 72, 50, 90, 49, 72, 46, 89], [50, 3, 50, 11, 40, 14, 52, 1, 50, 39, 51, 59, 48, 77, 49, 59, 45, 76]],
    pulldown: [[46, 26, 46, 34, 48, 18, 50, 5, 46, 62, 62, 62, 63, 84, 61, 63, 62, 85], [46, 26, 46, 34, 38, 44, 46, 32, 46, 62, 62, 62, 63, 84, 61, 63, 62, 85]],
    curl: [[50, 13, 50, 21, 50, 36, 52, 51, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93], [50, 13, 50, 21, 50, 36, 58, 25, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    pushdown: [[50, 13, 50, 21, 52, 36, 61, 28, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93], [50, 13, 50, 21, 52, 36, 55, 51, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    ohext: [[50, 13, 50, 21, 50, 5, 41, 13, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93], [50, 13, 50, 21, 50, 5, 51, -9, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    plank: [[80, 72, 73, 75, 73, 93, 84, 93, 46, 80, 32, 86, 18, 91, 32, 86, 18, 91], [80, 71, 73, 74, 73, 93, 84, 93, 46, 77, 32, 85, 18, 91, 32, 85, 18, 91]],
    crunch: [[15, 86, 23, 88, 27, 80, 20, 79, 50, 88, 62, 73, 70, 93, 61, 74, 69, 93], [25, 74, 31, 80, 33, 71, 27, 69, 50, 88, 62, 73, 70, 93, 61, 74, 69, 93]],
    birddog: [[73, 60, 66, 64, 66, 78, 66, 93, 40, 64, 40, 82, 40, 93, 40, 82, 26, 93], [73, 60, 66, 64, 78, 62, 90, 60, 40, 64, 40, 82, 40, 93, 26, 62, 12, 60]],
    pallof: [[50, 13, 50, 21, 54, 34, 60, 38, 50, 51, 52, 72, 54, 93, 47, 72, 44, 93], [50, 13, 50, 21, 62, 30, 75, 30, 50, 51, 52, 72, 54, 93, 47, 72, 44, 93]],
    shrug: [STAND, [50, 11, 50, 18, 51, 33, 52, 48, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    carry: [[50, 13, 50, 21, 50, 36, 50, 51, 50, 51, 55, 72, 58, 93, 46, 72, 42, 93], [51, 13, 51, 21, 51, 36, 51, 51, 51, 51, 46, 72, 42, 93, 55, 72, 58, 93]],
    's-neck': [STAND, [53, 14, 50, 21, 51, 36, 52, 51, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    's-cross': [[50, 13, 50, 21, 60, 26, 44, 25, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93], [50, 13, 50, 21, 59, 25, 42, 24, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    's-wall': [[48, 13, 48, 21, 60, 21, 70, 20, 48, 51, 49, 72, 49, 93, 47, 72, 46, 93], [46, 13, 46, 21, 58, 21, 70, 20, 46, 51, 48, 72, 49, 93, 46, 72, 46, 93]],
    's-wrist': [[50, 13, 50, 21, 62, 23, 74, 24, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93], [50, 13, 50, 21, 62, 23, 74, 21, 50, 51, 51, 72, 51, 93, 49, 72, 48, 93]],
    's-catcow': [[73, 70, 66, 62, 66, 78, 66, 93, 40, 62, 40, 82, 40, 93, 40, 82, 26, 93], [74, 56, 66, 66, 66, 79, 66, 93, 40, 66, 40, 82, 40, 93, 40, 82, 26, 93]],
    's-child': [[70, 86, 62, 82, 74, 88, 86, 91, 38, 82, 52, 92, 30, 93, 52, 92, 30, 93], [71, 87, 63, 83, 75, 89, 87, 91, 37, 83, 52, 92, 30, 93, 52, 92, 30, 93]],
    's-hug': [[15, 86, 23, 88, 38, 78, 46, 72, 50, 88, 46, 70, 58, 74, 46, 70, 58, 74], [15, 85, 23, 87, 38, 77, 45, 71, 50, 87, 44, 69, 56, 73, 44, 69, 56, 73]],
    's-hipflex': [[50, 30, 50, 38, 52, 52, 56, 62, 48, 66, 62, 68, 62, 93, 38, 93, 24, 93], [52, 31, 52, 39, 54, 53, 58, 63, 51, 68, 64, 69, 63, 93, 40, 93, 24, 93]],
    's-quad': [[50, 13, 50, 21, 46, 36, 42, 56, 50, 51, 51, 72, 51, 93, 52, 72, 40, 58], [50, 13, 50, 21, 46, 36, 41, 55, 50, 51, 51, 72, 51, 93, 53, 72, 40, 57]],
    's-ham': [[44, 55, 40, 62, 52, 72, 64, 84, 30, 88, 52, 90, 74, 90, 52, 90, 74, 90], [56, 68, 50, 72, 60, 80, 72, 88, 30, 88, 52, 90, 74, 90, 52, 90, 74, 90]],
    's-calf': [[68, 24, 64, 30, 72, 30, 80, 32, 52, 54, 60, 72, 62, 93, 42, 74, 34, 93], [70, 23, 66, 29, 74, 30, 80, 32, 55, 54, 62, 72, 62, 93, 44, 74, 34, 93]]
  };

  var LEGS = ['czworoglowe', 'dwuglowe', 'posladki', 'lydki'];
  var ARMS = ['barki', 'biceps', 'triceps', 'przedramiona'];
  function segOf(m) { return LEGS.indexOf(m) > -1 ? 'leg' : ARMS.indexOf(m) > -1 ? 'arm' : 'torso'; }

  return { EQUIPMENT: EQUIPMENT, MUSCLES: MUSCLES, GROUPS: GROUPS, JOINTS: JOINTS, EX: EX, STRETCH: STRETCH, POSES: POSES, segOf: segOf };
})();
