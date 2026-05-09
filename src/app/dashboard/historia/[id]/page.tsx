'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'

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
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
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

      const { data: respuestasData } = await supabase
        .from('respuestas')
        .select('id_pregunta')
        .eq('id_historia', historiaId)

      const progresoData: ProgresoTopico[] = await Promise.all(
        topicos.map(async (t: Topico) => {
          const { data: preguntasTopico } = await supabase
            .from('preguntas')
            .select('id')
            .eq('id_topico', t.id)

          const idsPreguntas = new Set(preguntasTopico?.map((p) => p.id) || [])
          const respondidas = respuestasData?.filter((r) => idsPreguntas.has(r.id_pregunta)).length || 0

          return {
            topico: t,
            total: preguntasTopico?.length || 0,
            respondidas,
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
  const primerTopicoIncompleto = progreso.find((p) => p.respondidas < p.total)

  const handleEliminar = async () => {
    setEliminando(true)
    await supabase
      .from('historias')
      .delete()
      .eq('id', historiaId)
    router.push('/dashboard')
  }

  if (loading) return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <Header backUrl="/dashboard" backLabel="Inicio" />
      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-[#EEEEEE]" />
        ))}
      </div>
    </main>
  )

  if (!historia) return null

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <Header backUrl="/dashboard" backLabel="Inicio" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-[#141414]">{historia.titulo}</h1>
            <p className="text-sm text-[#888888]">
              {historia.tipo === 'autobiografia'
                ? 'Autobiografía'
                : `Biografía de regalo · ${historia.nombre_protagonista}`}
            </p>
            {historia.descripcion && (
              <p className="text-xs text-[#AAAAAA] mt-1">{historia.descripcion}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/dashboard/historia/${historiaId}/editar`)}
            className="flex-shrink-0 text-xs text-[#6B8FC2] hover:underline mt-1"
          >
            Editar
          </button>
        </div>

        {/* Progreso general */}
        <div className="bg-white border border-[#EEEEEE] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#141414]">Progreso general</span>
            <span className="text-sm font-medium text-[#6B8FC2]">{porcentaje}%</span>
          </div>
          <div className="h-2 bg-[#EEEEEE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6B8FC2] rounded-full transition-all duration-700"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-xs text-[#888888]">
            {totalRespondidas} de {totalPreguntas} preguntas respondidas
          </p>
        </div>

        <div className="h-px bg-[#EEEEEE]" />

        {/* Tópicos */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-[#888888] uppercase tracking-widest">Tópicos</h2>
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/topicos`)}
              className="text-xs text-[#6B8FC2] hover:underline"
            >
              + Agregar
            </button>
          </div>

          {progreso.length === 0 ? (
            <div className="bg-white border border-[#EEEEEE] rounded-2xl p-8 text-center flex flex-col gap-2">
              <p className="text-sm text-[#888888]">No hay tópicos seleccionados.</p>
              <button
                onClick={() => router.push(`/dashboard/historia/${historiaId}/topicos`)}
                className="text-sm text-[#6B8FC2] hover:underline"
              >
                Seleccionar tópicos →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {progreso.map(({ topico, total, respondidas }) => {
                const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0
                const completo = respondidas === total && total > 0

                return (
                  <button
                    key={topico.id}
                    onClick={() => router.push(`/dashboard/historia/${historiaId}/preguntas/${topico.id}`)}
                    className="bg-white border border-[#EEEEEE] rounded-2xl px-4 py-3 flex flex-col gap-2 hover:border-[#6B8FC2] active:scale-[0.99] text-left transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#141414]">{topico.nombre_es}</span>
                      <div className="flex items-center gap-2">
                        {completo && (
                          <span className="text-xs px-2 py-0.5 bg-[#E8EFF8] text-[#6B8FC2] rounded-full">Completo</span>
                        )}
                        <span className="text-[#6B8FC2] text-lg leading-none">›</span>
                      </div>
                    </div>
                    <div className="h-1 bg-[#EEEEEE] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6B8FC2] rounded-full transition-all"
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
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/colaboradores`)}
              className="flex-1 h-11 border-2 border-[#EEEEEE] rounded-xl text-sm text-[#4A4A4A] bg-white hover:bg-[#F8F8F8] active:scale-[0.98]"
            >
              Colaboradores
            </button>
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/vista-previa`)}
              className="flex-1 h-11 border-2 border-[#EEEEEE] rounded-xl text-sm text-[#4A4A4A] bg-white hover:bg-[#F8F8F8] active:scale-[0.98]"
            >
              Ver historia
            </button>
          </div>
          {primerTopicoIncompleto && (
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/preguntas/${primerTopicoIncompleto.topico.id}`)}
              className="w-full h-11 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#333333] active:scale-[0.98]"
            >
              Responder preguntas →
            </button>
          )}
          <button
            onClick={() => setConfirmarEliminar(true)}
            className="w-full h-11 border-2 border-red-100 rounded-xl text-sm text-red-400 bg-white hover:bg-red-50 active:scale-[0.98]"
          >
            Eliminar historia
          </button>
        </div>

        {/* Modal confirmar eliminar */}
        {confirmarEliminar && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-xl">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-medium text-[#141414]">Eliminar historia</h2>
                <p className="text-sm text-[#888888]">
                  ¿Estás seguro que querés eliminar <strong className="text-[#141414]">{historia.titulo}</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmarEliminar(false)}
                  className="flex-1 h-11 border-2 border-[#EEEEEE] rounded-xl text-sm text-[#4A4A4A] hover:bg-[#F8F8F8] active:scale-[0.98]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminar}
                  disabled={eliminando}
                  className="flex-1 h-11 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 active:scale-[0.98] disabled:opacity-50"
                >
                  {eliminando ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}