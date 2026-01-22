# Configuration Ko-fi pour le Système VIP

## URL du Webhook

Voici l'URL du webhook à ajouter dans Ko-fi pour recevoir les notifications de paiement :

```
https://votre-domaine.com/api/webhooks/kofi
```

**Remplacez `votre-domaine.com` par votre domaine réel** (exemple: `tvchannelstreamer11-seven.vercel.app`)

## Configuration dans Ko-fi

1. **Connectez-vous à votre compte Ko-fi**
   - Allez sur https://ko-fi.com/manage

2. **Accédez aux Webhooks**
   - Dans le menu de gauche, allez à `More` → `Webhooks` (ou `Webhooks & API`)

3. **Ajoutez un nouveau Webhook**
   - Cliquez sur "Add Webhook" ou "Add New"
   - **URL du Webhook** : `https://votre-domaine.com/api/webhooks/kofi`
   - **Événements** : Sélectionnez `Donation` et optionnellement `Shop Order`

4. **Verification Token (Optionnel mais recommandé)**
   - Ko-fi génère un token de vérification
   - Copiez-le et ajoutez-le comme variable d'environnement :
   ```
   KOFI_VERIFICATION_TOKEN=votre_token_ici
   ```

## Variables d'Environnement Requises

Ajoutez à votre `.env.local` ou dans le dashboard Vercel :

```
KOFI_VERIFICATION_TOKEN=votre_token_de_verification
```

## Flux du Paiement VIP

1. **L'utilisateur clique** sur le bouton "Acheter VIP Premium" → Redirigé vers Ko-fi
2. **L'utilisateur effectue le paiement** sur Ko-fi
3. **Ko-fi envoie une notification** au webhook `/api/webhooks/kofi`
4. **Le webhook traite le paiement** :
   - Enregistre la transaction dans `kofi_payments`
   - Cherche l'utilisateur avec l'email du paiement
   - Met à jour `is_vip = true` et `vip_expires_at = null` (pas de limite)
5. **L'utilisateur reçoit le VIP** automatiquement ✓

## Structure de Données

### Table `kofi_payments`
```sql
- id (UUID) : Identifiant unique
- kofi_transaction_id (TEXT) : ID de Ko-fi
- user_id (UUID) : Lien vers l'utilisateur (nullable au départ)
- email (TEXT) : Email du paiement
- amount (DECIMAL) : Montant du paiement
- sender_name (TEXT) : Nom du donateur
- is_public (BOOLEAN) : Si le paiement est public
- status (TEXT) : 'pending', 'completed', 'failed'
- raw_data (JSONB) : Données brutes de Ko-fi
- processed_at (TIMESTAMP) : Moment du traitement
- created_at (TIMESTAMP) : Moment de la création
```

### Colonnes ajoutées à `user_profiles`
```sql
- is_vip (BOOLEAN) : L'utilisateur est-il VIP ?
- vip_purchased_at (TIMESTAMP) : Date d'achat du VIP
- vip_expires_at (TIMESTAMP) : Date d'expiration (NULL pour illimité)
```

## Tester le Webhook

### Option 1 : Test depuis Ko-fi
- Accédez à la page des Webhooks dans Ko-fi
- Vous devriez voir un bouton "Send Test" ou "Test Webhook"
- Cliquez pour envoyer un événement de test

### Option 2 : Test manuel avec cURL
```bash
curl -X POST https://votre-domaine.com/api/webhooks/kofi \
  -H "Content-Type: application/json" \
  -d '{
    "verification_token": "votre_token",
    "type": "Donation",
    "kofi_transaction_id": "test-123",
    "from_email": "test@example.com",
    "from_name": "Test User",
    "amount": "5.00",
    "is_public": false
  }'
```

### Option 3 : Test depuis Node.js/TypeScript
```typescript
const response = await fetch('https://votre-domaine.com/api/webhooks/kofi', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    verification_token: 'votre_token',
    type: 'Donation',
    kofi_transaction_id: 'test-123',
    from_email: 'test@example.com',
    from_name: 'Test User',
    amount: '5.00',
    is_public: false,
  }),
})
```

## Fichiers Créés

- `/app/api/webhooks/kofi/route.ts` - Webhook Ko-fi
- `/app/dashboard/page.tsx` - Page du tableau de bord
- `/components/user-dashboard.tsx` - Composant du dashboard
- `/app/login/page.tsx` - Page de connexion
- `/scripts/012_add_vip_column.sql` - Migration de la base de données

## À Faire

1. **Déployer sur Vercel**
2. **Ajouter le lien Ko-fi correct** dans `user-dashboard.tsx` ligne ~220 (remplacer `https://ko-fi.com/your-kofi-username`)
3. **Configurer le webhook dans Ko-fi** avec votre URL de production
4. **Ajouter le token de vérification Ko-fi** aux variables d'environnement
5. **Tester le flux complet**

## Debugging

Pour voir les logs des paiements Ko-fi, vérifiez la console Vercel :
```
vercel logs --prod
```

Les messages de debug commencent par `[v0]`.

## Questions ?

Si vous avez besoin de modifier le montant, les bénéfices VIP, ou la durée du VIP, modifiez :
- Le lien Ko-fi dans `/components/user-dashboard.tsx`
- Les conditions VIP dans le code métier
- Les variables de base de données si nécessaire
