/**
 * Tout reste sur l'appareil : IndexedDB, aucun envoi reseau.
 * C'est ce qui permet de ne collecter aucune donnee personnelle.
 */

import type { JournalOp } from './Editor'

const DB = 'toscacolor'
const STORE = 'works'
const VERSION = 1

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
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const saveWork = (work: Work) => tx('readwrite', (s) => s.put(work))
export const getWork = (id: string) => tx<Work | undefined>('readonly', (s) => s.get(id))
export const allWorks = () => tx<Work[]>('readonly', (s) => s.getAll())
export const deleteWork = (id: string) => tx('readwrite', (s) => s.delete(id))

const KID_KEY = 'toscacolor.kid'
export const getKidName = () => localStorage.getItem(KID_KEY) ?? ''
export const setKidName = (name: string) => localStorage.setItem(KID_KEY, name)
