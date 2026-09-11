# Nimbus

Scrivania personale per un Technical Cloud Project Manager. Serve a catturare le richieste che arrivano da email o chat, distinguere ciò che **esegui tu** da ciò che **coordini**, e tenere i progetti con il link alla cartella Drive — senza un foglio che dopo due settimane diventa illeggibile.

Ogni persona entra con email e password e ha la propria scrivania. I dati stanno in JSON sul server. La sessione dura 24 ore. Non c’è sync con Gmail o Google Drive.

## Cosa fa

- **Oggi**: vista a periodo (oggi, settimana lun–dom, 7 giorni, mese) con attività raggruppate per stato; inbox da smistare.
- **Inbox**: cattura in dieci secondi, poi smisti progetto, tipo e data.
- **Attività**: filtri per stato, tipo (eseguo / coordino) e progetto; lista o bacheca.
- **Progetti**: schede con attività aperte e URL Drive incollato a mano.
- **Backup**: esporta o importa un JSON dal menu in basso a sinistra.

## Avvio in locale

Node.js 20 o successivo.

```bash
npm install
npm run dev
```

Apri [http://127.0.0.1:43123](http://127.0.0.1:43123). Al primo avvio registra un account: se esiste già `data/nimbus.json`, diventa la scrivania di quell’utente. Gli account successivi partono dai dati di esempio.

In sviluppo, se non imposti `NIMBUS_AUTH_SECRET`, viene usato un secret di default. In produzione il secret è obbligatorio.

## Persistenza e autenticazione

Directory di default: `data/` (fuori da git).

- `data/users.json` — account
- `data/stores/<userId>.json` — scrivania di ciascun utente

Per un volume k3s:

```bash
NIMBUS_DATA_DIR=/data
NIMBUS_AUTH_SECRET=una-stringa-lunga-casuale
```

`NIMBUS_DATA_PATH` è ancora letto: la cartella del file diventa `dataDir`.

Per chiudere le nuove registrazioni dopo il setup:

```bash
NIMBUS_ALLOW_REGISTER=false
```

(Il primo account si può comunque creare se non esiste nessuno.)

## Backup

Dal menu a tre puntini nella barra laterale (solo i dati dell’utente collegato):

1. **Esporta JSON** — copia da tenere in Drive o in locale.
2. **Importa JSON** — ripristina un backup sulla tua scrivania.
3. **Ripristina esempio** — torna ai dati dimostrativi.

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui. Nessun database: JSON su disco e cookie di sessione firmati.
