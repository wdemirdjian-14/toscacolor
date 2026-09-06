import { useCallback, useEffect, useRef, useState } from 'react'
import { PAPER_H, PAPER_W } from '../engine/paper'
import { PREVIEW_H, PREVIEW_W, loadImage, photoToLineArt } from '../engine/photo'
import { savePaper, type Paper } from '../engine/storage'
import { IconBack, IconCamera, IconMagic } from './icons'

/**
 * Fabriquer un coloriage a partir d'une photo.
 *
 * L'apercu se calcule en petit pour que le curseur reponde du tac au tac ; la
 * version 300 dpi n'est produite qu'a la validation, une seule fois.
 */
export default function PhotoStudio({
  onBack,
  onCreated,
}: {
  onBack: () => void
  onCreated: (paper: Paper) => void
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [detail, setDetail] = useState(0.45)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const line = photoToLineArt(image, detail, PREVIEW_W, PREVIEW_H)
    canvas.width = PREVIEW_W
    canvas.height = PREVIEW_H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H)
    ctx.drawImage(line, 0, 0)
  }, [image, detail])

  useEffect(() => {
    if (!image) return
    const t = window.setTimeout(drawPreview, 40)
    return () => window.clearTimeout(t)
  }, [image, detail, drawPreview])

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBusy('Ouverture de la photo…')
    try {
      const img = await loadImage(file)
      setImage(img)
      setTitle((t) => t || 'Ma photo')
    } catch {
      setError("Cette image n'a pas pu être ouverte. Essaie une photo au format JPEG ou PNG.")
    } finally {
      setBusy(null)
    }
  }

  const create = async () => {
    if (!image) return
    setBusy('Fabrication du coloriage…')
    try {
      // Le trait est produit d'emblée en 300 dpi : c'est ce qui sera imprimé.
      await new Promise((r) => setTimeout(r, 30))
      const full = photoToLineArt(image, detail, PAPER_W * 2, PAPER_H * 2)
      const linePng = full.toDataURL('image/png')

      const thumbCanvas = document.createElement('canvas')
      thumbCanvas.width = 240
      thumbCanvas.height = Math.round((240 * PAPER_H) / PAPER_W)
      const tctx = thumbCanvas.getContext('2d')!
      tctx.fillStyle = '#ffffff'
      tctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height)
      tctx.drawImage(full, 0, 0, thumbCanvas.width, thumbCanvas.height)

      const paper: Paper = {
        id: `photo-${Date.now()}`,
        title: title.trim() || 'Ma photo',
        linePng,
        thumb: thumbCanvas.toDataURL('image/jpeg', 0.7),
        createdAt: Date.now(),
      }
      await savePaper(paper)
      onCreated(paper)
    } catch {
      setError("La photo est trop grande pour cet appareil. Essaie une image plus petite.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="screen">
      <button className="back" onClick={onBack}>
        <IconBack /> Retour
      </button>

      <h2 className="section-title">Une photo en coloriage</h2>
      <p className="photo-note">
        La photo reste sur cet appareil : elle n'est envoyée nulle part, et ça marche même sans
        réseau.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />

      {!image ? (
        <button className="photo-drop" onClick={() => fileRef.current?.click()}>
          <IconCamera />
          <b>Choisir une photo</b>
          <span>Un animal, un jouet, un visage — ça marche mieux si c'est bien éclairé.</span>
        </button>
      ) : (
        <>
          <div className="photo-stage">
            <canvas ref={canvasRef} className="photo-preview" />
          </div>

          <label className="detail">
            <span className="detail-label">Détails du dessin</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={detail}
              onChange={(e) => setDetail(Number(e.target.value))}
            />
            <span className="detail-ends">
              <b>Grandes formes</b>
              <b>Beaucoup de traits</b>
            </span>
          </label>

          <input
            className="photo-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Le nom du dessin"
            maxLength={24}
          />

          <div className="photo-actions">
            <button className="ghost" onClick={() => fileRef.current?.click()}>
              Une autre photo
            </button>
            <button className="primary" onClick={create}>
              <IconMagic />
              Colorier
            </button>
          </div>
        </>
      )}

      {error && <p className="photo-error">{error}</p>}

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
