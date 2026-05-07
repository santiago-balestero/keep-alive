'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

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
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <button onClick={() => router.back()} className="text-sm text-[#6B8FC2] hover:underline">
          ← Volver
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-medium text-[#141414]">Elegí los tópicos</h1>
          <p className="text-sm text-[#888888] mt-1">Seleccioná los temas que querés incluir en la historia</p>
        </div>

        <div className="flex flex-col gap-2">
          {topicos.map((t) => {
            const activo = seleccionados.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTopico(t.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border bg-white text-left transition-colors ${
                  activo ? 'border-[#141414]' : 'border-[#DDDDDD] hover:border-[#6B8FC2]'
                }`}
              >
                <div className={`w-5 h-5 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
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

        <div className="flex items-center justify-between sticky bottom-6">
          <span className="text-sm text-[#888888]">
            {seleccionados.length} tópico{seleccionados.length !== 1 ? 's' : ''} seleccionado{seleccionados.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleSubmit}
            disabled={seleccionados.length === 0 || loading}
            className="h-10 px-6 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Empezar →'}
          </button>
        </div>
      </div>
    </main>
  )
}