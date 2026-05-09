'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'

export default function EditarHistoria() {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [nombreProtagonista, setNombreProtagonista] = useState('')
  const [tipo, setTipo] = useState<'autobiografia' | 'regalo'>('autobiografia')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('historias')
        .select('*')
        .eq('id', historiaId)
        .single()

      if (data) {
        setTitulo(data.titulo)
        setDescripcion(data.descripcion || '')
        setTipo(data.tipo)
        setNombreProtagonista(data.nombre_protagonista || '')
      }
      setLoading(false)
    }
    fetchData()
  }, [historiaId])

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')

    const { error } = await supabase
      .from('historias')
      .update({
        titulo,
        descripcion,
        tipo,
        nombre_protagonista: tipo === 'regalo' ? nombreProtagonista : null,
        fecha_modificacion: new Date().toISOString(),
      })
      .eq('id', historiaId)

    if (error) {
      setError(error.message)
      setGuardando(false)
      return
    }

    router.push(`/dashboard/historia/${historiaId}`)
  }

  if (loading) return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-12 animate-pulse" />
        ))}
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <h1 className="text-2xl font-medium text-[#141414] mb-8">Editar historia</h1>

        <form onSubmit={handleGuardar} className="flex flex-col gap-6">

          {/* Tipo */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-widest">
              Tipo de historia
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'autobiografia', emoji: '👤', label: 'Autobiografía', desc: 'Tu propia historia' },
                { value: 'regalo', emoji: '🎁', label: 'Biografía regalo', desc: 'Para otra persona' },
              ].map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setTipo(op.value as any)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-[0.98] ${
                    tipo === op.value
                      ? 'border-[#141414] bg-white shadow-sm'
                      : 'border-[#EEEEEE] bg-white hover:border-[#CCCCCC]'
                  }`}
                >
                  <span className="text-2xl">{op.emoji}</span>
                  <span className="text-sm font-medium text-[#141414]">{op.label}</span>
                  <span className="text-xs text-[#888888] text-center">{op.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Protagonista */}
          {tipo === 'regalo' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#888888] uppercase tracking-widest">
                Nombre del protagonista
              </label>
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

          {/* Título */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-widest">
              Título
            </label>
            <input
              type="text"
              placeholder="Ej: Historia de mi abuelo Julio"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full h-11 px-4 text-sm border border-[#EEEEEE] rounded-xl bg-[#F8F8F8] text-[#141414] placeholder-[#BBBBBB] focus:outline-none focus:border-[#6B8FC2] focus:bg-white"
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#888888] uppercase tracking-widest">
              Descripción <span className="normal-case text-[#BBBBBB] font-normal">(opcional)</span>
            </label>
            <textarea
              placeholder="Una descripción breve..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 text-sm border border-[#EEEEEE] rounded-xl bg-[#F8F8F8] text-[#141414] placeholder-[#BBBBBB] focus:outline-none focus:border-[#6B8FC2] focus:bg-white resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="h-11 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#333333] active:scale-[0.98] disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </main>
  )
}