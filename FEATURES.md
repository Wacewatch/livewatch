# LiveWatch - Features & Role System

## Architecture Overview

LiveWatch est une plateforme de streaming TV avec un système de rôles à trois niveaux :

### Rôles Utilisateurs

#### 1. Utilisateur Standard (User)
- ✅ Accès aux chaînes TV en direct
- ✅ Système de favoris (max 20)
- ✅ Historique de visionnage (max 50)
- ✅ Qualité HD
- ✅ 1 stream simultané
- ❌ Publicités présentes
- ❌ Player VIP désactivé

#### 2. VIP Premium
- ✅ **Aucune publicité**
- ✅ Accès au Player VIP sans pubs
- ✅ Qualité 4K
- ✅ Favoris illimités (max 100)
- ✅ Historique étendu (max 500)
- ✅ 3 streams simultanés
- ✅ Téléchargement des streams
- ✅ Sources multiples
- ✅ Support prioritaire
- ✅ Thèmes personnalisés

#### 3. Administrateur
- ✅ Toutes les fonctionnalités VIP
- ✅ Accès au panneau d'administration
- ✅ Gestion des utilisateurs
- ✅ Gestion des chaînes
- ✅ Statistiques et analytics
- ✅ Gestion des bannières
- ✅ Génération de clés VIP
- ✅ Favoris et historique illimités
- ✅ Streams simultanés illimités

## Structure du Projet

### Composants Principaux

#### Pages
- `/` - Sélection du pays
- `/channels/[country]` - Liste des chaînes par pays
- `/dashboard` - Tableau de bord utilisateur
- `/admin` - Panneau d'administration (admin uniquement)
- `/player` - Player standard avec publicités
- `/playervip` - Player VIP sans publicités
- `/favorites` - Page des favoris
- `/login` - Authentification
- `/register` - Inscription

#### Composants UI
- `app-header.tsx` - Header global réutilisable
- `role-badge.tsx` - Badge de rôle coloré
- `stat-card.tsx` - Carte de statistiques
- `quick-action.tsx` - Bouton d'action rapide
- `feature-limits.tsx` - Affichage des limites par rôle
- `vip-upgrade-card.tsx` - Carte d'upgrade VIP

#### Systèmes
- `lib/theme.ts` - Système de thème unifié
- `lib/permissions.ts` - Gestion des permissions par rôle
- `lib/types.ts` - Types TypeScript
- `lib/hooks/use-user-role.ts` - Hook pour récupérer le rôle
- `lib/hooks/use-favorites.ts` - Hook pour gérer les favoris

### Base de Données (Supabase)

#### Tables Principales
- `user_profiles` - Profils utilisateurs avec rôles
- `user_favorites` - Favoris des utilisateurs
- `channel_views` - Historique de visionnage
- `channels` - Catalogue des chaînes
- `vip_keys` - Clés VIP pour activation
- `disabled_channels` - Chaînes désactivées
- `channel_overrides` - Personnalisation des chaînes
- `country_banners` - Bannières par pays
- `global_banners` - Bannières globales
- `active_sessions` - Sessions actives
- `kofi_transactions` - Transactions Ko-fi

## Système de Thème

Le fichier `lib/theme.ts` centralise tous les styles :

```typescript
theme.backgrounds.page      // Fond de page
theme.backgrounds.card      // Cartes
theme.buttons.primary       // Boutons primaires
theme.badges.vip           // Styles VIP
theme.badges.admin         // Styles Admin
theme.typography.h1        // Titres H1
```

## Permissions

Le système de permissions est défini dans `lib/permissions.ts` :

```typescript
const features = getRoleFeatures(role, isVip)

if (features.canAccessAdminPanel) {
  // Code admin uniquement
}

if (features.hasAdFreeExperience) {
  // Pas de pubs pour VIP/Admin
}
```

## Fonctionnalités par Zone

### Dashboard Utilisateur
- Statistiques personnalisées
- Badge de rôle dynamique
- Actions rapides contextuelles
- Liste des favoris avec liens directs
- Historique de visionnage
- Activation de clé VIP
- Limites d'utilisation affichées

### Player Modal
- Détection automatique du rôle
- Mode sans pub pour VIP/Admin
- Sources multiples pour VIP
- Liens de partage
- Statistiques en temps réel
- Support de plusieurs qualités

### Admin Panel
- Statistiques globales
- Gestion des utilisateurs
- Gestion des chaînes
- Génération de clés VIP
- Configuration des bannières
- Analytics détaillés
- Contrôle des pays
- Gestion des transactions Ko-fi

## API Routes

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `POST /api/auth/logout` - Déconnexion

### Utilisateurs
- `GET /api/user/profile` - Profil utilisateur
- `PUT /api/user/profile` - Mise à jour profil

### Favoris
- `GET /api/favorites` - Liste des favoris
- `POST /api/favorites` - Ajouter favori
- `DELETE /api/favorites` - Supprimer favori

### VIP
- `POST /api/vip/redeem` - Activer clé VIP
- `GET /api/vip/status` - Statut VIP

### Admin
- `GET /api/admin/stats` - Statistiques
- `GET /api/admin/users` - Liste utilisateurs
- `POST /api/admin/vip-keys` - Générer clés VIP
- `GET /api/admin/banners` - Gérer bannières
- `POST /api/admin/channels` - Gérer chaînes

### Streaming
- `GET /api/tvvoo/channels` - Liste des chaînes
- `GET /api/tvvoo/stream` - URL de stream
- `GET /api/catalog` - Catalogue complet

## Intégrations

### Supabase
- Authentification
- Base de données PostgreSQL
- Row Level Security (RLS)
- Realtime subscriptions

### Ko-fi
- Webhook pour paiements
- Activation automatique VIP
- Suivi des transactions

### TVVoo API
- Récupération des chaînes
- Streams en direct
- Métadonnées des chaînes

## Déploiement

### Variables d'Environnement Requises

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Application
NEXT_PUBLIC_APP_URL=
```

### Scripts Utiles

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```

## Sécurité

### Row Level Security (RLS)
Toutes les tables sensibles ont RLS activé :
- Les utilisateurs ne peuvent voir que leurs propres données
- Les admins ont accès complet
- Les favoris sont protégés par user_id

### Authentification
- Sessions sécurisées avec Supabase Auth
- Tokens JWT
- Protection CSRF
- Rate limiting sur les API sensibles

## Performance

### Optimisations
- Server Components par défaut
- Client Components uniquement où nécessaire
- Images optimisées avec Next.js Image
- Lazy loading des composants
- Mise en cache des requêtes API
- SSR pour le SEO

### Monitoring
- Logs structurés avec `[v0]` prefix
- Tracking des erreurs
- Analytics des performances
- Suivi des sessions actives

## Support

Pour toute question ou problème :
1. Consultez la documentation
2. Vérifiez les logs avec `[v0]` prefix
3. Contactez le support via Ko-fi
4. Ouvrez un ticket sur GitHub

---

**Version:** 2.0
**Dernière mise à jour:** 2026-02-18
