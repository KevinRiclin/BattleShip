import React, { useEffect, useMemo, useState } from 'react'
import ProfessionalBackground from '@/components/background'

const GRID_SIZE = 10
const FLEET = [
  { id: 'carrier', label: 'Porte-avions', size: 5 },
  { id: 'battleship', label: 'Cuirasse', size: 4 },
  { id: 'cruiser', label: 'Croiseur', size: 3 },
  { id: 'submarine', label: 'Sous-marin', size: 3 },
  { id: 'destroyer', label: 'Destroyer', size: 2 },
]

function cellKey(row, column) {
  return `${row}-${column}`
}

function buildShipCells(ship) {
  const cells = []
  for (let index = 0; index < ship.size; index += 1) {
    const row = ship.orientation === 'vertical' ? ship.row + index : ship.row
    const column = ship.orientation === 'horizontal' ? ship.column + index : ship.column
    cells.push(cellKey(row, column))
  }
  return cells
}

function canPlaceShip(candidateShip, shipsById) {
  if (candidateShip.orientation === 'horizontal' && candidateShip.column + candidateShip.size > GRID_SIZE) {
    return false
  }

  if (candidateShip.orientation === 'vertical' && candidateShip.row + candidateShip.size > GRID_SIZE) {
    return false
  }

  const candidateCells = buildShipCells(candidateShip)

  return Object.values(shipsById).every((ship) => {
    if (ship.id === candidateShip.id) {
      return true
    }

    const occupiedCells = new Set(buildShipCells(ship))
    return candidateCells.every((candidateCell) => !occupiedCells.has(candidateCell))
  })
}

function isPlayerReady(lobby, playerName) {
  return (lobby?.readyPlayers || []).some((readyPlayer) => readyPlayer.toLowerCase() === playerName.toLowerCase())
}

function ShipPlacementPage({ lobby, playerName, onGoBack, onGameStart }) {
  const [orientation, setOrientation] = useState('horizontal')
  const [shipsById, setShipsById] = useState({})
  const [selectedShipId, setSelectedShipId] = useState(FLEET[0].id)
  const [placementError, setPlacementError] = useState('')
  const [liveLobby, setLiveLobby] = useState(lobby)
  const [syncError, setSyncError] = useState('')
  const [isSubmittingReady, setIsSubmittingReady] = useState(false)
  const [hasSubmittedReady, setHasSubmittedReady] = useState(isPlayerReady(lobby, playerName || ''))
  const lobbyCode = liveLobby?.code || lobby?.code || ''

  useEffect(() => {
    setLiveLobby(lobby)
    setHasSubmittedReady(isPlayerReady(lobby, playerName || ''))
  }, [lobby, playerName])

  useEffect(() => {
    if (!lobbyCode) {
      return undefined
    }

    let isCancelled = false

    const refreshLobby = async () => {
      try {
        const response = await fetch(`/api/lobbies/${encodeURIComponent(lobbyCode)}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Synchronisation du lobby impossible.')
        }

        if (!isCancelled) {
          setLiveLobby(payload.lobby)
          setSyncError('')
          setHasSubmittedReady(isPlayerReady(payload.lobby, playerName || ''))

          if (payload.lobby?.status === 'in-game') {
            onGameStart(payload.lobby)
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
  }, [lobbyCode, onGameStart, playerName])

  const occupiedCellMap = useMemo(() => {
    const map = new Map()

    Object.values(shipsById).forEach((ship) => {
      buildShipCells(ship).forEach((key) => {
        map.set(key, ship.id)
      })
    })

    return map
  }, [shipsById])

  const allShipsPlaced = Object.keys(shipsById).length === FLEET.length
  const readyCount = liveLobby?.readyPlayers?.length || 0

  const selectedShip = FLEET.find((ship) => ship.id === selectedShipId)

  const handlePlaceShip = (row, column) => {
    if (!selectedShip) {
      return
    }

    const candidateShip = {
      ...selectedShip,
      row,
      column,
      orientation,
    }

    const nextShipsById = {
      ...shipsById,
      [candidateShip.id]: candidateShip,
    }

    if (!canPlaceShip(candidateShip, nextShipsById)) {
      setPlacementError('Placement invalide: hors grille ou collision avec un autre bateau.')
      return
    }

    setShipsById(nextShipsById)
    setPlacementError('')

    const nextShip = FLEET.find((ship) => !nextShipsById[ship.id])
    if (nextShip) {
      setSelectedShipId(nextShip.id)
    }
  }

  const handleRemoveShip = (shipId) => {
    const nextShipsById = { ...shipsById }
    delete nextShipsById[shipId]
    setShipsById(nextShipsById)
    setSelectedShipId(shipId)
  }

  const handleConfirmPlacement = async () => {
    if (!allShipsPlaced) {
      setPlacementError('Tu dois placer tous les bateaux avant de valider.')
      return
    }

    if (!lobbyCode || !playerName || isSubmittingReady || hasSubmittedReady) {
      return
    }

    setIsSubmittingReady(true)
    setPlacementError('')

    try {
      const response = await fetch(`/api/lobbies/${encodeURIComponent(lobbyCode)}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName,
          ships: Object.values(shipsById),
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Validation du placement impossible.')
      }

      setLiveLobby(payload.lobby)
      setHasSubmittedReady(true)

      if (payload.allReady || payload.lobby?.status === 'in-game') {
        onGameStart(payload.lobby)
      }
    } catch (error) {
      setPlacementError(error.message || 'Validation du placement impossible.')
    } finally {
      setIsSubmittingReady(false)
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
              Retour lobby
            </button>
            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Etape 2 / 2
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-md md:p-5">
            <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">Placement des bateaux</h1>
            <p className="mb-3 text-xs text-white/65 md:text-sm">
              Place tous tes bateaux avant de demarrer la partie. Clique une case pour poser le bateau selectionne.
            </p>

            <div className="mb-3 grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Lobby</p>
                <p className="mt-1 font-mono tracking-wider text-cyan-200">{lobbyCode || '---- ----'}</p>
                <p className="mt-1 text-xs text-white/75 md:text-sm">Joueur: {playerName || 'Inconnu'}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Orientation</p>
                <button
                  type="button"
                  onClick={() => setOrientation((value) => (value === 'horizontal' ? 'vertical' : 'horizontal'))}
                  className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 md:text-sm"
                >
                  {orientation === 'horizontal' ? 'Horizontale' : 'Verticale'}
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Progression</p>
                <p className="mt-1 text-xs text-white/80 md:text-sm">
                  {Object.keys(shipsById).length}/{FLEET.length} bateaux places
                </p>
                <p className="mt-1 text-xs text-white/80 md:text-sm">Prets: {readyCount}/2</p>
                <button
                  type="button"
                  onClick={handleConfirmPlacement}
                  disabled={!allShipsPlaced || isSubmittingReady || hasSubmittedReady}
                  className={`mt-2 w-full rounded-lg px-3 py-2 text-xs font-semibold text-black transition md:text-sm ${
                    allShipsPlaced && !hasSubmittedReady
                      ? 'bg-emerald-400 hover:bg-emerald-300 animate-pulse'
                      : 'bg-white/70 disabled:cursor-not-allowed'
                  }`}
                >
                  {isSubmittingReady
                    ? 'Validation...'
                    : hasSubmittedReady
                      ? 'Placement valide - en attente'
                      : 'Placement termine'}
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[250px,1fr]">
              <div className="min-h-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <h2 className="mb-2 text-base font-semibold text-white">Flotte</h2>
                <div className="space-y-1.5">
                  {FLEET.map((ship) => {
                    const isPlaced = Boolean(shipsById[ship.id])
                    const isSelected = selectedShipId === ship.id

                    return (
                      <div
                        key={ship.id}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition md:text-sm ${
                          isSelected
                            ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                            : 'border-white/10 bg-black/30 text-white/80 hover:bg-white/5'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedShipId(ship.id)}
                          className="w-full text-left"
                        >
                          <p className="font-medium">{ship.label}</p>
                          <p className="text-xs text-white/55">Taille: {ship.size}</p>
                          <p className={`mt-1 text-xs ${isPlaced ? 'text-emerald-300' : 'text-amber-200'}`}>
                            {isPlaced ? 'Place' : 'A placer'}
                          </p>
                        </button>

                        {isPlaced ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveShip(ship.id)}
                            className="mt-2 w-full rounded-md border border-rose-300/30 bg-rose-500/10 px-2 py-1 text-left text-[11px] text-rose-100 transition hover:bg-rose-500/20"
                          >
                            Retirer ce bateau
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <h2 className="mb-2 text-base font-semibold text-white">Grille (10x10)</h2>

                <div className="grid w-full max-w-[480px] grid-cols-10 gap-1 self-center md:max-w-[520px]">
                  {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                    const row = Math.floor(index / GRID_SIZE)
                    const column = index % GRID_SIZE
                    const key = cellKey(row, column)
                    const shipId = occupiedCellMap.get(key)

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePlaceShip(row, column)}
                        className={`aspect-square rounded-[5px] border text-[9px] transition ${
                          shipId
                            ? 'border-cyan-200/70 bg-cyan-300/35 text-white'
                            : 'border-white/15 bg-black/30 text-white/25 hover:bg-white/10'
                        }`}
                        title={`${String.fromCharCode(65 + row)}${column + 1}`}
                      >
                        {shipId ? 'S' : ''}
                      </button>
                    )
                  })}
                </div>

                {placementError ? (
                  <p className="mt-3 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 md:text-sm">
                    {placementError}
                  </p>
                ) : syncError ? (
                  <p className="mt-3 rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 md:text-sm">
                    {syncError}
                  </p>
                ) : hasSubmittedReady ? (
                  <p className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 md:text-sm">
                    Placement envoye. En attente de l'autre joueur...
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-white/65 md:text-sm">
                    Bateau selectionne: {selectedShip?.label || 'Aucun'} ({orientation})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShipPlacementPage
