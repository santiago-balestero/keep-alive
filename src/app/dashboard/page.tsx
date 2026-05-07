'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

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
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <button
          onClick={() => router.back()}
          className="text-sm text-[#6B8FC2] hover:underline"
        >
          ← Volver
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="text-xl font-medium text-[#141414] mb-6">Nueva historia</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Tipo */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-wide">¿De quién es esta historia?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('autobiografia')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${
                  tipo === 'autobiografia'
                    ? 'border-[#141414] border-2'
                    : 'border-[#DDDDDD]'
                }`}
              >
                <span className="text-2xl">👤</span>
                <span className="text-sm font-medium text-[#141414]">Autobiografía</span>
                <span className="text-xs text-[#888888] text-center">Tu propia historia</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo('regalo')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${
                  tipo === 'regalo'
                    ? 'border-[#141414] border-2'
                    : 'border-[#DDDDDD]'
                }`}
              >
                <span className="text-2xl">🎁</span>
                <span className="text-sm font-medium text-[#141414]">Biografía regalo</span>
                <span className="text-xs text-[#888888] text-center">Para otra persona</span>
              </button>
            </div>
          </div>

          {/* Protagonista (solo si es regalo) */}
          {tipo === 'regalo' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#888888] uppercase tracking-wide">Nombre del protagonista</label>
              <input
                type="text"
                placeholder="Ej: Abuelo Julio"
                value={nombreProtagonista}
                onChange={(e) => setNombreProtagonista(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm border border-[#DDDDDD] rounded-md bg-white text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2]"
              />
            </div>
          )}

          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-wide">Título</label>
            <input
              type="text"
              placeholder="Ej: Historia de mi abuelo Julio"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full h-10 px-3 text-sm border border-[#DDDDDD] rounded-md bg-white text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2]"
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-wide">Descripción <span className="normal-case text-[#AAAAAA]">(opcional)</span></label>
            <textarea
              placeholder="Un regalo para sus 80 años..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[#DDDDDD] rounded-md bg-white text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2] resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-10 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Continuar →'}
          </button>
        </form>
      </div>
    </main>
  )
}