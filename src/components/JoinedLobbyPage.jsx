import React, { useEffect, useState } from 'react'
import ProfessionalBackground from '@/components/background'

function JoinedLobbyPage({ lobby, playerName, onGoBack, onStartPlacement }) {
  const [liveLobby, setLiveLobby] = useState(lobby)
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    setLiveLobby(lobby)
  }, [lobby])

  useEffect(() => {
    if (!lobby?.code) {
      return undefined
    }

    let isCancelled = false

    const refreshLobby = async () => {
      try {
        const response = await fetch(`/api/lobbies/${encodeURIComponent(lobby.code)}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Synchronisation du lobby impossible.')
        }

        if (!isCancelled) {
          setLiveLobby(payload.lobby)
          setSyncError('')

          if (payload.lobby?.status === 'placing-ships') {
            onStartPlacement(payload.lobby)
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setSyncError(error.message || 'Synchronisation du lobby impossible.')
        }
      }
    }

    refreshLobby()
    const intervalId = setInterval(refreshLobby, 2000)

    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [lobby?.code, onStartPlacement])

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
            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Connecte au lobby
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-md md:p-10">
            <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">Lobby rejoint</h1>
            <p className="mb-8 text-sm text-white/65 md:text-base">
              Tu as rejoint la partie, partage ce code avec les autres joueurs.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">Informations</h2>
                <div className="space-y-3 text-sm text-white/75">
                  <p>
                    <span className="text-white/50">Code:</span>{' '}
                    <span className="font-mono text-cyan-200 tracking-wider">{liveLobby.code}</span>
                  </p>
                  <p>
                    <span className="text-white/50">Lobby:</span>{' '}
                    <span className="text-white">{liveLobby.lobbyName}</span>
                  </p>
                  <p>
                    <span className="text-white/50">Host:</span>{' '}
                    <span className="text-white">{liveLobby.hostName}</span>
                  </p>
                  <p>
                    <span className="text-white/50">Toi:</span>{' '}
                    <span className="text-emerald-300">{playerName}</span>
                  </p>
                  <p>
                    <span className="text-white/50">Joueurs:</span>{' '}
                    <span className="text-white">{liveLobby.players.length}/2</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">Joueurs connectes</h2>
                <ul className="space-y-2 text-sm text-white/80">
                  {liveLobby.players.map((player) => (
                    <li
                      key={player.name}
                      className="rounded-md border border-white/10 bg-black/30 px-3 py-2"
                    >
                      {player.name}
                      {player.isHost ? ' (host)' : ''}
                    </li>
                  ))}
                </ul>
                {syncError ? (
                  <p className="mt-3 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    {syncError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JoinedLobbyPage
