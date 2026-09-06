#!/usr/bin/env bash
# Publication de ToscaColor sur le VPS Ionos.
#   ./deploy/deploy.sh utilisateur@ip-du-vps
set -euo pipefail

TARGET="${1:?usage: ./deploy/deploy.sh utilisateur@ip-du-vps}"
REMOTE_DIR="/var/www/tosca"

cd "$(dirname "$0")/.."
npm run build
rsync -avz --delete dist/ "${TARGET}:${REMOTE_DIR}/"
echo "Publie sur ${TARGET}:${REMOTE_DIR} — https://tosca.walautao.fr"
