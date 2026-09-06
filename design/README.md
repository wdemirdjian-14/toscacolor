# Sources graphiques

Ce dossier n'est pas servi : ce qui est dans `public/` part sur le serveur et
dans le préchargement hors ligne, une image source de 2 Mo n'y a pas sa place.

## Le logo

Déposer l'original ici sous `logo-source.png` (carré, le cercle centré sur fond
blanc), puis régénérer les déclinaisons :

```bash
node design/logo.mjs design/logo-source.png
```

Le script produit, dans `public/` :

| Fichier | Rôle |
| --- | --- |
| `logo.png` | l'en-tête du site, cercle détouré sur fond transparent |
| `icon-512.png`, `icon-192.png` | l'icône d'application, coins comblés en rose |
| `apple-touch-icon.png` | l'écran d'accueil iOS |
| `favicon.png` | l'onglet du navigateur |

Les coins sont comblés parce qu'iOS masque l'icône en carré arrondi : un fond
transparent y apparaîtrait en blanc, avec un liseré visible autour du cercle.
