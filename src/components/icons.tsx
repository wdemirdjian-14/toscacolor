const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const IconBucket = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M10 3 3.6 9.4a1.5 1.5 0 0 0 0 2.1l5.9 5.9a1.5 1.5 0 0 0 2.1 0l6.4-6.4Z" />
    <path d="M7 6.4 12.6 12" />
    <path d="M20.5 15c1 1.6 1.5 2.6 1.5 3.4a1.7 1.7 0 0 1-3.4 0c0-.8.5-1.8 1.5-3.4Z" />
  </svg>
)

export const IconBrush = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M15 3.5a2.1 2.1 0 0 1 3 3L11 14l-3.5.5L8 11Z" />
    <path d="M6.5 15c-1.8.4-2.5 2-2.5 3.6 0 .9-.4 1.5-1 2 1.6.6 4 .7 5.4-.7 1-1 1.1-2.4.6-3.4" />
  </svg>
)

export const IconPencil = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M4 20l1-4.2L16.4 4.4a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19 4 20Z" />
    <path d="M15 6l3 3" />
  </svg>
)

export const IconMarker = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M9 15 4.5 19.5 4 21l1.5-.5L10 16" />
    <path d="M8.5 13.5 14 8l4 4-5.5 5.5Z" />
    <path d="M14 8l2.2-2.2a2.2 2.2 0 0 1 3.1 0l.9.9a2.2 2.2 0 0 1 0 3.1L18 12Z" />
  </svg>
)

export const IconEraser = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M8.6 19H20" />
    <path d="M4.8 15.2 12 8l5.5 5.5-5 5H7.3l-2.5-2.5a1.8 1.8 0 0 1 0-2.6Z" />
    <path d="M12 8l3-3a1.8 1.8 0 0 1 2.6 0l3 3a1.8 1.8 0 0 1 0 2.6l-3 3" />
  </svg>
)

export const IconUndo = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M4 8h9a5.5 5.5 0 0 1 0 11H8" />
    <path d="M7.5 4.5 4 8l3.5 3.5" />
  </svg>
)

export const IconRedo = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M20 8h-9a5.5 5.5 0 0 0 0 11h5" />
    <path d="M16.5 4.5 20 8l-3.5 3.5" />
  </svg>
)

export const IconBack = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const IconTrash = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
)

export const IconMagic = () => (
  <svg viewBox="0 0 24 24" {...s}>
    <path d="M5 19 15 9" />
    <path d="M14 4.5 15 7l2.5 1L15 9l-1 2.5L13 9l-2.5-1L13 7Z" />
    <path d="M19.5 13.5 20 15l1.5.5L20 16l-.5 1.5L19 16l-1.5-.5L19 15Z" />
  </svg>
)
