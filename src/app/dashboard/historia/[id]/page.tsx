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
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <Header backUrl="/dashboard" backLabel="Inicio" />
      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: 'var(--color-crema-oscuro)', borderRadius: 16, height: 80 }} />
        ))}
      </div>
    </main>
  )

  if (!historia) return null

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <Header backUrl="/dashboard" backLabel="Inicio" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-texto)' }}>{historia.titulo}</h1>
            <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>
              {historia.tipo === 'autobiografia' ? 'Autobiografía' : `Biografía de regalo · ${historia.nombre_protagonista}`}
            </p>
            {historia.descripcion && (
              <p style={{ fontSize: 12, color: 'var(--color-gris)', marginTop: 4 }}>{historia.descripcion}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/dashboard/historia/${historiaId}/editar`)}
            style={{ flexShrink: 0, fontSize: 13, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
          >
            Editar
          </button>
        </div>

        {/* Progreso general */}
        <div style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-texto)' }}>Progreso general</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-terracota)' }}>{porcentaje}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--color-crema-oscuro)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--color-terracota)', borderRadius: 8, width: `${porcentaje}%`, transition: 'width 0.7s' }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-gris)' }}>
            {totalRespondidas} de {totalPreguntas} preguntas respondidas
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--color-borde)' }} />

        {/* Tópicos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tópicos</h2>
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/topicos`)}
              style={{ fontSize: 13, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              + Agregar
            </button>
          </div>

          {progreso.length === 0 ? (
            <div style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>No hay tópicos seleccionados.</p>
              <button
                onClick={() => router.push(`/dashboard/historia/${historiaId}/topicos`)}
                style={{ fontSize: 13, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Seleccionar tópicos →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {progreso.map(({ topico, total, respondidas }) => {
                const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0
                const completo = respondidas === total && total > 0
                return (
                  <button
                    key={topico.id}
                    onClick={() => router.push(`/dashboard/historia/${historiaId}/preguntas/${topico.id}`)}
                    style={{
                      background: 'white', border: '1.5px solid var(--color-borde)',
                      borderRadius: 16, padding: '12px 16px',
                      display: 'flex', flexDirection: 'column', gap: 8,
                      textAlign: 'left', cursor: 'pointer', width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, color: 'var(--color-texto)' }}>{topico.nombre_es}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {completo && (
                          <span style={{ fontSize: 11, padding: '2px 8px', background: '#EEF4EC', color: 'var(--color-salvia)', borderRadius: 20, fontWeight: 500 }}>Completo</span>
                        )}
                        <span style={{ color: 'var(--color-azul)', fontSize: 18 }}>›</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'var(--color-crema-oscuro)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--color-azul)', borderRadius: 4, width: `${pct}%` }} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-gris)' }}>{respondidas} / {total} respondidas</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/colaboradores`)}
              style={{ flex: 1, height: 44, border: '1.5px solid var(--color-borde)', borderRadius: 12, fontSize: 14, color: 'var(--color-texto)', background: 'white', cursor: 'pointer' }}
            >
              Colaboradores
            </button>
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/vista-previa`)}
              style={{ flex: 1, height: 44, border: '1.5px solid var(--color-borde)', borderRadius: 12, fontSize: 14, color: 'var(--color-texto)', background: 'white', cursor: 'pointer' }}
            >
              Ver historia
            </button>
          </div>
          {primerTopicoIncompleto && (
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}/preguntas/${primerTopicoIncompleto.topico.id}`)}
              style={{ width: '100%', height: 44, background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer' }}
            >
              Responder preguntas →
            </button>
          )}
          <button
            onClick={() => setConfirmarEliminar(true)}
            style={{ width: '100%', height: 44, border: '1.5px solid #F5C4B0', borderRadius: 12, fontSize: 14, color: '#C0522A', background: 'white', cursor: 'pointer' }}
          >
            Eliminar historia
          </button>
        </div>

        {/* Modal confirmar eliminar */}
        {confirmarEliminar && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-texto)' }}>Eliminar historia</h2>
                <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>
                  ¿Estás seguro que querés eliminar <strong style={{ color: 'var(--color-texto)' }}>{historia.titulo}</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setConfirmarEliminar(false)}
                  style={{ flex: 1, height: 44, border: '1.5px solid var(--color-borde)', borderRadius: 12, fontSize: 14, color: 'var(--color-texto)', background: 'white', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminar}
                  disabled={eliminando}
                  style={{ flex: 1, height: 44, background: '#C0522A', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: eliminando ? 0.6 : 1 }}
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