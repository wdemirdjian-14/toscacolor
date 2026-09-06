/**
 * Tout reste sur l'appareil : IndexedDB, aucun envoi reseau.
 * C'est ce qui permet de ne collecter aucune donnee personnelle.
 */

import type { JournalOp } from './Editor'

const DB = 'toscacolor'
const STORE = 'works'
const PAPERS = 'papers'
const VERSION = 2

export interface Work {
  id: string // themeId:pageId
  themeId: string
  pageId: string
  title: string
  /** Calque couleur seul, en PNG. Le trait du modele est regenere au chargement. */
  colorPng: string
  /** Les gestes, pour pouvoir reimprimer en 300 dpi apres avoir rouvert l'oeuvre. */
  journal: JournalOp[]
  thumb: string
  signature: string
  done: boolean
  updatedAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(PAPERS)) {
        db.createObjectStore(PAPERS, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = run(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const saveWork = (work: Work) => tx(STORE, 'readwrite', (s) => s.put(work))
export const getWork = (id: string) => tx<Work | undefined>(STORE, 'readonly', (s) => s.get(id))
export const allWorks = () => tx<Work[]>(STORE, 'readonly', (s) => s.getAll())
export const deleteWork = (id: string) => tx(STORE, 'readwrite', (s) => s.delete(id))

/**
 * Un modèle fabriqué par l'enfant à partir d'une photo.
 * Le trait est stocké en 300 dpi : c'est lui qui sera imprimé, sans agrandissement.
 */
export interface Paper {
  id: string
  title: string
  linePng: string
  thumb: string
  createdAt: number
}

export const savePaper = (paper: Paper) => tx(PAPERS, 'readwrite', (s) => s.put(paper))
export const allPapers = () => tx<Paper[]>(PAPERS, 'readonly', (s) => s.getAll())
export const deletePaper = (id: string) => tx(PAPERS, 'readwrite', (s) => s.delete(id))

const KID_KEY = 'toscacolor.kid'
export const getKidName = () => localStorage.getItem(KID_KEY) ?? ''
export const setKidName = (name: string) => localStorage.setItem(KID_KEY, name)
