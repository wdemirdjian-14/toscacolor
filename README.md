# ToscaColor

Application de coloriage pour les 5-15 ans. Mobile-first, pensée iPad et iPhone.
Tout reste sur l'appareil : aucun compte, aucune publicité, aucun envoi réseau.

## Lancer en local

```bash
npm install
npm run dev
```

## État : étape 1 terminée

Le cœur de l'application fonctionne.

- **Pot de peinture** — remplissage par zone borné par le trait du modèle, avec
  dilatation d'un pixel pour supprimer le liseré blanc le long des contours.
- **Deux calques** — la couleur est peinte *sous* le trait noir. La gomme ne peut
  donc jamais entamer le modèle.
- **Mode facile** — le pinceau est bridé à la zone touchée en premier : l'enfant
  ne dépasse pas.
- **Pinceau, crayon, feutre, gomme**, trois épaisseurs, 24 couleurs.
- **Annuler / refaire** sur 40 étapes, par retouche de la zone modifiée
  (l'historique ne consomme pas toute la mémoire).
- **Zoom et déplacement** à deux doigts, molette sur ordinateur.
- **Apple Pencil** — pression et inclinaison, rejet de la paume.
- **Sauvegarde automatique** dans IndexedDB, reprise d'un coloriage en cours,
  galerie « Mes coloriages », signature au prénom de l'enfant.
- **10 coloriages licorne originaux**, classés en deux niveaux.

Chaque geste est également consigné dans un journal (`Editor.journal`) : c'est ce
qui permettra le rejeu accéléré et le réexport en 300 dpi sans refaire le moteur.

## Mise en ligne

Le dépôt se publie tout seul : **un tag Git déclenche la compilation et l'envoi
sur le VPS Ionos**, à l'adresse `https://tosca.walautao.fr`.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Le workflow [`deploy.yml`](.github/workflows/deploy.yml) compile, copie `dist/`
sur le serveur par rsync, vérifie que le site répond en 200, puis crée la
release GitHub avec l'archive du build. Chaque push sur `main` passe de son côté
par [`ci.yml`](.github/workflows/ci.yml) : types et compilation, rien de plus.

### Secrets à renseigner une seule fois

Dans **Settings → Secrets and variables → Actions** du dépôt :

| Secret | Contenu | Obligatoire |
| --- | --- | --- |
| `VPS_HOST` | l'IP ou le nom du VPS Ionos | oui |
| `VPS_USER` | l'utilisateur SSH de déploiement | oui |
| `VPS_SSH_KEY` | la **clé privée** correspondante, en entier | oui |
| `VPS_PATH` | dossier cible, `/var/www/tosca` par défaut | non |
| `VPS_PORT` | port SSH, `22` par défaut | non |
| `VPS_KNOWN_HOSTS` | sortie de `ssh-keyscan <host>` | recommandé |

Sans `VPS_KNOWN_HOSTS`, le runner accepte l'empreinte du serveur à l'aveugle au
premier contact. L'épingler ferme cette porte.

Créer une clé dédiée au déploiement plutôt que réutiliser une clé personnelle :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tosca_deploy -C "github-actions@toscacolor"
ssh-copy-id -i ~/.ssh/tosca_deploy.pub utilisateur@ip-du-vps
ssh-keyscan ip-du-vps            # à coller dans VPS_KNOWN_HOSTS
cat ~/.ssh/tosca_deploy          # à coller dans VPS_SSH_KEY
```

### Préparation du serveur, une fois

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx rsync
sudo mkdir -p /var/www/tosca && sudo chown -R $USER:www-data /var/www/tosca
sudo cp deploy/nginx-tosca.conf /etc/nginx/sites-available/tosca
sudo ln -s /etc/nginx/sites-available/tosca /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tosca.walautao.fr
```

Le HTTPS n'est pas optionnel : sans lui, pas de service worker, donc pas
d'installation sur l'écran d'accueil ni de mode hors ligne à l'étape 2.

Pour publier à la main, sans passer par un tag :
`./deploy/deploy.sh utilisateur@ip-du-vps`.

## Ce qui vient ensuite (étape 2)

Impression A4 300 dpi et export PDF, portail parental avant tout partage,
installation PWA et fonctionnement hors ligne, puis mise en ligne sur
`tosca.walautao.fr`.

## Structure

```
src/
  art/          les modèles, dessinés en SVG dans un repère 1000 x 1414
    shapes.ts   la boîte à outils de tracé (corne, oreille, nuage, fleur…)
    unicorns.ts les 10 pages du thème Licornes
  engine/
    floodFill.ts  remplissage par zone
    Editor.ts     calques, outils, historique, rendu
    storage.ts    IndexedDB
  components/   l'interface React
deploy/         configuration nginx et script de publication
```

### Ajouter un coloriage

Écrire une fonction qui renvoie `page([...])` dans `src/art/`, puis l'ajouter au
tableau du thème. **Toute forme doit être fermée** : un contour ouvert et le pot
de peinture fuit dans la page entière.

### Thèmes

Les thèmes sont volontairement génériques (licornes, animaux, océan, dinosaures,
super-héros originaux). Aucun personnage sous licence : une page de coloriage
reste une reproduction du personnage, même en noir et blanc.
