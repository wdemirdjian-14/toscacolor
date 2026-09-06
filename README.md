# ToscaColor

Application de coloriage pour les 5-15 ans. Mobile-first, pensée iPad et iPhone.
Tout reste sur l'appareil : aucun compte, aucune publicité, aucun envoi réseau.

## Lancer en local

```bash
npm install
npm run dev
```

## État : étapes 1 et 2 terminées

### Le moteur

- **Pot de peinture** — remplissage par zone borné par le trait du modèle, avec
  dilatation d'un pixel pour supprimer le liseré blanc le long des contours.
- **Deux calques** — la couleur est peinte *sous* le trait noir. La gomme ne peut
  donc jamais entamer le modèle.
- **Mode facile** — le pinceau est bridé à la zone touchée en premier : l'enfant
  ne dépasse pas.
- **Pinceau par défaut**, puis pot, crayon, feutre, gomme ; trois épaisseurs, 30 couleurs dont six à
  paillettes. Le semis de paillettes est déterministe : chaque geste porte sa
  graine, donc les mêmes éclats retombent au même endroit à l'écran, après une
  annulation, et sur l'impression 300 dpi.
- **Annuler / refaire** sur 40 étapes, par retouche de la zone modifiée
  (l'historique ne consomme pas toute la mémoire).
- **Zoom et déplacement** à deux doigts, molette sur ordinateur.
- **Apple Pencil** — pression et inclinaison, rejet de la paume.
- **Journal des gestes** — chaque action est consignée puis sauvegardée avec
  l'œuvre. C'est lui qui permet de réimprimer en 300 dpi, et il ouvrira la voie
  au rejeu accéléré.

### L'atelier

- **Plein écran** : le dessin occupe tout l'écran et les outils passent
  au-dessus, dans une barre flottante qu'on déplace par sa poignée — sa place
  est retenue d'une fois sur l'autre, parce qu'aucune position par défaut ne
  convient à tous les dessins.
- **La palette occupe la première ligne**, les paillettes en tête : c'est ce
  qu'un enfant cherche en premier. Les ustensiles sont descendus dans un menu
  qui se déplie vers le haut, chacun avec sa couleur.
- **Sauvegarde automatique** dans IndexedDB, reprise d'un coloriage en cours,
  galerie « Mes coloriages », signature au prénom de l'enfant.
- **10 coloriages licorne originaux**, classés en deux niveaux.

### Une photo en coloriage

Un enfant choisit une photo, un curseur règle la quantité de détails, et
l'aperçu se met à jour immédiatement. Tout se calcule sur l'appareil : la photo
n'est envoyée nulle part et ça fonctionne sans réseau.

Le traitement enchaîne luminance et étalement du contraste, flou, gradient de
Sobel, seuil par percentile piloté par le curseur, puis trois nettoyages qui
font toute la différence :

- **suppression des petits amas** — retirer les pixels isolés ne suffit pas, le
  grain d'une photo produit des paquets de trois ou quatre pixels qui
  mouchettent la page ; on mesure chaque tache et on jette les trop petites ;
- **effacement du bord de la photo**, qui est un contour franc mais n'appartient
  pas au sujet ;
- **dilatation du trait**, qui referme les contours interrompus. C'est le point
  critique : sans elle, le pot de peinture s'échappe au premier remplissage et
  le coloriage est fichu.

Le modèle est produit d'emblée en 300 dpi, donc une photo s'imprime aussi net
qu'un coloriage de la bibliothèque. Comptez quelques secondes de fabrication.

### Sortie et impression

- **Impression A4 à 300 dpi** (2480 × 3508 px). Le calque d'écran n'est pas
  agrandi : le modèle est rerasterisé depuis le SVG et les gestes sont rejoués à
  l'échelle, donc le trait reste net. Sur iPad, la boîte d'impression de Safari
  propose « Enregistrer en PDF » — c'est l'export PDF, sans dépendance.
- **Partage natif** (Photos, Fichiers, Mail, AirDrop) quand l'appareil le
  propose, téléchargement classique sinon.
- **Signature** — prénom et date posés sur l'œuvre au moment de la sortie.
- **Portail parental** devant l'impression, l'envoi et l'effacement total : une
  multiplication, valable deux minutes pour ne pas la redemander à chaque geste.

### Installation et hors ligne

L'application est **entièrement autonome**. Les coloriages sont dessinés par le
programme, pas téléchargés ; les polices sont embarquées dans le bundle ; la
sauvegarde, l'impression et le partage se font sur l'appareil. Une fois la page
ouverte une première fois, **aucune requête ne part vers le réseau** — vérifié :
zéro requête externe au chargement.

Le service worker précharge les 18 fichiers de l'application dès la première
visite. Un bandeau dans la bibliothèque dit où on en est :

| Ce qui s'affiche | Ce que ça veut dire |
| --- | --- |
| `Préparation…` | le préchargement est en cours, quelques secondes |
| `✓ Marche sans réseau` | tout est sur l'appareil, le Wi-Fi peut être coupé |
| `Réseau nécessaire` | pas de HTTPS : le service worker ne peut pas s'installer |

Installable sur l'écran d'accueil (manifeste, icônes, mode `standalone`, aucune
orientation forcée), ce qui masque la barre Safari et empêche du même coup
l'enfant de sortir de l'application d'un geste.

Testé serveur arrêté : la page se recharge, les dix coloriages s'ouvrent, les
paillettes fonctionnent, et l'export 300 dpi sort normalement.

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
apt update && apt install -y nginx certbot python3-certbot-nginx rsync
mkdir -p /var/www/tosca
curl -fsSL https://raw.githubusercontent.com/wdemirdjian-14/toscacolor/main/deploy/nginx-tosca-app.conf \
  > /etc/nginx/snippets/tosca-app.conf
curl -fsSL https://raw.githubusercontent.com/wdemirdjian-14/toscacolor/main/deploy/nginx-tosca.conf \
  > /etc/nginx/sites-available/tosca
ln -sf /etc/nginx/sites-available/tosca /etc/nginx/sites-enabled/tosca
nginx -t && systemctl reload nginx
certbot --nginx -d tosca.walautao.fr
```

Le HTTPS n'est pas optionnel : sans lui, le service worker ne s'enregistre pas,
donc ni installation sur l'écran d'accueil ni mode hors ligne.

Le compte de déploiement, à créer une fois lui aussi, n'a ni mot de passe ni
sudo et ne peut écrire que dans le dossier du site :

```bash
useradd -m -s /bin/bash tosca
mkdir -p /home/tosca/.ssh && chmod 700 /home/tosca/.ssh
echo "<clé publique de déploiement>" > /home/tosca/.ssh/authorized_keys
chmod 600 /home/tosca/.ssh/authorized_keys
chown -R tosca:tosca /home/tosca/.ssh
chown -R tosca:www-data /var/www/tosca
```

### Mettre à jour la configuration nginx

Seul le snippet se remplace. **Ne jamais réécrire le vhost** une fois le
certificat émis : il contient les blocs de Certbot.

```bash
curl -fsSL https://raw.githubusercontent.com/wdemirdjian-14/toscacolor/main/deploy/nginx-tosca-app.conf \
  > /etc/nginx/snippets/tosca-app.conf
nginx -t && systemctl reload nginx
```

Pour publier à la main, sans passer par un tag :
`./deploy/deploy.sh utilisateur@ip-du-vps`.

## Ce qui vient ensuite

Coloriage par numéros, autocollants et tampons, rejeu accéléré du coloriage,
photo et dessin transformés en modèle, et les thèmes suivants.

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
