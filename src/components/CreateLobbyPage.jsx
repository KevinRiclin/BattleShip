import React, { useEffect, useState } from 'react'
import ProfessionalBackground from '@/components/background'

function CreateLobbyPage({
  createPlayerName,
  setCreatePlayerName,
  createLobbyName,
  setCreateLobbyName,
  onStartPlacement,
  onGoBack,
}) {
  const canCreateLobby = createPlayerName.trim().length >= 3 && createLobbyName.trim().length >= 3
  const [mode, setMode] = useState('classic')
  const [isCreating, setIsCreating] = useState(false)
  const [createdLobbyCode, setCreatedLobbyCode] = useState('')
  const [createdLobby, setCreatedLobby] = useState(null)
  const [requestError, setRequestError] = useState('')

  const handleCreateLobby = async () => {
    if (!canCreateLobby || isCreating) {
      return
    }

    setIsCreating(true)
    setRequestError('')

    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostName: createPlayerName.trim(),
          lobbyName: createLobbyName.trim(),
          mode,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Creation du lobby impossible.')
      }

      setCreatedLobbyCode(payload.code)
      setCreatedLobby(payload.lobby)
    } catch (error) {
      setRequestError(error.message || 'Creation du lobby impossible.')
      setCreatedLobbyCode('')
      setCreatedLobby(null)
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    if (!createdLobbyCode) {
      return undefined
    }

    let isCancelled = false

    const refreshLobby = async () => {
      try {
        const response = await fetch(`/api/lobbies/${encodeURIComponent(createdLobbyCode)}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Rafraichissement du lobby impossible.')
        }

        if (!isCancelled) {
          setCreatedLobby(payload.lobby)
        }
      } catch {
        // Keep latest successful lobby snapshot if polling fails temporarily.
      }
    }

    refreshLobby()
    const intervalId = setInterval(refreshLobby, 2000)

    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [createdLobbyCode])

  const lobbyPlayers = createdLobby?.players || []
  const canStartGame = Boolean(createdLobbyCode)

  const handlePrimaryAction = async () => {
    if (!createdLobbyCode) {
      handleCreateLobby()
      return
    }

    if (!createdLobby || isCreating) {
      return
    }

    setIsCreating(true)
    setRequestError('')

    try {
      const response = await fetch(`/api/lobbies/${encodeURIComponent(createdLobbyCode)}/start`, {
        method: 'POST',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Impossible de demarrer la partie.')
      }

      setCreatedLobby(payload.lobby)
      onStartPlacement(payload.lobby)
    } catch (error) {
      setRequestError(error.message || 'Impossible de demarrer la partie.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <ProfessionalBackground />

      <div className="relative z-50 min-h-screen px-6 py-10 md:py-14">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onGoBack}
              className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Retour
            </button>
            <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-100">
              Etape 1 / 2
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-md md:p-10">
            <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">Creer la partie</h1>
            <p className="mb-8 text-sm text-white/65 md:text-base">
              Configure ton lobby, puis partage le code avec tes amis.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-white/75">Nom du capitaine</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={createPlayerName}
                    onChange={(event) => setCreatePlayerName(event.target.value)}
                    placeholder="Capitaine"
                    className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/75">Nom du lobby</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={createLobbyName}
                    onChange={(event) => setCreateLobbyName(event.target.value)}
                    placeholder="Escadron Alpha"
                    className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/75">Mode de jeu</label>
                  <select
                    value={mode}
                    onChange={(event) => setMode(event.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                  >
                    <option value="classic">Classique (10x10)</option>
                    <option value="fast">Rapide (8x8)</option>
                    <option value="expert">Expert (12x12)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">Apercu du lobby</h2>
                <div className="space-y-3 text-sm text-white/75">
                  <p>
                    <span className="text-white/50">Host:</span>{' '}
                    <span className="text-white">{createPlayerName || 'Non renseigne'}</span>
                  </p>
                  <p>
                    <span className="text-white/50">Lobby:</span>{' '}
                    <span className="text-white">{createLobbyName || 'Sans nom'}</span>
                  </p>
                  <p>
                    <span className="text-white/50">Code:</span>{' '}
                    <span className="font-mono tracking-wider text-cyan-200">
                      {createdLobbyCode || 'Genere apres creation'}
                    </span>
                  </p>
                  <p>
                    <span className="text-white/50">Statut:</span>{' '}
                    <span className="text-emerald-300">
                      {createdLobbyCode ? 'Lobby cree, pret a partager' : 'En attente de creation'}
                    </span>
                  </p>
                  <p>
                    <span className="text-white/50">Joueurs:</span>{' '}
                    <span className="text-white">{lobbyPlayers.length || 0}/2</span>
                  </p>
                </div>

                {lobbyPlayers.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Equipe dans le lobby</p>
                    <div className="space-y-1 text-sm text-white/80">
                      {lobbyPlayers.map((player) => (
                        <p key={`${player.name}-${player.isHost ? 'host' : 'guest'}`}>
                          {player.name} {player.isHost ? '(host)' : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {requestError ? (
                  <p className="mt-4 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                    {requestError}
                  </p>
                ) : null}

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={createdLobbyCode ? !canStartGame : !canCreateLobby}
                    className={`w-full rounded-lg py-3 font-semibold text-black transition ${
                      createdLobbyCode || canCreateLobby
                        ? 'bg-emerald-400 hover:bg-emerald-300 animate-pulse'
                        : 'bg-white disabled:cursor-not-allowed disabled:opacity-55'
                    }`}
                  >
                    {isCreating
                      ? createdLobbyCode
                        ? 'Demarrage...'
                        : 'Creation en cours...'
                      : createdLobbyCode
                        ? 'Demarrer la partie'
                        : 'Creer et ouvrir le lobby'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateLobbyPage
