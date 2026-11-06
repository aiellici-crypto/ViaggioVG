# Viaggio al Centro della Terra — avventura testuale

Un'avventura testuale in italiano tratta dal romanzo di Jules Verne (nella traduzione Treves del 1874). Si ispira ai classici giochi a parser degli anni '80, come *The Hobbit* (1982): scrivi i comandi in linguaggio naturale, i compagni di viaggio agiscono anche da soli, e una mossa sbagliata può costarti la vita.

Sei **Axel**, nipote del professore **Otto Lidenbrock**. Dalla pergamena runica di Arne Saknussemm, trovata ad Amburgo, ti spingi fino al cratere dello Sneffels in Islanda. Da lì scendi nelle viscere della Terra insieme alla guida **Hans**, attraversi il mare Lidenbrock e infine vieni sputato fuori dallo Stromboli.

## Come si gioca

Apri `index.html` in un browser qualsiasi. Non serve installare nulla né avere una connessione.

Lungo la strada qualcuno ti farà delle **domande**. Per andare avanti devi rispondere giusto: le risposte sono nascoste nei testi del gioco e nel romanzo. Se rispondi bene al primo colpo prendi più punti. Dopo due errori arriva un indizio.

| Comando | Esempi |
|---|---|
| Direzioni | `n`, `s`, `e`, `o`, `su`, `giù`, `avanti`, `vai a nord` |
| Osservare | `guarda`, `esamina libro`, `leggi foglio` |
| Oggetti | `prendi lampada`, `prendi tutto`, `lascia pugnale`, `inventario` (`i`) |
| Personaggi | `parla zio`, `parla con Hans`, `paga Hans`, `dai risdalleri a Hans`, `segui Hans` |
| Azioni | `accendi lampada`, `ascolta`, `usa piccone`, `pesca`, `fuggi`, `aspetta` (`z`)… |
| Aiuto | `aiuto`, `suggerimento`, `punteggio`, `salva`, `carica`, `ricomincia` |

Quando c'è una domanda aperta puoi scrivere anche `suggerimento`, `ripeti` o `rinuncia`.

La partita viene salvata in automatico nel browser. Se muori ripartirai dall'ultimo punto sicuro.

## Struttura

- `index.html` — la pagina
- `style.css` — l'aspetto retrò, a fosfori ambra
- `game.js` — il parser, i luoghi, i personaggi e i 22 enigmi

Il testo del romanzo usato come fonte (edizione Liber Liber) è di pubblico dominio.
