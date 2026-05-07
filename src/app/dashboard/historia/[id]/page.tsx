'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Historia = {
  id: string
  titulo: string
  tipo: string
  nombre_protagonista: string | null
  estado: string
}

type Topico = {
  id: number
  nombre_es: string
}

export default function DetalleHistoria() {
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string

  useEffect(() => {
    const fetchData = async () => {
      const { data: h } = await supabase
        .from('historias')
        .select('*')
        .eq('id', historiaId)
        .single()

      if (h) setHistoria(h)

      const { data: ht } = await supabase
        .from('historia_topicos')
        .select('topicos(id, nombre_es)')
        .eq('id_historia', historiaId)

      if (ht) {
        const t = ht.map((row: any) => row.topicos).filter(Boolean)
        setTopicos(t)
      }
    }
    fetchData()
  }, [historiaId])

  if (!historia) return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <p className="text-sm text-[#888888]">Cargando...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <button onClick={() => router.push('/dashboard')} className="text-sm text-[#6B8FC2] hover:underline">
          ← Inicio
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-medium text-[#141414]">{historia.titulo}</h1>
          <p className="text-sm text-[#888888] mt-1">
            {historia.tipo === 'autobiografia' ? 'Autobiografía' : `Biografía de regalo · ${historia.nombre_protagonista}`}
          </p>
        </div>

        <div className="h-px bg-[#DDDDDD]" />

        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-[#888888] uppercase tracking-wide">Tópicos</h2>
          {topicos.length === 0 ? (
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 text-center">
              <p className="text-sm text-[#888888]">No hay tópicos seleccionados.</p>
              <button
                onClick={() => router.push(`/dashboard/historia/${historiaId}/topicos`)}
                className="mt-3 text-sm text-[#6B8FC2] hover:underline"
              >
                Seleccionar tópicos →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {topicos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/dashboard/historia/${historiaId}/preguntas/${t.id}`)}
                  className="flex items-center justify-between bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 hover:border-[#6B8FC2] transition-colors"
                >
                  <span className="text-sm text-[#141414]">{t.nombre_es}</span>
                  <span className="text-[#6B8FC2]">›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}