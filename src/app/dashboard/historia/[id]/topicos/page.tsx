'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'

type Topico = {
  id: number
  nombre_es: string
  orden: number
}

export default function SeleccionTopicos() {
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string

  useEffect(() => {
    const fetchTopicos = async () => {
      const { data } = await supabase
        .from('topicos')
        .select('*')
        .order('orden')
      if (data) setTopicos(data)
    }
    fetchTopicos()
  }, [])

  const toggleTopico = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (seleccionados.length === 0) return
    setLoading(true)

    const rows = seleccionados.map((id_topico) => ({
      id_historia: historiaId,
      id_topico,
    }))

    const { error } = await supabase
      .from('historia_topicos')
      .insert(rows)

    if (!error) {
      router.push(`/dashboard/historia/${historiaId}`)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 className="text-2xl font-medium text-[#141414]">Elegí los tópicos</h1>
          <p className="text-sm text-[#888888] mt-1">Seleccioná los temas que querés incluir</p>
        </div>

        <div className="flex flex-col gap-2">
          {topicos.map((t) => {
            const activo = seleccionados.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTopico(t.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 bg-white text-left transition-all active:scale-[0.99] ${
                  activo
                    ? 'border-[#141414] shadow-sm'
                    : 'border-[#EEEEEE] hover:border-[#CCCCCC]'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                  activo ? 'bg-[#141414] border-[#141414]' : 'border-[#DDDDDD]'
                }`}>
                  {activo && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-[#141414]">{t.nombre_es}</span>
              </button>
            )
          })}
        </div>

        <div className="sticky bottom-6 flex items-center justify-between bg-white border border-[#EEEEEE] rounded-2xl px-4 py-3 shadow-sm">
          <span className="text-sm text-[#888888]">
            {seleccionados.length} tópico{seleccionados.length !== 1 ? 's' : ''} seleccionado{seleccionados.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleSubmit}
            disabled={seleccionados.length === 0 || loading}
            className="h-9 px-5 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#333333] active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? 'Guardando...' : 'Empezar →'}
          </button>
        </div>
      </div>
    </main>
  )
}