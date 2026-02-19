import React from 'react'
import ProfessionalBackground from '@/components/background'
import './index.css'

function App() {
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
                      placeholder="Capitaine"
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Code du lobby</label>
                    <input
                      type="text"
                      placeholder="ABCD-1234"
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                  <button className="w-full rounded-lg bg-white text-black font-semibold py-3 hover:bg-white/90 transition">
                    Rejoindre
                  </button>
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
                      placeholder="Capitaine"
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Nom du lobby</label>
                    <input
                      type="text"
                      placeholder="L'escadron bleu"
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                  <button className="w-full rounded-lg bg-white text-black font-semibold py-3 hover:bg-white/90 transition">
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
