# 📺 Intégration Vavoo - Guide Complet

## Vue d'ensemble

Ce système permet de streamer les chaînes de **vavoo.to** via des proxies Next.js qui gèrent les headers et tokens nécessaires, similaire au système PHP fourni.

---

## 🎯 Architecture

### Endpoints créés :

1. **`/api/vavoo/channels`** - Récupère toutes les chaînes disponibles
2. **`/api/vavoo/stream`** - Résout l'URL de stream pour une chaîne
3. **`/api/vavoo/proxy`** - Proxy qui stream le contenu avec les bons headers

---

## 🔧 Comment ça fonctionne

### 1. Récupération des chaînes

```typescript
const response = await fetch('/api/vavoo/channels')
const data = await response.json()

// Retourne:
{
  success: true,
  channels: [
    {
      id: "channel-id",
      name: "TF1 HD",
      country: "France",
      logo: "https://...",
      // ... autres propriétés
    }
  ],
  total: 500
}
```

### 2. Obtenir l'URL de stream

```typescript
const channelId = "tf1-hd-123"
const response = await fetch(`/api/vavoo/stream?id=${channelId}`)
const data = await response.json()

// Retourne:
{
  success: true,
  streamUrl: "/api/vavoo/proxy?id=tf1-hd-123&path=index.m3u8",
  channelId: "tf1-hd-123",
  provider: "vavoo"
}
```

### 3. Utiliser le stream dans un player

```tsx
<video controls>
  <source src="/api/vavoo/proxy?id=tf1-hd-123&path=index.m3u8" type="application/x-mpegURL" />
</video>
```

Ou avec HLS.js :

```typescript
import Hls from 'hls.js'

const streamUrl = '/api/vavoo/proxy?id=tf1-hd-123&path=index.m3u8'

if (Hls.isSupported()) {
  const hls = new Hls()
  hls.loadSource(streamUrl)
  hls.attachMedia(video)
}
```

---

## 🛠️ Technique du Proxy

### Headers utilisés (identiques au PHP)

Le proxy `/api/vavoo/proxy` utilise les mêmes headers que votre PHP :

```typescript
{
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
  "Referer": "https://vavoo.to/",
  "Origin": "https://vavoo.to",
  "Accept": "*/*",
  "Accept-Language": "fr-FR,fr;q=0.9",
  "Accept-Encoding": "identity",
  "Connection": "keep-alive",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin"
}
```

### Réécriture des URLs M3U8

Le proxy réécrit automatiquement les URLs relatives dans les playlists M3U8 :

**Avant (M3U8 original) :**
```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2000000
playlist_720p.m3u8
```

**Après (M3U8 réécrit) :**
```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2000000
/api/vavoo/proxy?id=tf1-hd-123&path=playlist_720p.m3u8
```

### Support des segments .ts

Les segments vidéo (.ts) sont streamés directement avec :
- Cache immutable (performance)
- Support des Range requests (seeking)
- Headers CORS appropriés

---

## 📝 Exemple d'intégration complète

### Composant React

```tsx
'use client'

import { useState, useEffect } from 'react'
import Hls from 'hls.js'

export function VavooPlayer({ channelId }: { channelId: string }) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStream() {
      try {
        const res = await fetch(`/api/vavoo/stream?id=${channelId}`)
        const data = await res.json()
        
        if (data.success) {
          setStreamUrl(data.streamUrl)
        } else {
          setError('Stream non disponible')
        }
      } catch (err) {
        setError('Erreur de chargement')
      }
    }

    loadStream()
  }, [channelId])

  useEffect(() => {
    if (!streamUrl) return

    const video = document.getElementById('vavoo-video') as HTMLVideoElement
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        enableWorker: true,
      })
      
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[v0] HLS Error:', data)
        if (data.fatal) {
          setError('Erreur de lecture')
        }
      })

      return () => hls.destroy()
    }
  }, [streamUrl])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <video
      id="vavoo-video"
      controls
      className="w-full h-full"
      autoPlay
    />
  )
}
```

---

## 🔄 Différences avec le PHP

### Similitudes :
✅ Mêmes headers HTTP
✅ Même technique de réécriture M3U8
✅ Support des segments .ts
✅ Gestion des erreurs

### Avantages de la version Next.js :
✅ Déploiement serverless (Vercel)
✅ Cache automatique et optimisations
✅ TypeScript et type-safety
✅ Meilleure gestion des erreurs
✅ Support natif des Range requests
✅ Logging détaillé pour debug

---

## 🚀 Utilisation dans votre app

### Ajouter à vos sources existantes

Modifiez votre backend pour inclure Vavoo comme provider :

```typescript
// Dans votre fonction de résolution de stream
async function getStreamUrl(channel: Channel) {
  // Si la chaîne a un ID Vavoo
  if (channel.vavooId) {
    const res = await fetch(`/api/vavoo/stream?id=${channel.vavooId}`)
    const data = await res.json()
    return data.streamUrl
  }
  
  // Fallback sur vos autres providers
  return getOtherProviderStream(channel)
}
```

---

## 🐛 Debug et Logs

Le système log automatiquement dans la console :

```
[v0] Proxying Vavoo stream: https://vavoo.to/play/tf1-hd-123/index.m3u8
[v0] Rewriting Vavoo M3U8 playlist for channel: tf1-hd-123
[v0] Successfully fetched 500 channels from Vavoo
```

Pour activer plus de logs, ajoutez dans votre player :

```typescript
hls.on(Hls.Events.MANIFEST_PARSED, () => {
  console.log('[v0] Manifest loaded successfully')
})
```

---

## ⚠️ Gestion des erreurs

Le système gère automatiquement :
- Timeouts (30s par défaut)
- Erreurs HTTP (404, 500, etc.)
- Erreurs réseau
- Streams non disponibles

Toutes les erreurs retournent un JSON avec détails :

```json
{
  "error": "Failed to fetch stream",
  "details": "Connection timeout",
  "status": 504
}
```

---

## 🎨 Intégration UI

Exemple de card pour sélectionner une chaîne Vavoo :

```tsx
function VavooChannelCard({ channel }: { channel: VavooChannel }) {
  return (
    <div 
      className="cursor-pointer hover:scale-105 transition"
      onClick={() => playChannel(channel.id)}
    >
      <img src={channel.logo} alt={channel.name} />
      <h3>{channel.name}</h3>
      <span className="badge">Vavoo</span>
    </div>
  )
}
```

---

## 📊 Performance

- **M3U8 Playlists**: Pas de cache (always fresh)
- **Segments .ts**: Cache immutable (31536000s)
- **API Channels**: Cache 5 minutes
- **Timeout**: 30 secondes par requête

---

## ✅ Prêt à l'emploi

Le système est maintenant opérationnel ! Utilisez simplement :

```typescript
// 1. Récupérer les chaînes
const { channels } = await fetch('/api/vavoo/channels').then(r => r.json())

// 2. Obtenir le stream
const { streamUrl } = await fetch(`/api/vavoo/stream?id=${channels[0].id}`).then(r => r.json())

// 3. Player
<video src={streamUrl} controls autoPlay />
```

---

**Voilà ! Votre intégration Vavoo est complète et fonctionnelle.** 🎉
