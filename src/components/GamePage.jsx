import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ProfessionalBackground from '@/components/background'

const GRID_SIZE = 10

function toCellKey(row, column) {
  return `${row}-${column}`
}

function shipLabelFromId(shipId) {
  const map = {
    carrier: 'Porte-avions',
    battleship: 'Cuirasse',
    cruiser: 'Croiseur',
    submarine: 'Sous-marin',
    destroyer: 'Destroyer',
  }

  return map[shipId] || 'Bateau'
}

function GamePage({ lobby, playerName, onGoBack }) {
  const [liveLobby, setLiveLobby] = useState(lobby)
  const [gameState, setGameState] = useState(null)
  const [syncError, setSyncError] = useState('')
  const [isFiring, setIsFiring] = useState(false)
  const [sunkShipLabel, setSunkShipLabel] = useState('')
  const [showEndPopup, setShowEndPopup] = useState(false)
  const [winnerName, setWinnerName] = useState('')
  const lobbyCode = liveLobby?.code || lobby?.code || ''

  useEffect(() => {
    setLiveLobby(lobby)
  }, [lobby])

  useEffect(() => {
    if (!lobbyCode || !playerName) {
      return undefined
    }

    let isCancelled = false

    const refreshGameState = async () => {
      try {
        const response = await fetch(
          `/api/lobbies/${encodeURIComponent(lobbyCode)}/game-state?playerName=${encodeURIComponent(playerName)}`,
        )
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Synchronisation de la partie impossible.')
        }

        if (!isCancelled) {
          setLiveLobby(payload.lobby)
          setGameState(payload.game)
          setSyncError('')
        }
      } catch (error) {
        if (!isCancelled) {
          setSyncError(error.message || 'Synchronisation de la partie impossible.')
        }
      }
    }

    refreshGameState()
    const intervalId = setInterval(refreshGameState, 1500)

    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [lobbyCode, playerName])

  const yourShots = gameState?.yourShots || {}
  const yourShips = new Set(gameState?.yourShipCells || [])
  const yourHitsTaken = new Set(gameState?.yourHitsTaken || [])
  const isYourTurn = gameState?.turnPlayerName === playerName
  const hasWinner = Boolean(gameState?.winnerName)
  const isWinner = gameState?.winnerName === playerName

  useEffect(() => {
    if (gameState?.winnerName) {
      setWinnerName(gameState.winnerName)
      setShowEndPopup(true)
    }
  }, [gameState?.winnerName])

  const statusLabel = useMemo(() => {
    if (hasWinner) {
      return gameState?.winnerName === playerName ? 'Victoire' : 'Defaite'
    }

    if (isYourTurn) {
      return 'A ton tour'
    }

    return `Tour de ${gameState?.turnPlayerName || '...'}`
  }, [gameState?.turnPlayerName, gameState?.winnerName, hasWinner, isYourTurn, playerName])

  const handleFire = async (row, column) => {
    if (!lobbyCode || !playerName || !isYourTurn || hasWinner || isFiring) {
      return
    }

    const cellKey = toCellKey(row, column)
    if (yourShots[cellKey]) {
      return
    }

    setIsFiring(true)
    setSyncError('')

    try {
      const response = await fetch(`/api/lobbies/${encodeURIComponent(lobbyCode)}/fire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName, row, column }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Tir impossible.')
      }

      if (payload.result?.sunkShipId) {
        setSunkShipLabel(shipLabelFromId(payload.result.sunkShipId))
        setTimeout(() => {
          setSunkShipLabel('')
        }, 1800)
      }

      const gameResponse = await fetch(
        `/api/lobbies/${encodeURIComponent(lobbyCode)}/game-state?playerName=${encodeURIComponent(playerName)}`,
      )
      const gamePayload = await gameResponse.json()

      if (!gameResponse.ok) {
        throw new Error(gamePayload.error || 'Synchronisation de la partie impossible.')
      }

      setLiveLobby(gamePayload.lobby)
      setGameState(gamePayload.game)
    } catch (error) {
      setSyncError(error.message || 'Tir impossible.')
    } finally {
      setIsFiring(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-black">
      <ProfessionalBackground />

      <div className="relative z-50 h-screen px-4 py-4 md:px-6 md:py-5">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
            <button
              type="button"
              onClick={onGoBack}
              className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Retour accueil
            </button>
            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-100">
              {statusLabel}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-md md:p-5">
            <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">Bataille en cours</h1>
            <p className="mb-3 text-xs text-white/65 md:text-sm">
              Clique sur la grille adverse pour tirer. Une case = un tir.
            </p>

            <div className="mb-3 grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Lobby</p>
                <p className="mt-1 font-mono tracking-wider text-cyan-200">{liveLobby?.code || '---- ----'}</p>
                <p className="mt-1 text-xs text-white/75 md:text-sm">Joueur: {playerName || 'Inconnu'}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Participants</p>
                <ul className="mt-1 space-y-1 text-xs text-white/80 md:text-sm">
                  {(liveLobby?.players || []).map((player) => (
                    <li key={player.name}>{player.name}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Etat</p>
                <p className="mt-1 text-xs text-white/80 md:text-sm">Tour: {gameState?.turnPlayerName || '...'}</p>
                <p className="mt-1 text-xs text-white/80 md:text-sm">Adversaire: {gameState?.opponentName || '...'}</p>
                <p className="mt-1 text-xs text-white/80 md:text-sm">
                  Gagnant: {gameState?.winnerName || 'Aucun'}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {sunkShipLabel ? (
                <motion.div
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="mb-3 rounded-xl border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-xs text-amber-100 md:text-sm"
                >
                  Impact critique: {sunkShipLabel} detruit.
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-h-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <h2 className="mb-2 text-base font-semibold text-white">Grille adverse</h2>
                <div className="grid max-w-[340px] grid-cols-10 gap-1 md:max-w-[390px] lg:max-w-[420px]">
                  {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                    const row = Math.floor(index / GRID_SIZE)
                    const column = index % GRID_SIZE
                    const key = toCellKey(row, column)
                    const shotResult = yourShots[key]

                    return (
                      <button
                        key={`enemy-${key}`}
                        type="button"
                        onClick={() => handleFire(row, column)}
                        disabled={!isYourTurn || hasWinner || Boolean(shotResult) || isFiring}
                        className={`aspect-square rounded border text-[9px] transition ${
                          shotResult === 'hit'
                            ? 'border-rose-300 bg-rose-500/40 text-white'
                            : shotResult === 'miss'
                              ? 'border-white/30 bg-white/10 text-white/70'
                              : 'border-white/15 bg-black/30 text-white/20 hover:bg-white/10 disabled:cursor-not-allowed'
                        }`}
                      >
                        {shotResult === 'hit' ? 'X' : shotResult === 'miss' ? 'o' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="min-h-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <h2 className="mb-2 text-base font-semibold text-white">Ta grille</h2>
                <div className="grid max-w-[340px] grid-cols-10 gap-1 md:max-w-[390px] lg:max-w-[420px]">
                  {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                    const row = Math.floor(index / GRID_SIZE)
                    const column = index % GRID_SIZE
                    const key = toCellKey(row, column)
                    const hasShip = yourShips.has(key)
                    const wasHit = yourHitsTaken.has(key)

                    return (
                      <div
                        key={`ally-${key}`}
                        className={`aspect-square rounded border text-[10px] ${
                          hasShip && wasHit
                            ? 'border-rose-300 bg-rose-500/45'
                            : hasShip
                              ? 'border-cyan-200/70 bg-cyan-300/35'
                              : wasHit
                                ? 'border-white/30 bg-white/15'
                                : 'border-white/15 bg-black/30'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {syncError ? (
              <p className="mt-3 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 md:text-sm">
                {syncError}
              </p>
            ) : null}

            <AnimatePresence>
              {showEndPopup && hasWinner ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 px-4"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl backdrop-blur-md ${
                      isWinner
                        ? 'border-emerald-300/40 bg-emerald-500/15'
                        : 'border-rose-300/40 bg-rose-500/15'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wider text-white/70">Fin de partie</p>
                    <h2 className="mt-2 text-3xl font-bold text-white">
                      {isWinner ? 'Victoire' : 'Defaite'}
                    </h2>
                    <p className="mt-2 text-sm text-white/85">
                      Gagnant: <span className="font-semibold">{winnerName}</span>
                    </p>
                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowEndPopup(false)}
                        className="flex-1 rounded-lg border border-white/25 bg-black/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                      >
                        Fermer
                      </button>
                      <button
                        type="button"
                        onClick={onGoBack}
                        className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        Retour accueil
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GamePage
