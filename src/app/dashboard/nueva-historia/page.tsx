'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

export default function NuevaHistoria() {
  const [tipo, setTipo] = useState<'autobiografia' | 'regalo'>('autobiografia')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [nombreProtagonista, setNombreProtagonista] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('historias')
      .insert({
        titulo,
        descripcion,
        tipo,
        nombre_protagonista: tipo === 'regalo' ? nombreProtagonista : null,
        id_autor: user.id,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/historia/${data.id}/topicos`)
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <Header backUrl="/dashboard" backLabel="Inicio" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <h1 className="text-2xl font-medium text-[#141414] mb-8">Nueva historia</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Tipo */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-widest">¿De quién es esta historia?</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'autobiografia', emoji: '👤', label: 'Autobiografía', desc: 'Tu propia historia' },
                { value: 'regalo', emoji: '🎁', label: 'Biografía regalo', desc: 'Para otra persona' },
              ].map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setTipo(op.value as any)}
                  className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-[0.98] ${
                    tipo === op.value
                      ? 'border-[#141414] bg-white shadow-sm'
                      : 'border-[#EEEEEE] bg-white hover:border-[#CCCCCC]'
                  }`}
                >
                  <span className="text-3xl">{op.emoji}</span>
                  <span className="text-sm font-medium text-[#141414]">{op.label}</span>
                  <span className="text-xs text-[#888888] text-center">{op.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {tipo === 'regalo' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#888888] uppercase tracking-widest">Nombre del protagonista</label>
              <input
                type="text"
                placeholder="Ej: Abuelo Julio"
                value={nombreProtagonista}
                onChange={(e) => setNombreProtagonista(e.target.value)}
                required
                className="w-full h-11 px-4 text-sm border border-[#EEEEEE] rounded-xl bg-[#F8F8F8] text-[#141414] placeholder-[#BBBBBB] focus:outline-none focus:border-[#6B8FC2] focus:bg-white"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-widest">Título</label>
            <input
              type="text"
              placeholder="Ej: Historia de mi abuelo Julio"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full h-11 px-4 text-sm border border-[#EEEEEE] rounded-xl bg-[#F8F8F8] text-[#141414] placeholder-[#BBBBBB] focus:outline-none focus:border-[#6B8FC2] focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-widest">
              Descripción <span className="normal-case text-[#BBBBBB] font-normal">(opcional)</span>
            </label>
            <textarea
              placeholder="Un regalo para sus 80 años..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 text-sm border border-[#EEEEEE] rounded-xl bg-[#F8F8F8] text-[#141414] placeholder-[#BBBBBB] focus:outline-none focus:border-[#6B8FC2] focus:bg-white resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#333333] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Continuar →'}
          </button>
        </form>
      </div>
    </main>
  )
}