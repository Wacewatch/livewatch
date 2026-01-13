# Déploiement du Cloudflare Worker pour Nakios

## Prérequis
- Compte Cloudflare (gratuit)
- Node.js et npm installés
- Wrangler CLI

## Installation

1. Installez Wrangler CLI :
```bash
npm install -g wrangler
```

2. Authentifiez-vous à Cloudflare :
```bash
wrangler login
```

3. Modifiez `wrangler.toml` et remplacez `your-domain.com` par votre domaine

4. Déployez le worker :
```bash
wrangler deploy workers/nakios-proxy.js
```

5. Le worker sera disponible à l'URL :
```
https://nakios-proxy.YOUR-SUBDOMAIN.workers.dev
```

6. Mettez à jour `components/player-modal.tsx` ligne 347 avec votre URL worker

## Test

Testez le worker en appelant :
```
https://nakios-proxy.YOUR-SUBDOMAIN.workers.dev/?channel=vavoo_13%20EME%20RUE%20HD%7Cgroup%3Afr
```

Vous devriez recevoir un JSON avec `success: true` et `streamUrl`.
