import http from 'node:http'
import { randomBytes } from 'node:crypto'

const PORT = Number(process.env.PORT || 8787)
const lobbies = new Map()
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_PLAYERS_PER_LOBBY = 2
const REQUIRED_SHIP_COUNT = 5
const GRID_SIZE = 10
const LOBBY_START_ROUTE = /^\/api\/lobbies\/([^/]+)\/start\/?$/
const LOBBY_READY_ROUTE = /^\/api\/lobbies\/([^/]+)\/ready\/?$/
const LOBBY_GAME_STATE_ROUTE = /^\/api\/lobbies\/([^/]+)\/game-state\/?$/
const LOBBY_FIRE_ROUTE = /^\/api\/lobbies\/([^/]+)\/fire\/?$/
const LOBBY_GET_ROUTE = /^\/api\/lobbies\/([^/]+)\/?$/

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end(JSON.stringify(payload))
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = ''

    request.on('data', (chunk) => {
      rawBody += chunk
      if (rawBody.length > 1e6) {
        reject(new Error('Request body too large'))
        request.destroy()
      }
    })

    request.on('end', () => {
      if (!rawBody) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(rawBody))
      } catch {
        reject(new Error('Invalid JSON payload'))
      }
    })

    request.on('error', () => {
      reject(new Error('Cannot read request body'))
    })
  })
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function randomSegment(length) {
  const bytes = randomBytes(length)
  let segment = ''

  for (let index = 0; index < length; index += 1) {
    segment += CODE_CHARS[bytes[index] % CODE_CHARS.length]
  }

  return segment
}

function generateLobbyCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `${randomSegment(4)}-${randomSegment(4)}`
    if (!lobbies.has(candidate)) {
      return candidate
    }
  }

  throw new Error('Unable to allocate unique lobby code')
}

function sanitizeLobbyPayload(lobby) {
  return {
    code: lobby.code,
    hostName: lobby.hostName,
    lobbyName: lobby.lobbyName,
    mode: lobby.mode,
    status: lobby.status,
    createdAt: lobby.createdAt,
    players: lobby.players,
    readyPlayers: Object.keys(lobby.readyPlayers || {}).filter((name) => lobby.readyPlayers[name]),
    turnPlayerName: lobby.gameState?.turnPlayerName || null,
    winnerName: lobby.gameState?.winnerName || null,
  }
}

function resolvePlayerName(lobby, playerName) {
  const normalized = normalizeText(playerName).toLowerCase()
  const player = lobby.players.find((entry) => entry.name.toLowerCase() === normalized)
  return player?.name || null
}

function shipCells(placement) {
  const row = Number(placement.row)
  const column = Number(placement.column)
  const size = Number(placement.size)
  const orientation = placement.orientation
  const id = normalizeText(placement.id)

  if (!id || !Number.isInteger(row) || !Number.isInteger(column) || !Number.isInteger(size)) {
    return null
  }

  if (size < 2 || size > 5 || (orientation !== 'horizontal' && orientation !== 'vertical')) {
    return null
  }

  const cells = []
  for (let index = 0; index < size; index += 1) {
    const currentRow = orientation === 'vertical' ? row + index : row
    const currentColumn = orientation === 'horizontal' ? column + index : column

    if (
      currentRow < 0 ||
      currentColumn < 0 ||
      currentRow >= GRID_SIZE ||
      currentColumn >= GRID_SIZE
    ) {
      return null
    }

    cells.push(`${currentRow}-${currentColumn}`)
  }

  return { id, cells }
}

function buildBoardFromPlacements(placements) {
  if (!Array.isArray(placements) || placements.length !== REQUIRED_SHIP_COUNT) {
    return null
  }

  const allCells = new Set()
  const shipCellsById = {}

  for (const placement of placements) {
    const parsed = shipCells(placement)
    if (!parsed || shipCellsById[parsed.id]) {
      return null
    }

    for (const cell of parsed.cells) {
      if (allCells.has(cell)) {
        return null
      }
      allCells.add(cell)
    }

    shipCellsById[parsed.id] = parsed.cells
  }

  if (Object.keys(shipCellsById).length !== REQUIRED_SHIP_COUNT) {
    return null
  }

  return {
    shipCells: Array.from(allCells),
    shipCellsById,
  }
}

function initGameState(lobby) {
  const [playerA, playerB] = lobby.players.map((player) => player.name)

  lobby.gameState = {
    turnPlayerName: playerA,
    winnerName: null,
    shotsByPlayer: {
      [playerA]: {},
      [playerB]: {},
    },
    hitsTakenByPlayer: {
      [playerA]: {},
      [playerB]: {},
    },
    boardsByPlayer: {
      [playerA]: buildBoardFromPlacements(lobby.shipPlacements[playerA]),
      [playerB]: buildBoardFromPlacements(lobby.shipPlacements[playerB]),
    },
  }
}

function getOpponentName(lobby, playerName) {
  const opponent = lobby.players.find((player) => player.name !== playerName)
  return opponent?.name || null
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host}`)
  const pathname = requestUrl.pathname

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (request.method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'POST' && pathname === '/api/lobbies') {
    try {
      const body = await parseJsonBody(request)
      const hostName = normalizeText(body.hostName)
      const lobbyName = normalizeText(body.lobbyName)
      const mode = normalizeText(body.mode) || 'classic'

      if (hostName.length < 3 || lobbyName.length < 3) {
        sendJson(response, 400, {
          error: 'Le nom du joueur et le nom du lobby doivent contenir au moins 3 caracteres.',
        })
        return
      }

      const code = generateLobbyCode()
      const createdAt = new Date().toISOString()

      const lobby = {
        code,
        hostName,
        lobbyName,
        mode,
        status: 'waiting',
        createdAt,
        players: [{ name: hostName, isHost: true }],
        readyPlayers: {},
        shipPlacements: {},
      }

      lobbies.set(code, lobby)
      sendJson(response, 201, { code, lobby: sanitizeLobbyPayload(lobby) })
      return
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'Creation du lobby impossible.' })
      return
    }
  }

  const gameStateRouteMatch = pathname.match(LOBBY_GAME_STATE_ROUTE)
  if (request.method === 'GET' && gameStateRouteMatch) {
    const code = normalizeText(decodeURIComponent(gameStateRouteMatch[1])).toUpperCase()
    const playerName = normalizeText(requestUrl.searchParams.get('playerName'))
    const lobby = lobbies.get(code)

    if (!lobby) {
      sendJson(response, 404, { error: 'Lobby introuvable.' })
      return
    }

    const canonicalPlayerName = resolvePlayerName(lobby, playerName)
    if (!canonicalPlayerName) {
      sendJson(response, 403, { error: 'Ce joueur ne fait pas partie du lobby.' })
      return
    }

    if (!lobby.gameState) {
      sendJson(response, 200, {
        lobby: sanitizeLobbyPayload(lobby),
        game: null,
      })
      return
    }

    const opponentName = getOpponentName(lobby, canonicalPlayerName)
    const yourShots = lobby.gameState.shotsByPlayer[canonicalPlayerName] || {}
    const yourBoard = lobby.gameState.boardsByPlayer[canonicalPlayerName] || { shipCells: [] }
    const yourHitsTaken = Object.keys(lobby.gameState.hitsTakenByPlayer[canonicalPlayerName] || {})

    sendJson(response, 200, {
      lobby: sanitizeLobbyPayload(lobby),
      game: {
        turnPlayerName: lobby.gameState.turnPlayerName,
        winnerName: lobby.gameState.winnerName,
        opponentName,
        yourShots,
        yourShipCells: yourBoard.shipCells,
        yourHitsTaken,
      },
    })
    return
  }

  const lobbyGetRouteMatch = pathname.match(LOBBY_GET_ROUTE)
  if (request.method === 'GET' && lobbyGetRouteMatch) {
    const code = normalizeText(decodeURIComponent(lobbyGetRouteMatch[1])).toUpperCase()
    const lobby = lobbies.get(code)

    if (!lobby) {
      sendJson(response, 404, { error: 'Lobby introuvable.' })
      return
    }

    sendJson(response, 200, { lobby: sanitizeLobbyPayload(lobby) })
    return
  }

  if (request.method === 'POST' && pathname === '/api/lobbies/join') {
    try {
      const body = await parseJsonBody(request)
      const code = normalizeText(body.code).toUpperCase()
      const playerName = normalizeText(body.playerName)
      const lobby = lobbies.get(code)

      if (!code || code.length < 3 || playerName.length < 3) {
        sendJson(response, 400, {
          error: 'Le code et le nom du joueur doivent contenir au moins 3 caracteres.',
        })
        return
      }

      if (!lobby) {
        sendJson(response, 404, { error: 'Lobby introuvable.' })
        return
      }

      const alreadyInLobby = lobby.players.some(
        (player) => player.name.toLowerCase() === playerName.toLowerCase(),
      )

      if (!alreadyInLobby && lobby.players.length >= MAX_PLAYERS_PER_LOBBY) {
        sendJson(response, 409, {
          error: 'Lobby full: 2 joueurs maximum.',
          code: 'LOBBY_FULL',
        })
        return
      }

      if (!alreadyInLobby) {
        lobby.players.push({ name: playerName, isHost: false })
      }

      sendJson(response, 200, { lobby: sanitizeLobbyPayload(lobby) })
      return
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'Impossible de rejoindre le lobby.' })
      return
    }
  }

  const startRouteMatch = pathname.match(LOBBY_START_ROUTE)
  if (request.method === 'POST' && startRouteMatch) {
    const code = normalizeText(decodeURIComponent(startRouteMatch[1])).toUpperCase()
    const lobby = lobbies.get(code)

    if (!lobby) {
      sendJson(response, 404, { error: 'Lobby introuvable.' })
      return
    }

    lobby.status = 'placing-ships'
    lobby.readyPlayers = {}
    lobby.shipPlacements = {}
    sendJson(response, 200, { lobby: sanitizeLobbyPayload(lobby) })
    return
  }

  const readyRouteMatch = pathname.match(LOBBY_READY_ROUTE)
  if (request.method === 'POST' && readyRouteMatch) {
    try {
      const code = normalizeText(decodeURIComponent(readyRouteMatch[1])).toUpperCase()
      const body = await parseJsonBody(request)
      const playerName = normalizeText(body.playerName)
      const ships = Array.isArray(body.ships) ? body.ships : []
      const lobby = lobbies.get(code)

      if (!lobby) {
        sendJson(response, 404, { error: 'Lobby introuvable.' })
        return
      }

      if (playerName.length < 3) {
        sendJson(response, 400, { error: 'Nom du joueur invalide.' })
        return
      }

      const canonicalPlayerName = resolvePlayerName(lobby, playerName)

      if (!canonicalPlayerName) {
        sendJson(response, 403, { error: 'Ce joueur ne fait pas partie du lobby.' })
        return
      }

      const board = buildBoardFromPlacements(ships)
      if (!board) {
        sendJson(response, 400, { error: 'Tous les bateaux doivent etre places avant validation.' })
        return
      }

      lobby.status = 'placing-ships'
      lobby.readyPlayers[canonicalPlayerName] = true
      lobby.shipPlacements[canonicalPlayerName] = ships

      const allReady =
        lobby.players.length === MAX_PLAYERS_PER_LOBBY &&
        lobby.players.every((player) => lobby.readyPlayers[player.name])

      if (allReady) {
        if (!lobby.gameState) {
          initGameState(lobby)
        }
        lobby.status = 'in-game'
      }

      sendJson(response, 200, { lobby: sanitizeLobbyPayload(lobby), allReady })
      return
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'Validation du placement impossible.' })
      return
    }
  }

  const fireRouteMatch = pathname.match(LOBBY_FIRE_ROUTE)
  if (request.method === 'POST' && fireRouteMatch) {
    try {
      const code = normalizeText(decodeURIComponent(fireRouteMatch[1])).toUpperCase()
      const body = await parseJsonBody(request)
      const playerName = normalizeText(body.playerName)
      const row = Number(body.row)
      const column = Number(body.column)
      const lobby = lobbies.get(code)

      if (!lobby) {
        sendJson(response, 404, { error: 'Lobby introuvable.' })
        return
      }

      if (!lobby.gameState || lobby.status !== 'in-game') {
        sendJson(response, 400, { error: 'La partie n est pas encore en cours.' })
        return
      }

      const canonicalPlayerName = resolvePlayerName(lobby, playerName)
      if (!canonicalPlayerName) {
        sendJson(response, 403, { error: 'Ce joueur ne fait pas partie du lobby.' })
        return
      }

      if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0 || row >= GRID_SIZE || column >= GRID_SIZE) {
        sendJson(response, 400, { error: 'Coordonnees de tir invalides.' })
        return
      }

      if (lobby.gameState.winnerName) {
        sendJson(response, 400, { error: 'La partie est deja terminee.' })
        return
      }

      if (lobby.gameState.turnPlayerName !== canonicalPlayerName) {
        sendJson(response, 409, { error: 'Ce n est pas ton tour.' })
        return
      }

      const opponentName = getOpponentName(lobby, canonicalPlayerName)
      const targetCell = `${row}-${column}`
      const shotsByCurrent = lobby.gameState.shotsByPlayer[canonicalPlayerName]

      if (shotsByCurrent[targetCell]) {
        sendJson(response, 409, { error: 'Cette case a deja ete visee.' })
        return
      }

      const opponentBoard = lobby.gameState.boardsByPlayer[opponentName]
      const opponentHits = lobby.gameState.hitsTakenByPlayer[opponentName]
      const hit = opponentBoard.shipCells.includes(targetCell)

      shotsByCurrent[targetCell] = hit ? 'hit' : 'miss'
      if (hit) {
        opponentHits[targetCell] = true
      }

      let sunkShipId = null
      if (hit) {
        const shipsEntries = Object.entries(opponentBoard.shipCellsById)
        for (const [shipId, shipCellsById] of shipsEntries) {
          if (shipCellsById.includes(targetCell)) {
            const sunk = shipCellsById.every((cell) => Boolean(opponentHits[cell]))
            if (sunk) {
              sunkShipId = shipId
            }
            break
          }
        }
      }

      const allOpponentCellsHit = opponentBoard.shipCells.every((cell) => Boolean(opponentHits[cell]))
      if (allOpponentCellsHit) {
        lobby.gameState.winnerName = canonicalPlayerName
      } else {
        // A hit grants an extra shot; turn changes only on miss.
        lobby.gameState.turnPlayerName = hit ? canonicalPlayerName : opponentName
      }

      sendJson(response, 200, {
        lobby: sanitizeLobbyPayload(lobby),
        result: {
          row,
          column,
          hit,
          sunkShipId,
          winnerName: lobby.gameState.winnerName,
          nextTurnPlayerName: lobby.gameState.turnPlayerName,
        },
      })
      return
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'Tir impossible.' })
      return
    }
  }

  sendJson(response, 404, { error: 'Route introuvable.' })
})

server.listen(PORT, () => {
  console.log(`BattleShip API running on http://localhost:${PORT}`)
})