# Nimbus

Scrivania personale per un Technical Cloud Project Manager. Serve a catturare le richieste che arrivano da email o chat, distinguere ciò che **esegui tu** da ciò che **coordini**, e tenere i progetti con il link alla cartella Drive — senza un foglio che dopo due settimane diventa illeggibile.

Ogni persona entra con **Google**. Il primo accesso crea la scrivania; gli account sono isolati. I dati stanno in JSON sul server. La sessione dura 24 ore. Non c’è sync con Gmail o Google Drive: gli URL Drive si incollano a mano.

## Cosa fa

- **Oggi**: vista a periodo (oggi, settimana lun–dom, 7 giorni, mese) con attività raggruppate per stato; inbox da smistare.
- **Inbox**: cattura in dieci secondi, poi smisti progetto, tipo e data.
- **Attività**: filtri per stato, tipo (eseguo / coordino) e progetto; lista o bacheca.
- **Progetti**: schede con attività aperte e URL Drive incollato a mano.
- **Backup**: esporta o importa un JSON dal menu in basso a sinistra.

## Avvio in locale

Node.js 20 o successivo. Serve un client OAuth Google (tipo **Applicazione Web**) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

- Origini JavaScript autorizzate: `http://127.0.0.1:43123`
- URI di reindirizzamento autorizzati: `http://127.0.0.1:43123/api/auth/google/callback`

Finché l’app OAuth non è verificata, Google la limita ai tester che aggiungi alla schermata di consenso.

```bash
export GOOGLE_CLIENT_ID=....apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=...
npm install
npm run dev
```

Apri [http://127.0.0.1:43123](http://127.0.0.1:43123) e usa **Continua con Google**. Il primo account, se esiste già `data/nimbus.json`, ne eredita i dati. Gli account successivi partono dai dati di esempio. Un account locale precedente con la stessa email Google viene collegato al primo accesso.

Google accetta HTTP **solo** su `127.0.0.1` / `localhost`. Un IP di rete o Tailscale (`http://100.x.x.x:43123`) viene rifiutato (`invalid_request`).

### Dominio proprio (es. nimbus.piergionni.it)

Un record A verso l’IP Tailscale (`100.x`) **non** basta: il browser usa la porta 80/443, Nimbus ascolta `43123`, `100.x` è raggiungibile solo da nodi Tailscale, e Google pretenderà **HTTPS** (Let’s Encrypt su un IP Tailscale non funziona con la verifica HTTP).

La via semplice è un **tunnel Cloudflare** sulla macchina dove gira Nimbus. Il CNAME verso il tunnel lo crea Cloudflare **dopo** che `piergionni.it` usa i nameserver Cloudflare. Non serve (e di solito non basta) un CNAME dal registrar verso `100.x` o verso `*.cfargotunnel.com`.

**Nameserver, non glue.** Cloudflare ti dà due *nomi* tipo `ada.ns.cloudflare.com` e `bob.ns.cloudflare.com`. Nel registrar cerca la schermata **«nameserver del dominio» / «DNS di terze parti» / «custom nameserver»** e metti solo quei due host. Non è la schermata «crea nameserver» / «host» / «glue», quella chiede anche gli IP perché sta registrando `ns1.piergionni.it` — è un’altra cosa. Se il campo IP è obbligatorio, sei nel form sbagliato.

Prima di cambiare i NS, copia su Cloudflare i record che hai già (MX della posta, `www`, ecc.): da quel momento il DNS autoritativo è Cloudflare.

Poi, sulla macchina di Nimbus:

1. Togli il record A `nimbus` → `100.x`.
2. Installa `cloudflared`, poi:

```bash
cloudflared tunnel login
cloudflared tunnel create nimbus
cloudflared tunnel route dns nimbus nimbus.piergionni.it
```

3. File `~/.cloudflared/config.yml` (adatta `tunnel` e `credentials-file` a quelli creati al passo 2):

```yaml
tunnel: <id-del-tunnel>
credentials-file: /home/TUO_UTENTE/.cloudflared/<id-del-tunnel>.json
ingress:
  - hostname: nimbus.piergionni.it
    service: http://127.0.0.1:43123
  - service: http_status:404
```

4. `cloudflared tunnel run nimbus` (Nimbus deve già essere in ascolto su `127.0.0.1:43123`).
5. Nel client OAuth Google, origini e redirect:

   - `https://nimbus.piergionni.it`
   - `https://nimbus.piergionni.it/api/auth/google/callback`

6. Avvia Nimbus **con** (prima di `npm run dev` / `npm start`):

```bash
export NIMBUS_APP_URL=https://nimbus.piergionni.it
export GOOGLE_CLIENT_ID=...
export GOOGLE_CLIENT_SECRET=...
```

Apri `https://nimbus.piergionni.it` (senza porta). Funziona da qualsiasi rete, non solo Tailscale.

In sviluppo, se non imposti `NIMBUS_AUTH_SECRET`, viene usato un secret di default. In produzione il secret è obbligatorio, insieme a `NIMBUS_APP_URL`.

## Persistenza e autenticazione

Directory di default: `data/` (fuori da git).

- `data/users.json` — account (`id`, email, `googleSub`)
- `data/stores/<userId>.json` — scrivania di ciascun utente
- `data/files/<userId>/<activityId>/` — binari degli allegati delle attività

L’export JSON include solo i metadati degli allegati (nome, dimensione), non i file.

Per un volume k3s / Cloud Run:

```bash
NIMBUS_DATA_DIR=/data
NIMBUS_AUTH_SECRET=una-stringa-lunga-casuale
NIMBUS_APP_URL=https://nimbus.example.com
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

Nel client OAuth di produzione: origine e redirect `https://nimbus.example.com` e `https://nimbus.example.com/api/auth/google/callback`.

`NIMBUS_DATA_PATH` è ancora letto: la cartella del file diventa `dataDir`.

Per chiudere i nuovi account dopo il setup (chi è già in `users.json` continua ad accedere):

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

Next.js, TypeScript, Tailwind CSS, shadcn/ui. Nessun database: JSON su disco, OAuth Google e cookie di sessione firmati.
