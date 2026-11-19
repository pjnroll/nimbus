# Nimbus

Scrivania personale per un Technical Cloud Project Manager. Serve a catturare le richieste che arrivano da email o chat, distinguere ciò che **esegui tu** da ciò che **coordini**, e tenere i progetti con il link alla cartella Drive — senza un foglio che dopo due settimane diventa illeggibile.

Gira in locale, senza servizi cloud: si entra con **email e password**, i dati stanno in JSON sul disco della macchina, la sessione dura 24 ore. Il login Google e l’import da Google Calendar restano disponibili come opzione. Non c’è sync con Gmail o Google Drive: gli URL Drive si incollano a mano.

## Cosa fa

- **Oggi**: vista a periodo (oggi, settimana lun–dom, 7 giorni, mese) con attività raggruppate per stato; inbox da smistare.
- **Inbox**: cattura in dieci secondi, poi smisti progetto, tipo e data.
- **Attività**: filtri per stato, tipo (eseguo / coordino) e progetto; lista o bacheca.
- **Progetti**: schede con attività aperte e URL Drive incollato a mano.
- **Backup**: esporta o importa un JSON dal menu in basso a sinistra.

## Avvio in locale

Node.js 22 o successivo (`npm run set-password` usa `node --env-file-if-exists`).

1. Crea `.env.local` nella cartella del progetto (è fuori da git):

```bash
NIMBUS_AUTH_SECRET=una-stringa-lunga-casuale
```

Per generarne uno: `openssl rand -hex 32`. Se lo cambi, le sessioni aperte scadono.

2. Installa e imposta la password del tuo account:

```bash
npm install
npm run set-password
```

Lo script elenca gli account presenti in `data/users.json`, chiede l’email e due volte la password (almeno 8 caratteri). Se l’email non esiste, crea l’account. Si può rilanciare in qualsiasi momento per cambiare password, anche a server avviato.

3. Compila e avvia:

```bash
npm run build
npm start
```

Nimbus ascolta su tutte le interfacce, porta `43123`:

- da questa macchina: [http://127.0.0.1:43123](http://127.0.0.1:43123)
- dalla rete di casa: `http://<IP-della-macchina>:43123` (lo vedi con `ip -4 addr`)
- da fuori casa, via Tailscale: `http://100.x.x.x:43123` (il traffico è già cifrato dalla VPN)

Dopo 5 password sbagliate in 15 minuti lo stesso indirizzo viene bloccato per un quarto d’ora.

Per lo sviluppo c’è `npm run dev`, sulla stessa porta.

### Avvio permanente (systemd)

Il servizio di esempio è in `deploy/nimbus.service` e presuppone il progetto in `~/Documenti/dev/nimbus` (adatta `WorkingDirectory` se serve).

```bash
mkdir -p ~/.config/systemd/user
cp deploy/nimbus.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now nimbus
loginctl enable-linger "$USER"   # parte all'accensione, anche senza login grafico
```

Log: `journalctl --user -u nimbus -f`. Dopo un aggiornamento del codice: `npm run build && systemctl --user restart nimbus`.

### Firewall

Se usi `ufw`, apri la porta solo verso LAN e Tailscale (adatta la sottorete di casa):

```bash
sudo ufw allow from 192.168.1.0/24 to any port 43123 proto tcp
sudo ufw allow in on tailscale0 to any port 43123 proto tcp
```

## Installare su un altro server

Il codice arriva da git; `data/` e `.env.local` no, vanno portati o ricreati a mano. Gli esempi usano `~/nimbus` sul server.

1. **Prerequisiti sul server**: Node.js 22 o successivo installato da pacchetto (per esempio NodeSource), così `npm` sta in `/usr/bin/npm` come si aspetta il servizio; `git` con accesso al repository; Tailscale se lo vuoi raggiungere da fuori casa.

2. **Codice**:

```bash
git clone git@github.com:pjnroll/nimbus.git ~/nimbus
cd ~/nimbus
npm ci
```

3. **Dati**, dalla macchina dove gira oggi Nimbus (fermalo prima, se è attivo):

```bash
rsync -a ~/Documenti/dev/nimbus/data/ UTENTE@SERVER:~/nimbus/data/
```

`-a` conserva i permessi privati dei file. Da qui in poi la copia valida è quella sul server: non usare più Nimbus sulla macchina di partenza, altrimenti le due copie divergono.

4. **Segreto e password**, sul server e dopo aver copiato `data/`:

```bash
cd ~/nimbus
echo "NIMBUS_AUTH_SECRET=$(openssl rand -hex 32)" > .env.local
chmod 600 .env.local
npm run set-password
```

5. **Build e prova**: `npm run build && npm start`, poi apri `http://IP-DEL-SERVER:43123` (o `http://100.x.x.x:43123` via Tailscale) da un altro dispositivo e chiudi con `Ctrl+C`.

6. **Servizio permanente**, con `WorkingDirectory` adattata al percorso del server:

```bash
mkdir -p ~/.config/systemd/user
sed 's#%h/Documenti/dev/nimbus#%h/nimbus#' deploy/nimbus.service > ~/.config/systemd/user/nimbus.service
systemctl --user daemon-reload
systemctl --user enable --now nimbus
sudo loginctl enable-linger "$USER"
```

7. **Firewall**: come nella sezione [Firewall](#firewall).

8. **Aggiornamenti**:

```bash
cd ~/nimbus && git pull && npm ci && npm run build && systemctl --user restart nimbus
```

Sul server `data/` è l’unica copia: fai un backup periodico, per esempio con `rsync -a UTENTE@SERVER:~/nimbus/data/ ~/backup/nimbus-data/` da un’altra macchina.

## Persistenza e autenticazione

Directory di default: `data/` (fuori da git). Si cambia con `NIMBUS_DATA_DIR`.

- `data/users.json` — account (`id`, email, hash della password, eventuale `googleSub`)
- `data/stores/<userId>.json` — scrivania di ciascun utente
- `data/files/<userId>/<activityId>/` — binari degli allegati delle attività

Le password sono salvate solo come hash `scrypt`. L’export JSON include solo i metadati degli allegati (nome, dimensione), non i file.

`NIMBUS_DATA_PATH` è ancora letto: la cartella del file diventa `dataDir`.

In sviluppo, se non imposti `NIMBUS_AUTH_SECRET`, viene usato un secret casuale e le sessioni scadono al riavvio. Con `npm start` il secret è obbligatorio.

## Backup

Dal menu a tre puntini nella barra laterale (solo i dati dell’utente collegato):

1. **Esporta JSON** — copia da tenere dove preferisci.
2. **Importa JSON** — ripristina un backup sulla tua scrivania.
3. **Ripristina esempio** — torna ai dati dimostrativi.

Per un backup completo, allegati compresi, copia l’intera cartella `data/`.

## Opzionale: Google

Senza `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` il bottone «Continua con Google» e «Importa call» non compaiono. Per riattivarli serve un client OAuth Google (tipo **Applicazione Web**) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

- Origini JavaScript autorizzate: `http://127.0.0.1:43123`
- URI di reindirizzamento autorizzati: `http://127.0.0.1:43123/api/auth/google/callback` e `http://127.0.0.1:43123/api/calendar/google/callback`

Per **Importa call** abilita la Google Calendar API sullo stesso progetto e aggiungi lo scope `https://www.googleapis.com/auth/calendar.events.readonly` alla schermata di consenso. Il Calendario si autorizza a parte, in sola lettura.

In `.env.local`:

```bash
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
NIMBUS_APP_URL=http://127.0.0.1:43123
```

Google accetta HTTP **solo** su `127.0.0.1` / `localhost`: da un IP di rete o Tailscale il login Google e l’import vengono rifiutati (`invalid_request`). Il login con password funziona ovunque.

Finché l’app OAuth non è verificata, Google la limita ai tester che aggiungi alla schermata di consenso. Al primo accesso Google, un account con la stessa email viene collegato; per chiudere la creazione di nuovi account via Google:

```bash
NIMBUS_ALLOW_REGISTER=false
```

## Opzionale: HTTPS e dominio pubblico

Se un giorno servisse di nuovo un dominio HTTPS (tunnel, reverse proxy, k3s), imposta `NIMBUS_APP_URL=https://...`: con un URL `https` i cookie diventano `Secure` e il server invia l’header HSTS. Con un URL `http` o senza `NIMBUS_APP_URL` restano compatibili con l’accesso in chiaro su LAN e Tailscale.

### Dismettere il vecchio tunnel Cloudflare

1. Ferma `cloudflared` (`Ctrl+C` sul processo, o `sudo systemctl disable --now cloudflared` se l’avevi installato come servizio).
2. Facoltativo: `cloudflared tunnel delete nimbus`, poi togli il record `nimbus` dal DNS su Cloudflare e cancella `~/.cloudflared/`.
3. Facoltativo: in Google Cloud Console revoca il client OAuth, se non usi l’import da Calendar.

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui. Nessun database: JSON su disco, password con hash `scrypt`, OAuth Google opzionale e cookie di sessione firmati. Il font Plus Jakarta Sans è incluso nel pacchetto, quindi build e avvio non richiedono internet.
