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
  descripcion: string | null
}

type Topico = {
  id: number
  nombre_es: string
}

type ProgresoTopico = {
  topico: Topico
  total: number
  respondidas: number
}

export default function DetalleHistoria() {
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [progreso, setProgreso] = useState<ProgresoTopico[]>([])
  const [loading, setLoading] = useState(true)
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

      if (!ht) return

      const topicos = ht.map((row: any) => row.topicos).filter(Boolean)

      const progresoData: ProgresoTopico[] = await Promise.all(
        topicos.map(async (t: Topico) => {
          const { count: total } = await supabase
            .from('preguntas')
            .select('*', { count: 'exact', head: true })
            .eq('id_topico', t.id)

          const { count: respondidas } = await supabase
            .from('respuestas')
            .select('*', { count: 'exact', head: true })
            .eq('id_historia', historiaId)
            .eq('id_pregunta', supabase.from('preguntas').select('id').eq('id_topico', t.id) as any)

          const { data: respuestasData } = await supabase
            .from('respuestas')
            .select('id_pregunta')
            .eq('id_historia', historiaId)

          const { data: preguntasTopico } = await supabase
            .from('preguntas')
            .select('id')
            .eq('id_topico', t.id)

          const idsPreguntas = new Set(preguntasTopico?.map((p) => p.id) || [])
          const respondidas2 = respuestasData?.filter((r) => idsPreguntas.has(r.id_pregunta)).length || 0

          return {
            topico: t,
            total: total || 0,
            respondidas: respondidas2,
          }
        })
      )

      setProgreso(progresoData)
      setLoading(false)
    }

    fetchData()
  }, [historiaId])

  const totalPreguntas = progreso.reduce((acc, p) => acc + p.total, 0)
  const totalRespondidas = progreso.reduce((acc, p) => acc + p.respondidas, 0)
  const porcentaje = totalPreguntas > 0 ? Math.round((totalRespondidas / totalPreguntas) * 100) : 0

  if (loading) return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <p className="text-sm text-[#888888]">Cargando...</p>
    </main>
  )

  if (!historia) return null

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <button onClick={() => router.push('/dashboard')} className="text-sm text-[#6B8FC2] hover:underline">
          ← Inicio
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium text-[#141414]">{historia.titulo}</h1>
          <p className="text-sm text-[#888888]">
            {historia.tipo === 'autobiografia'
              ? 'Autobiografía'
              : `Biografía de regalo · ${historia.nombre_protagonista}`}
          </p>
          {historia.descripcion && (
            <p className="text-xs text-[#AAAAAA] mt-1">{historia.descripcion}</p>
          )}
        </div>

        {/* Progreso general */}
        <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#141414]">Progreso general</span>
            <span className="text-sm font-medium text-[#6B8FC2]">{porcentaje}%</span>
          </div>
          <div className="h-2 bg-[#EEEEEE] rounded-full">
            <div
              className="h-2 bg-[#6B8FC2] rounded-full transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-xs text-[#888888]">
            {totalRespondidas} de {totalPreguntas} preguntas respondidas
          </p>
        </div>

        <div className="h-px bg-[#DDDDDD]" />

        {/* Tópicos con progreso */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-[#888888] uppercase tracking-wide">Tópicos</h2>
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/topicos`)}
              className="text-xs text-[#6B8FC2] hover:underline"
            >
              + Agregar
            </button>
          </div>

          {progreso.length === 0 ? (
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
              {progreso.map(({ topico, total, respondidas }) => {
                const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0
                return (
                  <button
                    key={topico.id}
                    onClick={() => router.push(`/dashboard/historia/${historiaId}/preguntas/${topico.id}`)}
                    className="bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 flex flex-col gap-2 hover:border-[#6B8FC2] transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#141414]">{topico.nombre_es}</span>
                      <span className="text-xs text-[#6B8FC2]">›</span>
                    </div>
                    <div className="h-1 bg-[#EEEEEE] rounded-full">
                      <div
                        className="h-1 bg-[#6B8FC2] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#888888]">
                      {respondidas} / {total} respondidas
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Acciones */}
<div className="flex gap-3">
  <button
    onClick={() => router.push(`/dashboard/historia/${historiaId}/colaboradores`)}
    className="flex-1 h-10 border border-[#DDDDDD] rounded-md text-sm text-[#4A4A4A] bg-white hover:bg-[#F2F2F2] transition-colors"
  >
    Colaboradores
  </button>
  <button
    onClick={() => router.push(`/dashboard/historia/${historiaId}/vista-previa`)}
    className="flex-1 h-10 border border-[#DDDDDD] rounded-md text-sm text-[#4A4A4A] bg-white hover:bg-[#F2F2F2] transition-colors"
  >
    Ver historia
  </button>
</div>
<button
  onClick={() => {
    const primerTopico = progreso.find((p) => p.respondidas < p.total)
    if (primerTopico) {
      router.push(`/dashboard/historia/${historiaId}/preguntas/${primerTopico.topico.id}`)
    }
  }}
  className="w-full h-10 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors"
>
  Responder preguntas →
</button>

      </div>
    </main>
  )
}