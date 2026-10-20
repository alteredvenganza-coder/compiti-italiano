// Pronuncia: words grouped by the sounds Spanish speakers find hardest in Italian.
// w = word or phrase, es = Spanish meaning, tip = how to say it (shown after listening / when wrong).
window.PRON = [
{ id: "doppie", title: "Doppie", sub: "palla, nonno, sette", tip: "La consonante doppia si tiene un attimo in più, come se facessi una piccola pausa: pal-la, non-no.", words: [
  { w: "palla", es: "pelota", tip: "pal-la: fermati sulla L. «pala» è un'altra parola." },
  { w: "nonno", es: "abuelo", tip: "non-no: la N lunga. «nono» vuol dire noveno." },
  { w: "sette", es: "siete", tip: "set-te: la T si ferma. «sete» è la sed." },
  { w: "cassa", es: "caja", tip: "cas-sa: la S lunga e senza vibrare." },
  { w: "mamma", es: "mamá", tip: "mam-ma: chiudi bene le labbra sulla M doppia." },
  { w: "gatto", es: "gato", tip: "gat-to: la T si sente due volte." },
  { w: "cappello", es: "sombrero", tip: "cap-pel-lo: due doppie, P e L." },
  { w: "anno", es: "año", tip: "an-no: N lunga, non ñ." },
]},
{ id: "cg", title: "C e G", sub: "ciao, chiave, gelato, ghiaccio", tip: "Davanti a E e I: ci = «chi» spagnolo, gi = «yi» forte. Con la H: chi = «qui», ghi = «gui».", words: [
  { w: "ciao", es: "hola", tip: "cia come «cha» spagnolo, morbido." },
  { w: "cena", es: "cena", tip: "ce come «che» spagnolo, mai «se»." },
  { w: "chiave", es: "llave", tip: "chi come «qui»: kià-ve." },
  { w: "gelato", es: "helado", tip: "ge come una «ye» forte, mai come la jota." },
  { w: "giorno", es: "día", tip: "gior come «yor» forte." },
  { w: "spaghetti", es: "espaguetis", tip: "ghe come «gue»: spa-ghet-ti." },
  { w: "ghiaccio", es: "hielo", tip: "ghia come «guia», poi doppia C dolce: ghiàc-cio." },
]},
{ id: "gngli", title: "GN e GLI", sub: "bagno, figlio, famiglia", tip: "GN è la ñ spagnola. GLI è una L morbida con la lingua contro il palato, tipo una «ll» leggera.", words: [
  { w: "bagno", es: "baño", tip: "ba-gno: come baño." },
  { w: "lavagna", es: "pizarra", tip: "la-va-gna: gna come «ña»." },
  { w: "gnocchi", es: "ñoquis", tip: "gno come «ño», poi doppia C dura." },
  { w: "figlio", es: "hijo", tip: "fi-glio: lingua sul palato, non dire «fi-g-lio»." },
  { w: "famiglia", es: "familia", tip: "fa-mi-glia: GLI morbida, non «familia»." },
  { w: "aglio", es: "ajo", tip: "a-glio: la G non si sente da sola." },
  { w: "meglio", es: "mejor", tip: "me-glio: GLI morbida." },
]},
{ id: "sc", title: "SC", sub: "scuola, scienze, pesce", tip: "SC davanti a E e I si dice «sh». Davanti a A, O, U o con la H resta «sc» duro.", words: [
  { w: "scuola", es: "escuela", tip: "scuo-la: senza la E davanti, non «escuola»." },
  { w: "scienze", es: "ciencias", tip: "scien-ze: «shen», poi Z come «ts»." },
  { w: "pesce", es: "pescado", tip: "pe-sce: «pesh-e»." },
  { w: "uscita", es: "salida", tip: "u-sci-ta: «u-shi-ta»." },
  { w: "schiena", es: "espalda", tip: "schie-na: «skie», con la H è duro." },
]},
{ id: "z", title: "Z", sub: "zio, zaino, grazie", tip: "La Z italiana non è la Z spagnola: è «ts» (grazie) o «ds» (zaino).", words: [
  { w: "zio", es: "tío", tip: "zio come «dsio» o «tsio»." },
  { w: "zaino", es: "mochila", tip: "zài-no: «dsàino»." },
  { w: "ragazza", es: "chica", tip: "ra-gaz-za: «ts» lungo." },
  { w: "piazza", es: "plaza", tip: "piaz-za: «ts» lungo, non «piassa»." },
  { w: "grazie", es: "gracias", tip: "gra-zie: «grà-tsie»." },
]},
{ id: "vb", title: "V e B", sub: "vino, bene, verde", tip: "In italiano V e B sono diverse: la V si fa con i denti sul labbro di sotto.", words: [
  { w: "vino", es: "vino", tip: "V con i denti sul labbro, non «bino»." },
  { w: "bene", es: "bien", tip: "B con le labbra chiuse." },
  { w: "verde", es: "verde", tip: "V con i denti: «verde», non «berde»." },
  { w: "bevo", es: "bebo", tip: "be-vo: prima B (labbra), poi V (denti)." },
]},
{ id: "frasi", title: "Frasi per la scuola", sub: "Buongiorno, posso andare in bagno?", tip: "Le frasi lunghe: prima ascolta lenta, poi ripeti a pezzi.", words: [
  { w: "Buongiorno, professoressa", es: "Buenos días, profesora", tip: "buon-gior-no: GIOR come «yor»." },
  { w: "Posso andare in bagno?", es: "¿Puedo ir al baño?", tip: "pos-so: S doppia. bagno: gn come ñ." },
  { w: "Non ho capito", es: "No he entendido", tip: "ho: la H non si legge." },
  { w: "Ho dodici anni", es: "Tengo doce años", tip: "do-di-ci: ci come «chi»." },
  { w: "Come si dice?", es: "¿Cómo se dice?", tip: "di-ce: ce come «che»." },
]},
];
