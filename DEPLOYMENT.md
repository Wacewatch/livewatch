# Déploiement sur VPS OVH

## Configuration nginx requise

Pour que le streaming vidéo fonctionne correctement sur votre VPS, vous devez augmenter les timeouts nginx.

### 1. Modifier la configuration nginx

```bash
sudo nano /etc/nginx/sites-available/livewatch.sbs
```

Copiez le contenu de `nginx.conf.example` dans ce fichier.

### 2. Tester la configuration

```bash
sudo nginx -t
```

### 3. Redémarrer nginx

```bash
sudo systemctl restart nginx
```

## Si vous utilisez Apache

Ajoutez dans votre VirtualHost :

```apache
<VirtualHost *:80>
    ServerName livewatch.sbs
    
    ProxyTimeout 120
    ProxyPreserveHost On
    
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
