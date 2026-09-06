/**
 * Sortie du coloriage : signature, impression A4 et partage.
 * Tout se fait dans le navigateur ; rien n'est televerse nulle part.
 */

/** Pose le prenom et la date sur l'oeuvre, en bas a droite. */
export function stampSignature(canvas: HTMLCanvasElement, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const ctx = canvas.getContext('2d')!
  const size = Math.round(canvas.height * 0.022)
  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  ctx.save()
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#231f2b'
  ctx.font = `600 ${size}px "Baloo 2", cursive`
  ctx.fillText(trimmed, canvas.width - size * 2, canvas.height - size * 2.6)
  ctx.fillStyle = '#6e6880'
  ctx.font = `400 ${Math.round(size * 0.62)}px "Nunito", sans-serif`
  ctx.fillText(date, canvas.width - size * 2, canvas.height - size * 1.4)
  ctx.restore()
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export impossible'))), 'image/png')
  })
}

/**
 * Impression pleine page.
 *
 * L'image est posee dans un conteneur que la feuille d'impression est seule a
 * afficher, puis retiree. Sur iPad, la boite d'impression de Safari propose
 * aussi « Enregistrer en PDF » : c'est notre export PDF, sans dependance.
 */
export function printImage(dataUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const holder = document.createElement('div')
    holder.id = 'print-area'
    const img = new Image()
    holder.appendChild(img)

    const cleanup = () => {
      holder.remove()
      resolve()
    }
    img.onload = () => {
      document.body.appendChild(holder)
      // Laisser Safari peindre l'image avant d'ouvrir la boite d'impression.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.print()
          setTimeout(cleanup, 800)
        }),
      )
    }
    img.onerror = cleanup
    img.src = dataUrl
  })
}

/**
 * Partage natif quand l'appareil le propose (Photos, Fichiers, Mail, AirDrop),
 * telechargement classique sinon.
 */
export async function shareImage(blob: Blob, filename: string): Promise<'partage' | 'telecharge'> {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mon coloriage' })
      return 'partage'
    } catch (e) {
      // L'enfant a annule la feuille de partage : ce n'est pas une erreur.
      if ((e as DOMException)?.name === 'AbortError') return 'partage'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'telecharge'
}

/** Nom de fichier lisible : « coloriage-tete-de-licorne-lina.png ». */
export function fileName(title: string, who: string) {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  return ['coloriage', clean(title), clean(who)].filter(Boolean).join('-') + '.png'
}
