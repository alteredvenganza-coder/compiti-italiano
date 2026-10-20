# Compiti di Italiano

App di compiti e pratica (Palestra) di italiano per ragazze ispanofone, con pannello per l'insegnante.

- Sito e API: Cloudflare Workers (`src/worker.js`) con i file statici in `public/`.
- Database: Cloudflare D1 `compiti-italiano` (schema in `migrations/`).
- Accesso: l'insegnante crea il proprio account al primo avvio; gli account delle alunne (nome utente + PIN) si creano dal pannello.

## Pubblicare
Collega questo repository a Cloudflare (Workers e Pages › Crea › Importa un repository): ogni push su `main` viene pubblicato con `npx wrangler deploy`.

## Provare in locale
```
npm install
npx wrangler d1 migrations apply compiti-italiano --local
npx wrangler dev
```
