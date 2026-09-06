import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor, type ToolId } from '../engine/Editor'
import { canvasToPng, fileName, printImage, shareImage, stampSignature } from '../engine/export'
import { releaseCanvas } from '../engine/paper'
import ParentGate from './ParentGate'
import FloatingTools from './FloatingTools'
import { PALETTE, type Swatch } from '../engine/palette'
import { getKidName, saveWork, setKidName, type Work } from '../engine/storage'
import type { Coloring, Theme } from '../art'
import {
  IconBack,
  IconBrush,
  IconBucket,
  IconChevron,
  IconEraser,
  IconExpand,
  IconMagic,
  IconMarker,
  IconPencil,
  IconPrint,
  IconRedo,
  IconShare,
  IconTrash,
  IconUndo,
} from './icons'

const TOOL_LIST: Array<{ id: ToolId; label: string; icon: () => JSX.Element; tint: string }> = [
  { id: 'bucket', label: 'Pot', icon: IconBucket, tint: '#41A7DB' },
  { id: 'brush', label: 'Pinceau', icon: IconBrush, tint: '#E4335A' },
  { id: 'pencil', label: 'Crayon', icon: IconPencil, tint: '#F79038' },
  { id: 'marker', label: 'Feutre', icon: IconMarker, tint: '#57BE6E' },
  { id: 'eraser', label: 'Gomme', icon: IconEraser, tint: '#9159D6' },
]

const SIZES = [12, 30, 68]

interface Props {
  theme: Theme
  page: Coloring
  saved?: Work
  onExit: () => void
}

export default function ColoringView({ theme, page, saved, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const saveTimer = useRef<number | null>(null)

  const [tool, setTool] = useState<ToolId>('brush')
  const [toolsOpen, setToolsOpen] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [color, setColor] = useState(PALETTE[0].hex)
  const [effect, setEffect] = useState<Swatch['effect']>(PALETTE[0].effect)
  const [size, setSize] = useState(SIZES[1])
  const [easy, setEasy] = useState(true)
  const [history, setHistory] = useState({ undo: false, redo: false })
  const [finishing, setFinishing] = useState<string | null>(null)
  const [kid, setKid] = useState(getKidName())
  const [gate, setGate] = useState<null | { action: string; run: () => void }>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Un parent qui imprime puis partage ne doit pas refaire le calcul deux fois.
  const gateUntil = useRef(0)

  const persist = useCallback(
    async (done = false) => {
      const ed = editorRef.current
      if (!ed) return
      const work: Work = {
        id: `${theme.id}:${page.id}`,
        themeId: theme.id,
        pageId: page.id,
        title: page.title,
        colorPng: ed.colorLayerPng(),
        journal: ed.journal,
        thumb: ed.thumbnailPng(),
        signature: getKidName(),
        done,
        updatedAt: Date.now(),
      }
      await saveWork(work)
    },
    [page.id, page.title, theme.id],
  )

  useEffect(() => {
    const canvas = canvasRef.current!
    const editor = new Editor(canvas)
    editorRef.current = editor

    editor.onChange = () => {
      setHistory({ undo: editor.canUndo(), redo: editor.canRedo() })
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      // Sauvegarde automatique : un enfant ne finit presque jamais d'un trait.
      saveTimer.current = window.setTimeout(() => void persist(false), 2500)
    }

    const onResize = () => editor.resize()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    void editor.loadPaper(page.art(), saved?.colorPng, saved?.journal).then(() => {
      editor.resize()
    })

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      editor.destroy()
      editorRef.current = null
    }
  }, [page, saved?.colorPng, persist])

  // Les reglages vivent dans l'editeur ; React ne fait que les refleter.
  // On les applique aussi a la volee : sans cela, un enfant qui tape une couleur
  // puis le dessin dans la foulee peindrait encore avec la couleur precedente.
  const apply = (patch: Partial<Pick<Editor, 'tool' | 'colorHex' | 'size' | 'easy' | 'effect'>>) => {
    if (editorRef.current) Object.assign(editorRef.current, patch)
  }

  useEffect(() => {
    apply({ tool, colorHex: color, size, easy, effect: effect ?? null })
  }, [tool, color, size, easy, effect])

  const leave = async () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    await persist(false)
    onExit()
  }

  /** Passe par le portail parental, sauf s'il vient d'etre franchi. */
  const guard = (action: string, run: () => void) => {
    if (Date.now() < gateUntil.current) {
      run()
      return
    }
    setGate({ action, run })
  }

  const buildPrintable = async () => {
    const ed = editorRef.current!
    // Sans cette attente, une signature pourrait être tracée avec la police de
    // repli si le rendu tombe pendant le chargement des polices.
    await document.fonts.ready
    const canvas = await ed.printable(2)
    stampSignature(canvas, kid)
    return canvas
  }

  const doPrint = async () => {
    setBusy('Préparation de la page…')
    try {
      const canvas = await buildPrintable()
      await printImage(canvas.toDataURL('image/png'))
      releaseCanvas(canvas)
    } finally {
      setBusy(null)
    }
  }

  const doShare = async () => {
    setBusy("Préparation de l'image…")
    try {
      const canvas = await buildPrintable()
      const blob = await canvasToPng(canvas)
      releaseCanvas(canvas)
      await shareImage(blob, fileName(page.title, kid))
    } finally {
      setBusy(null)
    }
  }

  /** Plein écran : la page occupe tout, les outils passent au-dessus d'elle. */
  const toggleImmersive = () => {
    setImmersive((v) => {
      const next = !v
      // L'API plein écran n'existe pas sur iPad ; l'installation sur l'écran
      // d'accueil y joue le même rôle. On tente, sans en dépendre.
      try {
        if (next) void document.documentElement.requestFullscreen?.()
        else if (document.fullscreenElement) void document.exitFullscreen?.()
      } catch {
        /* le navigateur refuse : la mise en page suffit */
      }
      return next
    })
    // La zone de dessin change de taille : il faut recadrer la page.
    setTimeout(() => editorRef.current?.resize(), 60)
  }

  const pickSwatch = (sw: Swatch) => {
    apply({ colorHex: sw.hex, effect: sw.effect ?? null })
    setColor(sw.hex)
    setEffect(sw.effect)
    if (tool === 'eraser') {
      apply({ tool: 'bucket' })
      setTool('bucket')
    }
  }

  const current = TOOL_LIST.find((t) => t.id === tool) ?? TOOL_LIST[0]
  const CurrentIcon = current.icon

  const openFinish = () => {
    const ed = editorRef.current
    if (!ed) return
    setFinishing(ed.thumbnailPng(300))
  }

  const confirmFinish = async () => {
    setKidName(kid.trim())
    await persist(true)
    setFinishing(null)
    onExit()
  }

  return (
    <div className={`studio${immersive ? ' immersive' : ''}`}>
      <div className="topbar">
        <button className="icon-btn" onClick={leave} aria-label="Retour">
          <IconBack />
        </button>
        <button
          className="icon-btn"
          onClick={() => editorRef.current?.undo()}
          disabled={!history.undo}
          aria-label="Annuler"
        >
          <IconUndo />
        </button>
        <button
          className="icon-btn"
          onClick={() => editorRef.current?.redo()}
          disabled={!history.redo}
          aria-label="Refaire"
        >
          <IconRedo />
        </button>
        <span className="title">{page.title}</span>
        <button className="icon-btn" onClick={toggleImmersive} aria-label="Plein écran">
          <IconExpand />
        </button>
        <button
          className="icon-btn"
          onClick={() =>
            guard('tout effacer', () => {
              editorRef.current?.clearAll()
            })
          }
          aria-label="Tout effacer"
        >
          <IconTrash />
        </button>
        <button className="done-btn" onClick={openFinish}>
          J'ai fini
        </button>
      </div>

      <canvas ref={canvasRef} className="board" />

      <div className="dock">
        <div className="swatches">
          {PALETTE.map((sw) => (
            <button
              key={sw.hex}
              className={`swatch${sw.effect ? ' sparkly' : ''}`}
              style={{ '--c': sw.hex } as React.CSSProperties}
              aria-pressed={color === sw.hex}
              aria-label={sw.name}
              title={sw.name}
              onClick={() => pickSwatch(sw)}
            />
          ))}
        </div>

        <div className="row">
          <div className="tool-picker">
            <button
              className="tool-trigger"
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
              onClick={() => setToolsOpen((v) => !v)}
              style={{ '--c': current.tint } as React.CSSProperties}
            >
              <CurrentIcon />
              <span>{current.label}</span>
              <IconChevron />
            </button>

            {toolsOpen && (
              <>
                <button
                  className="tool-scrim"
                  aria-label="Fermer le choix des ustensiles"
                  onClick={() => setToolsOpen(false)}
                />
                <div className="tool-menu" role="menu">
                  {TOOL_LIST.map((t) => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.id}
                        role="menuitemradio"
                        aria-checked={tool === t.id}
                        className="tool"
                        style={{ '--c': t.tint } as React.CSSProperties}
                        onClick={() => {
                          apply({ tool: t.id })
                          setTool(t.id)
                          setToolsOpen(false)
                        }}
                      >
                        <Icon />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className="sizes">
            {SIZES.map((s) => (
              <button
                key={s}
                className="size"
                aria-pressed={size === s}
                onClick={() => {
                  apply({ size: s })
                  setSize(s)
                }}
                aria-label={`Épaisseur ${s}`}
              >
                <i style={{ width: s / 2.6, height: s / 2.6 }} />
              </button>
            ))}
          </div>

          <button
            className="easy-btn"
            aria-pressed={easy}
            onClick={() =>
              setEasy((v) => {
                apply({ easy: !v })
                return !v
              })
            }
            title="Le trait reste dans la zone touchée"
          >
            <IconMagic />
            <span>Facile</span>
          </button>
        </div>
      </div>

      {immersive && (
        <FloatingTools
          tool={tool}
          color={color}
          size={size}
          sizes={SIZES}
          easy={easy}
          canUndo={history.undo}
          canRedo={history.redo}
          onTool={(t) => {
            apply({ tool: t })
            setTool(t)
          }}
          onColor={pickSwatch}
          onSize={(n) => {
            apply({ size: n })
            setSize(n)
          }}
          onEasy={() =>
            setEasy((v) => {
              apply({ easy: !v })
              return !v
            })
          }
          onUndo={() => editorRef.current?.undo()}
          onRedo={() => editorRef.current?.redo()}
          onExit={toggleImmersive}
          onDone={openFinish}
        />
      )}

      {finishing && !gate && (
        <div className="sheet" role="dialog" aria-label="Terminer le coloriage">
          <div className="box">
            <img className="preview" src={finishing} alt="" />
            <h2>Bravo !</h2>
            <p>Signe ton dessin, il ira dans ta galerie.</p>
            <input
              value={kid}
              onChange={(e) => setKid(e.target.value)}
              placeholder="Ton prénom"
              maxLength={18}
            />
            <div className="finish-actions">
              <button className="wide" onClick={() => guard("imprimer le dessin", doPrint)}>
                <IconPrint />
                Imprimer
              </button>
              <button className="wide" onClick={() => guard("envoyer le dessin", doShare)}>
                <IconShare />
                Envoyer
              </button>
            </div>
            <p className="finish-note">
              L'impression sort en A4, à la vraie résolution. Sur iPad, « Imprimer » propose aussi
              d'enregistrer en PDF.
            </p>
            <div className="actions">
              <button className="ghost" onClick={() => setFinishing(null)}>
                Continuer
              </button>
              <button className="primary" onClick={confirmFinish}>
                Garder
              </button>
            </div>
          </div>
        </div>
      )}

      {gate && (
        <ParentGate
          action={gate.action}
          onPass={() => {
            gateUntil.current = Date.now() + 2 * 60 * 1000
            const run = gate.run
            setGate(null)
            run()
          }}
          onCancel={() => setGate(null)}
        />
      )}

      {busy && (
        <div className="sheet" role="status">
          <div className="box busy">
            <div className="spinner" aria-hidden="true" />
            <p>{busy}</p>
          </div>
        </div>
      )}

    </div>
  )
}
