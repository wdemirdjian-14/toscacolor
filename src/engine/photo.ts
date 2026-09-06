import { PAPER_H, PAPER_W, makeCanvas, releaseCanvas } from './paper'

/**
 * Transformer une photo en coloriage.
 *
 * Tout se passe sur l'appareil : la photo d'un enfant ne part nulle part, ce qui
 * evite d'avoir a la proteger ailleurs, et permet de le faire sans reseau.
 *
 * La difficulte n'est pas de detecter les contours, c'est de les FERMER. Une
 * detection brute laisse des traits interrompus, et le pot de peinture s'echappe
 * alors dans toute la page : le coloriage est fichu des le premier remplissage.
 * D'ou la dilatation finale, qui epaissit et referme.
 */

export const PREVIEW_W = 620
export const PREVIEW_H = Math.round((PREVIEW_W * PAPER_H) / PAPER_W)

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image illisible'))
    }
    img.src = url
  })
}

interface Fitted {
  data: ImageData
  /** L'emprise de la photo dans la page : ses bords ne sont pas des contours. */
  rect: { x: number; y: number; w: number; h: number }
}

/** Pose la photo dans la page A4 sans rien couper, centree sur du blanc. */
function fitToPage(img: HTMLImageElement, w: number, h: number): Fitted {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  const k = Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * k
  const dh = img.naturalHeight * k
  ctx.imageSmoothingQuality = 'high'
  const dx = (w - dw) / 2
  const dy = (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
  return { data: ctx.getImageData(0, 0, w, h), rect: { x: dx, y: dy, w: dw, h: dh } }
}

/** Luminance, puis etalement du contraste : le seuil se comporte pareil sur toutes les photos. */
function luma(src: ImageData): Float32Array {
  const d = src.data
  const out = new Float32Array(src.width * src.height)
  let lo = 255
  let hi = 0
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const v = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]
    out[i] = v
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  const span = Math.max(1, hi - lo)
  for (let i = 0; i < out.length; i++) out[i] = ((out[i] - lo) / span) * 255
  return out
}

/** Flou par moyenne glissante, sépare en horizontal puis vertical. */
function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  const win = r * 2 + 1
  for (let y = 0; y < h; y++) {
    const row = y * w
    let sum = 0
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / win
      sum -= src[row + Math.min(w - 1, Math.max(0, x - r))]
      sum += src[row + Math.min(w - 1, Math.max(0, x + r + 1))]
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / win
      sum -= tmp[Math.min(h - 1, Math.max(0, y - r)) * w + x]
      sum += tmp[Math.min(h - 1, Math.max(0, y + r + 1)) * w + x]
    }
  }
  return out
}

/** Trois passes de moyenne glissante : une bonne approximation du flou gaussien,
 *  et à coût constant quel que soit le rayon. */
function blur3(src: Float32Array, w: number, h: number, r: number): Float32Array {
  return blur(blur(blur(src, w, h, r), w, h, r), w, h, r)
}

interface Gradient {
  mag: Float32Array
  gx: Float32Array
  gy: Float32Array
}

/** Sobel, en conservant les composantes : la direction sert à affiner le trait. */
function gradients(src: Float32Array, w: number, h: number): Gradient {
  const mag = new Float32Array(src.length)
  const gx = new Float32Array(src.length)
  const gy = new Float32Array(src.length)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const a = src[i - w - 1]
      const b = src[i - w]
      const c = src[i - w + 1]
      const d = src[i - 1]
      const f = src[i + 1]
      const g = src[i + w - 1]
      const j = src[i + w]
      const k = src[i + w + 1]
      const dx = a + 2 * d + g - (c + 2 * f + k)
      const dy = a + 2 * b + c - (g + 2 * j + k)
      gx[i] = dx
      gy[i] = dy
      mag[i] = Math.hypot(dx, dy)
    }
  }
  return { mag, gx, gy }
}

/**
 * Affinage : on ne garde que la crête du contour.
 *
 * Un seuil brut sur l'amplitude donne des bourrelets de plusieurs pixels, aux
 * bords dentelés. Ici chaque pixel n'est conservé que s'il est le maximum local
 * dans la direction du gradient : il reste un trait d'un pixel, propre, qu'on
 * épaissit ensuite volontairement à la largeur voulue.
 */
function nonMax(g: Gradient, w: number, h: number): Float32Array {
  const { mag, gx, gy } = g
  const out = new Float32Array(mag.length)
  // tan(22,5°) : au-delà de ce rapport, le gradient est franchement horizontal.
  const DIAG = 2.4142
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const m = mag[i]
      if (m <= 0) continue
      const ax = Math.abs(gx[i])
      const ay = Math.abs(gy[i])
      let n1: number
      let n2: number
      if (ax > ay * DIAG) {
        n1 = mag[i - 1]
        n2 = mag[i + 1]
      } else if (ay > ax * DIAG) {
        n1 = mag[i - w]
        n2 = mag[i + w]
      } else if (gx[i] * gy[i] > 0) {
        n1 = mag[i - w - 1]
        n2 = mag[i + w + 1]
      } else {
        n1 = mag[i - w + 1]
        n2 = mag[i + w - 1]
      }
      if (m >= n1 && m >= n2) out[i] = m
    }
  }
  return out
}

/**
 * Double seuil avec propagation.
 *
 * C'est ce qui répare les traits interrompus sans ramener le bruit : les pixels
 * francs amorcent le contour, les pixels faibles ne sont gardés que s'ils se
 * rattachent à un pixel franc. Un point de grain isolé, lui, reste faible et
 * seul, donc il tombe.
 */
function hysteresis(thin: Float32Array, w: number, h: number, high: number, low: number): Uint8Array {
  const out = new Uint8Array(thin.length)
  const stack: number[] = []
  for (let i = 0; i < thin.length; i++) {
    if (thin[i] >= high) {
      out[i] = 1
      stack.push(i)
    }
  }
  while (stack.length) {
    const i = stack.pop()!
    const x = i % w
    const y = (i / w) | 0
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy
      if (yy < 1 || yy >= h - 1) continue
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx
        if (xx < 1 || xx >= w - 1) continue
        const j = yy * w + xx
        if (!out[j] && thin[j] >= low) {
          out[j] = 1
          stack.push(j)
        }
      }
    }
  }
  return out
}

/**
 * Efface les zones grouillantes.
 *
 * C'est la vraie difference entre un contour et une texture. Une meche de
 * cheveux, un pull tricote, un feuillage produisent des traits parfaitement
 * francs : ni le seuil ni la longueur ne les distinguent d'un contour de
 * visage. Leur densite, si — dans une touffe, un pixel sur trois est un
 * contour, alors qu'un vrai contour est une ligne seule au milieu du vide.
 *
 * Et une zone qu'on ne peut pas colorier n'a rien a faire sur un coloriage.
 */
function clearBusyAreas(
  edge: Uint8Array,
  w: number,
  h: number,
  radius: number,
  maxDensity: number,
): Uint8Array {
  const f = new Float32Array(edge.length)
  for (let i = 0; i < edge.length; i++) f[i] = edge[i]
  const density = blur(f, w, h, radius)
  const out = new Uint8Array(edge.length)
  for (let i = 0; i < out.length; i++) out[i] = density[i] > maxDensity ? 0 : edge[i]
  return out
}

/**
 * Agrandit le masque de contours vers la resolution de sortie.
 *
 * La detection se fait en petit, volontairement : c'est ce qui fait disparaitre
 * la texture — une meche de cheveux, le grain d'un pull, le feuillage d'un
 * arbre — tout en gardant les formes qui comptent. Le trait, lui, est fabrique
 * ensuite a la taille voulue, donc il reste net a l'impression.
 */
function upscaleMask(edge: Uint8Array, sw: number, sh: number, w: number, h: number): Uint8Array {
  const small = makeCanvas(sw, sh)
  const sctx = small.getContext('2d')!
  const img = sctx.createImageData(sw, sh)
  for (let i = 0; i < edge.length; i++) if (edge[i]) img.data[i * 4 + 3] = 255
  sctx.putImageData(img, 0, 0)

  const big = makeCanvas(w, h)
  const bctx = big.getContext('2d', { willReadFrequently: true })!
  bctx.imageSmoothingEnabled = true
  bctx.imageSmoothingQuality = 'high'
  bctx.drawImage(small, 0, 0, w, h)
  const data = bctx.getImageData(0, 0, w, h).data
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] >= 80 ? 1 : 0
  releaseCanvas(small)
  releaseCanvas(big)
  return out
}

/** Adoucit le contour du trait : moyenne locale puis re-seuillage. */
function smoothMask(edge: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r < 1) return edge
  const f = new Float32Array(edge.length)
  for (let i = 0; i < edge.length; i++) f[i] = edge[i]
  const soft = blur(f, w, h, r)
  const out = new Uint8Array(edge.length)
  for (let i = 0; i < out.length; i++) out[i] = soft[i] >= 0.45 ? 1 : 0
  return out
}

/**
 * Seuil par percentile, via un histogramme : trier huit millions de valeurs
 * couterait bien plus cher, et la precision d'un millieme suffit ici.
 */
function percentile(mag: Float32Array, keep: number): number {
  const BINS = 1024
  let max = 0
  for (let i = 0; i < mag.length; i++) if (mag[i] > max) max = mag[i]
  if (max <= 0) return Infinity
  const hist = new Uint32Array(BINS)
  for (let i = 0; i < mag.length; i++) hist[Math.min(BINS - 1, ((mag[i] / max) * (BINS - 1)) | 0)]++
  const target = mag.length * keep
  let acc = 0
  for (let b = BINS - 1; b >= 0; b--) {
    acc += hist[b]
    if (acc >= target) return (b / (BINS - 1)) * max
  }
  return 0
}

/**
 * Supprime les petits amas.
 *
 * Retirer les pixels isolés ne suffit pas : le grain d'une photo produit des
 * paquets de trois ou quatre pixels qui survivent et mouchettent toute la page.
 * On mesure donc chaque tache, et on jette celles qui sont trop petites pour
 * être un contour. Les vrais traits, eux, forment de longues chaînes.
 */
function removeSmallBlobs(edge: Uint8Array, w: number, h: number, minArea: number): Uint8Array {
  const seen = new Uint8Array(edge.length)
  const out = new Uint8Array(edge.length)
  out.set(edge)
  const stack: number[] = []
  const blob: number[] = []

  for (let start = 0; start < edge.length; start++) {
    if (!edge[start] || seen[start]) continue
    stack.length = 0
    blob.length = 0
    stack.push(start)
    seen[start] = 1

    let big = false
    while (stack.length) {
      const i = stack.pop()!
      if (!big) {
        blob.push(i)
        // Au-delà du seuil, inutile de retenir la tache : on sait qu'elle reste.
        if (blob.length >= minArea) big = true
      }
      const x = i % w
      const y = (i / w) | 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          const j = yy * w + xx
          if (edge[j] && !seen[j]) {
            seen[j] = 1
            stack.push(j)
          }
        }
      }
    }
    if (!big) for (const i of blob) out[i] = 0
  }
  return out
}

/** Épaissit le trait, ce qui referme du même coup les contours interrompus. */
function dilate(edge: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r < 1) return edge
  // Séparable : horizontal puis vertical. Un carré de 7×7 coûte 14 écritures
  // par pixel au lieu de 49 — ce qui compte sur les huit millions de pixels
  // d'un A4 à 300 dpi.
  const mid = new Uint8Array(edge.length)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      if (!edge[row + x]) continue
      const from = Math.max(0, x - r)
      const to = Math.min(w - 1, x + r)
      for (let i = from; i <= to; i++) mid[row + i] = 1
    }
  }
  const out = new Uint8Array(edge.length)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (!mid[y * w + x]) continue
      const from = Math.max(0, y - r)
      const to = Math.min(h - 1, y + r)
      for (let i = from; i <= to; i++) out[i * w + x] = 1
    }
  }
  return out
}

/**
 * `detail` va de 0 (les grandes formes seulement) à 1 (tous les petits contours).
 * Le résultat est un trait noir sur fond transparent, comme un modèle vectoriel
 * rasterisé : le reste du moteur ne fait aucune différence.
 */
export function photoToLineArt(
  img: HTMLImageElement,
  detail: number,
  w = PAPER_W,
  h = PAPER_H,
): HTMLCanvasElement {
  // La détection se fait toujours en petit, quelle que soit la taille demandée.
  // C'est ce qui distingue une forme d'une texture : à 500 pixels de large, une
  // mèche de cheveux n'est plus un contour, alors qu'un visage en reste un. Le
  // curseur élargit cette fenêtre — plus elle est grande, plus les petits
  // détails redeviennent des contours.
  // La plage est volontairement étroite : au-delà, une photo un peu texturée
  // vire au grouillement et ne se colorie plus. Mieux vaut un curseur dont
  // toute la course sert que dix pour cent d'utile et le reste illisible.
  const dw = Math.round(380 + detail * 120)
  const dh = Math.round((dw * h) / w)

  const { data: src, rect } = fitToPage(img, dw, dh)
  const gray = luma(src)
  const smoothed = blur3(gray, dw, dh, 2)
  const grad = gradients(smoothed, dw, dh)
  const thin = nonMax(grad, dw, dh)

  // Le seuil haut amorce les contours, le seuil bas rattache leurs portions
  // faibles. C'est ce qui répare un trait interrompu sans ramener le grain.
  const high = percentile(thin, 0.018 + detail * 0.009)
  let edge: Uint8Array = hysteresis(thin, dw, dh, high, high * 0.38)

  // Le bord de la photo contre la marge blanche est un contour très franc, mais
  // ce n'est pas un contour du sujet : on l'efface pour ne pas encadrer la page.
  const band = 3
  const clearRows = (a: number, b: number) => {
    for (let y = Math.max(0, Math.round(a)); y <= Math.min(dh - 1, Math.round(b)); y++) {
      edge.fill(0, y * dw, y * dw + dw)
    }
  }
  const clearCols = (a: number, b: number) => {
    const x0 = Math.max(0, Math.round(a))
    const x1 = Math.min(dw - 1, Math.round(b))
    for (let y = 0; y < dh; y++) for (let x = x0; x <= x1; x++) edge[y * dw + x] = 0
  }
  clearRows(rect.y - band, rect.y + band)
  clearRows(rect.y + rect.h - band, rect.y + rect.h + band)
  clearCols(rect.x - band, rect.x + band)
  clearCols(rect.x + rect.w - band, rect.x + rect.w + band)

  // Le grouillement d'abord, les miettes ensuite : nettoyer une touffe laisse
  // des fragments qu'il faut ramasser dans la foulée.
  edge = clearBusyAreas(edge, dw, dh, Math.max(6, Math.round(dw / 44)), 0.17 + detail * 0.11)
  // Un contour est une longue chaîne ; une tache courte est du grain.
  edge = removeSmallBlobs(edge, dw, dh, 30)

  // Passage à la résolution demandée, puis fabrication du trait. L'épaisseur
  // suit la page et non la détection : même dessin à l'écran et sur le papier.
  const unit = w / PAPER_W
  edge = upscaleMask(edge, dw, dh, w, h)
  edge = dilate(edge, w, h, Math.max(1, Math.round(1.6 * unit)))
  edge = smoothMask(edge, w, h, Math.max(1, Math.round(1.2 * unit)))

  const out = makeCanvas(w, h)
  const octx = out.getContext('2d')!
  const dst = octx.createImageData(w, h)
  const dd = dst.data
  for (let i = 0, p = 0; i < edge.length; i++, p += 4) {
    if (edge[i]) {
      dd[p] = 0x23
      dd[p + 1] = 0x1f
      dd[p + 2] = 0x2b
      dd[p + 3] = 255
    }
  }
  octx.putImageData(dst, 0, 0)
  return out
}
