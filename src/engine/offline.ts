import { registerSW } from 'virtual:pwa-register'

/**
 * État du mode hors ligne.
 *
 * Tout ce dont l'application a besoin — le code, les polices, les coloriages,
 * qui sont dessinés par le programme et non téléchargés — tient dans le
 * préchargement. Une fois celui-ci terminé, l'enfant peut choisir un dessin,
 * couper le réseau et le mener jusqu'à l'impression sans jamais rien demander.
 */
export type OfflineState = 'preparation' | 'pret' | 'indisponible'

export function watchOffline(onChange: (state: OfflineState) => void) {
  // Un service worker exige une origine sécurisée : sans HTTPS, pas de hors ligne.
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    onChange('indisponible')
    return
  }
  // Une visite suivante : le worker contrôle déjà la page, tout est en cache.
  if (navigator.serviceWorker.controller) onChange('pret')

  registerSW({
    immediate: true,
    onOfflineReady: () => onChange('pret'),
    onRegisterError: () => onChange('indisponible'),
  })
}
