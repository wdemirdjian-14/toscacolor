import { useMemo, useState } from 'react'

/**
 * Portail parental.
 *
 * Imprimer, partager ou effacer sont des gestes qu'un enfant de six ans ne doit
 * pas pouvoir declencher seul. Une multiplication suffit : elle arrete les
 * petits sans gener l'adulte, et c'est ce qu'exigent les regles Apple Kids et
 * Google Play Families avant toute sortie de l'application.
 */
export default function ParentGate({
  action,
  onPass,
  onCancel,
}: {
  action: string
  onPass: () => void
  onCancel: () => void
}) {
  const [a, b] = useMemo(() => [3 + Math.floor(Math.random() * 7), 4 + Math.floor(Math.random() * 6)], [])
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (Number(value) === a * b) {
      onPass()
    } else {
      setWrong(true)
      setValue('')
    }
  }

  return (
    <div className="sheet" role="dialog" aria-label="Vérification parentale">
      <form className="box" onSubmit={submit}>
        <h2>Un adulte, s'il te plaît</h2>
        <p>
          Pour {action}, réponds à cette question.
        </p>
        <div className="gate-question">
          {a} × {b} = ?
        </div>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, ''))
            setWrong(false)
          }}
          placeholder="?"
          aria-label="Résultat"
        />
        {wrong && <p className="gate-wrong">Ce n'est pas ça. Essaie encore.</p>}
        <div className="actions">
          <button type="button" className="ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="primary" disabled={!value}>
            Valider
          </button>
        </div>
      </form>
    </div>
  )
}
