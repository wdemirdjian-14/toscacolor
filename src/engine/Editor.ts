import { computeRegion, hexToRgb, paintRegion, regionToCanvas } from './floodFill'
import { PAPER_H, PAPER_W, buildMask, makeCanvas, rasterizeLineArt } from './paper'

export type ToolId = 'bucket' | 'brush' | 'pencil' | 'marker' | 'eraser'

export interface ToolSpec {
  id: ToolId
  label: string
  /** Opacite appliquee au moment ou le trait est depose sur le calque couleur. */
  alpha: number
  /** Le trait suit-il la pression de l'Apple Pencil ? */
  pressure: boolean
}

export const TOOLS: Record<ToolId, ToolSpec> = {
  bucket: { id: 'bucket', label: 'Pot', alpha: 1, pressure: false },
  brush: { id: 'brush', label: 'Pinceau', alpha: 1, pressure: true },
  pencil: { id: 'pencil', label: 'Crayon', alpha: 1, pressure: true },
  marker: { id: 'marker', label: 'Feutre', alpha: 0.45, pressure: false },
  eraser: { id: 'eraser', label: 'Gomme', alpha: 1, pressure: false },
}

/** Une action, conservee pour rejouer le coloriage et le reexporter plus finement. */
export type JournalOp =
  | { t: 'fill'; color: string; x: number; y: number }
  | { t: 'stroke'; tool: ToolId; color: string; size: number; easy: boolean; pts: number[] }

interface Patch {
  x: number
  y: number
  before: ImageData
  after: ImageData
}

interface Pt {
  x: number
  y: number
  p: number
}

export class Editor {
  readonly display: HTMLCanvasElement
  private dctx: CanvasRenderingContext2D

  private color = makeCanvas()
  private cctx = this.color.getContext('2d', { willReadFrequently: true })!
  private stroke = makeCanvas()
  private sctx = this.stroke.getContext('2d')!
  private preStroke = makeCanvas()
  private lineArt: HTMLCanvasElement | null = null
  private mask: Uint8Array | null = null

  // outils
  tool: ToolId = 'bucket'
  colorHex = '#E4335A'
  size = 26
  easy = true

  // vue
  private scale = 1
  private tx = 0
  private ty = 0

  // geste en cours
  private pointers = new Map<number, { x: number; y: number }>()
  private drawingId: number | null = null
  private pts: Pt[] = []
  private strokeBox = { x0: 0, y0: 0, x1: 0, y1: 0 }
  private clipCanvas: HTMLCanvasElement | null = null
  private pinch: { dist: number; cx: number; cy: number } | null = null

  // historique
  private undoStack: Patch[] = []
  private redoStack: Patch[] = []
  journal: JournalOp[] = []

  private frame = 0
  onChange: (() => void) | null = null

  constructor(display: HTMLCanvasElement) {
    this.display = display
    this.dctx = display.getContext('2d')!
    this.cctx.clearRect(0, 0, PAPER_W, PAPER_H)
    this.bind()
  }

  // ---------------------------------------------------------------- modele

  async loadPaper(svg: string, savedPng?: string) {
    this.lineArt = await rasterizeLineArt(svg)
    this.mask = buildMask(this.lineArt)
    this.cctx.clearRect(0, 0, PAPER_W, PAPER_H)
    this.undoStack = []
    this.redoStack = []
    this.journal = []
    if (savedPng) await this.restore(savedPng)
    this.fitToScreen()
    this.invalidate()
  }

  private restore(png: string) {
    return new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        this.cctx.drawImage(img, 0, 0, PAPER_W, PAPER_H)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = png
    })
  }

  // ------------------------------------------------------------------- vue

  resize() {
    const rect = this.display.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    this.display.width = Math.round(rect.width * dpr)
    this.display.height = Math.round(rect.height * dpr)
    this.fitToScreen()
    this.invalidate()
  }

  fitToScreen() {
    const rect = this.display.getBoundingClientRect()
    if (!rect.width) return
    const pad = 16
    this.scale = Math.min((rect.width - pad * 2) / PAPER_W, (rect.height - pad * 2) / PAPER_H)
    this.tx = (rect.width - PAPER_W * this.scale) / 2
    this.ty = (rect.height - PAPER_H * this.scale) / 2
  }

  private toPaper(clientX: number, clientY: number) {
    const rect = this.display.getBoundingClientRect()
    return {
      x: (clientX - rect.left - this.tx) / this.scale,
      y: (clientY - rect.top - this.ty) / this.scale,
    }
  }

  private clampView() {
    const rect = this.display.getBoundingClientRect()
    const minScale = Math.min((rect.width - 32) / PAPER_W, (rect.height - 32) / PAPER_H)
    this.scale = Math.max(minScale, Math.min(this.scale, minScale * 12))
    const w = PAPER_W * this.scale
    const h = PAPER_H * this.scale
    const marginX = Math.max(0, (rect.width - w) / 2)
    const marginY = Math.max(0, (rect.height - h) / 2)
    this.tx = w <= rect.width ? marginX : Math.min(0, Math.max(rect.width - w, this.tx))
    this.ty = h <= rect.height ? marginY : Math.min(0, Math.max(rect.height - h, this.ty))
  }

  // -------------------------------------------------------------- pointeurs

  private bind() {
    const el = this.display
    el.style.touchAction = 'none'
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onUp)
    el.addEventListener('pointerleave', this.onUp)
    el.addEventListener('wheel', this.onWheel, { passive: false })
  }

  destroy() {
    const el = this.display
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointercancel', this.onUp)
    el.removeEventListener('pointerleave', this.onUp)
    el.removeEventListener('wheel', this.onWheel)
  }

  /** Un stylet actif rend la main posee sur l'ecran non pertinente. */
  private penActive = false

  private onDown = (e: PointerEvent) => {
    try {
      this.display.setPointerCapture(e.pointerId)
    } catch {
      /* pointeur synthetique : sans capture, on dessine quand meme */
    }
    if (e.pointerType === 'pen') this.penActive = true
    if (this.penActive && e.pointerType === 'touch' && this.drawingId !== null) return

    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (this.pointers.size >= 2) {
      this.abortStroke()
      this.startPinch()
      return
    }
    if (this.pinch) return

    const p = this.toPaper(e.clientX, e.clientY)
    if (p.x < 0 || p.y < 0 || p.x >= PAPER_W || p.y >= PAPER_H) return

    if (this.tool === 'bucket') {
      this.fillAt(p.x, p.y)
      return
    }
    this.drawingId = e.pointerId
    this.beginStroke(p, e.pressure || 0.5)
  }

  private onMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (this.pinch) {
      this.updatePinch()
      return
    }
    if (e.pointerId !== this.drawingId) return

    // Sur iPad, un seul pointermove porte plusieurs echantillons : on les prend tous.
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e]
    for (const ev of events.length ? events : [e]) {
      const p = this.toPaper(ev.clientX, ev.clientY)
      this.extendStroke(p, ev.pressure || 0.5)
    }
    this.invalidate()
  }

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId)
    if (this.pointers.size < 2 && this.pinch) {
      this.pinch = null
    }
    if (e.pointerId === this.drawingId) this.endStroke()
    if (e.pointerType === 'pen') this.penActive = false
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = this.display.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const k = Math.exp(-e.deltaY * 0.0015)
    this.zoomAround(cx, cy, k)
  }

  private zoomAround(cx: number, cy: number, k: number) {
    const before = this.scale
    this.scale *= k
    this.clampView()
    const applied = this.scale / before
    this.tx = cx - (cx - this.tx) * applied
    this.ty = cy - (cy - this.ty) * applied
    this.clampView()
    this.invalidate()
  }

  private startPinch() {
    const [a, b] = [...this.pointers.values()]
    const rect = this.display.getBoundingClientRect()
    this.pinch = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      cx: (a.x + b.x) / 2 - rect.left,
      cy: (a.y + b.y) / 2 - rect.top,
    }
  }

  private updatePinch() {
    if (this.pointers.size < 2 || !this.pinch) return
    const [a, b] = [...this.pointers.values()]
    const rect = this.display.getBoundingClientRect()
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const cx = (a.x + b.x) / 2 - rect.left
    const cy = (a.y + b.y) / 2 - rect.top

    this.tx += cx - this.pinch.cx
    this.ty += cy - this.pinch.cy
    this.pinch.cx = cx
    this.pinch.cy = cy

    if (this.pinch.dist > 0) {
      this.zoomAround(cx, cy, dist / this.pinch.dist)
    }
    this.pinch.dist = dist
    this.clampView()
    this.invalidate()
  }

  // ----------------------------------------------------------------- outils

  private fillAt(x: number, y: number) {
    if (!this.mask) return
    const region = computeRegion(this.mask, PAPER_W, PAPER_H, x, y)
    if (!region) return
    const patch = this.capture(region.x0, region.y0, region.x1, region.y1, () => {
      paintRegion(this.cctx, this.mask!, PAPER_W, region, hexToRgb(this.colorHex))
    })
    if (patch) this.push(patch)
    this.journal.push({ t: 'fill', color: this.colorHex, x: Math.round(x), y: Math.round(y) })
    this.invalidate()
    this.onChange?.()
  }

  private beginStroke(p: { x: number; y: number }, pressure: number) {
    this.sctx.clearRect(0, 0, PAPER_W, PAPER_H)
    this.pts = [{ x: p.x, y: p.y, p: pressure }]
    this.strokeBox = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
    this.clipCanvas = null

    // Mode facile : le trait est bride a la zone touchee en premier.
    if (this.easy && this.mask && this.tool !== 'eraser') {
      const region = computeRegion(this.mask, PAPER_W, PAPER_H, p.x, p.y, true)
      if (region) this.clipCanvas = regionToCanvas(region, PAPER_W, PAPER_H)
    }
    if (this.tool === 'eraser') {
      this.preStroke.getContext('2d')!.clearRect(0, 0, PAPER_W, PAPER_H)
      this.preStroke.getContext('2d')!.drawImage(this.color, 0, 0)
    }
    this.drawSegment()
    this.invalidate()
  }

  private extendStroke(p: { x: number; y: number }, pressure: number) {
    const last = this.pts[this.pts.length - 1]
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return
    this.pts.push({ x: p.x, y: p.y, p: pressure })
    this.strokeBox.x0 = Math.min(this.strokeBox.x0, p.x)
    this.strokeBox.y0 = Math.min(this.strokeBox.y0, p.y)
    this.strokeBox.x1 = Math.max(this.strokeBox.x1, p.x)
    this.strokeBox.y1 = Math.max(this.strokeBox.y1, p.y)
    this.drawSegment()
  }

  /** Trace le dernier segment, lisse par une quadratique passant par les milieux. */
  private drawSegment() {
    const n = this.pts.length
    const spec = TOOLS[this.tool]
    const ctx = this.tool === 'eraser' ? this.cctx : this.sctx

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (this.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.fillStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.strokeStyle = this.colorHex
      ctx.fillStyle = this.colorHex
    }

    const width = (p: number) => (spec.pressure ? this.size * (0.45 + p * 1.1) : this.size)

    if (n === 1) {
      const a = this.pts[0]
      ctx.beginPath()
      ctx.arc(a.x, a.y, width(a.p) / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const a = this.pts[n - 2]
      const b = this.pts[n - 1]
      ctx.lineWidth = width(b.p)
      ctx.beginPath()
      if (n === 2) {
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
      } else {
        const z = this.pts[n - 3]
        ctx.moveTo((z.x + a.x) / 2, (z.y + a.y) / 2)
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
      }
      ctx.stroke()
    }
    ctx.restore()

    if (this.clipCanvas && this.tool !== 'eraser') this.applyClip()
  }

  /** Rogne le trait sur la zone, en se limitant a la portion qui vient d'etre tracee. */
  private applyClip() {
    const n = this.pts.length
    const a = this.pts[Math.max(0, n - 3)]
    const b = this.pts[n - 1]
    const pad = this.size * 1.5 + 4
    const x = Math.min(a.x, b.x) - pad
    const y = Math.min(a.y, b.y) - pad
    const w = Math.abs(b.x - a.x) + pad * 2
    const h = Math.abs(b.y - a.y) + pad * 2

    this.sctx.save()
    this.sctx.beginPath()
    this.sctx.rect(x, y, w, h)
    this.sctx.clip()
    this.sctx.globalCompositeOperation = 'destination-in'
    this.sctx.drawImage(this.clipCanvas!, 0, 0)
    this.sctx.restore()
  }

  private endStroke() {
    if (this.drawingId === null) return
    this.drawingId = null
    if (!this.pts.length) return

    const pad = this.size * 1.6 + 6
    const x0 = Math.max(0, Math.floor(this.strokeBox.x0 - pad))
    const y0 = Math.max(0, Math.floor(this.strokeBox.y0 - pad))
    const x1 = Math.min(PAPER_W - 1, Math.ceil(this.strokeBox.x1 + pad))
    const y1 = Math.min(PAPER_H - 1, Math.ceil(this.strokeBox.y1 + pad))

    if (this.tool === 'eraser') {
      // Le calque couleur a deja ete entame : l'etat d'avant vient de la copie.
      const before = this.preStroke
        .getContext('2d')!
        .getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
      const after = this.cctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
      this.push({ x: x0, y: y0, before, after })
    } else {
      const patch = this.capture(x0, y0, x1, y1, () => {
        this.cctx.save()
        this.cctx.globalAlpha = TOOLS[this.tool].alpha
        this.cctx.drawImage(this.stroke, 0, 0)
        this.cctx.restore()
      })
      if (patch) this.push(patch)
    }

    this.journal.push({
      t: 'stroke',
      tool: this.tool,
      color: this.colorHex,
      size: this.size,
      easy: this.easy,
      pts: this.pts.flatMap((p) => [Math.round(p.x), Math.round(p.y), Math.round(p.p * 100)]),
    })

    this.pts = []
    this.clipCanvas = null
    this.sctx.clearRect(0, 0, PAPER_W, PAPER_H)
    this.invalidate()
    this.onChange?.()
  }

  private abortStroke() {
    this.drawingId = null
    this.pts = []
    this.clipCanvas = null
    this.sctx.clearRect(0, 0, PAPER_W, PAPER_H)
    this.invalidate()
  }

  // ------------------------------------------------------------ historique

  private capture(x0: number, y0: number, x1: number, y1: number, apply: () => void): Patch | null {
    const w = x1 - x0 + 1
    const h = y1 - y0 + 1
    if (w <= 0 || h <= 0) return null
    const before = this.cctx.getImageData(x0, y0, w, h)
    apply()
    const after = this.cctx.getImageData(x0, y0, w, h)
    return { x: x0, y: y0, before, after }
  }

  private push(patch: Patch) {
    this.undoStack.push(patch)
    if (this.undoStack.length > 40) this.undoStack.shift()
    this.redoStack = []
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  undo() {
    const p = this.undoStack.pop()
    if (!p) return
    this.cctx.putImageData(p.before, p.x, p.y)
    this.redoStack.push(p)
    this.journal.pop()
    this.invalidate()
    this.onChange?.()
  }

  redo() {
    const p = this.redoStack.pop()
    if (!p) return
    this.cctx.putImageData(p.after, p.x, p.y)
    this.undoStack.push(p)
    this.invalidate()
    this.onChange?.()
  }

  clearAll() {
    const patch = this.capture(0, 0, PAPER_W - 1, PAPER_H - 1, () => {
      this.cctx.clearRect(0, 0, PAPER_W, PAPER_H)
    })
    if (patch) this.push(patch)
    this.journal = []
    this.invalidate()
    this.onChange?.()
  }

  // ----------------------------------------------------------------- rendu

  invalidate() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.render()
    })
  }

  private render() {
    const ctx = this.dctx
    const rect = this.display.getBoundingClientRect()
    const dpr = this.display.width / Math.max(rect.width, 1)

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.display.width, this.display.height)
    ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scale, dpr * this.tx, dpr * this.ty)

    ctx.save()
    ctx.shadowColor = 'rgba(28,24,38,0.18)'
    ctx.shadowBlur = 24 / this.scale
    ctx.shadowOffsetY = 6 / this.scale
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PAPER_W, PAPER_H)
    ctx.restore()

    ctx.drawImage(this.color, 0, 0)
    if (this.pts.length && this.tool !== 'eraser') {
      ctx.save()
      ctx.globalAlpha = TOOLS[this.tool].alpha
      ctx.drawImage(this.stroke, 0, 0)
      ctx.restore()
    }
    if (this.lineArt) ctx.drawImage(this.lineArt, 0, 0)
  }

  // ---------------------------------------------------------------- export

  /** Aplatit papier + couleur + trait. scale 2 donne du 300 dpi en A4. */
  flatten(scale = 1): HTMLCanvasElement {
    const out = makeCanvas(Math.round(PAPER_W * scale), Math.round(PAPER_H * scale))
    const ctx = out.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.scale(scale, scale)
    ctx.drawImage(this.color, 0, 0)
    if (this.lineArt) ctx.drawImage(this.lineArt, 0, 0)
    return out
  }

  /** Le calque couleur seul : c'est lui qu'on sauvegarde, le trait est rejouable. */
  colorLayerPng(): string {
    return this.color.toDataURL('image/png')
  }

  thumbnailPng(w = 240): string {
    const out = makeCanvas(w, Math.round((w * PAPER_H) / PAPER_W))
    const ctx = out.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(this.color, 0, 0, out.width, out.height)
    if (this.lineArt) ctx.drawImage(this.lineArt, 0, 0, out.width, out.height)
    return out.toDataURL('image/jpeg', 0.72)
  }

  /** Part des zones deja peintes pour savoir si le coloriage est fini. */
  filledRatio(): number {
    const step = 8
    const img = this.cctx.getImageData(0, 0, PAPER_W, PAPER_H).data
    let painted = 0
    let total = 0
    for (let y = 0; y < PAPER_H; y += step) {
      for (let x = 0; x < PAPER_W; x += step) {
        const i = (y * PAPER_W + x) * 4
        if (this.mask && this.mask[y * PAPER_W + x] > 110) continue
        total++
        if (img[i + 3] > 20) painted++
      }
    }
    return total ? painted / total : 0
  }
}
