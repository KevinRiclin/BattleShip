import http from 'node:http'
import { randomBytes } from 'node:crypto'

const PORT = Number(process.env.PORT || 8787)
const lobbies = new Map()
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

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
  }
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
      }

      lobbies.set(code, lobby)
      sendJson(response, 201, { code, lobby: sanitizeLobbyPayload(lobby) })
      return
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'Creation du lobby impossible.' })
      return
    }
  }

  if (request.method === 'GET' && pathname.startsWith('/api/lobbies/')) {
    const code = normalizeText(decodeURIComponent(pathname.replace('/api/lobbies/', ''))).toUpperCase()
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

  sendJson(response, 404, { error: 'Route introuvable.' })
})

server.listen(PORT, () => {
  console.log(`BattleShip API running on http://localhost:${PORT}`)
})