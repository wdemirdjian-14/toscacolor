import { useEffect, useMemo, useState } from 'react'
import { THEMES, type Coloring, type Level, type Theme } from './art'
import ColoringView from './components/ColoringView'
import { IconBack } from './components/icons'
import { allWorks, getKidName, setKidName, type Work } from './engine/storage'
import { watchOffline, type OfflineState } from './engine/offline'

type View =
  | { name: 'home' }
  | { name: 'theme'; themeId: string }
  | { name: 'color'; themeId: string; pageId: string }

const OFFLINE_LABEL: Record<OfflineState, string> = {
  preparation: 'Préparation…',
  pret: '✓ Marche sans réseau',
  indisponible: 'Réseau nécessaire',
}

const OFFLINE_HINT: Record<OfflineState, string> = {
  preparation: "L'application se met en mémoire, patiente quelques secondes.",
  pret: 'Tout est enregistré sur cet appareil : tu peux couper le Wi-Fi et colorier jusqu\'au bout.',
  indisponible: "Le mode hors ligne demande une connexion sécurisée (https).",
}

const svgUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })
  const [works, setWorks] = useState<Work[]>([])
  const [kid, setKid] = useState(getKidName())
  const [offline, setOffline] = useState<OfflineState>('preparation')

  useEffect(() => watchOffline(setOffline), [])

  const refresh = () => void allWorks().then((w) => setWorks(w.sort((a, b) => b.updatedAt - a.updatedAt)))
  useEffect(refresh, [])

  const byId = useMemo(() => new Map(works.map((w) => [w.id, w])), [works])

  if (view.name === 'color') {
    const theme = THEMES.find((t) => t.id === view.themeId)!
    const page = theme.pages.find((p) => p.id === view.pageId)!
    return (
      <ColoringView
        theme={theme}
        page={page}
        saved={byId.get(`${theme.id}:${page.id}`)}
        onExit={() => {
          refresh()
          setView({ name: 'theme', themeId: theme.id })
        }}
      />
    )
  }

  if (view.name === 'theme') {
    const theme = THEMES.find((t) => t.id === view.themeId)!
    return (
      <ThemeScreen
        theme={theme}
        works={byId}
        onBack={() => setView({ name: 'home' })}
        onOpen={(page) => setView({ name: 'color', themeId: theme.id, pageId: page.id })}
      />
    )
  }

  return (
    <div className="screen">
      <div className="masthead">
        <div className="logo">
          Tosca<span>Color</span>
        </div>
        <div className="masthead-right">
          <span className={`offline offline-${offline}`} title={OFFLINE_HINT[offline]}>
            {OFFLINE_LABEL[offline]}
          </span>
          <div className="kid">
          <label htmlFor="kid">Prénom</label>
          <input
            id="kid"
            value={kid}
            placeholder="Toi"
            maxLength={18}
            onChange={(e) => {
              setKid(e.target.value)
              setKidName(e.target.value)
            }}
          />
          </div>
        </div>
      </div>

      {works.length > 0 && (
        <>
          <h2 className="section-title">Mes coloriages</h2>
          <div className="grid">
            {works.map((w) => (
              <button
                key={w.id}
                className="page-card"
                onClick={() => setView({ name: 'color', themeId: w.themeId, pageId: w.pageId })}
              >
                <img className="thumb" src={w.thumb} alt="" />
                <div className="meta">
                  <b>{w.title}</b>
                  <span>{w.done ? `Fini${w.signature ? ` · ${w.signature}` : ''}` : 'En cours'}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Choisis un thème</h2>
      <div className="grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-card${t.soon ? ' soon' : ''}`}
            disabled={t.soon}
            onClick={() => setView({ name: 'theme', themeId: t.id })}
          >
            <div className="dots">
              <i style={{ background: t.accent }} />
              <i style={{ background: '#FBD62F' }} />
              <i style={{ background: '#41A7DB' }} />
            </div>
            <div>
              <div className="name">{t.name}</div>
              <div className="count">{t.soon ? 'Bientôt' : `${t.pages.length} coloriages`}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ThemeScreen({
  theme,
  works,
  onBack,
  onOpen,
}: {
  theme: Theme
  works: Map<string, Work>
  onBack: () => void
  onOpen: (page: Coloring) => void
}) {
  const [level, setLevel] = useState<Level | 'tous'>('tous')
  const thumbs = useMemo(
    () => new Map(theme.pages.map((p) => [p.id, svgUrl(p.svg())])),
    [theme],
  )
  const pages = theme.pages.filter((p) => level === 'tous' || p.level === level)

  return (
    <div className="screen">
      <button className="back" onClick={onBack}>
        <IconBack /> Thèmes
      </button>
      <h2 className="section-title">{theme.name}</h2>
      <div className="filters">
        {(['tous', 'facile', 'moyen'] as const).map((l) => (
          <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>
            {l === 'tous' ? 'Tous' : l === 'facile' ? 'Grandes zones' : 'Plus détaillé'}
          </button>
        ))}
      </div>
      {pages.length === 0 ? (
        <div className="empty">Rien ici pour l'instant.</div>
      ) : (
        <div className="grid">
          {pages.map((p) => {
            const w = works.get(`${theme.id}:${p.id}`)
            return (
              <button key={p.id} className="page-card" onClick={() => onOpen(p)}>
                <img className="thumb" src={w?.thumb ?? thumbs.get(p.id)} alt={p.title} />
                <div className="meta">
                  <b>{p.title}</b>
                  <span>
                    {p.level === 'facile' ? 'Grandes zones' : 'Plus détaillé'}
                    {w ? (w.done ? ' · fini' : ' · en cours') : ''}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
