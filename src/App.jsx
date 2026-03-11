import React, { useState } from 'react'
import ProfessionalBackground from '@/components/background'
import CreateLobbyPage from '@/components/CreateLobbyPage'
import JoinedLobbyPage from '@/components/JoinedLobbyPage'

function App() {
  const [screen, setScreen] = useState('landing')
  const [joinPlayerName, setJoinPlayerName] = useState('')
  const [joinLobbyCode, setJoinLobbyCode] = useState('')
  const [isJoiningLobby, setIsJoiningLobby] = useState(false)
  const [joinLobbyError, setJoinLobbyError] = useState('')
  const [joinedLobby, setJoinedLobby] = useState(null)
  const [createPlayerName, setCreatePlayerName] = useState('')
  const [createLobbyName, setCreateLobbyName] = useState('')
  const canJoinLobby = joinPlayerName.trim().length >= 3 && joinLobbyCode.trim().length >= 3
  const canOpenCreatePage = createPlayerName.trim().length >= 3 && createLobbyName.trim().length >= 3

  const handleGoToCreatePage = () => {
    setScreen('create-lobby')
  }

  const handleGoBack = () => {
    setScreen('landing')
  }

  const handleJoinLobby = async () => {
    if (!canJoinLobby || isJoiningLobby) {
      return
    }

    setIsJoiningLobby(true)
    setJoinLobbyError('')

    try {
      const response = await fetch('/api/lobbies/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: joinLobbyCode.trim().toUpperCase(),
          playerName: joinPlayerName.trim(),
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Impossible de rejoindre ce lobby.')
      }

      setJoinedLobby(payload.lobby)
      setScreen('joined-lobby')
    } catch (error) {
      setJoinLobbyError(error.message || 'Impossible de rejoindre ce lobby.')
      setJoinedLobby(null)
    } finally {
      setIsJoiningLobby(false)
    }
  }

  if (screen === 'create-lobby') {
    return (
      <CreateLobbyPage
        createPlayerName={createPlayerName}
        setCreatePlayerName={setCreatePlayerName}
        createLobbyName={createLobbyName}
        setCreateLobbyName={setCreateLobbyName}
        onGoBack={handleGoBack}
      />
    )
  }

  if (screen === 'joined-lobby' && joinedLobby) {
    return (
      <JoinedLobbyPage
        lobby={joinedLobby}
        playerName={joinPlayerName.trim()}
        onGoBack={handleGoBack}
      />
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <ProfessionalBackground />
      <div className="relative z-50 flex items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Bataille Navale</h1>
          </div>

          <div className="bg-black/60 border border-white/10 backdrop-blur-md shadow-2xl rounded-2xl min-h-[580px]">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 min-h-[580px]">
              <div className="p-10 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2 text-center md:text-left">Rejoindre une partie</h3>
                  <p className="text-sm text-white/60 mb-2 text-center md:text-left">Entre le code d’un lobby pour rejoindre tes amis.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Nom du joueur</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={joinPlayerName}
                      onChange={(event) => setJoinPlayerName(event.target.value)}
                      placeholder="Capitaine"
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Code du lobby</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={joinLobbyCode}
                      onChange={(event) => setJoinLobbyCode(event.target.value)}
                      placeholder="ABCD-1234"
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleJoinLobby}
                    disabled={!canJoinLobby || isJoiningLobby}
                    className={`w-full rounded-lg py-3 font-semibold text-black transition ${
                      canJoinLobby
                        ? 'bg-gray-100 animate-pulse'
                        : 'bg-white disabled:cursor-not-allowed '
                    }`}
                  >
                    {isJoiningLobby ? 'Connexion...' : 'Rejoindre'}
                  </button>
                  {joinLobbyError ? (
                    <p className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                      {joinLobbyError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="p-10 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2 text-center md:text-left">Créer une partie</h3>
                  <p className="text-sm text-white/60 mb-3 text-center md:text-left">Configure le mode et invite tes amis.</p>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Nom du joueur</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={createPlayerName}
                      onChange={(event) => setCreatePlayerName(event.target.value)}
                      placeholder="Capitaine"
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Nom du lobby</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={createLobbyName}
                      onChange={(event) => setCreateLobbyName(event.target.value)}
                      placeholder="L'escadron bleu"
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoToCreatePage}
                    disabled={!canOpenCreatePage}
                    className={`w-full rounded-lg py-3 font-semibold text-black transition ${
                      canOpenCreatePage
                        ? 'bg-gray-100 animate-pulse'
                        : 'bg-white disabled:cursor-not-allowed'
                    }`}
                  >
                    Créer
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

export default App
