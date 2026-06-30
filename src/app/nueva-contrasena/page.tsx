'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NuevaContrasena() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, background: 'white', borderRadius: 20, border: '1.5px solid var(--color-borde)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

        <Image src="/logo.jpg" alt="Keep Alive" width={80} height={80} className="object-contain rounded-2xl" />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-texto)' }}>Nueva contraseña</h1>
          <p style={{ fontSize: 14, color: 'var(--color-gris)', marginTop: 4 }}>Elegí una nueva contraseña para tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', height: 44, padding: '0 16px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'var(--color-crema)', color: 'var(--color-texto)', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            style={{ width: '100%', height: 44, padding: '0 16px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'var(--color-crema)', color: 'var(--color-texto)', outline: 'none' }}
          />

          {error && <p style={{ fontSize: 13, color: 'var(--color-error)', textAlign: 'center' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', height: 44, background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>

      </div>
    </main>
  )
}