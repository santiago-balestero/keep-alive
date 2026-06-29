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
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-texto)' }}>Elegí los tópicos</h1>
          <p style={{ fontSize: 14, color: 'var(--color-gris)', marginTop: 4 }}>Seleccioná los temas que querés incluir</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topicos.map((t) => {
            const activo = seleccionados.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTopico(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                  borderRadius: 16, background: 'white', cursor: 'pointer', width: '100%',
                  border: activo ? '2px solid var(--color-terracota)' : '2px solid var(--color-borde)',
                  textAlign: 'left'
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: activo ? '2px solid var(--color-terracota)' : '2px solid var(--color-borde)',
                  background: activo ? 'var(--color-terracota)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {activo && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 14, color: 'var(--color-texto)' }}>{t.nombre_es}</span>
              </button>
            )
          })}
        </div>

        <div style={{ position: 'sticky', bottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: '12px 16px' }}>
          <span style={{ fontSize: 14, color: 'var(--color-gris)' }}>
            {seleccionados.length} tópico{seleccionados.length !== 1 ? 's' : ''} seleccionado{seleccionados.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleSubmit}
            disabled={seleccionados.length === 0 || loading}
            style={{ height: 36, padding: '0 20px', background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 10, cursor: 'pointer', opacity: seleccionados.length === 0 || loading ? 0.4 : 1 }}
          >
            {loading ? 'Guardando...' : 'Empezar →'}
          </button>
        </div>
      </div>
    </main>
  )
}