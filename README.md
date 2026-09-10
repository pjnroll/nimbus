# Nimbus

Scrivania personale per un Technical Cloud Project Manager. Serve a catturare le richieste che arrivano da email o chat, distinguere ciò che **esegui tu** da ciò che **coordini**, e tenere i progetti con il link alla cartella Drive — senza un foglio che dopo due settimane diventa illeggibile.

I dati restano sul browser (localStorage). Non c’è login, né sync con Gmail o Google Drive.

## Cosa fa

- **Oggi**: ritardi, scadenze di oggi, inbox da smistare, persone da sollecitare.
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

Apri [http://127.0.0.1:43123](http://127.0.0.1:43123).

Al primo avvio vedi dati di esempio (progetti Maggioli-like). Puoi ripristinarli dal menu **Ripristina esempio**. Per lavorare sui tuoi dati, elimina le attività di esempio o importa un backup.

## Backup

Dal menu a tre puntini nella barra laterale:

1. **Esporta JSON** — file da tenere in Drive o in locale.
2. **Importa JSON** — ripristina un backup su un altro browser.
3. **Ripristina esempio** — torna ai dati dimostrativi.

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui. Nessun database.
