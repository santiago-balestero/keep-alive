'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

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
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <Header backUrl="/dashboard" backLabel="Inicio" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-texto)', marginBottom: 32 }}>Nueva historia</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Tipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>¿De quién es esta historia?</label>
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
                    padding: 20, borderRadius: 16,
                    border: tipo === op.value ? '2px solid var(--color-terracota)' : '2px solid var(--color-borde)',
                    background: 'white', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{op.emoji}</span>
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
              Descripción <span style={{ textTransform: 'none', color: 'var(--color-gris)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              placeholder="Un regalo para sus 80 años..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'white', color: 'var(--color-texto)', outline: 'none', resize: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: '#FDF0ED', border: '1px solid #F5C4B0', borderRadius: 12, padding: '10px 16px' }}>
              <p style={{ fontSize: 13, color: '#C0522A' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ height: 44, background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Guardando...' : 'Continuar →'}
          </button>
        </form>
      </div>
    </main>
  )
}