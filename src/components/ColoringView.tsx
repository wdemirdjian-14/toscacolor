import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor, type ToolId } from '../engine/Editor'
import { PALETTE } from '../engine/palette'
import { getKidName, saveWork, setKidName, type Work } from '../engine/storage'
import type { Coloring, Theme } from '../art'
import {
  IconBack,
  IconBrush,
  IconBucket,
  IconEraser,
  IconMagic,
  IconMarker,
  IconPencil,
  IconRedo,
  IconTrash,
  IconUndo,
} from './icons'

const TOOL_LIST: Array<{ id: ToolId; label: string; icon: () => JSX.Element }> = [
  { id: 'bucket', label: 'Pot', icon: IconBucket },
  { id: 'brush', label: 'Pinceau', icon: IconBrush },
  { id: 'pencil', label: 'Crayon', icon: IconPencil },
  { id: 'marker', label: 'Feutre', icon: IconMarker },
  { id: 'eraser', label: 'Gomme', icon: IconEraser },
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

  const [tool, setTool] = useState<ToolId>('bucket')
  const [color, setColor] = useState(PALETTE[6].hex)
  const [size, setSize] = useState(SIZES[1])
  const [easy, setEasy] = useState(true)
  const [history, setHistory] = useState({ undo: false, redo: false })
  const [finishing, setFinishing] = useState<string | null>(null)
  const [kid, setKid] = useState(getKidName())

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

    void editor.loadPaper(page.svg(), saved?.colorPng).then(() => {
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
  const apply = (patch: Partial<Pick<Editor, 'tool' | 'colorHex' | 'size' | 'easy'>>) => {
    if (editorRef.current) Object.assign(editorRef.current, patch)
  }

  useEffect(() => {
    apply({ tool, colorHex: color, size, easy })
  }, [tool, color, size, easy])

  const leave = async () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    await persist(false)
    onExit()
  }

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
    <div className="studio">
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
        <button
          className="icon-btn"
          onClick={() => {
            if (confirm('Tout effacer et recommencer ?')) editorRef.current?.clearAll()
          }}
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
        <div className="tools">
          {TOOL_LIST.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                className="tool"
                aria-pressed={tool === t.id}
                onClick={() => {
                  apply({ tool: t.id })
                  setTool(t.id)
                }}
              >
                <Icon />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="row">
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
          <div className="swatches">
            {PALETTE.map((sw) => (
              <button
                key={sw.hex}
                className="swatch"
                style={{ background: sw.hex }}
                aria-pressed={color === sw.hex}
                aria-label={sw.name}
                onClick={() => {
                  apply({ colorHex: sw.hex })
                  setColor(sw.hex)
                  if (tool === 'eraser') {
                    apply({ tool: 'bucket' })
                    setTool('bucket')
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {finishing && (
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
    </div>
  )
}
