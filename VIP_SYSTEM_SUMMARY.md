# Système VIP avec Ko-fi - Guide d'Utilisation

## 🎯 Vue d'ensemble

J'ai créé un système VIP complet permettant aux utilisateurs de passer à VIP via Ko-fi. Voici ce qui a été mis en place :

## 📁 Fichiers Créés

### Backend
1. **`/app/api/webhooks/kofi/route.ts`** - Webhook Ko-fi
   - Reçoit les notifications de paiement Ko-fi
   - Valide les transactions
   - Met à jour le statut VIP automatiquement
   - Crée des enregistrements de paiement

2. **`/scripts/012_add_vip_column.sql`** - Migration DB
   - Ajoute colonnes VIP à `user_profiles`
   - Crée table `kofi_payments`
   - Établit les relations

### Frontend
3. **`/components/user-dashboard.tsx`** - Dashboard utilisateur
   - Affiche les infos du profil
   - Affiche l'état VIP
   - Bouton d'achat Ko-fi
   - Interface moderne et responsive

4. **`/app/dashboard/page.tsx`** - Page du dashboard
   - Protégée (redirige si non connecté)
   - Layout optimisé

5. **`/components/auth/auth-form.tsx`** - Formulaire d'authentification
   - Onglets Login/Signup
   - Création de compte automatique
   - Profil utilisateur créé à l'inscription

6. **`/app/login/page.tsx`** - Page de connexion
   - Utilise le formulaire d'auth combiné
   - Design cohérent

### Documentation
7. **`/KOFI_SETUP.md`** - Guide de configuration Ko-fi

## 🔧 Configuration Requise

### 1. Environnement Ko-fi
Vous avez besoin de :
- Un compte Ko-fi (https://ko-fi.com)
- L'ID de votre shop/page Ko-fi
- Le token de vérification Ko-fi (optionnel mais recommandé)

### 2. Variables d'Environnement
Ajoutez à Vercel/variables :
\`\`\`
KOFI_VERIFICATION_TOKEN=votre_token_verification
\`\`\`

### 3. Configuration du Webhook
1. Allez sur https://ko-fi.com/manage
2. Accédez à `More → Webhooks`
3. Ajoutez le webhook :
   \`\`\`
   https://votre-app.vercel.app/api/webhooks/kofi
   \`\`\`
4. Sélectionnez les événements : `Donation` et `Shop Order`

## 🚀 Flux Utilisateur

### Avant le VIP
1. L'utilisateur non-VIP voit le bouton **"Acheter VIP Premium"** dans son dashboard
2. Clic → Redirection vers Ko-fi
3. Effectue le paiement
4. Ko-fi envoie la notification au webhook

### Après le Paiement
1. Le webhook reçoit la notification
2. Cherche l'utilisateur avec cet email
3. Met à jour `is_vip = true`
4. L'utilisateur devient VIP à l'actualisation de la page

## 📊 Base de Données

### Nouvelles Colonnes dans `user_profiles`
\`\`\`sql
is_vip: boolean (default: false)
vip_purchased_at: timestamp (date d'achat)
vip_expires_at: timestamp (NULL = illimité)
\`\`\`

### Nouvelle Table `kofi_payments`
\`\`\`sql
id: uuid (PK)
kofi_transaction_id: text (unique)
user_id: uuid (FK user_profiles, nullable)
email: text
amount: decimal
sender_name: text
is_public: boolean
status: text (pending, completed, failed)
raw_data: jsonb (données brutes Ko-fi)
processed_at: timestamp
created_at: timestamp (auto)
\`\`\`

## 🔐 Sécurité

- ✅ Vérification du token Ko-fi dans le webhook
- ✅ Enregistrement de toutes les transactions
- ✅ Protection du dashboard (auth requise)
- ✅ Pas d'exposition des données sensibles
- ✅ Logs détaillés pour le debugging

## 🧪 Test

### Test du Webhook
\`\`\`bash
curl -X POST https://votre-app.vercel.app/api/webhooks/kofi \
  -H "Content-Type: application/json" \
  -d '{
    "verification_token": "test",
    "type": "Donation",
    "kofi_transaction_id": "test-123",
    "from_email": "test@example.com",
    "from_name": "Test User",
    "amount": "5.00",
    "is_public": false
  }'
\`\`\`

## 📱 Routes

- `/login` - Connexion/Inscription
- `/dashboard` - Dashboard utilisateur
- `/api/webhooks/kofi` - Webhook Ko-fi (POST)

## 🎨 Intégration au Menu

Le UserMenu a été mis à jour pour :
- Afficher le lien **"Mon Tableau de Bord"**
- Bouton **"Acheter VIP"** (avant VIP)
- Affichage du rôle (Admin/VIP/Membre)

## ⚙️ Configuration du Lien Ko-fi

Dans `/components/user-dashboard.tsx`, ligne ~220 :
\`\`\`tsx
<a href="https://ko-fi.com/YOUR_USERNAME" ...>
\`\`\`

Remplacez `YOUR_USERNAME` par votre username Ko-fi.

## 🐛 Debugging

Pour voir les logs des paiements :
\`\`\`bash
vercel logs --prod
\`\`\`

Les messages de debug commencent par `[v0]`.

## 💡 Améliorations Futures

- [ ] Ajouter d'autres montants VIP
- [ ] Supporter plusieurs durées (1 mois, 3 mois, etc.)
- [ ] Email de confirmation de VIP
- [ ] Page d'historique des paiements
- [ ] Support d'autres méthodes de paiement

## ❓ FAQ

**Q: Pourquoi le VIP n'est pas activé immédiatement ?**
A: Ko-fi envoie une notification POST asynchrone. L'utilisateur doit actualiser la page après ~1-5 secondes.

**Q: Puis-je tester sans Ko-fi ?**
A: Oui, testez le webhook directement avec cURL (voir section Test).

**Q: Comment annuler un paiement ?**
A: Vous pouvez manuellement mettre `is_vip = false` en SQL. Lier un refund Ko-fi au système est une future amélioration.

## 📞 Support

Consultez `/KOFI_SETUP.md` pour des instructions détaillées.
