# 🎬 Intégration LiveWatch en iframe

## Vue d'ensemble

Ce guide explique comment intégrer LiveWatch dans votre site en iframe tout en partageant l'authentification de vos utilisateurs.

## 🚀 Intégration rapide

### 1. Ajouter l'iframe à votre page

```html
<iframe 
    id="livewatch-iframe"
    src="https://votre-domaine.com/channels/France"
    allow="autoplay; fullscreen; picture-in-picture"
    allowfullscreen
    style="width: 100%; height: 800px; border: none;"
></iframe>
```

### 2. Implémenter l'authentification cross-origin

```javascript
// Données utilisateur de votre site
const userAuthData = {
    role: 'admin', // ou 'vip', 'member'
    userId: 'user-12345',
    email: 'user@example.com',
    token: 'your-auth-token'
};

const iframe = document.getElementById('livewatch-iframe');

// Écouter les demandes d'auth de l'iframe
window.addEventListener('message', (event) => {
    // ⚠️ IMPORTANT: Vérifier l'origine en production
    if (event.origin !== 'https://votre-domaine.com') return;
    
    if (event.data?.type === 'auth-request') {
        // Envoyer l'authentification
        iframe.contentWindow.postMessage({
            type: 'auth-response',
            role: userAuthData.role,
            userId: userAuthData.userId,
            email: userAuthData.email,
            token: userAuthData.token
        }, 'https://votre-domaine.com');
    }
});

// Envoyer l'auth au chargement de l'iframe
iframe.addEventListener('load', () => {
    setTimeout(() => {
        iframe.contentWindow.postMessage({
            type: 'auth-response',
            role: userAuthData.role,
            userId: userAuthData.userId,
            email: userAuthData.email
        }, 'https://votre-domaine.com');
    }, 1000);
});
```

## 📋 Rôles disponibles

- `admin` : Accès complet sans publicité + panneau admin
- `vip` : Accès sans publicité
- `member` : Accès standard avec publicités

## 🔒 Sécurité

### En développement
```javascript
// Accepter tous les domaines pour les tests
iframe.contentWindow.postMessage(data, '*');
```

### En production
```javascript
// ⚠️ TOUJOURS spécifier le domaine exact
iframe.contentWindow.postMessage(data, 'https://votre-domaine-exact.com');

// Et vérifier l'origine des messages reçus
window.addEventListener('message', (event) => {
    if (event.origin !== 'https://votre-domaine-exact.com') {
        console.warn('Message rejeté, origine non autorisée');
        return;
    }
    // Traiter le message...
});
```

## 📱 Responsive Design

L'iframe LiveWatch s'adapte automatiquement à tous les écrans :

```css
/* Mobile first */
iframe {
    width: 100%;
    height: 600px; /* Hauteur mobile */
}

/* Tablette et desktop */
@media (min-width: 768px) {
    iframe {
        height: 800px;
    }
}
```

## 🎯 Exemple complet

Un fichier d'exemple complet est disponible dans `public/iframe-parent-example.html`.

Pour le tester localement :
1. Ouvrez le fichier dans votre navigateur
2. Observez la console pour voir les messages d'authentification
3. Le rôle "admin" sera automatiquement appliqué

## 🐛 Débogage

Activez la console du navigateur pour voir les logs :

```
[v0] Running in iframe, requesting auth from parent
[v0] Received auth from parent: {role: "admin", userId: "..."}
```

Si vous ne voyez pas ces messages :
1. Vérifiez que l'iframe charge correctement
2. Vérifiez que le JavaScript s'exécute
3. Vérifiez la console pour les erreurs CORS

## 💡 Cas d'usage

### Site de média (beta.wavewatch.xyz)
```javascript
// Récupérer le rôle depuis votre backend
fetch('/api/user/profile')
    .then(res => res.json())
    .then(user => {
        iframe.contentWindow.postMessage({
            type: 'auth-response',
            role: user.role,
            userId: user.id,
            email: user.email
        }, 'https://livewatch.sbs');
    });
```

### Plateforme d'abonnement
```javascript
// Vérifier si l'utilisateur a un abonnement actif
const role = user.hasActiveSubscription ? 'vip' : 'member';
iframe.contentWindow.postMessage({
    type: 'auth-response',
    role: role,
    userId: user.id
}, 'https://livewatch.sbs');
```

## 📞 Support

Pour toute question sur l'intégration, consultez la documentation ou contactez le support.
