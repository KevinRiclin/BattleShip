import React, { useMemo, useState } from 'react'
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

function ShipPlacementPage({ lobby, hostName, onGoBack }) {
  const [orientation, setOrientation] = useState('horizontal')
  const [shipsById, setShipsById] = useState({})
  const [selectedShipId, setSelectedShipId] = useState(FLEET[0].id)
  const [placementError, setPlacementError] = useState('')

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

  return (
    <div className="min-h-screen bg-black">
      <ProfessionalBackground />

      <div className="relative z-50 min-h-screen px-6 py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 flex items-center justify-between gap-4">
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

          <div className="rounded-2xl border border-white/10 bg-black/60 p-5 shadow-2xl backdrop-blur-md md:p-8">
            <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">Placement des bateaux</h1>
            <p className="mb-6 text-sm text-white/65 md:text-base">
              Place tous tes bateaux avant de demarrer la partie. Clique une case pour poser le bateau selectionne.
            </p>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">Lobby</p>
                <p className="mt-1 font-mono tracking-wider text-cyan-200">{lobby?.code || '---- ----'}</p>
                <p className="mt-2 text-sm text-white/75">Host: {hostName || 'Inconnu'}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">Orientation</p>
                <button
                  type="button"
                  onClick={() => setOrientation((value) => (value === 'horizontal' ? 'vertical' : 'horizontal'))}
                  className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {orientation === 'horizontal' ? 'Horizontale' : 'Verticale'}
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">Progression</p>
                <p className="mt-2 text-sm text-white/80">
                  {Object.keys(shipsById).length}/{FLEET.length} bateaux places
                </p>
                <button
                  type="button"
                  disabled={!allShipsPlaced}
                  className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-black transition ${
                    allShipsPlaced
                      ? 'bg-emerald-400 hover:bg-emerald-300 animate-pulse'
                      : 'bg-white/70 disabled:cursor-not-allowed'
                  }`}
                >
                  Placement termine
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="mb-3 text-lg font-semibold text-white">Flotte</h2>
                <div className="space-y-2">
                  {FLEET.map((ship) => {
                    const isPlaced = Boolean(shipsById[ship.id])
                    const isSelected = selectedShipId === ship.id

                    return (
                      <button
                        key={ship.id}
                        type="button"
                        onClick={() => setSelectedShipId(ship.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                            : 'border-white/10 bg-black/30 text-white/80 hover:bg-white/5'
                        }`}
                      >
                        <p className="font-medium">{ship.label}</p>
                        <p className="text-xs text-white/55">Taille: {ship.size}</p>
                        <p className={`mt-1 text-xs ${isPlaced ? 'text-emerald-300' : 'text-amber-200'}`}>
                          {isPlaced ? 'Place' : 'A placer'}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 space-y-2">
                  {Object.values(shipsById).map((ship) => (
                    <button
                      key={`remove-${ship.id}`}
                      type="button"
                      onClick={() => handleRemoveShip(ship.id)}
                      className="w-full rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-left text-xs text-rose-100 transition hover:bg-rose-500/20"
                    >
                      Retirer {ship.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="mb-3 text-lg font-semibold text-white">Grille (10x10)</h2>

                <div className="grid w-full max-w-[560px] grid-cols-10 gap-1">
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
                        className={`aspect-square rounded-[6px] border text-[10px] transition ${
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
                  <p className="mt-4 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                    {placementError}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-white/65">
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
