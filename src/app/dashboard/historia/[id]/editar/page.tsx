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
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />
      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: 'var(--color-crema-oscuro)', borderRadius: 16, height: 48 }} />
        ))}
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-texto)', marginBottom: 32 }}>Editar historia</h1>

        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Tipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tipo de historia</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { value: 'autobiografia', emoji: '👤', label: 'Autobiografía', desc: 'Tu propia historia' },
                { value: 'regalo', emoji: '🎁', label: 'Biografía regalo', desc: 'Para otra persona' },
              ].map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setTipo(op.value as any)}
                  style={{
                    padding: 16, borderRadius: 16, background: 'white', cursor: 'pointer',
                    border: tipo === op.value ? '2px solid var(--color-terracota)' : '2px solid var(--color-borde)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                  }}
                >
                  <span style={{ fontSize: 24 }}>{op.emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-texto)' }}>{op.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-gris)', textAlign: 'center' }}>{op.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {tipo === 'regalo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nombre del protagonista</label>
              <input
                type="text"
                placeholder="Ej: Abuelo Julio"
                value={nombreProtagonista}
                onChange={(e) => setNombreProtagonista(e.target.value)}
                required
                style={{ width: '100%', height: 44, padding: '0 16px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'white', color: 'var(--color-texto)', outline: 'none' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Título</label>
            <input
              type="text"
              placeholder="Ej: Historia de mi abuelo Julio"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              style={{ width: '100%', height: 44, padding: '0 16px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'white', color: 'var(--color-texto)', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Descripción <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              placeholder="Una descripción breve..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'white', color: 'var(--color-texto)', outline: 'none', resize: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-borde)', borderRadius: 12, padding: '10px 16px' }}>
              <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            style={{ height: 44, background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </main>
  )
}