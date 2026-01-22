## Module Ko-fi dans l'Admin

Le module Ko-fi dans le tableau de bord admin permet de consulter et gérer tous les paiements effectués via Ko-fi.

### Fonctionnalités

#### 1. Vue d'ensemble des transactions
- **Chiffre d'affaires total** : Somme de tous les paiements complétés
- **Transactions complétées** : Nombre de paiements réussis
- **En attente** : Nombre de paiements en cours de traitement
- **Échouées** : Nombre de paiements échoués

#### 2. Recherche et filtrage
- **Barre de recherche** : Recherchez par :
  - Email de l'utilisateur
  - ID de transaction
  - Nom du donateur
  
- **Filtre par statut** :
  - Tous les statuts
  - Complétées (✓)
  - En attente (⏱️)
  - Échouées (✗)

#### 3. Tableau des transactions
Le tableau affiche pour chaque transaction :
- ID Transaction (8 premiers caractères)
- Email de l'utilisateur qui a acheté le VIP
- Nom du donateur (tel que rempli sur Ko-fi)
- Montant et devise
- Statut avec indicateur visuel
- Méthode de paiement (Ko-fi, carte, etc.)
- Date et heure du paiement

#### 4. Export CSV
Cliquez sur le bouton "Exporter CSV" pour télécharger toutes les transactions filtrées au format CSV. Utile pour :
- Comptabilité
- Rapports financiers
- Archivage
- Analyse des ventes

### Statuts des transactions

| Statut | Couleur | Signification |
|--------|---------|---------------|
| Complété | Vert | Le paiement a été reçu et l'utilisateur est devenu VIP |
| En attente | Jaune | Ko-fi a notifié le webhook mais la confirmation est en cours |
| Échoué | Rouge | Le paiement n'a pas pu être traité |

### Flux de paiement

1. L'utilisateur clique sur "Acheter VIP Premium" dans le dashboard
2. Il est redirigé vers votre page Ko-fi
3. Après le paiement, Ko-fi envoie une notification au webhook
4. L'utilisateur reçoit automatiquement le grade VIP (sans limite de durée)
5. La transaction apparaît dans ce module

### API Endpoint

L'endpoint utilisé pour récupérer les transactions :

```
GET /api/admin/kofi-transactions
```

**Réponse :**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "transaction_id": "string",
      "user_id": "uuid",
      "user_email": "user@example.com",
      "amount": 5.00,
      "currency": "USD",
      "status": "completed",
      "payment_method": "Ko-fi Shop",
      "donor_name": "John Doe",
      "message": "Keep up the good work!",
      "created_at": "2024-01-22T10:30:00Z",
      "processed_at": "2024-01-22T10:31:00Z"
    }
  ],
  "total": 1
}
```

### Sécurité

- Seuls les administrateurs peuvent accéder au module
- Les données sont protégées par Row Level Security (RLS)
- Les transactions sont immutables dans la base de données
- Les webhooks Ko-fi sont vérifiés avec un token secret

### Troubleshooting

**Aucune transaction n'apparaît :**
1. Vérifiez que le webhook Ko-fi est configuré correctement
2. Vérifiez l'URL du webhook dans les paramètres Ko-fi
3. Assurez-vous que la colonne `is_vip` a bien été créée

**Les transactions ne se mettent pas à jour :**
1. Rafraîchissez la page avec F5
2. Vérifiez que la base de données est bien connectée
3. Consultez les logs du serveur pour les erreurs

### Notes

- Les transactions sont triées par date décroissante (plus récentes en premier)
- Le chiffre d'affaires n'inclut que les transactions complétées
- Seules les transactions des 180 derniers jours sont conservées par défaut (configurable)
