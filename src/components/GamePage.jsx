import React from 'react'
import ProfessionalBackground from '@/components/background'

function GamePage({ lobby, playerName, onGoBack }) {
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
              Retour accueil
            </button>
            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Partie lancee
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-md md:p-10">
            <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">La partie commence</h1>
            <p className="mb-6 text-sm text-white/65 md:text-base">
              Les 2 joueurs sont prets. La logique de tir peut maintenant etre implementee sur cet ecran.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-wide text-white/50">Lobby</p>
                <p className="mt-1 font-mono tracking-wider text-cyan-200">{lobby?.code || '---- ----'}</p>
                <p className="mt-3 text-sm text-white/75">Joueur: {playerName || 'Inconnu'}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-wide text-white/50">Participants</p>
                <ul className="mt-2 space-y-1 text-sm text-white/80">
                  {(lobby?.players || []).map((player) => (
                    <li key={player.name}>{player.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GamePage
