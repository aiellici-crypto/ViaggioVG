/* =====================================================================
   VIAGGIO AL CENTRO DELLA TERRA — avventura testuale
   Ispirata al romanzo di Jules Verne (trad. it. Treves, 1874)
   e ai classici giochi a parser degli anni '80.
   ===================================================================== */
(function () {
'use strict';

/* ---------------------------------------------------------------------
   Output
   --------------------------------------------------------------------- */
var OUT = [];               // buffer (usato anche dai test in Node)
var UI = null;              // riferimenti DOM, se presenti

function say(text, cls) {
  OUT.push({ text: text, cls: cls || '' });
  if (UI) {
    var p = document.createElement('p');
    if (cls) p.className = cls;
    p.textContent = text;
    UI.out.appendChild(p);
    UI.out.scrollTop = UI.out.scrollHeight;
  }
}
function npc(text) { say(text, 'npc'); }

/* ---------------------------------------------------------------------
   Testi speciali: il crittogramma
   --------------------------------------------------------------------- */
var LATINO = 'In Sneffels Yoculis craterem kem delibat umbra Scartaris Julii intra calendas descende, audas viator, et terrestre centrum attinges. Kod feci. Arne Saknussemm';
var LETTERE = LATINO.toLowerCase().replace(/[^a-z]/g, '');
var ROVESCIO = LETTERE.split('').reverse().join('');
function aGruppi(s, n) {
  var r = [];
  for (var i = 0; i < s.length; i += n) r.push(s.slice(i, i + n));
  var righe = [];
  for (var j = 0; j < r.length; j += 7) righe.push(r.slice(j, j + 7).join(' '));
  return righe.join('\n');
}
var RUNE = 'ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚴᛚᛗᚾᛟᛈᛩᚱᛋᛏᚢᚡᚹᛪᚤᛉ';
function inRune(s) {
  return s.replace(/[a-z]/g, function (c) { return RUNE[c.charCodeAt(0) - 97]; });
}
var DOC_FOGLIO = aGruppi(ROVESCIO, 6);
var DOC_RUNE = inRune(DOC_FOGLIO);
var DOC_LATINO =
  'In Sneffels Yoculis craterem kem delibat\n' +
  'umbra Scartaris Julii intra calendas descende,\n' +
  'audas viator, et terrestre centrum attinges.\n' +
  'Kod feci. Arne Saknussemm';
var DOC_TRAD =
  '«Discendi nel cratere dello Yocul di Sneffels che l\'ombra dello Scartaris ' +
  'viene a lambire innanzi le calende di luglio, viaggiatore audace, e tu perverrai ' +
  'al centro della Terra. Ciò che io feci. Arne Saknussemm.»';

/* ---------------------------------------------------------------------
   Arte ASCII per i vari "atti"
   --------------------------------------------------------------------- */
var ART = {
  amburgo: [
    '        _|_          AMBURGO  · 1863          _|_',
    '   ____/___\\____                         ____/___\\__',
    '  |  [] [] []  |   ~ Königstrasse 19 ~   | [] [] [] |',
    '  |  [] [] []  |  ___________________    | [] [] [] |',
    '  |   _____    | |  ♦  ♦   ♦   ♦  ♦  |   |   ____   |',
    '__|__|_____|___|_|___________________|___|__|____|__|__'
  ],
  copenaghen: [
    '                 |              COPENAGHEN',
    '                (_)       ~  ~       ~    ~',
    '               /|||\\         __|__',
    '              //|||\\\\   ~  _|__|__|_  ~     ~',
    '             ///|||\\\\\\    \\_________/  Valkyrie',
    '~~~~~~~~~~~~~|||||||||~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
  ],
  islanda: [
    '                        /\\      SNEFFELS',
    '              /\\       /  \\  /\\',
    '             /  \\  /\\ / /\\ \\/  \\        ISLANDA',
    '            /    \\/  \\_/  \\_\\   \\',
    '       ____/  ~~  \\    ghiacci   \\_______',
    '______/____________\\______________________\\______'
  ],
  abisso: [
    '   \\\\  \\\\        ·       ·        //  //',
    '    \\\\  \\\\   ·      ·       ·   //  //',
    '     ||  ||       ( o )        ||  ||   SOTTOTERRA',
    '     ||  ||      lampada       ||  ||',
    '    //  //    ·        ·        \\\\  \\\\',
    '   //  //   ·     ·       ·      \\\\  \\\\'
  ],
  mare: [
    '  ·  ·   ·    ~ luce elettrica ~    ·   ·  ·',
    '                       __',
    '        ~      ~     _|  |_     ~      ~',
    '   ~        ~       |______|  zattera      ~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '  ~   MARE LIDENBROCK   ~      ~       ~      ~'
  ],
  stromboli: [
    '                     ( (  ) )',
    '                      ) (  (',
    '                      /\\/\\       STROMBOLI',
    '                  ___/    \\___',
    '        ¥  ¥   __/   ulivi    \\__   ¥',
    '~~~~~~~~~~~~~~/__________________\\~~~~~~~~~~~~~'
  ]
};

/* ---------------------------------------------------------------------
   Stato di gioco
   --------------------------------------------------------------------- */
var G;
function nuovoStato() {
  return oggettiIniziali({
    room: 'sala', inv: [], flags: {}, seen: {}, items: {}, quiz: null, tries: 0,
    score: 0, solved: {}, moves: 0, dark: 0, checkpoint: null, dead: false, over: false,
    cnt: {}
  });
}
function oggettiIniziali(g) {
  g.items = { casa_frid: ['lampada', 'piccone', 'borraccia', 'cotone'], capo: ['pugnale'] };
  return g;
}

/* ---------------------------------------------------------------------
   Utilità di parsing
   --------------------------------------------------------------------- */
function norm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
var STOP = ('il lo la i gli le l un una uno al allo alla ai agli alle a ad del dello della dei degli ' +
  'delle di da dal dallo dalla dai con col sul sulla sullo nel nella nello in per verso e ' +
  'mio mia tuo tua suo sua quel quella quello questo questa po poco piu dentro').split(' ');
var DIRS = {
  n: 'n', nord: 'n', s: 's', sud: 's', e: 'e', est: 'e', o: 'o', ovest: 'o', w: 'o',
  su: 'su', alto: 'su', sopra: 'su', giu: 'giu', basso: 'giu', sotto: 'giu',
  avanti: 'avanti', naviga: 'avanti', prosegui: 'avanti', continua: 'avanti',
  indietro: 'indietro', fuori: 'fuori', esci: 'fuori'
};
var VERBI = {
  guarda: 'guarda', l: 'guarda', g: 'guarda', descrivi: 'guarda',
  esamina: 'esamina', x: 'esamina', osserva: 'esamina', ispeziona: 'esamina', studia: 'esamina', controlla: 'esamina', consulta: 'esamina',
  leggi: 'leggi', decifra: 'leggi', traduci: 'leggi',
  prendi: 'prendi', raccogli: 'prendi', afferra: 'prendi', piglia: 'prendi', p: 'prendi',
  lascia: 'lascia', posa: 'lascia', getta: 'lascia', butta: 'lascia',
  inventario: 'inv', i: 'inv', inv: 'inv',
  parla: 'parla', chiedi: 'parla', domanda: 'parla', interroga: 'parla', saluta: 'parla', abbraccia: 'parla',
  dai: 'dai', consegna: 'dai', offri: 'dai', porgi: 'dai', mostra: 'dai',
  paga: 'paga',
  usa: 'usa', utilizza: 'usa', adopera: 'usa',
  accendi: 'accendi', attiva: 'accendi',
  spegni: 'spegni',
  ascolta: 'ascolta', senti: 'ascolta', origlia: 'ascolta',
  scava: 'scava', colpisci: 'scava', rompi: 'scava', picchia: 'scava', spacca: 'scava', batti: 'scava',
  aspetta: 'aspetta', attendi: 'aspetta', z: 'aspetta', riposa: 'aspetta', dormi: 'aspetta',
  segui: 'segui',
  sali: 'sali', monta: 'sali', imbarcati: 'sali', arrampicati: 'sali', scala: 'sali',
  scendi: 'scendi', calati: 'scendi',
  entra: 'entra', vai: 'vai', va: 'vai', cammina: 'vai', dirigiti: 'vai', torna: 'vai',
  pesca: 'pesca',
  spara: 'spara', attacca: 'spara', uccidi: 'spara', combatti: 'spara',
  grida: 'grida', urla: 'grida', chiama: 'grida',
  nasconditi: 'nascondi', nascondi: 'nascondi',
  fuggi: 'fuggi', scappa: 'fuggi', corri: 'fuggi',
  bevi: 'bevi', mangia: 'mangia', riempi: 'riempi',
  metti: 'metti', piazza: 'metti', colloca: 'metti', inserisci: 'metti', posiziona: 'metti',
  apri: 'apri', brucia: 'brucia', agita: 'agita', sventola: 'agita',
  aiuto: 'aiuto', help: 'aiuto', comandi: 'aiuto',
  suggerimento: 'hint', indizio: 'hint', hint: 'hint', aiutami: 'hint',
  punteggio: 'punti', punti: 'punti',
  salva: 'salva', carica: 'carica', ricomincia: 'ricomincia', restart: 'ricomincia',
  ripeti: 'ripeti', rinuncia: 'rinuncia'
};

function has(o) {
  for (var i = 1; i < arguments.length; i++) {
    if ((' ' + o + ' ').indexOf(' ' + arguments[i]) !== -1) return true;
  }
  return false;
}

/* ---------------------------------------------------------------------
   Oggetti
   --------------------------------------------------------------------- */
var ITEMS = {
  pergamena: { name: 'una pergamena sgualcita', nouns: ['pergamena', 'documento', 'carta antica'],
    desc: function () {
      say('Una pergamena ingiallita, lunga cinque pollici e larga tre, coperta di caratteri runici disposti in righe. In fondo, quasi cancellati, due segni che lo zio crede una firma. Ecco ciò che vi è scritto:');
      say(DOC_RUNE, 'doc');
    } },
  foglio: { name: 'il foglio con il dettato dello zio', nouns: ['foglio', 'dettato', 'lettere', 'messaggio', 'crittogramma', 'criptogramma'],
    desc: function () { leggiFoglio(); } },
  lampada: { name: 'un apparecchio di Ruhmkorff (lampada elettrica)', nouns: ['lampada', 'apparecchio', 'ruhmkorff', 'luce', 'lanterna'],
    desc: function () { say('Una lampada elettrica di Ruhmkorff: una pila di Bunsen alimenta un rocchetto d\'induzione, e la corrente illumina una serpentina di vetro piena di gas carbonico. Luce fredda e sicura, anche in mezzo ai gas infiammabili.' + (G.flags.luce ? ' È accesa.' : ' È spenta.')); } },
  piccone: { name: 'un piccone', nouns: ['piccone', 'zappa', 'martello'],
    desc: 'Un robusto piccone di ferro, buono per spaccare la roccia.' },
  borraccia: { name: 'una borraccia', nouns: ['borraccia', 'fiaschetta', 'otre', 'acqua'],
    desc: function () { say(G.flags.acqua ? 'La borraccia è piena dell\'acqua ferruginosa dell\'Hans-Bach.' : (G.flags.sete ? 'La borraccia è desolatamente vuota.' : 'Una borraccia di latta, piena d\'acqua.')); } },
  cotone: { name: 'un pacco di cotone fulminante', nouns: ['cotone', 'fulmicotone', 'fulminante', 'esplosivo', 'polvere', 'miccia', 'mina'],
    desc: 'Cotone fulminante: un esplosivo la cui forza espansiva è quattro volte quella della polvere da sparo. Lo zio ha insistito per portarne. Maneggiare con cura!' },
  risdalleri: { name: 'tre risdalleri d\'argento', nouns: ['risdalleri', 'risdallero', 'monete', 'denaro', 'soldi', 'paga'],
    desc: 'Tre risdalleri: la paga settimanale pattuita con Hans.' },
  pugnale: { name: 'un pugnale arrugginito', nouns: ['pugnale', 'daga', 'coltello'],
    desc: 'Una daga del XVI secolo, d\'origine spagnola, di quelle che i gentiluomini portavano alla cintura. La ruggine non è d\'un giorno: è d\'un anno, di cento, di trecento anni!' },
  bussola: { name: 'la bussola', nouns: ['bussola', 'ago', 'ago calamitato'],
    desc: function () { descBussola(); } }
};
function itemHere(id) { return (G.items[G.room] || []).indexOf(id) !== -1; }
function hasItem(id) { return G.inv.indexOf(id) !== -1; }
function give(id) { if (!hasItem(id)) G.inv.push(id); }
function drop(id) { G.inv = G.inv.filter(function (x) { return x !== id; }); }
function putRoom(room, id) { G.items[room] = G.items[room] || []; if (G.items[room].indexOf(id) === -1) G.items[room].push(id); }
function takeRoom(room, id) { G.items[room] = (G.items[room] || []).filter(function (x) { return x !== id; }); }
function findItem(o, where) {
  var pool = where === 'inv' ? G.inv : where === 'room' ? (G.items[G.room] || []) : G.inv.concat(G.items[G.room] || []);
  for (var i = 0; i < pool.length; i++) {
    var it = ITEMS[pool[i]];
    for (var j = 0; j < it.nouns.length; j++) if (has(o, it.nouns[j])) return pool[i];
  }
  return null;
}

/* ---------------------------------------------------------------------
   Personaggi (descrizioni e frasi "autonome" in stile Hobbit)
   --------------------------------------------------------------------- */
var NPC = {
  zio: { nouns: ['zio', 'professore', 'lidenbrock', 'otto'],
    name: 'lo zio, il professore Lidenbrock',
    desc: 'Otto Lidenbrock, professore al Johannaeum: alto, magro, d\'una salute di ferro, con gli occhiali sopra un naso lungo e sottile. Quando cammina misura il terreno a passi d\'una tesa; è il più impaziente degli uomini.',
    idle: ['Lo zio borbotta: «Avanti, Axel, avanti!»',
      'Il professore picchia una roccia col martello e ne esamina la frattura.',
      'Lo zio si siede e incomincia a parlare di minerali.',
      'Lo zio consulta il cronometro e annota qualcosa sul taccuino.',
      'Il professore si aggiusta gli occhiali e scruta i dintorni.',
      'Lo zio ripete fra sé: «Saknussemm... Saknussemm...»'] },
  hans: { nouns: ['hans', 'guida', 'bjelke', 'cacciatore', 'islandese'],
    name: 'Hans, la guida islandese',
    desc: 'Hans Bjelke, cacciatore di eider: un colosso dalla forza erculea, dai capelli lunghi e rossicci, flemmatico e silenzioso. Parla poco, e solo in danese, ma non sbaglia mai.',
    idle: ['Hans non dice nulla.', 'Hans fuma tranquillamente la sua pipa.',
      'Hans dice: «Forüt!»', 'Hans ti guarda, flemmatico come sempre.',
      'Hans aggiusta il carico sulle spalle.', 'Hans si siede e aspetta.'] },
  marta: { nouns: ['marta', 'serva', 'cuoca', 'domestica'], name: 'la buona Marta',
    desc: 'La buona Marta, la vecchia serva di casa Lidenbrock, col grembiule e il mestolo in mano.',
    idle: ['Marta rimescola qualcosa sul fornello.', 'Marta sospira: «Che giornata, signor Axel!»'] },
  grauben: { nouns: ['grauben', 'ragazza', 'fidanzata', 'figlioccia'], name: 'Graüben',
    desc: 'Graüben, la pupilla di tuo zio: diciassette anni, bionda, occhi azzurri, un carattere serio e una mente da mineralogista. La ami, e lei ti ama.',
    idle: ['Graüben ti sorride.'] },
  fridriksson: { nouns: ['fridriksson', 'ospite', 'scienziato islandese', 'professore islandese'], name: 'il signor Fridriksson',
    desc: 'Il signor Fridriksson, professore di scienze naturali alla scuola di Reykjawik: un uomo amabile, che parla latino con lo zio.',
    idle: ['Il signor Fridriksson sfoglia un libro della sua biblioteca.'] },
  capitano: { nouns: ['capitano', 'bjarne', 'marinaio', 'marinai'], name: 'il capitano Bjarne',
    desc: 'Il capitano Bjarne, uomo di poche parole, comandante della goletta Valkyrie.', idle: ['Il capitano impartisce ordini ai marinai.'] },
  rettore: { nouns: ['rettore', 'parroco', 'prete', 'moglie'], name: 'il rettore di Stapi',
    desc: 'Il rettore di Stapi: ferraio, pescatore, cacciatore, falegname, e per giunta prete. Sua moglie è una megera lunga e magra.',
    idle: ['Il rettore batte sull\'incudine.'] },
  ragazzo: { nouns: ['ragazzo', 'pastorello', 'bambino', 'fanciullo'], name: 'un pastorello',
    desc: 'Un ragazzetto scalzo, spaventato dal vostro aspetto di naufraghi bruciacchiati.', idle: ['Il ragazzo vi guarda con diffidenza.'] },
  pastore: { nouns: ['pastore', 'gigante', 'uomo'], name: 'un pastore gigantesco',
    desc: 'Un essere umano alto più di dodici piedi, con una testa grossa come quella d\'un bufalo e una criniera di capelli. Brandisce un ramo enorme. È il pastore di quei mastodonti!', idle: [] }
};
function findNpc(o) {
  var r = room();
  var pres = presenti();
  for (var i = 0; i < pres.length; i++) {
    var n = NPC[pres[i]];
    for (var j = 0; j < n.nouns.length; j++) if (has(o, n.nouns[j])) return pres[i];
  }
  return null;
}
function presenti() {
  var r = room();
  var l = r.npcs ? r.npcs() : [];
  if (G.flags.zio && !G.flags.solo && l.indexOf('zio') === -1) l.push('zio');
  if (G.flags.hans && !G.flags.solo && l.indexOf('hans') === -1) l.push('hans');
  return l;
}

/* ---------------------------------------------------------------------
   Enigmi
   --------------------------------------------------------------------- */
var QUIZ = {
  runico: { pts: 10,
    q: '«Axel!» tuona lo zio, agitando la pergamena. «Tu che hai studiato con me: che sorta di scrittura è questa? Rispondi!»',
    ans: ['runic', 'rune', 'runi', 'runa'],
    hint: 'Sono gli antichi caratteri dei popoli del Nord, incisi un tempo sulle pietre. La descrizione della pergamena te lo dice.',
    ok: function () {
      say('«Runica! Bravo! Sono rune islandesi, e io le tradurrò!» Lo zio ti mette davanti un foglio e incomincia a dettare, lettera per lettera, l\'equivalente latino di ogni carattere. Ne viene fuori una successione di lettere senza senso.');
      give('foglio');
      say('Il professore si rigira il foglio fra le mani, lo maledice, combina le lettere in cento modi, picchia il pugno sul tavolo. Poi, d\'improvviso, afferra il cappello ed esce di casa come una furia. L\'uscio di strada sbatte.');
      G.flags.zio_fuori = true;
      say('(Hai ora il foglio con il dettato. Forse potresti leggerlo tu...)', 'sys');
    } },
  rovescio: { pts: 15,
    q: 'Le lettere ti danzano davanti agli occhi. Il foglio deve pur avere una chiave! In che modo va letto il messaggio?',
    ans: ['rovescio', 'contrario', 'indietro', 'inverso', 'invers', 'fine', 'ultima', 'destra a sinistra', 'destra verso sinistra', 'al rovescio', 'capovolt', 'specchio'],
    hint: 'Sventolandoti col foglio per il caldo, ne intravedi un attimo il retro, in trasparenza: ti pare di leggere «craterem» e «terrestre». E se le lettere andassero lette nel verso opposto?',
    ok: function () {
      say('Ecco la chiave! Basta leggere tutto, cominciando dall\'ultima lettera fino alla prima! Il cuore ti batte forte mentre pronunci la frase latina:');
      say(DOC_LATINO, 'doc');
      say(DOC_TRAD, 'doc');
      G.flags.letto = true;
      say('Il centro della Terra! Se lo zio legge questo, partirà... e ti trascinerà con sé! Per un attimo pensi di bruciare tutto nel caminetto.');
      say('Ma in quel momento l\'uscio di strada si apre: lo zio è rientrato! Senza guardarti, si chiude nello studio, torna a tormentare la pergamena... e si mette in tasca la chiave di casa. Nessuno uscirà finché il segreto non sarà svelato.');
      G.flags.zio_fuori = false; G.flags.chiuso = true;
    } },
  sneffels: { pts: 10,
    q: 'Lo zio legge il latino e lancia un vero ruggito. Afferra un atlante e lo spalanca. «"Yoculis" vuol dire ghiacciaio, in islandese! Sneffels è un vulcano! Ma dimmi, Axel, in quale isola si trova lo Sneffels?»',
    ans: ['island'],
    hint: 'Saknussemm era un dotto islandese, e «Yocul» è una parola della sua lingua. Lo Sneffels si trova nella sua terra.',
    ok: function () {
      say('«In Islanda, sicuro! Sulla costa occidentale, a nord di Reykjawik: un monte alto cinquemila piedi!»');
      G.flags.rivelato = true;
      startQuiz('calende');
    } },
  calende: { pts: 10,
    q: '«Ma attento: il documento dice "Julii intra calendas". Entro quale giorno dobbiamo trovarci nel cratere, perché l\'ombra dello Scartaris ci indichi la via?»',
    ans: ['luglio', 'calende', 'primo', '1 7', '1 luglio', 'fine giugno', '30 giugno'],
    hint: 'Le calende erano il primo giorno del mese per i Romani. E «Julius» è il mese di...',
    ok: function () {
      say('«Prima delle calende di luglio! Non c\'è un giorno da perdere!» Lo zio si caccia in tasca il documento, apre l\'uscio di strada e chiama Marta: «Va\' pure al mercato, buona donna!»');
      say('Poi si volta verso di te: «E tu, Axel, va\' a fare la valigia! Partiamo per Copenaghen!» Senti il pavimento mancarti sotto i piedi. Ah, se almeno potessi parlarne con Graüben, che è in visita ad Altona...');
      G.flags.chiuso = false; G.flags.partenza = true; G.flags.marta_uscita = true;
    } },
  grauben: { pts: 10,
    q: 'Graüben ti prende le mani: «Axel, che hai? Sei pallido! Dove vuole condurti mio tutore?»',
    ans: ['centro', 'terra', 'sneffels', 'vulcano', 'island', 'cratere'],
    hint: 'Ricorda la frase di Saknussemm: «...et terrestre centrum attinges».',
    ok: function () {
      say('Graüben ascolta tutto in silenzio. Poi, invece di spaventarsi, le si illuminano gli occhi: «Che bel viaggio! È degno del nipote d\'un dotto. Va\', Axel... e quando ritornerai, sarai un uomo. Sarai il suo eguale... e potrai parlare liberamente. E io...»');
      say('Arrossisce e non finisce la frase. Ma tu hai capito: al tuo ritorno, sarà tua moglie. Ora hai il coraggio di partire.');
      G.flags.grauben = true;
    } },
  elseneur: { pts: 10,
    q: 'Aggrappato alla balaustra della palla di rame, con le gambe che tremano, guardi lo stretto del Sund. Lo zio ti indica una costa lontana: «Laggiù c\'è il castello di Elseneur! Di quale principe di Shakespeare era la terrazza dove apparve lo spettro?»',
    ans: ['amleto', 'hamlet'],
    hint: '«Essere o non essere...» Il principe di Danimarca.',
    ok: function () {
      say('«Amleto, sicuro!» Per un istante dimentichi la vertigine, e ti pare di vedere l\'ombra del principe errare sulla terrazza leggendaria. Lo zio è soddisfatto: «Per oggi basta. Domani ricominceremo!» La lezione di vertigine è compiuta: ora non hai più paura degli abissi... o quasi.');
      G.flags.vertigine = true;
    } },
  eretico: { pts: 10, choices: ['A) Perché erano scritti in rune e nessuno sapeva leggerli',
    'B) Perché Saknussemm fu perseguitato come eretico e nel 1573 le sue opere furono arse a Copenaghen',
    'C) Perché furono vendute agli Inglesi da un mercante di Amburgo'],
    q: 'Il signor Fridriksson, a tavola, scuote il capo: «Arne Saknussemm? Un grande alchimista del sedicesimo secolo. Ma non troverete un solo libro suo né in Islanda né altrove.» Lo zio ti fa un cenno: tocca a te mostrarti erudito. Perché non esistono più libri di Saknussemm?',
    ans: ['b', 'eretic', '1573', 'arse', 'bruciat', 'rogo', 'arso'],
    hint: 'Il XVI secolo non era tenero con i liberi pensatori: il carnefice di Copenaghen ebbe molto da fare.',
    ok: function () {
      say('«Esatto, giovanotto!» esclama Fridriksson. «Furono arse per mano del carnefice.» Lo zio sorride: ora capisce perché Saknussemm nascose la sua scoperta in un crittogramma! «A proposito,» aggiunge Fridriksson, «per il vostro giro scientifico vi ho trovato una guida eccellente: un cacciatore di eider, che si accontenta di tre risdalleri a settimana, pagati ogni sabato. Eccolo che arriva.»');
      G.flags.fr_info = true;
      say('Entra un uomo alto, robusto, con lunghi capelli rossicci: è Hans Bjelke.', 'npc');
    } },
  paga: { pts: 10,
    q: 'Hans incrocia le braccia e aspetta, immobile. Lo zio ti bisbiglia: «Il danese lo parli meglio di me. Offrigli la paga pattuita: quanti risdalleri a settimana?»',
    ans: ['3', 'tre'],
    hint: 'Lo ha detto Fridriksson poco fa, parlando di Hans.',
    ok: function () {
      say('Hans fa un breve cenno col capo: «Ja.» Il patto è concluso: vi accompagnerà durante tutto il viaggio, fino in fondo... dovunque sia il fondo. Lo zio ti affida la prima paga: tre risdalleri.');
      give('risdalleri'); G.flags.hans = true;
    } },
  scartaris: { pts: 10,
    q: 'Dalla vetta dello Sneffels si vedono due picchi. Hans ne indica uno: «Scartaris.» Lo zio si volta verso di te con aria trionfante: «E dimmi, Axel, secondo il documento, che cosa del picco Scartaris ci indicherà la bocca giusta?»',
    ans: ['ombra'],
    hint: '«...craterem kem delibat UMBRA Scartaris...»: il picco funziona come l\'ago di un immenso quadrante solare.',
    ok: function () {
      say('«L\'ombra! Come l\'ago d\'un quadrante solare! Scendiamo nel cratere, e aspettiamo il sole!»');
    } },
  hansbach: { pts: 10,
    q: 'Bevete, bevete, bevete! Lo zio, ripresi i sensi, dichiara: «Questo ruscello merita un nome. E lo porterà in onore di chi l\'ha trovato!» Come lo chiamerete?',
    ans: ['hans'],
    hint: 'Chi ha sentito l\'acqua dietro la parete? Aggiungi «Bach», ruscello in tedesco.',
    ok: function () {
      say('«L\'Hans-Bach!» Hans non si scompone: si limita a bere, e a riempire le borracce. Ma il professore ha un\'idea: «Lasciamo scorrere l\'acqua! Scenderà con noi e ci farà da guida!» Il ruscello, docile, si avvia lungo la galleria che scende.');
      G.flags.acqua = true; G.flags.sete = false;
    } },
  distanza: { pts: 20,
    q: 'La voce dello zio ti arriva attraverso la roccia, come in una galleria acustica: «Axel! Io dirò il tuo nome e guarderò il cronometro; tu ripetilo appena lo senti!» ... «Quaranta secondi,» dice lo zio, «sono passati fra le due parole.» Il suono percorre 1020 piedi al secondo. A quanti piedi di distanza sei dai tuoi compagni?',
    ans: ['20400', '20 400', 'ventimila', 'lega e mezza', 'lega e mezzo'],
    hint: 'I quaranta secondi sono andata e ritorno: il suono ha impiegato venti secondi per arrivare da lui a te. Ora moltiplica per 1020.',
    ok: function () {
      say('«Ventimila e quattrocento piedi: una lega e mezza!» esclama lo zio. «Non è difficile percorrerla! La galleria in cui ti trovi scende verso di noi: siamo in una vasta caverna dove sboccano molte gallerie. Scendi, Axel! Scendi, anche strisciando, anche scivolando! Ti aspettiamo a braccia aperte!»');
      G.flags.distanza = true;
    } },
  surtarbrandur: { pts: 10,
    q: 'Hans sta legando con forti corde delle travi scure, mezzo pietrificate. Lo zio ne getta un pezzo in mare: affonda, poi torna a galla. «È il legno fossile che gli Islandesi chiamano... come, Axel?»',
    ans: ['surtarbrandur', 'surtar', 'surtabrandur', 'legno fossile'],
    hint: 'Una parola islandese che significa all\'incirca «legno bruciato»: comincia per «surtar...».',
    ok: function () {
      say('«Surtarbrandur! Pini, abeti, betulle di tutte le specie, schiacciati e mineralizzati dal tempo. Galleggia come il sughero!» Hans annuisce: la zattera cresce sotto le sue mani.');
    } },
  nome_porto: { pts: 10,
    q: 'Lo zio contempla il porticciolo naturale, chiuso fra le rocce. «Questo mare l\'ho chiamato mare Lidenbrock: è giusto, l\'ho scoperto io! Ma il porto da cui salperemo... lo battezzerai tu, Axel. Che nome gli daremo?»',
    ans: ['grauben'],
    hint: 'Pensa a chi ti aspetta ad Amburgo, e che ti ha dato il coraggio di partire.',
    ok: function () {
      say('«Porto Graüben! Ottima idea, ragazzo mio: ella sarà orgogliosa di sapere che il suo nome figura sulla carta del mondo sotterraneo!» La sera dopo la zattera è compiuta: dieci piedi per cinque, un albero, una vela fatta di coperte. Si salpa il 13 agosto.');
    } },
  cieco: { pts: 10,
    q: 'Dall\'acqua emerge, dibattendosi all\'amo, un pesce dalla testa piatta e arrotondata, coperto di placche ossee. Lo zio lo esamina: «Un pterichthys! Una famiglia estinta da secoli, nota solo come fossile! Ma ha una particolarità, tipica dei pesci delle acque sotterranee. La vedi? Cosa ha di strano?»',
    ans: ['cieco', 'occhi', 'vista', 'non vede'],
    hint: 'Guardagli bene la testa... dove dovrebbero esserci gli organi della vista, non c\'è nulla.',
    ok: function () {
      say('«È cieco! Anzi, l\'organo della vista gli manca del tutto!» In due ore ne pescate parecchi: carne fresca per il viaggio. Ma quale altra creatura antidiluviana nuoterà sotto di voi?');
    } },
  ictiosauro: { pts: 15, choices: ['A) Il plesiosauro', 'B) L\'ictiosauro', 'C) Il mastodonte', 'D) Il megaterio'],
    q: 'Due mostri marini si affrontano a cento tese dalla zattera, sollevando montagne d\'acqua! Lo zio, col cannocchiale, grida: «Il primo ha il muso d\'un porcomarino, la testa d\'una lucertola, i denti d\'un coccodrillo e un occhio sanguigno grosso come la testa d\'un uomo!» Quale dei due mostri è?',
    ans: ['b', 'ictios', 'ittios', 'ichthyo', 'ichtyo'],
    hint: 'Il secondo mostro, «un serpente nascosto nel guscio d\'una tartaruga» col collo da cigno, è il plesiosauro. Il primo è il suo nemico: un «pesce-lucertola».',
    ok: function () {
      say('«L\'ictiosauro! E l\'altro è il plesiosauro, suo nemico mortale!» I due rettili lottano per ore, poi spariscono scavando un maëlstrom. D\'improvviso riaffiora una testa enorme: è il plesiosauro, ferito a morte. Il suo collo si torce, si rizza, ricade... e il mostro resta immobile sulle onde. Dell\'ictiosauro, nessuna traccia.');
    } },
  geysir: { pts: 10,
    q: 'Lo zio immerge il termometro nell\'acqua bollente del getto: 163 gradi! «Un geyser, come quelli d\'Islanda! Gli Islandesi pronunciano geysir, una parola che significa... Lo sai, Axel?»',
    ans: ['furor', 'furia', 'collera', 'rabbia', 'ira'],
    hint: 'Guarda come ruggisce e si scatena quel getto: la sua parola islandese indica una passione violenta.',
    ok: function () {
      say('«Furore! E mai nome fu più meritato.» Il professore, di buonumore, battezza l\'isolotto col tuo nome: d\'ora in poi sulla carta sarà l\'«isola Axel». Hai percorso duecentosessanta leghe di mare dal porto Graüben.');
    } },
  tempesta: { pts: 15, deadly: true, choices: ['A) Afferro il piccone di ferro per respingere la palla di fuoco',
    'B) Mi getto in mare per sfuggirle',
    'C) Non mi muovo e mi tengo stretto alla zattera'],
    q: 'Un globo di fuoco, bianco-azzurro, grosso come una bomba, cala sulla zattera e vi rotola sopra, a pochi pollici dalla polveriera! Tutto il ferro di bordo è calamitato: strumenti, utensili, armi si urtano sonoramente; i chiodi delle tue scarpe aderiscono a una piastra di ferro. Che cosa fai?',
    ans: ['c', 'stretto', 'tengo', 'immobile', 'non mi muovo', 'fermo'],
    hint: 'Il ferro è magnetizzato e il mare è in burrasca...',
    death: 'Ti muovi, e il globo elettrico, attirato dal ferro, ti avvolge in un getto di fiamme accecanti. Non saprai mai come finisce il viaggio.',
    ok: function () {
      say('Resti immobile, aggrappato ai tronchi. Il globo scoppia in un getto di fiamme... poi tutto si spegne. Svieni.');
      say('Quando riapri gli occhi, l\'uragano infuria ancora per giorni. Infine un fragore: la zattera si sfascia contro una costa rocciosa! Hans ti afferra per un braccio e ti trascina sulla sabbia. Poi, impassibile, torna in mezzo ai frangenti a salvare i viveri e gli strumenti.');
      go('riva', true);
    } },
  quaternario: { pts: 10,
    q: 'Fra le ossa c\'è un corpo umano, perfettamente riconoscibile, mummificato dai terreni. Lo zio, come se parlasse davanti al Johannaeum, solleva la voce: «Signori, ho l\'onore di presentarvi un uomo fossile, contemporaneo dei mastodonti!» Di quale epoca geologica?',
    ans: ['quaternar', 'quarta', 'pleistocen'],
    hint: 'L\'epoca dei mastodonti e dei mammut, l\'ultima prima dell\'attuale: viene dopo la terziaria.',
    ok: function () {
      say('«Dell\'epoca quaternaria! E i San Tommaso della paleontologia dovranno arrendersi!» Il professore è al colmo della gioia. Tu, invece, guardi verso nord, dove si stende una foresta, e ti pare di udire dei rumori...');
    } },
  iniziali: { pts: 10,
    q: 'Sulla parete di granito, sopra l\'apertura d\'una galleria, due lettere misteriose, mezzo corrose dal tempo, sono incise con la punta d\'una lama. Lo zio trema d\'emozione. Di chi sono queste iniziali?',
    ans: ['saknussemm', 'arne', 'saknusem', 'saknussem', 'saknusemm'],
    hint: 'Le stesse lettere che firmavano la pergamena runica: A. S.',
    ok: function () {
      say('«A. S.! Arne Saknussemm! Sempre Arne Saknussemm!» Lo zio battezza il luogo «capo Saknussemm». Ecco la via! Ma la galleria è ostruita: un enorme masso, caduto chissà quando, chiude il passaggio. Nemmeno Hans riesce a smuoverlo.');
      say('(Forse un po\' di quell\'esplosivo portato dall\'Islanda...)', 'sys');
    } },
  eruzione: { pts: 10,
    q: 'Il calore cresce, le pareti si fanno rosse, l\'acqua intorno a voi bolle. La zattera sale, sale, sempre più veloce, dentro un camino verticale. Lo zio, quasi felice: «Sai che cosa ci spinge verso l\'alto, Axel?»',
    ans: ['eruzion', 'lava', 'vulcan', 'magma', 'fuoco'],
    hint: 'Il pozzo è il camino d\'un vulcano attivo... e sotto di voi qualcosa sta per esplodere.',
    ok: function () {
      say('«Un\'eruzione! Siamo nel camino d\'un vulcano in attività!» Ad ogni scossa la zattera balza in su. Fiamme, fumo, cenere... Un ultimo urto spaventoso, e vi sentite scagliati nell\'aria come proiettili. Poi, il buio.');
      go('stromboli', true);
    } },
  lingua: { pts: 10,
    q: 'Lo zio prova a interrogare il ragazzo in tedesco: nessuna risposta. In inglese: nulla. In francese: silenzio. In che lingua dovreste parlargli, a giudicare dagli ulivi, dalle viti e dal cielo del sud?',
    ans: ['italian'],
    hint: 'Ulivi, fichi, melagrane, un mare azzurro... Siete in un paese mediterraneo, nel cuore del Mare Nostrum.',
    ok: function () {
      say('«Come si chiama questa montagna, piccolo mio?» domanda lo zio in italiano. Il ragazzo, sfuggendo dalle mani di Hans, risponde correndo via fra gli ulivi: «Stromboli!»');
      say('Lo Stromboli! Entrati da un vulcano dell\'Islanda, siete usciti da un altro, nelle isole Eolie, a più di milleduecento leghe dallo Sneffels!');
      G.flags.stromboli = true;
    } },
  bussola: { pts: 20,
    q: 'Alla vista della bussola, lo zio lancia un grido: l\'ago segna il sud dove dovrebbe segnare il nord! Ecco perché, dopo la tempesta, credevate d\'essere stati ricacciati sulla costa nord e di risalire poi verso settentrione: in realtà eravate sulla costa sud, e scendevate verso il Mediterraneo! Ma che cosa aveva guastato la bussola?',
    ans: ['globo', 'palla di fuoco', 'fulmine', 'tempesta', 'elettric', 'magnet', 'calamit', 'invert', 'polarit', 'rovesc'],
    hint: 'Ricordi quel globo di fuoco che calamitò tutto il ferro della zattera durante la tempesta?',
    ok: function () {
      say('«Il globo di fuoco! Calamitando il ferro della zattera, ne aveva invertito i poli!» esclama il professore, e d\'improvviso è il più felice degli uomini. Il mistero è risolto.');
      fine();
    } }
};
function totalePunti() { var t = 0; for (var k in QUIZ) t += QUIZ[k].pts; return t; }

function startQuiz(id) {
  if (G.solved[id]) return false;
  G.quiz = id; G.tries = 0;
  var q = QUIZ[id];
  say(q.q, 'quiz');
  if (q.choices) say(q.choices.join('\n'), 'quiz');
  say(q.deadly ? '(Rispondi in fretta: la tua vita dipende da questa scelta.)' : '(Scrivi la risposta. Puoi anche scrivere SUGGERIMENTO, RIPETI o RINUNCIA.)', 'sys');
  return true;
}
function rispostaGiusta(q, raw) {
  var n = norm(raw), c = n.replace(/ /g, '');
  for (var i = 0; i < q.ans.length; i++) {
    var a = q.ans[i];
    if (a.length === 1) { if (n === a || n.indexOf(a + ' ') === 0 || n.indexOf(a + ')') === 0 || n === 'risposta ' + a) return true; continue; }
    if (a.length <= 3 || /^\d+$/.test(a)) { if ((' ' + n + ' ').indexOf(' ' + a + ' ') !== -1 || (a.length > 3 && c.indexOf(a) !== -1)) return true; continue; }
    if (n.indexOf(a) !== -1 || c.indexOf(a.replace(/ /g, '')) !== -1) return true;
  }
  return false;
}
function handleQuiz(raw) {
  var q = QUIZ[G.quiz], n = norm(raw);
  if (n === 'suggerimento' || n === 'indizio' || n === 'aiuto' || n === 'hint') { say('Indizio: ' + q.hint, 'sys'); return; }
  if (n === 'ripeti') { say(q.q, 'quiz'); if (q.choices) say(q.choices.join('\n'), 'quiz'); return; }
  if (n === 'rinuncia') {
    if (q.deadly) { say('Non c\'è tempo per esitare!', 'bad'); return; }
    G.quiz = null; say('Lasci perdere, per ora. (Potrai riprovare più tardi: la strada però resta sbarrata.)', 'sys'); return;
  }
  if (rispostaGiusta(q, raw)) {
    var id = G.quiz, p = Math.max(Math.ceil(q.pts / 3), q.pts - G.tries * Math.ceil(q.pts / 4));
    G.quiz = null; G.solved[id] = true; G.score += p;
    say('Risposta esatta! (+' + p + ' punti)', 'ok');
    q.ok();
    return;
  }
  if (q.deadly) { morte(q.death); return; }
  G.tries++;
  var rimproveri = ['«No, no e poi no!» sbuffa lo zio.', 'Non è così. Pensaci meglio.', 'Sbagliato. Eppure la risposta è vicina...'];
  say(rimproveri[(G.tries - 1) % rimproveri.length], 'bad');
  if (G.tries >= 2) say('Indizio: ' + q.hint, 'sys');
}

/* ---------------------------------------------------------------------
   Morte e checkpoint (come nei vecchi giochi: "SEI MORTO")
   --------------------------------------------------------------------- */
function snapshot() { var c = G.checkpoint; G.checkpoint = null; var s = JSON.stringify(G); G.checkpoint = c; return s; }
function morte(testo) {
  say(testo, 'bad');
  say('*** SEI MORTO ***', 'death');
  say('Il tuo viaggio finisce qui... ma la fortuna aiuta gli audaci. Premi INVIO (o scrivi qualsiasi cosa) per riprendere dall\'ultimo punto sicuro.', 'sys');
  G.dead = true; G.quiz = null;
}
function rinasci() {
  var cp = G.checkpoint;
  if (cp) { G = JSON.parse(cp); G.checkpoint = cp; } else { G = nuovoStato(); }
  G.dead = false;
  say('...Riprendi i sensi. Era soltanto un incubo? Sei di nuovo qui:', 'sys');
  descrivi(true);
  if (room().onEnter) room().onEnter();
}

/* ---------------------------------------------------------------------
   Luoghi
   --------------------------------------------------------------------- */
function room() { return ROOMS[G.room]; }
function zio() { return G.flags.zio && !G.flags.solo; }

var ROOMS = {
/* ============================ AMBURGO ============================ */
sala: { title: 'Sala da pranzo — Königstrasse 19', arte: 'amburgo', date: '24 maggio 1863', checkpoint: true,
  desc: function () {
    return 'Sei nella sala da pranzo della vecchia casa di tuo zio, il professore Otto Lidenbrock, al numero 19 di Königstrasse, nel quartiere antico di Amburgo. La casa pende un poco, come la berretta d\'uno studente; sul fornello il desinare comincia appena a cantarellare. A nord una porta conduce al gabinetto di studio del professore; a ovest l\'uscio dà sulla strada.' +
      (G.flags.chiuso ? ' L\'uscio di strada è chiuso a chiave.' : '');
  },
  npcs: function () { return G.flags.marta_uscita ? [] : ['marta']; },
  scenery: { fornello: 'Una zuppa al prezzemolo, una frittata col prosciutto, una lombata con composta di prugne... e, per frutta, gamberi in dolce.',
    desinare: 'Una zuppa al prezzemolo, una frittata col prosciutto, una lombata con composta di prugne... e, per frutta, gamberi in dolce.',
    uscio: 'La porta di strada, massiccia, di quercia.', porta: 'A nord lo studio, a ovest la strada.' },
  exits: { n: 'studio', o: function () {
    if (!G.flags.partenza && !G.flags.zio_fuori && !G.flags.chiuso) { npc('Dallo studio giunge un vocione: «Axel, seguimi! Subito!» Meglio non far aspettare lo zio.'); return null; }
    if (G.flags.chiuso) { say('L\'uscio è chiuso a chiave, e la chiave è nella tasca dello zio.'); return null; }
    if (!G.flags.partenza) { say('Non puoi andartene ora: hai un segreto fra le mani, e lo zio potrebbe tornare da un momento all\'altro.'); return null; }
    return 'strada'; } },
  onFirst: function () {
    npc('«Già il signor Lidenbrock!» esclama la buona Marta, stupefatta. «Ma il desinare non è pronto! Signor Axel, è rientrato come un fulmine e si è chiuso nello studio. Vada lei a sentire che cosa vuole!»');
    npc('Dallo studio, a nord, una voce tonante: «Axel, seguimi!»');
  },
  act: function (v, o) {
    if (v === 'parla' && has(o, 'marta')) {
      if (G.flags.chiuso) npc('Marta piagnucola: «Il padrone ha chiuso la porta! Non posso andare al mercato, e nessuno mangerà finché quel foglio non sarà letto! Signor Axel, faccia qualcosa: lei sa qualcosa, lo vedo dai suoi occhi!»');
      else if (G.flags.zio_fuori) npc('«Il padrone è uscito come un pazzo, senza neanche il cappello in testa... Anzi no, il cappello l\'aveva. Mangi, signor Axel, che si raffredda!»');
      else npc('«Il professore la cerca, signor Axel. Nello studio, a nord!»');
      return true;
    }
    if (v === 'mangia') { say(G.flags.chiuso ? 'Non c\'è più niente da mangiare in casa: lo zio ha deciso che si digiuna finché il documento non sarà decifrato.' : 'In qualità di nipote affezionato, ti credi in obbligo di mangiare la parte dello zio e la tua. Coscienziosamente, arrivi fino all\'ultimo gambero.'); return true; }
    if (v === 'apri' && has(o, 'porta', 'uscio')) { return false; }
  } },

studio: { title: 'Gabinetto di studio del professore', arte: 'amburgo', date: '24 maggio 1863',
  desc: function () {
    return 'Il gabinetto dello zio è un vero museo: tutti i campioni del regno minerale vi sono etichettati con ordine perfetto, combustibili, metalli, pietre. Sopra il tavolo, accanto al grande seggiolone di velluto, è aperto un vecchio libro dalla rilegatura di vitello.' +
      (G.flags.zio_fuori ? ' Lo zio non c\'è: è uscito di corsa.' : '') + ' La porta a sud riconduce alla sala da pranzo.';
  },
  npcs: function () { return G.flags.zio_fuori ? [] : ['zio']; },
  scenery: { libro: function () {
      if (!G.flags.perg) {
        say('È l\'Heims-Kringla di Snorre Turleson, il famoso autore islandese del XII secolo: la cronaca dei principi norvegesi, in lingua islandese. Mentre lo sfogli, una pergamena sgualcita scivola fuori dalle pagine e cade sul pavimento!');
        npc('Lo zio si precipita a raccoglierla: «Che cos\'è? Che cos\'è?» Poi la posa sul tavolo, davanti a te, con occhi febbrili.');
        G.flags.perg = true; putRoom('studio', 'pergamena');
      } else say('L\'Heims-Kringla di Snorre Turleson. Lo zio dice che è un capolavoro; tu pensi soprattutto che pesi molto.');
    },
    campioni: 'Pietre, metalli, combustibili: li hai etichettati tu stesso, con Graüben, centinaia di volte.',
    minerali: 'Pietre, metalli, combustibili: li hai etichettati tu stesso, con Graüben, centinaia di volte.',
    caminetto: 'Qualche brace arde ancora nel caminetto.', ritratto: 'Il ritratto di Graüben, appeso al muro. Che nostalgia!' },
  exits: { s: 'sala' },
  onFirst: function () { npc('Lo zio, curvo sul tavolo, ti fa cenno di avvicinarti: «Guarda, Axel! L\'Heims-Kringla! Un tesoro! Esaminalo, esaminalo!»'); },
  act: function (v, o) {
    if ((v === 'parla' || v === 'dai') && has(o, 'zio', 'professore', 'lidenbrock')) {
      if (G.flags.zio_fuori) { say('Lo zio non è qui.'); return true; }
      if (!G.flags.perg) { npc('«Esamina il libro, Axel! Non vedi che meraviglia?»'); return true; }
      if (!G.solved.runico) { startQuiz('runico'); return true; }
      if (G.flags.chiuso) {
        if (!G.flags.letto) { npc('Lo zio non alza nemmeno gli occhi dal foglio.'); return true; }
        say('Non resisti più: la fame, i gemiti di Marta, lo zio che si consuma... «Zio, la chiave del documento... bisogna leggerlo al rovescio!» Gli porgi il foglio.');
        startQuiz(G.solved.sneffels ? 'calende' : 'sneffels'); return true;
      }
      if (G.flags.partenza) { npc('«Che fai ancora qui? Va\' a fare la valigia! Anzi, va\' a salutare Graüben, e poi in carrozza!»'); return true; }
    }
    if (v === 'brucia' && has(o, 'foglio', 'pergamena', 'documento')) {
      if (G.flags.zio_fuori) say('Afferri il foglio e la pergamena, e con mano febbrile stai per gettarli sulle braci... ma ti trattieni. No: non è da te. E poi, che diritto hai di distruggere un documento simile?');
      else npc('Lo zio ti strappa di mano il foglio: «Sei impazzito?»');
      return true;
    }
    if (v === 'esamina' && has(o, 'zio') && !G.flags.zio_fuori) return false;
  } },

strada: { title: 'Königstrasse', arte: 'amburgo', date: '26 maggio 1863',
  desc: function () { return 'Sei nella vecchia Königstrasse. Le case a capanna si specchiano nei canali. A est c\'è l\'uscio di casa Lidenbrock; a nord, lungo l\'Elba, si va verso Altona.' +
    (G.flags.grauben ? ' Davanti alla casa aspetta un\'ampia carrozza, già ingombra dei bagagli dello zio. Il professore, impaziente, è già seduto dentro.' : ''); },
  exits: { e: 'sala', n: 'altona' },
  scenery: { carrozza: function () { say(G.flags.grauben ? 'Una carrozza a due cavalli, diretta alla stazione di Altona. Puoi SALIRE in carrozza.' : 'Non c\'è nessuna carrozza, per ora.'); } },
  act: function (v, o) {
    if ((v === 'sali' || v === 'entra') && has(o, 'carrozza', 'vettura') || (v === 'sali' && !o && G.flags.grauben)) {
      if (!G.flags.grauben) { say('Non c\'è nessuna carrozza.'); return true; }
      say('Ti stringi Graüben fra le braccia, e prendi posto nella carrozza. Marta e la fanciulla vi rivolgono dalla soglia un ultimo saluto; i cavalli partono al galoppo verso Altona.');
      say('Il treno vi porta a Kiel; un battello a vapore, l\'Ellenora, vi fa attraversare il Baltico; e alle dieci del mattino sbarcate a Copenaghen.');
      G.flags.zio = true;
      go('fenice', true); return true;
    }
  } },

altona: { title: 'Strada di Altona, lungo l\'Elba', arte: 'amburgo', date: '25 maggio 1863',
  desc: function () { return 'Segui le rive dell\'Elba fuori dalla città. Il fiume scorre placido, le navi dondolano all\'ancora. A sud si torna verso Königstrasse.' +
    (G.flags.grauben ? '' : ' Laggiù, con il suo passo leggero, sta tornando a casa una fanciulla bionda: è Graüben!'); },
  npcs: function () { return ['grauben']; },
  exits: { s: function () {
    if (!G.flags.grauben) { say('Non puoi andartene senza aver parlato con Graüben.'); return null; }
    return 'strada'; } },
  act: function (v, o) {
    if (v === 'parla' && has(o, 'grauben', 'ragazza')) {
      if (!G.solved.grauben) { startQuiz('grauben'); return true; }
      npc('«Va\', Axel. Ti aspetterò.»'); return true;
    }
  } },

/* ============================ COPENAGHEN ============================ */
fenice: { title: 'Albergo della Fenice, Copenaghen', arte: 'copenaghen', date: 'giugno 1863', checkpoint: true,
  desc: function () { return 'Una stanza dell\'albergo della Fenice, in Bred-Gade. Dalla finestra si vedono i tetti di Copenaghen. A sud si scende verso il porto; a est svetta il campanile della chiesa di Vor-Frelsers.'; },
  exits: { s: 'porto_cph', e: 'chiesa' },
  onFirst: function () {
    npc('Lo zio si stropiccia le mani: «Il signor Thomson, del Museo, ci ha trovato un passaggio: la goletta danese Valkyrie salpa per Reykjawik fra pochi giorni! Ma prima, Axel, faremo una lezione d\'abisso. Ho visto un campanile qui vicino, con una scala esterna fino alla cima. Andiamo!»');
  },
  act: function (v, o) {
    if (v === 'parla' && has(o, 'zio')) { npc(G.flags.vertigine ? '«Ora sei pronto! Al porto, alla Valkyrie!»' : '«Al campanile, a est! Bisogna avvezzarti alle vertigini: dove andiamo, l\'abisso sarà sotto i nostri piedi!»'); return true; }
  } },

chiesa: { title: 'Chiesa di Vor-Frelsers', arte: 'copenaghen', date: 'giugno 1863',
  desc: function () { return 'Ai piedi della chiesa di Vor-Frelsers, nel quartiere di Christianshavn. Il campanile è altissimo: una scala esterna si avvolge a spirale attorno alla guglia, sempre più stretta, fino a una palla di rame. Nessuna ringhiera, solo una fragile balaustra. A ovest si torna all\'albergo.'; },
  scenery: { campanile: 'Trecento piedi d\'altezza, e una scala esterna che si attorciglia come un cavatappi verso il cielo.', scala: 'Una scala a chiocciola, esterna, che sale fino alla palla di rame. Tremi solo a guardarla.' },
  exits: { o: 'fenice', su: 'cima' },
  act: function (v, o) { if (v === 'sali' && (!o || has(o, 'scala', 'campanile', 'torre'))) { go('su'); return true; } } },

cima: { title: 'In cima al campanile', arte: 'copenaghen', date: 'giugno 1863',
  desc: function () { return 'Sei aggrappato alla palla di rame, in vetta al campanile. Il vento ti sferza, tutto gira: le case paiono schiacciate in mezzo alla nebbia, le nuvole corrono sopra di te. Lontano scintilla lo stretto del Sund, punteggiato di vele; verso nord, la costa della Svezia e il castello di Elseneur. Si scende soltanto in giù.'; },
  exits: { giu: function () { if (!G.solved.elseneur) { npc('Lo zio ti trattiene per il collo: «Non ancora! Guarda, guarda bene laggiù!»'); startQuiz('elseneur'); return null; } return 'chiesa'; } },
  onEnter: function () { if (!G.solved.elseneur) startQuiz('elseneur'); },
  act: function (v, o) { if (v === 'scendi') { go('giu'); return true; } } },

porto_cph: { title: 'Porto di Copenaghen', arte: 'copenaghen', date: 'giugno 1863',
  desc: function () { return 'Sulle banchine del porto, fregate e bastimenti dormono sotto le loro coperture rosse. All\'ancora c\'è la Valkyrie, una piccola goletta danese: trasporterà a Reykjawik carbone, stoviglie, vesti di lana e un carico di frumento. A nord si torna all\'albergo.'; },
  npcs: function () { return ['capitano']; },
  scenery: { valkyrie: 'Una brava veliera, la Valkyrie. Cinque uomini d\'equipaggio, tutti danesi. Puoi SALIRE a bordo.', goletta: 'Una brava veliera, la Valkyrie. Puoi SALIRE a bordo.', nave: 'La Valkyrie. Puoi SALIRE a bordo.' },
  exits: { n: 'fenice' },
  act: function (v, o) {
    if (v === 'parla' && has(o, 'capitano')) { npc('Il capitano Bjarne si limita a dire: «Si parte con la marea. Salite pure, se siete pronti.»'); return true; }
    if ((v === 'sali' || v === 'entra') && (!o || has(o, 'nave', 'valkyrie', 'goletta', 'bordo'))) {
      if (!G.flags.vertigine) { npc('Lo zio ti afferra per la manica: «Un momento! Prima la lezione di vertigine, al campanile di Vor-Frelsers!»'); return true; }
      say('La Valkyrie spiega le vele e si caccia nello stretto. Il viaggio non offre incidenti: tu sopporti bene il mare, mentre lo zio, a suo gran dispetto, non cessa un istante d\'essere ammalato. Il giorno 11 avvistate il capo Portland; il 13 la goletta getta l\'ancora nella baia di Reykjawik.');
      G.flags.zio = true; go('reykjavik', true); return true;
    }
  } },

/* ============================ ISLANDA ============================ */
reykjavik: { title: 'Reykjawik', arte: 'islanda', date: '13 giugno 1863', checkpoint: true,
  desc: function () { return 'La capitale dell\'Islanda: due strade soltanto. Lungo la spiaggia, capanne di legno a travi rosse; sulla riva gli abitanti seccano e salano merluzzi. L\'aria sa di sale, di pesce e del fumo dei focolari, dove si brucia il surtarbrandur, il legno fossile che gli Islandesi cavano dalle torbiere. A nord c\'è la casa del signor Fridriksson, che vi ospita; a est comincia la pista per la penisola dello Sneffels.'; },
  scenery: { merluzzi: 'Il principale oggetto d\'esportazione dell\'isola. Ce ne sono a montagne.', capanne: 'Capanne di legno, coi tetti di zolle erbose: d\'estate vi si falcia il fieno sopra!' },
  exits: { n: 'casa_frid', e: function () {
    var manca = [];
    if (!G.flags.hans) manca.push('una guida');
    ['lampada', 'piccone', 'borraccia', 'cotone'].forEach(function (x) { if (!hasItem(x)) manca.push(ITEMS[x].name.replace(/^(un|una|il|la) /, '')); });
    if (manca.length) { npc('Lo zio ti ferma: «Non si parte senza tutto il necessario! Manca ancora: ' + manca.join(', ') + '. È tutto in casa di Fridriksson, a nord.»'); return null; }
    say('Il 16 giugno la carovana si mette in cammino: tre cavalli e due di soma. Hans procede davanti, con passo regolare, senza fretta. Attraversate pianure di lava, torbiere, fiumi gelati.');
    return 'fiordo'; } } },

casa_frid: { title: 'Casa del signor Fridriksson', arte: 'islanda', date: '14 giugno 1863',
  desc: function () { return 'La casa del signor Fridriksson: tre camere, una biblioteca, il vostro bagaglio ammonticchiato in un angolo. Le casse dell\'equipaggiamento sono aperte. A sud si torna in strada.'; },
  npcs: function () { var l = ['fridriksson']; if (G.flags.fr_info && !G.flags.hans) l.push('hans'); return l; },
  scenery: { casse: function () {
      var l = ['lampada', 'piccone', 'borraccia', 'cotone'].filter(function (x) { return itemHere(x); });
      say('Corde, scale di corda, un termometro, un manometro, un cronometro, due carabine, viveri per sei mesi...' + (l.length ? ' E poi, da prendere: ' + l.map(function (x) { return ITEMS[x].name; }).join(', ') + '.' : ' Il resto lo hai già preso tu, o lo porta Hans.'));
    },
    equipaggiamento: function () { ROOMS.casa_frid.scenery.casse(); },
    biblioteca: 'Libri islandesi, danesi, latini. Nessuno di Arne Saknussemm.' },
  exits: { s: 'reykjavik' },
  act: function (v, o) {
    if (v === 'parla' && has(o, 'fridriksson', 'ospite')) {
      if (!G.solved.eretico) { startQuiz('eretico'); return true; }
      npc('«La guida vi porterà fino a Stapi, ai piedi dello Sneffels. Buon viaggio scientifico!» Non sospetta nemmeno quanto sarà... profondo.'); return true;
    }
    if (v === 'parla' && has(o, 'hans', 'guida')) {
      if (!G.flags.fr_info) { say('Non c\'è nessuna guida, per ora. Forse il signor Fridriksson ne conosce una.'); return true; }
      if (!G.solved.paga) { startQuiz('paga'); return true; }
    }
  } },

fiordo: { title: 'Hvalfjörd, presso Gardär', arte: 'islanda', date: '17 giugno 1863',
  desc: function () { return 'La pista si interrompe sulla riva d\'un fiordo profondo: l\'Hvalfjörd. L\'acqua è larga, e i cavalli si rifiutano di entrarvi. ' + (G.flags.marea ? 'La marea è giusta: la chiatta è accostata alla riva. Si può proseguire verso est.' : 'Hans indica l\'acqua e dice soltanto: «Färja.»') + ' A ovest la pista ritorna verso Reykjawik.'; },
  scenery: { chiatta: function () { say(G.flags.marea ? 'Una larga chiatta, pronta a traghettarvi.' : 'Laggiù, ormeggiata all\'altra riva, c\'è una chiatta. Il traghetto però parte solo con la marea giusta.'); }, acqua: 'L\'acqua del fiordo: la marea sta salendo.' },
  exits: { o: 'reykjavik', e: function () {
    if (!G.flags.marea) { npc('Lo zio sferza il cavallo, che si impunta. Hans gli tocca la spalla: «Färja.» Bisogna aspettare la marea.'); return null; }
    say('La chiatta vi traghetta. Poi, per giorni, galoppate in un paese sempre più desolato: lebbrosi che si allontanano come spettri, laghi neri, fumarole e sorgenti bollenti che zampillano dal suolo: gli Islandesi le chiamano geysir, cioè «furore». Il sabato 20 giugno arrivate a Büdir, e il 21 a Stapi, ai piedi del vulcano.');
    return 'stapi'; } },
  act: function (v) { if (v === 'aspetta') { if (!G.flags.marea) { say('Il tempo passa... L\'acqua sale lentamente. Dopo un\'ora Hans si alza: la marea è giusta, e la chiatta è accostata alla riva.'); G.flags.marea = true; } else say('Il tempo passa.'); return true; } } },

stapi: { title: 'Stapi, casa del rettore', arte: 'islanda', date: '21 giugno 1863', checkpoint: true,
  desc: function () { return 'Stapi: una trentina di capanne di lava, in fondo a un piccolo fiordo chiuso da una muraglia di basalto. Siete ospiti del rettore, che è insieme ferraio, pescatore e prete. Sopra le case incombe la massa dello Sneffels, con la vetta coperta di neve. In su si sale verso le pendici.'; },
  npcs: function () { return ['rettore']; },
  scenery: { basalto: 'Colonne di basalto, regolari come le canne d\'un organo. Lo zio ne è entusiasta.', sneffels: 'Il vulcano, alto cinquemila piedi, con due picchi sulla vetta. Da qualche parte lassù c\'è la porta del centro della Terra.' },
  exits: { su: function () {
    if (!G.flags.pagato) { npc('Hans non si muove. Tende la mano e dice: «Lördag.» Ieri era sabato, e Hans aspetta ancora la sua paga settimanale.'); return null; }
    say('Alle nove del mattino del 23 giugno partite. Il rettore vi presenta un conto formidabile; lo zio paga senza mercanteggiare: chi parte per il centro della Terra non lesina qualche risdallero.');
    return 'pendici'; } },
  act: function (v, o) {
    if ((v === 'paga' && has(o, 'hans', 'guida')) || (v === 'paga' && !o) || (v === 'dai' && has(o, 'risdaller', 'monete', 'soldi', 'denaro', 'paga'))) {
      if (!hasItem('risdalleri')) { say('Non hai più denaro.'); return true; }
      drop('risdalleri'); G.flags.pagato = true; G.score += 5;
      say('Dai a Hans i suoi tre risdalleri. Lui li conta, li ripone, e dice: «Forüt!» Avanti! (+5 punti)'); return true;
    }
    if (v === 'paga' && has(o, 'rettore')) { npc('Il rettore sorride avidamente. Il conto lo pagherà lo zio, alla partenza.'); return true; }
    if (v === 'parla' && has(o, 'rettore')) { npc('Il rettore borbotta qualcosa in islandese e torna alla sua incudine.'); return true; }
  } },

pendici: { title: 'Pendici dello Sneffels', arte: 'islanda', date: '23 giugno 1863',
  desc: function () { return 'Vi arrampicate su un pendio di pietre senza cemento, che franano sotto i piedi. Ora il cammino è ripidissimo. Ma laggiù, sulla pianura, un\'immensa colonna di pomice polverizzata, sabbia e polvere si leva turbinando come una tromba, e il vento la spinge verso di voi! Hans si mette a girare di sbieco attorno al cono, verso est, facendo cenno di seguirlo.'; },
  scenery: { tromba: 'Una tromba di pietra pomice: gli Islandesi la chiamano «mistour». Se vi raggiunge, vi stritolerà.', colonna: 'Una tromba di pietra pomice che avanza verso di voi.' },
  exits: { su: function () { morte('Ti ostini a salire dritto verso la vetta. La tromba di pomice si rovescia contro la montagna e ti avvolge, ti solleva, ti scaraventa giù per il pendio come un fuscello.'); return null; },
    e: function () { say('Segui Hans girando attorno al cono. Pochi istanti dopo la tromba si abbatte proprio dove eravate, e la montagna trema. Salvi! Altre cinque ore di salita, e alle undici di sera giungete in vetta.'); return 'vetta'; },
    giu: 'stapi' },
  act: function (v, o) { if (v === 'segui' && has(o, 'hans', 'guida')) { go('e'); return true; } } },

vetta: { title: 'Vetta dello Sneffels', arte: 'islanda', date: '24 giugno 1863',
  desc: function () { return 'Siete sulla vetta dello Sneffels, a cinquemila piedi sul mare. Lo spettacolo è sublime: vallate, ghiacciai, il mare sconfinato, e laggiù, a nord, la Groenlandia nascosta nelle brume. Ecco i due picchi della cima; fra di essi si apre il cratere, un cono rovesciato di mezza lega di circonferenza. Si scende in giù, nel cratere.'; },
  scenery: { picco: 'Il picco occidentale: lo Scartaris.', scartaris: 'Lo Scartaris, l\'ago del quadrante solare di Saknussemm.', cratere: 'Un imbuto profondo duemila piedi.' },
  onEnter: function () { if (!G.solved.scartaris) startQuiz('scartaris'); },
  exits: { giu: function () { if (!G.solved.scartaris) { startQuiz('scartaris'); return null; } return 'cratere'; } },
  act: function (v, o) { if (v === 'scendi') { go('giu'); return true; } } },

cratere: { title: 'Fondo del cratere', arte: 'islanda', date: '25 giugno 1863', checkpoint: true,
  desc: function () {
    var t = 'Sei nel fondo del cratere. Vi si aprono tre bocche, ciascuna larga un centinaio di piedi: una a sinistra, una centrale e una a destra. Da esse, un tempo, lo Sneffels cacciava lave e vapori. Sulla roccia, in caratteri runici mezzo corrosi, è inciso un nome: Arne Saknussemm! ';
    var d = G.flags.giorno || 25;
    if (d < 28) t += 'Il cielo è coperto: nessuna ombra si disegna sul fondo. Lo zio è furioso. Se il sole non appare prima delle calende di luglio, bisognerà rimandare tutto d\'un anno.';
    else if (!G.flags.ombra) t += 'È domenica 28 giugno: il sole è tornato! L\'ombra dello Scartaris si allunga sul fondo del cratere e gira lentamente con il sole, avvicinandosi alle bocche.';
    else t += 'È mezzodì. L\'ombra dello Scartaris, ora più breve, lambisce dolcemente l\'orlo della bocca CENTRALE!';
    return t;
  },
  scenery: { bocca: 'Tre bocche: sinistra, centrale, destra. Puoi ENTRARE in una di esse, ma solo una è quella di Saknussemm.', bocche: 'Tre bocche: sinistra, centrale, destra.', ombra: function () { say(G.flags.ombra ? 'L\'ombra tocca la bocca centrale.' : 'Non c\'è ancora nessuna ombra utile.'); }, nome: 'ARNE SAKNUSSEMM, in caratteri runici. Lo zio quasi sviene dalla gioia.', cielo: 'Nuvole, nuvole e ancora nuvole.' },
  exits: { su: 'vetta', giu: function () { say('In quale bocca? Sinistra, centrale o destra? (es. ENTRA BOCCA CENTRALE)'); return null; } },
  act: function (v, o) {
    if (v === 'aspetta') {
      var d = G.flags.giorno || 25;
      if (d < 27) { G.flags.giorno = d + 1; say('Il tempo passa... Passa un\'intera giornata: ' + (d + 1) + ' giugno. Il cielo resta coperto. Hans non si muove dal suo posto. Lo zio non ti rivolge la parola.'); }
      else if (d === 27) { G.flags.giorno = 28; say('Il tempo passa... All\'alba di domenica 28 giugno, col cambiamento di luna, si muta il tempo: il sole versa a onde i suoi raggi nel cratere! Ogni pietra allunga la sua ombra. Lo zio gira insieme all\'ombra dello Scartaris.'); }
      else if (!G.flags.ombra) { G.flags.ombra = true; say('Il tempo passa... Al mezzodì, quando è più breve, l\'ombra dello Scartaris viene a lambire l\'orlo della bocca centrale. «È là!» esclama il professore. «È là! Al centro del globo!»'); }
      else say('L\'ombra comincia ad allontanarsi. Lo zio freme: «Che aspetti?»');
      return true;
    }
    if (v === 'entra' || v === 'scendi' || v === 'vai') {
      if (!o) { say('In quale bocca? Sinistra, centrale o destra?'); return true; }
      var c = has(o, 'centr', 'mezzo', 'centro'), lato = has(o, 'sinistr', 'destr');
      if (!c && !lato) return false;
      if (!G.flags.ombra) { npc('Lo zio ti trattiene: «Fermo! Non sappiamo ancora quale sia la via di Saknussemm! Bisogna aspettare l\'ombra!»'); return true; }
      if (lato) { morte('Ti cali nella bocca sbagliata. Il camino si restringe, si attorciglia, si perde nel buio; le corde finiscono. Di te non si saprà mai più nulla.'); return true; }
      say('Hans, impassibile, prende una lunga corda, la raddoppia attorno a un blocco di lava e ne getta i capi nell\'abisso. Ci si cala reggendosi a entrambi i capi, poi si ritira la corda e si ricomincia. Hans dice: «Forüt!» Tu guardi giù: il pozzo non ha fondo. Sono le due del pomeriggio del 28 giugno. Il grande viaggio comincia.');
      say('Dopo dieci ore e mezzo di discesa, giungete in fondo al camino. Sei a 2800 piedi sotto la vetta: a livello del mare.');
      go('camino', true); return true;
    }
  } },

/* ============================ SOTTOTERRA ============================ */
camino: { title: 'Fondo del camino', arte: 'abisso', date: '29 giugno 1863', checkpoint: true,
  desc: function () { return 'Siete in fondo al camino dello Sneffels. In alto, lontanissimo, un disco di cielo; un raggio di luce arriva fin quaggiù. Davanti a voi si apre, in discesa, una galleria buia: la via presa dalla lava nell\'eruzione del 1229. Più avanti la luce del sole non arriverà.' + (G.flags.luce ? ' La tua lampada è accesa.' : ' Lo zio ti ricorda di ACCENDERE la lampada.'); },
  exits: { giu: 'lava', su: function () { say('Risalire? Lo zio non lo permetterebbe mai.'); return null; } },
  act: function (v, o) { if (v === 'vai' && has(o, 'galleria')) { go('giu'); return true; } } },

lava: { title: 'Galleria di lava', arte: 'abisso', date: '29 giugno 1863', dark: true,
  desc: function () { return 'La galleria scende dolcemente come un piano inclinato. Le pareti sono tappezzate da un intonaco di lava lucente che riflette la luce elettrica centuplicandola: è come camminare in un lampadario di cristallo. Il termometro sale appena. «Facilis descensus Averni», cita lo zio. Si scende in giù; in su si torna al camino.'; },
  scenery: { pareti: 'Lava vitrificata, stalattiti di lava, cristalli d\'ogni colore.', lava: 'Lava vitrificata, lucida come smalto.' },
  exits: { giu: function () { say('Camminate per ore, sempre in discesa. Alle otto di sera del 30 giugno la galleria si divide in due.'); return 'bivio'; }, su: 'camino' } },

bivio: { title: 'Il bivio', arte: 'abisso', date: '30 giugno 1863', dark: true,
  desc: function () { return 'La galleria si biforca: due strade buie si aprono davanti a voi, una verso est e una verso ovest. Saknussemm non ha lasciato nessun segno. In su si risale verso la galleria di lava.' + (G.flags.vicolo ? ' Il tunnel di est, ormai lo sapete, non porta da nessuna parte.' : ' Lo zio indica senza esitare il tunnel di est.'); },
  exits: { e: function () { if (G.flags.vicolo) { npc('Lo zio scuote il capo: «Mai più!»'); return null; } return 'carbone'; },
    o: function () {
      if (!G.flags.vicolo) { npc('Lo zio ti afferra per un braccio: «Di qua, Axel! Il tunnel di est! Sono certo che è quello giusto!» Il professore non ammette discussioni.'); return null; }
      return 'granito'; },
    su: 'lava' } },

carbone: { title: 'Galleria del carbon fossile', arte: 'abisso', date: '2 luglio 1863', dark: true,
  desc: function () { return 'La galleria non scende più: corre orizzontale, poi risale perfino! Le pareti non sono più di lava ma di calcare, di schisto, e poi di carbon fossile. Nei marmi si vedono impronte di animali primitivi: trilobiti, felci, pesci. Lo zio finge di non vedere. Si va a est; a ovest si torna al bivio.'; },
  scenery: { trilobiti: 'Trilobiti: crostacei dell\'era primaria. «Siamo saliti di epoca, zio, non discesi!» gli dici. Lui tace.', fossili: 'Felci, trilobiti, conchiglie simili al cloporto. La vita è apparsa: siete negli strati del periodo di transizione.', carbone: 'Un\'intera miniera di carbon fossile, formata da foreste sepolte in età remotissime.' },
  exits: { e: 'vicolo', o: 'bivio' } },

vicolo: { title: 'Vicolo cieco', arte: 'abisso', date: '3 luglio 1863', dark: true,
  desc: function () { return 'Una muraglia di roccia chiude la galleria: vicolo cieco! E la borraccia è vuota. Lo zio guarda la parete a lungo, poi dice piano: «Mi sono ingannato. Bisogna tornare al bivio.» A ovest si torna indietro.'; },
  onEnter: function () { if (!G.flags.vicolo) { G.flags.vicolo = true; G.flags.sete = true; say('L\'ultima goccia d\'acqua è finita stasera. Ti rimane solo il ginepro, che brucia la gola.', 'bad'); } },
  exits: { o: function () {
    say('Il ritorno è un supplizio. Tre giorni senza acqua, lungo le gallerie interminabili. Al bivio ti abbatti al suolo, mezzo morto. Lo zio si china su di te e ti accosta alle labbra la sua borraccia: «Bevi!» Aveva conservato un ultimo sorso, per te. Piangi di riconoscenza.');
    return 'bivio'; } } },

granito: { title: 'Galleria di granito', arte: 'abisso', date: '8 luglio 1863', dark: true,
  desc: function () { return 'Il tunnel di ovest scende ripido nel granito, la roccia primitiva. La luce fa scintillare il mica, il feldspato, il quarzo, come in un diamante cavo. ' + (G.flags.acqua ? 'Dallo squarcio nella parete sgorga l\'acqua dell\'Hans-Bach, che scorre giù per la galleria. In giù si segue il ruscello.' : 'Ma la sete vi uccide. Hans si è fermato e tiene l\'orecchio appoggiato alla parete di destra, immobile.') + ' A est si torna al bivio.'; },
  scenery: { parete: function () { say(G.flags.acqua ? 'La parete squarciata, da cui esce l\'acqua.' : 'Una parete di granito. Hans vi tiene appoggiato l\'orecchio. Che cosa sente?'); }, granito: 'Mica, feldspato, quarzo: la roccia per eccellenza.' },
  exits: { e: 'bivio', giu: function () { if (!G.flags.acqua) { say('Senza acqua non fareste cento passi. Dovete trovarne qui, o morire.'); return null; } if (!G.solved.hansbach) { startQuiz('hansbach'); return null; } return 'ruscello'; } },
  act: function (v, o) {
    if (v === 'ascolta') { say(G.flags.acqua ? 'Il gorgoglio allegro dell\'Hans-Bach.' : 'Appoggi l\'orecchio al granito... Un mormorio sordo, lontano: «Watten!» dice Hans. È acqua! Un torrente scorre dietro la parete!'); G.flags.ascoltato = true; return true; }
    if (v === 'parla' && has(o, 'hans')) { npc(G.flags.acqua ? 'Hans beve in silenzio.' : 'Hans ti indica la parete: «Watten.»'); return true; }
    if (v === 'scava' || (v === 'usa' && has(o, 'piccone'))) {
      if (G.flags.acqua) { say('Non serve più.'); return true; }
      if (!G.flags.ascoltato) { say('Colpire la roccia a caso? Prima cerca di capire che cosa sente Hans.'); return true; }
      if (!hasItem('piccone')) { say('Ti servirebbe un piccone.'); return true; }
      say('Hans prende il piccone e attacca la roccia a due piedi da terra. Un\'ora di lavoro, un\'ora e mezza... Il piccone affonda: un getto d\'acqua irrompe con violenza e investe Hans, che grida di dolore. L\'acqua è bollente! Ma raffreddandosi è buona, ferruginosa, deliziosa.');
      G.flags.acqua = true; startQuiz('hansbach'); return true;
    }
    if (v === 'bevi') { if (G.flags.acqua) { say('Bevi a lunghi sorsi. Che voluttà!'); if (!G.solved.hansbach) startQuiz('hansbach'); } else say('Non c\'è una goccia d\'acqua.'); return true; }
    if (v === 'riempi') { say(G.flags.acqua ? 'Riempi la borraccia.' : 'Riempirla di che?'); return true; }
  } },

ruscello: { title: 'Lungo l\'Hans-Bach', arte: 'abisso', date: '7 agosto 1863', dark: true,
  desc: function () { return 'Per settimane seguite l\'Hans-Bach, che scende docile lungo le gallerie: spirali, pozzi, scale naturali. Ormai siete a trenta leghe sotto terra, sotto l\'oceano Atlantico. Oggi tu cammini davanti, distratto, studiando gli strati di granito. In giù la galleria prosegue.'; },
  exits: { giu: function () {
    say('Cammini, cammini, assorto nei tuoi pensieri... D\'improvviso ti volti. Nessuno! Chiami: silenzio. Ti chini a bagnare la fronte nell\'Hans-Bach... ma il ruscello non c\'è più. Sotto i tuoi piedi, granito asciutto.');
    G.flags.solo = true; return 'smarrito'; },
    su: 'granito' } },

smarrito: { title: 'Una galleria sconosciuta', arte: 'abisso', date: '7 agosto 1863', dark: true,
  desc: function () { return 'Sei solo. Perduto. Chissà dove la galleria si è biforcata, e l\'Hans-Bach se n\'è andato coi tuoi compagni per un altro pendio. Ti resta la lampada e un po\' di viveri. Le gallerie si diramano in tutte le direzioni: nord, sud, est, ovest, in su, in giù.'; },
  onFirst: function () { say('Sei solo a più di trenta leghe sotto la superficie del globo. Il terrore ti assale.', 'bad'); },
  exits: (function () { var f = function () {
      say('Corri come un insensato, urtando le pareti, cadendo, rialzandoti. A un tratto, il terreno ti manca: cadi, batti la testa... e la lampada si spezza! La luce si spegne. Tenebre assolute.');
      G.flags.luce = false; drop('lampada');
      say('Fra le tenebre più nere, ti trascini fino a una parete e vi appoggi la fronte, disperato.');
      return 'buio'; };
    return { n: f, s: f, e: f, o: f, su: f, giu: f, avanti: f }; })(),
  act: function (v) { if (v === 'grida') { say('La tua voce si perde fra le gallerie. Nessuna risposta.'); return true; } if (v === 'aspetta') { say('Aspetti... ma nessuno viene. Devi muoverti.'); return true; } } },

buio: { title: 'Tenebre', arte: 'abisso', date: '7 agosto 1863',
  desc: function () { return 'Buio assoluto. Non vedi nemmeno le tue mani. Sei appoggiato a una parete di roccia liscia.' + (G.flags.voci ? ' Attraverso la roccia ti giungono delle voci!' : ''); },
  exits: { giu: function () {
    if (!G.flags.distanza) { say('Muoverti al buio, senza sapere dove? Sarebbe la fine.'); return null; }
    say('Ti trascini, scivoli lungo una galleria ripidissima... la pendenza diventa spaventosa, rotoli, cadi in un vuoto, urti con la testa una roccia aguzza. Perdi i sensi.');
    G.flags.solo = false; return 'grotta'; } },
  act: function (v, o) {
    if (v === 'ascolta') {
      if (!G.flags.voci) { say('Silenzio... poi, tendendo l\'orecchio contro la roccia, odi delle parole indistinte, lontane, come un mormorio. Voci umane! Le parole «förlorad»... È la voce di Hans! E quella dello zio!'); G.flags.voci = true; }
      else say('Voci lontane, che sembrano arrivare attraverso la roccia.'); return true;
    }
    if (v === 'grida' || v === 'parla') {
      if (!G.flags.voci) { say('Gridi nel buio. Nulla. Forse, prima, dovresti ASCOLTARE.'); return true; }
      if (G.flags.distanza) { npc('«Scendi, Axel! Scendi!»'); return true; }
      say('Gridi con tutte le tue forze: «Zio Lidenbrock!» Passano secondi lunghissimi... Poi: «Axel, Axel, sei tu?» È lui! Il fenomeno è di acustica: la galleria conduce i suoni come un filo conduce l\'elettricità.');
      startQuiz('distanza'); return true;
    }
    if (v === 'accendi') { say('La lampada si è spezzata nella caduta.'); return true; }
  } },

grotta: { title: 'Una grotta luminosa', arte: 'mare', date: '9 agosto 1863', checkpoint: true,
  desc: function () { return 'Ti risvegli in una grotta, coricato su coperte, con la testa fasciata. Una luce strana, diffusa, entra dall\'apertura; si sente un mormorio d\'onde e un sospiro di vento. Onde? Vento? A quaranta leghe sotto terra?! A ovest l\'apertura dà all\'esterno.'; },
  onFirst: function () {
    npc('«Vive! Vive!» grida lo zio, e ti abbraccia piangendo. «Ah, fanciullo mio, quanto ti ho pianto!» Hans, quasi sorridendo, dice: «Godt dag.» Sei salvo, fra le braccia dei tuoi compagni.');
    say('(La tua lampada è perduta, ma laggiù, a quanto pare, non ve ne sarà bisogno.)', 'sys');
  },
  exits: { o: 'spiaggia', fuori: 'spiaggia' },
  act: function (v, o) { if (v === 'parla' && has(o, 'zio')) { npc('«Esci pure, Axel, ma con prudenza. Vedrai una cosa che non crederai!»'); return true; } } },

spiaggia: { title: 'Riva del mare Lidenbrock', arte: 'mare', date: '10 agosto 1863',
  desc: function () { return 'Un mare! Un mare immenso, sotterraneo, che si perde a vista d\'occhio. Le onde si frangono su una spiaggia di sabbia dorata, sparsa di conchiglie primitive. Sopra di voi, a migliaia di piedi, una volta di nubi brilla d\'una luce elettrica, fredda, senza ombre, come un\'aurora boreale perenne. A nord si vede una strana foresta; a est un promontorio chiude un piccolo porto naturale; a sud c\'è la grotta.'; },
  scenery: { mare: 'Il mare Lidenbrock: lo zio lo ha battezzato col suo nome. Di acqua salata, come il nostro oceano.', luce: 'Un fenomeno elettrico: la luce non riscalda e non getta ombre.', conchiglie: 'Conchiglie del periodo di transizione.' },
  exits: { n: 'funghi', e: 'porto_g', s: 'grotta', dentro: 'grotta' } },

funghi: { title: 'La foresta dei funghi', arte: 'mare', date: '10 agosto 1863',
  desc: function () { return 'Una foresta di alberi bianchi, alti quaranta piedi, dalle cime a ombrello... non sono alberi: sono funghi! Funghi giganti, a migliaia, sotto i quali regna un\'oscurità completa. Più in là, licopodi e felci arboree grandi come i nostri pini. A terra giacciono ossa enormi. A sud si torna alla spiaggia.'; },
  scenery: { funghi: 'Funghi bianchi, a cappello, alti trenta o quaranta piedi.', ossa: 'Lo zio le chiama per nome: «La mascella del mastodonte! I molari del dinoterio! Il femore del megaterio! Un serraglio di bestie antidiluviane!»', licopodi: 'Le umili piante dei nostri giardini, che qui sono alberi.' },
  exits: { s: 'spiaggia' } },

porto_g: { title: 'Il porticciolo naturale', arte: 'mare', date: '12 agosto 1863',
  desc: function () { return 'Un piccolo porto naturale, chiuso fra le rocce. ' + (G.solved.nome_porto && G.solved.surtarbrandur ? 'La zattera è pronta, ormeggiata: dieci piedi per cinque, con un albero e una vela. Si può SALIRE a bordo.' : 'Hans sta costruendo una zattera con travi di legno scuro, mezzo pietrificato, legandole con forti corde.') + ' A ovest si torna alla spiaggia.'; },
  scenery: { legno: function () { if (!G.solved.surtarbrandur) startQuiz('surtarbrandur'); else say('Surtarbrandur: legno fossile.'); },
    zattera: function () { if (!G.solved.surtarbrandur) startQuiz('surtarbrandur'); else if (!G.solved.nome_porto) startQuiz('nome_porto'); else say('Solida e leggera, la zattera di surtarbrandur. Si può SALIRE.'); },
    travi: function () { ROOMS.porto_g.scenery.legno(); } },
  exits: { o: 'spiaggia' },
  act: function (v, o) {
    if (v === 'parla' && has(o, 'zio')) { if (!G.solved.surtarbrandur) npc('«Guarda che legno usa Hans! Esaminalo!»'); else if (!G.solved.nome_porto) startQuiz('nome_porto'); else npc('«A bordo, a bordo!»'); return true; }
    if (v === 'parla' && has(o, 'hans')) { npc('Hans continua a legare le travi, senza alzare lo sguardo.'); return true; }
    if ((v === 'sali' || v === 'entra') && (!o || has(o, 'zattera', 'bordo'))) {
      if (!G.solved.surtarbrandur) { startQuiz('surtarbrandur'); return true; }
      if (!G.solved.nome_porto) { startQuiz('nome_porto'); return true; }
      say('Il 13 agosto, di buon mattino, Hans issa la vela. La zattera lascia il porto Graüben e prende il largo, verso sud-est. Ben presto la costa scompare.');
      go('mare1', true); return true;
    }
  } },

mare1: { title: 'In mare aperto', arte: 'mare', date: '14 agosto 1863',
  desc: function () { return 'La zattera corre spinta dal vento di nord-ovest. Intorno, fuchi lunghi tre o quattromila piedi si snodano come serpenti. Nulla all\'orizzonte. Hans è al timone; ha attaccato una lenza a un pezzo di carne e l\'ha gettata in acqua. Puoi PESCARE, o proseguire AVANTI.'; },
  scenery: { lenza: 'Una lenza con un amo improvvisato. Si tende...', fuchi: 'Alghe gigantesche, nastri interminabili.' },
  exits: { avanti: function () { if (!G.solved.cieco) { say('La lenza di Hans si tende di colpo: qualcosa ha abboccato! Forse dovresti PESCARE.'); return null; } say('Navigate per giorni. Lo zio getta lo scandaglio con una sbarra di ferro in cima: duecento tese di corda, e non tocca il fondo.'); return 'mare2'; } },
  act: function (v) { if (v === 'pesca' || v === 'prendi' && false) { if (!G.solved.cieco) startQuiz('cieco'); else say('Ne avete pescati abbastanza.'); return true; } } },

mare2: { title: 'Il mare profondo', arte: 'mare', date: '17 agosto 1863',
  desc: function () { return 'Mare deserto, luce implacabile. Hans ha appena ritirato lo scandaglio: la sbarra di ferro all\'estremità porta impronte profonde, come se fosse stata stretta fra due mascelle! L\'oceano è ricco di vita... e di pericoli. Si prosegue AVANTI.'; },
  scenery: { sbarra: 'Hans la mostra e dice: «Tänder!» Denti! Il ferro è morso fortemente. Quale mostro può avere una tale mascella?', scandaglio: 'La sbarra di ferro reca impronte di denti. «Tänder!» dice Hans.' },
  exits: { avanti: function () { say('Il 18 agosto, la zattera è sollevata da un urto spaventoso! Hans indica un punto nero che si alza e si abbassa sulle onde: «Der nere!» Laggiù!'); return 'mare3'; } } },

mare3: { title: 'Il duello dei mostri', arte: 'mare', date: '18 agosto 1863', checkpoint: true,
  desc: function () { return G.solved.ictiosauro ? 'Il mare torna calmo. Il cadavere del plesiosauro galleggia lontano. Si prosegue AVANTI.' : 'Intorno alla zattera ribolle il mare: due rettili mostruosi, avanzi degli oceani primitivi, si stanno affrontando! Le carabine sono a portata di mano.'; },
  onEnter: function () { if (!G.solved.ictiosauro) startQuiz('ictiosauro'); },
  exits: { avanti: function () { if (!G.solved.ictiosauro) { startQuiz('ictiosauro'); return null; } say('Il 20 agosto, all\'orizzonte, una colonna d\'acqua s\'innalza nell\'aria. Hans dice: «Holme!» Un\'isola!'); return 'isola'; } },
  act: function (v) {
    if (v === 'spara') { morte('Spari al mostro più vicino. La palla rimbalza sulle sue scaglie... e il bestione si volta. Una mascella di centottantadue denti spezza la zattera come un fuscello.'); return true; }
    if (v === 'fuggi') { say('Fuggire? Quei rettili sono più veloci d\'una locomotiva. Meglio restare immobili.'); return true; }
  } },

isola: { title: 'Isola del geyser', arte: 'mare', date: '20 agosto 1863', checkpoint: true,
  desc: function () { return 'Un isolotto di granito misto a tufo siliceo, che trema sotto i piedi come la caldaia d\'una macchina a vapore. Al centro, un geyser enorme lancia la sua colonna d\'acqua bollente a cinquecento piedi d\'altezza, fra detonazioni sorde. La zattera è accostata alla riva: si riparte AVANTI.'; },
  scenery: { geyser: function () { if (!G.solved.geysir) startQuiz('geysir'); else say('Il geyser ruggisce. Furore, davvero.'); }, getto: function () { ROOMS.isola.scenery.geyser(); }, acqua: 'Acqua bollente: non toccarla!' },
  exits: { avanti: function () {
    if (!G.solved.geysir) { npc('Lo zio non si stacca dal geyser: «Un momento! Guarda, Axel, guarda questo spettacolo!»'); startQuiz('geysir'); return null; }
    say('Il 21 agosto il geyser scompare all\'orizzonte. Il vento rinfresca; il cielo si carica di nuvole pesanti come balle di cotone. Silenzio generale. Poi, d\'improvviso, si scatena l\'uragano! Lo zio non vuole ammainare la vela: la zattera vola sulle onde. Sulla cima dell\'albero brilla un fuoco di sant\'Elmo...');
    return 'tempesta'; } },
  act: function (v, o) { if (v === 'parla' && has(o, 'zio')) { if (!G.solved.geysir) startQuiz('geysir'); else npc('«L\'isola Axel! Bel nome, eh?»'); return true; } } },

tempesta: { title: 'La tempesta', arte: 'mare', date: '24 agosto 1863', checkpoint: true,
  desc: function () { return 'L\'uragano infuria da tre giorni. Lampi come serpenti, tuoni senza tregua, onde mostruose. La zattera è una pagliuzza nel caos.'; },
  onEnter: function () { if (!G.solved.tempesta) startQuiz('tempesta'); },
  act: function () { if (!G.solved.tempesta) { startQuiz('tempesta'); return true; } } },

riva: { title: 'Una costa sconosciuta', arte: 'mare', date: '26 agosto 1863', checkpoint: true,
  desc: function () { return 'Siete naufragati su una costa rocciosa. Hans ha salvato quasi tutto: viveri, la bussola, il cronometro, i fucili, perfino il cotone fulminante. Ha già cominciato a riparare la zattera. Lo zio vuole ripartire subito per raggiungere la costa sud, dove crede di essere arrivato. Verso ovest si stende una pianura biancheggiante.'; },
  onFirst: function () { give('bussola'); npc('Lo zio ti mette in mano la bussola: «Tieni, Axel. Verifica dove siamo!»'); },
  exits: { o: 'ossario' },
  act: function (v, o) { if (v === 'parla' && has(o, 'zio')) { npc('«Abbiamo attraversato il mare! Siamo sulla costa sud! O no?» Consulta la bussola, Axel.'); return true; } } },

ossario: { title: 'La pianura delle ossa', arte: 'mare', date: '26 agosto 1863',
  desc: function () { return 'Una pianura immensa coperta di ossa: un vero cimitero dove le generazioni di due millenni confondono la loro polvere. Mastodonti, megateri, mammut... E lì, fra le ossa, una forma umana. A nord si scorge una foresta; a est si torna alla costa.'; },
  scenery: { ossa: 'Ossa di mastodonti a migliaia. «Gigantosteologia!» esclama lo zio.', corpo: function () { if (!G.solved.quaternario) startQuiz('quaternario'); else say('L\'uomo fossile: pelle tesa come una pergamena, denti intatti, capelli abbondanti.'); }, uomo: function () { ROOMS.ossario.scenery.corpo(); }, cadavere: function () { ROOMS.ossario.scenery.corpo(); }, forma: function () { ROOMS.ossario.scenery.corpo(); } },
  exits: { e: 'riva', n: function () { if (!G.solved.quaternario) { npc('Lo zio si è inginocchiato accanto alla forma umana: «Axel! Vieni a vedere!»'); startQuiz('quaternario'); return null; } return 'foresta'; } } },

foresta: { title: 'La foresta terziaria', arte: 'mare', date: '26 agosto 1863', checkpoint: true,
  desc: function () { return 'Una foresta dell\'epoca terziaria: palme, pini, tassi, cipressi, tuie, intrecciati di liane. E sotto gli alberi... forme immense si muovono: un branco di mastodonti vivi, che strappano rami con le proboscidi! Fra di loro, appoggiato a un albero, un essere umano alto più di dodici piedi li sorveglia: il loro pastore! Non vi ha ancora visti. A sud, alle vostre spalle, c\'è la via verso il mare.'; },
  npcs: function () { return ['pastore']; },
  scenery: { mastodonti: 'Mastodonti vivi, enormi, con zanne d\'avorio.' },
  exits: { n: function () { morte('Avanzi verso il gigante. Lui si volta, solleva il ramo enorme che gli fa da bastone... Il mondo diventa nero.'); return null; },
    s: function () { say('Afferri lo zio per il braccio e lo trascini via: «Venite! Venite!» Per la prima volta in vita sua, il professore si lascia guidare. Fuggite senza voltarvi, fino al mare.'); return 'capo'; } },
  act: function (v, o) {
    if (v === 'fuggi' || v === 'nascondi') { go('s'); return true; }
    if (v === 'parla' && has(o, 'pastore', 'gigante')) { go('n'); return true; }
    if (v === 'spara') { morte('Il colpo rimbomba fra gli alberi. Il pastore e il suo branco si voltano tutti insieme. Una carica di mastodonti non lascia superstiti.'); return true; }
    if (v === 'grida') { morte('Il tuo grido risuona sotto gli alberi. Il gigante ti scorge, e in tre passi ti è addosso.'); return true; }
  } },

capo: { title: 'Capo Saknussemm', arte: 'mare', date: '27 agosto 1863', checkpoint: true,
  desc: function () { return 'Siete tornati sulla riva del mare, presso un promontorio di granito. Hans vi ha raggiunti con la zattera riparata, che ora è ormeggiata qui accanto. Nella parete si apre l\'imbocco d\'una galleria buia' + (G.solved.iniziali ? ', ostruita da un enorme masso. Sulla roccia, due lettere incise: A. S.' : '. Sulla roccia, sopra l\'imbocco, ti pare di scorgere dei segni incisi.') + (G.flags.mina ? ' Il cotone fulminante è nel buco, e la miccia arriva fino alla zattera.' : ''); },
  onFirst: function () { say('Sulla sabbia, ai tuoi piedi, qualcosa luccica: un vecchio pugnale!'); },
  scenery: { segni: function () { if (!G.solved.iniziali) startQuiz('iniziali'); else say('A. S., incise con la punta d\'un pugnale... forse proprio quello!'); },
    roccia: function () { ROOMS.capo.scenery.segni(); }, lettere: function () { ROOMS.capo.scenery.segni(); }, iniziali: function () { ROOMS.capo.scenery.segni(); }, parete: function () { ROOMS.capo.scenery.segni(); },
    masso: 'Un masso enorme, caduto per qualche scossa del terreno. Nessuna forza umana lo smuoverà... ma forse una forza chimica sì.',
    galleria: function () { say(G.solved.iniziali ? 'La galleria di Saknussemm, ostruita dal masso.' : 'Un\'apertura buia. Sopra, dei segni incisi.'); },
    zattera: 'La zattera riparata da Hans. Puoi SALIRE a bordo.' },
  exits: {},
  act: function (v, o) {
    if ((v === 'metti' || v === 'usa') && has(o, 'cotone', 'fulmicotone', 'esplosivo', 'mina', 'polvere')) {
      if (!G.solved.iniziali) { say('Far saltare una roccia a caso? Prima guarda bene dove sei.'); return true; }
      if (!hasItem('cotone')) { say('Non hai l\'esplosivo.'); return true; }
      drop('cotone'); G.flags.mina = true;
      say('Hans scava col piccone un buco nella roccia, accanto al masso. Tu vi sistemi il cotone fulminante e svolgi una lunga miccia fin sulla zattera. Ora basta una scintilla. Lo zio: «Sulla zattera, presto! E di lì accenderemo!»'); return true;
    }
    if (v === 'accendi' && has(o, 'miccia', 'mina', 'cotone')) {
      if (!G.flags.mina) { say('Non c\'è nessuna miccia da accendere.'); return true; }
      morte('Accendi la miccia stando a terra, accanto al masso. L\'esplosione ti travolge con una pioggia di granito.'); return true;
    }
    if ((v === 'sali' || v === 'entra') && (!o || has(o, 'zattera', 'bordo'))) {
      if (!G.flags.mina) { npc('Lo zio: «Non partiremo prima d\'aver aperto la via di Saknussemm!»'); return true; }
      say('Salite sulla zattera e vi allontanate dalla riva, tenendo in mano il capo della miccia.'); go('zattera_mina', true); return true;
    }
    if (v === 'scava' || (v === 'spingi')) { say('Hans e lo zio spingono il masso con tutte le forze. Non si muove d\'un pollice.'); return true; }
    if (v === 'entra' && has(o, 'galleria')) { say('Il masso ostruisce il passaggio.'); return true; }
  } },

zattera_mina: { title: 'Sulla zattera, al largo del capo', arte: 'mare', date: '27 agosto 1863',
  desc: function () { return 'La zattera dondola a qualche tesa dalla riva. Tieni fra le dita il capo della miccia. Lo zio ha l\'orologio in mano, Hans è al timone. Non resta che ACCENDERE LA MICCIA.'; },
  act: function (v, o) {
    if (v === 'accendi' && (!o || has(o, 'miccia', 'mina', 'cotone'))) {
      say('Accosti la lanterna alla miccia. Una scintilla, un sibilo... Un minuto... Le rocce si sollevano come una cortina! Un abisso si apre nella riva, il mare si trasforma in una cascata vertiginosa, e la zattera, trascinata, precipita nel baratro!');
      go('abisso', true); return true;
    }
  } },

abisso: { title: 'Nel baratro', arte: 'abisso', date: '27 agosto 1863',
  desc: function () { return 'La zattera è trascinata nel buio da una corrente furiosa, in un pozzo senza fondo. La torcia illumina pareti che sfilano a velocità folle. Avete perso quasi tutto: restano la bussola e il cronometro. Ora la caduta sembra essersi fermata... e poi, anzi, invertita. Non si può che ASPETTARE.'; },
  act: function (v) {
    if (v === 'aspetta') {
      G.cnt.abisso = (G.cnt.abisso || 0) + 1;
      if (G.cnt.abisso === 1) say('Il tempo passa... L\'acqua non scende più: sale! Sale portandovi con sé, in un camino verticale. Il calore aumenta.');
      else startQuiz('eruzione');
      return true;
    }
  } },

stromboli: { title: 'Le pendici d\'un vulcano', arte: 'stromboli', date: '29 agosto 1863',
  desc: function () { return 'Siete distesi sul fianco d\'una montagna, sotto un sole ardente. Sopra di voi, ogni quarto d\'ora, il cratere erutta con fragore. Intorno: ulivi, fichi, viti cariche d\'uva, melagrane. Un mare azzurro circonda l\'isola. Sotto un albero, un ragazzetto vi guarda spaventato.' + (G.flags.stromboli ? ' Laggiù, a sud, si vede un porto di pescatori.' : ''); },
  npcs: function () { return G.flags.stromboli ? [] : ['ragazzo']; },
  scenery: { ulivi: 'Ulivi! Siete nel sud, non nel Nord!', mare: 'Un mare azzurro e tranquillo.', uva: 'Divori un grappolo d\'uva: che delizia, dopo tanti mesi!', fichi: 'Fichi maturi.' },
  onFirst: function () { G.flags.zio = true; G.flags.hans = true; },
  exits: { s: function () { if (!G.flags.stromboli) { say('Prima di tutto bisogna capire dove siete. Parla con il ragazzo.'); return null; }
    say('I pescatori stromboliotti vi accolgono come naufraghi. Il 4 settembre vi imbarcate sul Volturno; tre giorni dopo approdate a Marsiglia, e la sera del 9 settembre siete ad Amburgo.');
    return 'epilogo'; } },
  act: function (v, o) {
    if (v === 'parla' && has(o, 'ragazzo', 'pastorello', 'bambino')) { if (!G.solved.lingua) startQuiz('lingua'); return true; }
    if (v === 'mangia') { say('Divori uva e fichi. Non hai mai mangiato nulla di più buono.'); return true; }
  } },

epilogo: { title: 'Ritorno ad Amburgo', arte: 'amburgo', date: '9 settembre 1863',
  desc: function () { return 'Lo studio dello zio, in Königstrasse. Marta piange di gioia, Graüben ti stringe le mani. Tutta Amburgo festeggia «il grande professore Lidenbrock». Hans, che non ha mai voluto altro che la sua paga, ha accettato di restare qualche giorno prima di tornare in Islanda. Sul tavolo c\'è la vecchia bussola, l\'unico strumento sopravvissuto.'; },
  init: function () { putRoom('epilogo', 'bussola'); drop('bussola'); G.flags.hans = true; },
  npcs: function () { return ['grauben', 'marta']; },
  act: function (v, o) { if (v === 'parla' && has(o, 'grauben')) { npc('«Ora che sei un eroe, Axel... non c\'è più bisogno di lasciarmi.»'); return true; } }
}
};

function descBussola() {
  if (G.room === 'riva') {
    say('Lo zio prende la bussola, la pone orizzontale e osserva l\'ago. Si arresta... e segna il NORD verso il mare! Dunque, invece di avanzare verso sud, la tempesta vi ha riportati sulla costa settentrionale. Siete tornati indietro! Lo zio impallidisce, poi la collera lo infiamma: «Non mi arrenderò!»');
    G.flags.bussola = true; return;
  }
  if (G.room === 'epilogo') { startQuiz('bussola'); return; }
  say('L\'ago oscilla e si ferma, ostinato.');
}

/* ---------------------------------------------------------------------
   Movimento e descrizione
   --------------------------------------------------------------------- */
function descrivi(forza) {
  var r = room();
  say(r.title, 'title');
  if (r.dark && !G.flags.luce) {
    say('È buio pesto. Non vedi nulla, e camminare così è molto pericoloso.');
  } else {
    say(r.desc());
    var it = G.items[G.room] || [];
    if (it.length) say('Vedi qui: ' + it.map(function (x) { return ITEMS[x].name; }).join(', ') + '.');
    var p = presenti().filter(function (x) { return x !== 'pastore'; });
    if (p.length) say('Con te: ' + p.map(function (x) { return NPC[x].name; }).join(', ') + '.', 'npc');
  }
  aggiornaStatus();
}
function go(dirOrRoom, diretto) {
  var dest;
  if (diretto) dest = dirOrRoom;
  else {
    var r = room();
    var ex = r.exits && r.exits[dirOrRoom];
    if (ex === undefined) {
      if (dirOrRoom === 'indietro') { say('Indietro? Non è questa la tua strada.'); return; }
      say(dirOrRoom === 'avanti' ? 'Non puoi proseguire in questo modo.' : 'Non puoi andare da quella parte.'); return;
    }
    if (r.dark && !G.flags.luce && !diretto) {
      G.dark++;
      if (G.dark >= 2) { morte('Avanzi a tentoni nel buio... Il piede non trova più il suolo. Precipiti in un crepaccio senza fondo.'); return; }
      say('Muovi un passo nel buio e per poco non precipiti in un crepaccio! Accendi la lampada, prima che sia troppo tardi.', 'bad'); return;
    }
    dest = typeof ex === 'function' ? ex() : ex;
    if (!dest || G.dead) return;
  }
  G.room = dest; G.dark = 0;
  var nr = room();
  var first = !G.seen[dest]; G.seen[dest] = true;
  if (first && nr.init) nr.init();
  descrivi();
  if (first && nr.onFirst) nr.onFirst();
  if (nr.checkpoint) G.checkpoint = snapshot();
  if (nr.onEnter) nr.onEnter();
}

/* ---------------------------------------------------------------------
   Esecuzione comandi
   --------------------------------------------------------------------- */
function eseguiComando(raw) {
  if (G.over) { say('Il viaggio è compiuto. Scrivi RICOMINCIA per una nuova partita.', 'sys'); if (norm(raw) === 'ricomincia') ricomincia(); return; }
  if (G.dead) { rinasci(); return; }
  if (G.quiz) { var nq = norm(raw); if (nq === 'salva' || nq === 'carica' || nq === 'ricomincia') { /* consentiti */ } else { handleQuiz(raw); fineTurno(false); return; } }

  var n = norm(raw);
  if (!n) { say('Dimmi che cosa vuoi fare.', 'sys'); return; }
  var t = n.split(' ');
  var v0 = t[0];
  var dir = null, verb = null, rest;

  // "vai nord", "vai a nord"
  if (DIRS[v0] && t.length === 1) dir = DIRS[v0];
  else if ((v0 === 'vai' || v0 === 'va' || v0 === 'cammina' || v0 === 'dirigiti' || v0 === 'torna') && t.length >= 2) {
    var tt = t.slice(1).filter(function (x) { return STOP.indexOf(x) === -1 || DIRS[x]; });
    if (tt.length === 1 && DIRS[tt[0]]) dir = DIRS[tt[0]];
  }
  if (v0 === 'giu' && t.length === 1) dir = 'giu';
  if (dir) { G.moves++; go(dir); fineTurno(true); return; }

  verb = VERBI[v0];
  if (!verb) {
    // forse il giocatore ha scritto direttamente una risposta, o una parola sola
    say(['Non capisco quel verbo.', 'Non conosco la parola «' + v0 + '».', 'Lo zio ti guarda perplesso. Prova con un altro verbo (scrivi AIUTO).'][Math.floor(Math.random() * 3)], 'sys');
    return;
  }
  rest = t.slice(1).filter(function (x) { return STOP.indexOf(x) === -1; }).join(' ');
  // "sali" e "scendi" senza oggetto = direzione
  G.moves++;
  esegui(verb, rest, raw);
  fineTurno(true);
}

function esegui(v, o, raw) {
  var r = room();
  // meta-comandi
  switch (v) {
    case 'aiuto': aiuto(); return;
    case 'hint': suggerimento(); return;
    case 'punti': say('Punteggio: ' + G.score + ' su ' + totalePunti() + ' (più qualche premio). Mosse: ' + G.moves + '.'); return;
    case 'salva': salva(); return;
    case 'carica': carica(); return;
    case 'ricomincia': ricomincia(); return;
    case 'ripeti': case 'rinuncia': say('Non c\'è nessuna domanda in sospeso.', 'sys'); return;
    case 'inv':
      if (!G.inv.length) say('Non porti nulla con te.');
      else say('Porti con te: ' + G.inv.map(function (x) { return ITEMS[x].name; }).join(', ') + '.');
      return;
  }
  // azioni specifiche del luogo
  if (r.act) { var h = r.act(v, o, raw); if (h) return; }
  // buio
  var buio = r.dark && !G.flags.luce;

  switch (v) {
    case 'guarda':
      if (o) return esegui('esamina', o, raw);
      descrivi(); return;
    case 'esamina': case 'leggi':
      if (!o) { if (v === 'leggi') say('Leggere che cosa?'); else descrivi(); return; }
      if (buio && !has(o, 'lampada')) { say('Al buio non vedi niente.'); return; }
      if (v === 'leggi' && has(o, 'foglio', 'dettato', 'messaggio', 'crittogramma', 'criptogramma', 'lettere') && hasItem('foglio')) { leggiFoglio(); return; }
      var id = findItem(o);
      if (id) { var d = ITEMS[id].desc; if (typeof d === 'function') d(); else say(d); return; }
      var np = findNpc(o);
      if (np) { say(NPC[np].desc); return; }
      if (r.scenery) for (var k in r.scenery) if (has(o, k)) { var s = r.scenery[k]; if (typeof s === 'function') s(); else say(s); return; }
      if (has(o, 'intorno', 'luogo', 'stanza')) { descrivi(); return; }
      say('Non vedi nulla di speciale.'); return;
    case 'prendi':
      if (!o) { say('Prendere che cosa?'); return; }
      if (has(o, 'tutto')) { var all = (G.items[G.room] || []).slice(); if (!all.length) { say('Non c\'è niente da prendere.'); return; } all.forEach(function (x) { takeRoom(G.room, x); give(x); say('Prendi ' + ITEMS[x].name + '.'); }); return; }
      var pid = findItem(o, 'room');
      if (pid) { takeRoom(G.room, pid); give(pid); say('Prendi ' + ITEMS[pid].name + '.'); if (pid === 'pergamena') npc('Lo zio te la strappa quasi di mano: «Attento! È preziosissima!»'); return; }
      if (findItem(o, 'inv')) { say('Ce l\'hai già.'); return; }
      if (findNpc(o)) { say('Non è il caso.'); return; }
      if (r.scenery && Object.keys(r.scenery).some(function (k) { return has(o, k); })) { say('Non puoi portarlo con te.'); return; }
      say('Non c\'è niente del genere, qui.'); return;
    case 'lascia':
      var lid = findItem(o, 'inv');
      if (!lid) { say('Non hai niente del genere.'); return; }
      if (lid === 'foglio' || lid === 'lampada' || lid === 'bussola' || lid === 'cotone' || lid === 'piccone' || lid === 'borraccia') { say('Meglio di no: potrebbe servirti.'); return; }
      drop(lid); putRoom(G.room, lid); say('Lasci ' + ITEMS[lid].name + '.'); return;
    case 'parla':
      if (!o) { var pp = presenti(); if (pp.length === 1) return esegui('parla', NPC[pp[0]].nouns[0], raw); say('Con chi vuoi parlare?'); return; }
      var who = findNpc(o);
      if (!who) { say('Non c\'è nessuno con quel nome, qui.'); return; }
      if (who === 'zio') { npc(['«Avanti, Axel! Il tempo è prezioso!»', '«La scienza, ragazzo mio, è fatta di errori, ma di errori che è bene commettere, perché conducono a poco a poco alla verità!»', '«Non c\'è da esitare, Axel. Avanti!»'][G.moves % 3]); return; }
      if (who === 'hans') { npc(['Hans risponde: «Forüt.»', 'Hans si stringe nelle spalle.', 'Hans dice: «Ja.»'][G.moves % 3]); return; }
      npc(NPC[who].idle[0] || 'Nessuna risposta.'); return;
    case 'dai':
      var did = findItem(o, 'inv'); var dw = findNpc(o);
      if (!did) { say('Non hai niente del genere.'); return; }
      if (!dw) { say('A chi?'); return; }
      say(NPC[dw].name.charAt(0).toUpperCase() + NPC[dw].name.slice(1) + ' non sa che farsene.'); return;
    case 'paga': say('Non devi pagare nessuno, adesso.'); return;
    case 'accendi':
      if (has(o, 'lampada', 'luce', 'apparecchio', 'ruhmkorff', 'lanterna') || !o) {
        if (!hasItem('lampada')) { say('Non hai una lampada.'); return; }
        if (G.flags.luce) { say('È già accesa.'); return; }
        G.flags.luce = true; G.dark = 0;
        say('Stabilisci il contatto: la serpentina si illumina d\'una luce bianca e fredda. Ora vedi intorno a te.');
        if (r.dark) descrivi();
        return;
      }
      say('Non puoi accendere quello.'); return;
    case 'spegni':
      if (G.flags.luce) { G.flags.luce = false; say('Spegni la lampada.' + (r.dark ? ' Il buio ti inghiotte.' : '')); } else say('Non c\'è niente di acceso.'); return;
    case 'usa':
      if (has(o, 'lampada')) return esegui('accendi', 'lampada', raw);
      if (has(o, 'bussola')) return esegui('esamina', 'bussola', raw);
      if (has(o, 'borraccia')) return esegui('bevi', '', raw);
      say('Non vedi come usarlo qui.'); return;
    case 'ascolta': say(r.dark && !G.flags.luce ? 'Solo il battito del tuo cuore.' : 'Non senti nulla di particolare.'); return;
    case 'scava': say('Non serve a niente colpire qui.'); return;
    case 'aspetta': say(['Il tempo passa...', 'Il tempo passa... Lo zio sbuffa d\'impazienza.', 'Aspetti. Non succede nulla.'][G.moves % 3]); return;
    case 'segui':
      if (has(o, 'hans')) say(G.flags.hans ? 'Hans ti precede, come sempre, con passo regolare.' : 'Hans non è qui.');
      else if (has(o, 'zio')) say('Lo zio è proprio accanto a te.'); else say('Seguire chi?');
      return;
    case 'sali': go('su'); return;
    case 'scendi': go('giu'); return;
    case 'entra': if (r.exits && r.exits.dentro) go('dentro'); else say('Entrare dove?'); return;
    case 'vai': say('Indica una direzione: nord, sud, est, ovest, su, giù, avanti.'); return;
    case 'bevi':
      if (!hasItem('borraccia')) { say('Non hai niente da bere.'); return; }
      if (G.flags.sete) { say('La borraccia è vuota. Resta solo il ginepro, che brucia la gola.'); return; }
      say('Bevi un sorso d\'acqua. Va meglio.'); return;
    case 'mangia': say('Mangi un po\' di carne secca e di biscotto. Le provviste bastano per mesi.'); return;
    case 'grida': say('La tua voce rimbomba.'); return;
    case 'nascondi': case 'fuggi': say('Non c\'è nessun pericolo da cui fuggire... per ora.'); return;
    case 'spara': say('Le carabine sono per i casi estremi. Questo non lo è.'); return;
    case 'pesca': say('Qui non c\'è nulla da pescare.'); return;
    case 'brucia': say('Meglio non giocare col fuoco.'); return;
    case 'agita':
      if (has(o, 'foglio') && hasItem('foglio') && !G.solved.rovescio) { say('Ti fai vento col foglio. Per un istante, in trasparenza, ne vedi il rovescio... e ti pare di leggere delle parole latine: «craterem», «terrestre»! Ma certo: le lettere sono scritte all\'incontrario!'); return; }
      say('Non succede nulla.'); return;
    case 'apri': say('Non si apre.'); return;
    case 'riempi': say('Non c\'è acqua qui.'); return;
    case 'metti': say('Non vedi dove metterlo.'); return;
  }
  say('Non puoi farlo qui.');
}

function leggiFoglio() {
  if (G.solved.rovescio) { say('Il messaggio di Saknussemm:'); say(DOC_LATINO, 'doc'); say(DOC_TRAD, 'doc'); return; }
  say('Sul foglio ci sono le lettere dettate dallo zio, nell\'ordine esatto dei caratteri runici:');
  say(DOC_FOGLIO, 'doc');
  say('Qua e là ti pare di scorgere qualche frammento: «mutabi», «mereta», «nec»... ma il tutto non ha alcun senso. Le lettere ti volteggiano intorno.');
  if (G.flags.zio_fuori || G.room !== 'studio') startQuiz('rovescio');
  else npc('Lo zio ti strappa il foglio: «Dammi qua! Lo decifrerò io!» E te lo restituisce subito dopo, sconfitto.');
}

/* ---------------------------------------------------------------------
   Fine turno: i personaggi agiscono da soli
   --------------------------------------------------------------------- */
function fineTurno(azione) {
  if (G.dead || G.over || G.quiz) { aggiornaStatus(); salvaAuto(); return; }
  if (azione && Math.random() < 0.22) {
    var p = presenti().filter(function (x) { return NPC[x].idle && NPC[x].idle.length; });
    if (p.length && !(room().dark && !G.flags.luce)) {
      var w = p[Math.floor(Math.random() * p.length)];
      var l = NPC[w].idle;
      npc(l[Math.floor(Math.random() * l.length)]);
    }
  }
  aggiornaStatus(); salvaAuto();
}

/* ---------------------------------------------------------------------
   Aiuti, suggerimenti, salvataggi
   --------------------------------------------------------------------- */
function aiuto() {
  say('COMANDI — Scrivi frasi semplici, come nei vecchi giochi d\'avventura:\n' +
    '  Direzioni: N, S, E, O, SU, GIÙ, AVANTI (anche «vai a nord»)\n' +
    '  GUARDA · ESAMINA <cosa> · LEGGI <cosa> · PRENDI <cosa> · LASCIA <cosa> · INVENTARIO (I)\n' +
    '  PARLA <chi> · DAI <cosa> A <chi> · PAGA <chi> · SEGUI <chi>\n' +
    '  ACCENDI · USA · ASCOLTA · SCAVA · BEVI · MANGIA · PESCA · SPARA · FUGGI · GRIDA · METTI · SALI · ENTRA\n' +
    '  ASPETTA (Z): lascia passare il tempo — a volte è proprio ciò che serve!\n' +
    '  SUGGERIMENTO · PUNTEGGIO · SALVA · CARICA · RICOMINCIA\n' +
    'Quando qualcuno ti pone una domanda, scrivi la risposta: per proseguire devi rispondere giusto. Le risposte si trovano nei testi del gioco... e nel romanzo di Verne.', 'sys');
}
var HINTS = {
  sala: function () { return G.flags.chiuso ? (G.flags.letto ? 'Lo zio ha la chiave. Vai nello studio e PARLA ALLO ZIO: digli che cosa hai scoperto.' : 'Leggi il foglio.') : (G.flags.partenza ? 'Esci a ovest: devi salutare Graüben.' : 'Lo zio ti aspetta nello studio, a nord.'); },
  studio: function () { if (!G.flags.perg) return 'ESAMINA IL LIBRO sul tavolo.'; if (!G.solved.runico) return 'ESAMINA LA PERGAMENA, poi PARLA ALLO ZIO.'; if (!G.solved.rovescio) return 'LEGGI IL FOGLIO. Se non capisci, prova ad AGITARE IL FOGLIO.'; if (G.flags.chiuso) return 'PARLA ALLO ZIO.'; return 'Esci: devi salutare Graüben, ad Altona.'; },
  strada: function () { return G.flags.grauben ? 'SALI IN CARROZZA.' : 'Graüben è ad Altona, a nord.'; },
  altona: function () { return 'PARLA CON GRAÜBEN.'; },
  fenice: function () { return G.flags.vertigine ? 'Vai al porto, a sud, e SALI sulla nave.' : 'Vai al campanile, a est, e SALI.'; },
  chiesa: function () { return 'SALI sul campanile.'; },
  cima: function () { return 'Rispondi allo zio, poi scendi (GIÙ).'; },
  porto_cph: function () { return G.flags.vertigine ? 'SALI sulla nave.' : 'Prima la lezione di vertigine al campanile.'; },
  reykjavik: function () { return 'Entra in casa di Fridriksson (N). Poi parti verso est con la guida e l\'equipaggiamento.'; },
  casa_frid: function () { return !G.solved.eretico ? 'PARLA CON FRIDRIKSSON.' : (!G.solved.paga ? 'PARLA CON HANS.' : 'ESAMINA LE CASSE e PRENDI TUTTO ciò che serve.'); },
  fiordo: function () { return 'Hans dice «Färja»: bisogna ASPETTARE la marea.'; },
  stapi: function () { return G.flags.pagato ? 'Sali (SU).' : 'Hans vuole la sua paga: PAGA HANS.'; },
  pendici: function () { return 'Non salire dritto! SEGUI HANS (o vai a est).'; },
  vetta: function () { return 'Rispondi, poi scendi nel cratere.'; },
  cratere: function () { return G.flags.ombra ? 'ENTRA NELLA BOCCA CENTRALE.' : 'ASPETTA, più volte: il sole tornerà.'; },
  camino: function () { return 'ACCENDI LA LAMPADA, poi scendi.'; },
  lava: function () { return 'Scendi (GIÙ).'; },
  bivio: function () { return G.flags.vicolo ? 'Ora prendi il tunnel di ovest.' : 'Lo zio vuole andare a est. Seguilo.'; },
  carbone: function () { return 'Prosegui a est... o torna a ovest.'; },
  vicolo: function () { return 'Torna indietro, a ovest.'; },
  granito: function () { return G.flags.acqua ? 'Scendi lungo il ruscello.' : (G.flags.ascoltato ? 'USA IL PICCONE (o SCAVA).' : 'ASCOLTA, come fa Hans.'); },
  ruscello: function () { return 'Scendi.'; },
  smarrito: function () { return 'Muoviti in una direzione qualsiasi.'; },
  buio: function () { return G.flags.distanza ? 'Scendi (GIÙ).' : (G.flags.voci ? 'GRIDA, o PARLA ALLO ZIO.' : 'ASCOLTA.'); },
  grotta: function () { return 'Esci a ovest.'; },
  spiaggia: function () { return 'Il porto naturale è a est.'; },
  funghi: function () { return 'Torna a sud: il porto è a est della spiaggia.'; },
  porto_g: function () { return 'ESAMINA IL LEGNO, PARLA ALLO ZIO, poi SALI SULLA ZATTERA.'; },
  mare1: function () { return 'PESCA, poi AVANTI.'; },
  mare2: function () { return 'ESAMINA LA SBARRA, poi AVANTI.'; },
  mare3: function () { return 'Non sparare! Rispondi alla domanda, poi AVANTI.'; },
  isola: function () { return 'ESAMINA IL GEYSER, poi AVANTI.'; },
  riva: function () { return 'ESAMINA LA BUSSOLA, poi vai a ovest.'; },
  ossario: function () { return 'ESAMINA IL CORPO, poi vai a nord.'; },
  foresta: function () { return 'Silenzio! FUGGI verso sud.'; },
  capo: function () { return !G.solved.iniziali ? 'ESAMINA I SEGNI sulla roccia.' : (!G.flags.mina ? 'METTI IL COTONE vicino al masso.' : 'SALI SULLA ZATTERA prima di accendere.'); },
  zattera_mina: function () { return 'ACCENDI LA MICCIA.'; },
  abisso: function () { return 'ASPETTA.'; },
  stromboli: function () { return G.flags.stromboli ? 'Vai a sud, al porto.' : 'PARLA CON IL RAGAZZO.'; },
  epilogo: function () { return 'ESAMINA LA BUSSOLA.'; }
};
function suggerimento() {
  if (room().dark && !G.flags.luce) { say('Suggerimento: accendi la lampada!', 'sys'); return; }
  var h = HINTS[G.room]; say('Suggerimento: ' + (h ? h() : 'Guardati intorno.'), 'sys');
}
var KEY = 'viaggio_centro_terra_v1';
function storage() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }
function salva() { var s = storage(); try { s.setItem(KEY + '_man', JSON.stringify(G)); say('Partita salvata.', 'sys'); } catch (e) { say('Impossibile salvare in questo browser.', 'sys'); } }
function carica(silenzioso) {
  var s = storage(), d = null;
  try { d = s && (s.getItem(KEY + '_man') || s.getItem(KEY + '_auto')); } catch (e) { d = null; }
  if (!d) { if (!silenzioso) say('Nessuna partita salvata.', 'sys'); return false; }
  try { G = JSON.parse(d); } catch (e) { say('Salvataggio illeggibile.', 'sys'); return false; }
  say('Partita caricata.', 'sys'); descrivi(); return true;
}
function salvaAuto() { var s = storage(); try { if (s) s.setItem(KEY + '_auto', JSON.stringify(G)); } catch (e) { /* niente */ } }
function ricomincia() {
  var s = storage(); try { if (s) { s.removeItem(KEY + '_auto'); s.removeItem(KEY + '_man'); } } catch (e) { /* niente */ }
  G = nuovoStato();
  if (UI) UI.out.innerHTML = '';
  intro();
}

function fine() {
  G.over = true;
  say('Il professore Lidenbrock diventa un grand\'uomo, e tu il nipote d\'un grand\'uomo: è già qualche cosa. Al Johannaeum lo zio racconta il viaggio davanti a tutta la città; il suo libro è tradotto in ogni lingua; le società scientifiche se lo contendono.');
  say('Hans, malgrado le vostre preghiere, ritorna in Islanda. «Färval», dice semplicemente, e parte per Reykjawik. Non lo dimenticherete mai.');
  say('E Graüben? Graüben non è più la pupilla di tuo zio: è la tua sposa.');
  say('*** IL VIAGGIO È COMPIUTO ***', 'title');
  var tot = totalePunti();
  var tit = G.score >= tot ? 'Degno di Arne Saknussemm!' : G.score >= tot * 0.8 ? 'Geologo insigne' : G.score >= tot * 0.6 ? 'Assistente del professore' : 'Allievo del Johannaeum';
  say('Punteggio finale: ' + G.score + ' su ' + tot + ' — in ' + G.moves + ' mosse. Titolo: ' + tit + '.', 'ok');
  say('Scrivi RICOMINCIA per una nuova partita.', 'sys');
  aggiornaStatus();
}

/* ---------------------------------------------------------------------
   Interfaccia
   --------------------------------------------------------------------- */
function aggiornaStatus() {
  if (!UI) return;
  var r = room();
  UI.place.textContent = r.title;
  UI.date.textContent = r.date || '';
  UI.score.textContent = 'Punti ' + G.score + ' · Mosse ' + G.moves;
  var a = ART[r.arte] || ART.amburgo;
  UI.art.textContent = a.join('\n');
}
function intro() {
  say('VIAGGIO AL CENTRO DELLA TERRA', 'title');
  say('Un\'avventura testuale dal romanzo di Jules Verne.\nTu sei Axel, nipote e assistente del professore Lidenbrock. Amburgo, domenica 24 maggio 1863...', 'sys');
  say('(Scrivi i comandi e premi INVIO. Scrivi AIUTO per l\'elenco dei comandi, SUGGERIMENTO se sei bloccato.)', 'sys');
  G.seen.sala = true; G.checkpoint = snapshot();
  descrivi();
  ROOMS.sala.onFirst();
}

function avvia() {
  G = nuovoStato();
  if (typeof document === 'undefined') return;
  UI = {
    out: document.getElementById('out'), art: document.getElementById('art'),
    place: document.getElementById('st-place'), date: document.getElementById('st-date'),
    score: document.getElementById('st-score'), input: document.getElementById('in')
  };
  var storia = [], pos = 0;
  document.getElementById('cmd').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = UI.input.value; UI.input.value = '';
    if (v.trim()) { storia.push(v); pos = storia.length; }
    say('> ' + v, 'echo');
    eseguiComando(v);
  });
  UI.input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && pos > 0) { pos--; UI.input.value = storia[pos]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { if (pos < storia.length - 1) { pos++; UI.input.value = storia[pos]; } else { pos = storia.length; UI.input.value = ''; } e.preventDefault(); }
  });
  document.getElementById('pad').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    say('> ' + b.dataset.c, 'echo'); eseguiComando(b.dataset.c); UI.input.focus();
  });
  var s = storage(), auto = null;
  try { auto = s && s.getItem(KEY + '_auto'); } catch (e) { auto = null; }
  if (auto) {
    try { G = JSON.parse(auto); } catch (e) { G = nuovoStato(); }
    say('Bentornato, Axel. La tua partita è stata ripresa da dove l\'avevi lasciata. (Scrivi RICOMINCIA per ricominciare da capo.)', 'sys');
    if (G.over) { say('Il viaggio è già compiuto.', 'sys'); aggiornaStatus(); }
    else descrivi();
  } else intro();
  UI.input.focus();
}

/* Esportazione per i test automatici */
var API = { eseguiComando: eseguiComando, out: OUT, stato: function () { return G; },
  reset: function () { G = nuovoStato(); OUT.length = 0; intro(); }, ROOMS: ROOMS, QUIZ: QUIZ, totalePunti: totalePunti,
  setRandom: function (f) { Math.random = f; } };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') { window.VIAGGIO = API; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia(); }
else G = nuovoStato();
})();
