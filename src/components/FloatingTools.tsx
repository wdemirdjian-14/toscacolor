import { useEffect, useRef, useState } from 'react'
import type { ToolId } from '../engine/Editor'
import { PALETTE, type Swatch } from '../engine/palette'
import {
  IconBrush,
  IconBucket,
  IconEraser,
  IconMagic,
  IconMarker,
  IconPencil,
  IconRedo,
  IconShrink,
  IconUndo,
} from './icons'

const TOOLS: Array<{ id: ToolId; label: string; icon: () => JSX.Element; tint: string }> = [
  { id: 'brush', label: 'Pinceau', icon: IconBrush, tint: '#E4335A' },
  { id: 'bucket', label: 'Pot', icon: IconBucket, tint: '#41A7DB' },
  { id: 'pencil', label: 'Crayon', icon: IconPencil, tint: '#F79038' },
  { id: 'marker', label: 'Feutre', icon: IconMarker, tint: '#57BE6E' },
  { id: 'eraser', label: 'Gomme', icon: IconEraser, tint: '#9159D6' },
]

const POS_KEY = 'toscacolor.tools-position'

interface Props {
  tool: ToolId
  color: string
  size: number
  sizes: number[]
  easy: boolean
  canUndo: boolean
  canRedo: boolean
  onTool: (t: ToolId) => void
  onColor: (s: Swatch) => void
  onSize: (n: number) => void
  onEasy: () => void
  onUndo: () => void
  onRedo: () => void
  onExit: () => void
  onDone: () => void
}

/**
 * La barre d'outils du mode plein ecran.
 *
 * Elle flotte au-dessus du dessin et se deplace : quelle que soit la position
 * choisie par defaut, elle finira par tomber sur la zone qu'un enfant veut
 * colorier. On la prend par sa poignee et on la met ailleurs, et l'endroit est
 * retenu pour la fois suivante.
 */
export default function FloatingTools(props: Props) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null')
      if (saved && typeof saved.x === 'number') return saved
    } catch {
      /* rien de sauvegardé, on prend la position par défaut */
    }
    return { x: window.innerWidth - 86, y: 96 }
  })
  const [open, setOpen] = useState<null | 'outils' | 'couleurs' | 'tailles'>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const clamp = (x: number, y: number) => {
    const el = barRef.current
    const w = el?.offsetWidth ?? 72
    const h = el?.offsetHeight ?? 380
    return {
      x: Math.max(8, Math.min(window.innerWidth - w - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - h - 8, y)),
    }
  }

  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // La capture n'est pas indispensable au déplacement : on continue sans.
    }
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
  }
  const moveDrag = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy))
  }
  const endDrag = () => {
    if (!drag.current) return
    drag.current = null
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(pos))
    } catch {
      /* stockage refusé : la position vaudra pour cette session seulement */
    }
  }

  const current = TOOLS.find((t) => t.id === props.tool) ?? TOOLS[0]
  const CurrentIcon = current.icon
  const swatch = PALETTE.find((s) => s.hex === props.color)

  return (
    <div
      ref={barRef}
      className={`floating${pos.x < window.innerWidth / 2 ? ' at-left' : ''}`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="grip"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="button"
        aria-label="Déplacer les outils"
        tabIndex={0}
      >
        <span />
        <span />
      </div>

      <button
        className="fbtn"
        style={{ '--c': current.tint } as React.CSSProperties}
        aria-label={`Ustensile : ${current.label}`}
        onClick={() => setOpen(open === 'outils' ? null : 'outils')}
      >
        <CurrentIcon />
      </button>

      <button
        className={`fbtn fcolor${swatch?.effect ? ' sparkly' : ''}`}
        style={{ '--c': props.color } as React.CSSProperties}
        aria-label={`Couleur : ${swatch?.name ?? props.color}`}
        onClick={() => setOpen(open === 'couleurs' ? null : 'couleurs')}
      />

      <button
        className="fbtn fsize"
        aria-label="Épaisseur"
        onClick={() => setOpen(open === 'tailles' ? null : 'tailles')}
      >
        <i style={{ width: props.size / 2.6, height: props.size / 2.6 }} />
      </button>

      <button
        className="fbtn"
        aria-pressed={props.easy}
        aria-label="Mode facile"
        onClick={props.onEasy}
      >
        <IconMagic />
      </button>

      <div className="fsep" />

      <button className="fbtn" aria-label="Annuler" disabled={!props.canUndo} onClick={props.onUndo}>
        <IconUndo />
      </button>
      <button className="fbtn" aria-label="Refaire" disabled={!props.canRedo} onClick={props.onRedo}>
        <IconRedo />
      </button>

      <div className="fsep" />

      <button className="fbtn" aria-label="Quitter le plein écran" onClick={props.onExit}>
        <IconShrink />
      </button>
      <button className="fbtn fdone" onClick={props.onDone}>
        Fini
      </button>

      {open && (
        <>
          <button className="fscrim" aria-label="Fermer" onClick={() => setOpen(null)} />
          <div className={`fpanel fpanel-${open}`}>
            {open === 'outils' &&
              TOOLS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    className="tool"
                    aria-checked={props.tool === t.id}
                    role="menuitemradio"
                    style={{ '--c': t.tint } as React.CSSProperties}
                    onClick={() => {
                      props.onTool(t.id)
                      setOpen(null)
                    }}
                  >
                    <Icon />
                    {t.label}
                  </button>
                )
              })}

            {open === 'couleurs' && (
              <div className="fswatches">
                {PALETTE.map((sw) => (
                  <button
                    key={sw.hex}
                    className={`swatch${sw.effect ? ' sparkly' : ''}`}
                    style={{ '--c': sw.hex } as React.CSSProperties}
                    aria-pressed={props.color === sw.hex}
                    aria-label={sw.name}
                    onClick={() => {
                      props.onColor(sw)
                      setOpen(null)
                    }}
                  />
                ))}
              </div>
            )}

            {open === 'tailles' &&
              props.sizes.map((n) => (
                <button
                  key={n}
                  className="size"
                  aria-pressed={props.size === n}
                  aria-label={`Épaisseur ${n}`}
                  onClick={() => {
                    props.onSize(n)
                    setOpen(null)
                  }}
                >
                  <i style={{ width: n / 2.6, height: n / 2.6 }} />
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
