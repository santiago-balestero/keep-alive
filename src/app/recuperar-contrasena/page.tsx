'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMensaje('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMensaje('Te enviamos un email con las instrucciones para recuperar tu contraseña.')
    }

    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, background: 'white', borderRadius: 20, border: '1.5px solid var(--color-borde)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

        <Image src="/logo.jpg" alt="Keep Alive" width={80} height={80} className="object-contain rounded-2xl" />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-texto)' }}>Recuperar contraseña</h1>
          <p style={{ fontSize: 14, color: 'var(--color-gris)', marginTop: 4 }}>Ingresá tu email y te enviamos un link para resetearla</p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', height: 44, padding: '0 16px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'var(--color-crema)', color: 'var(--color-texto)', outline: 'none' }}
          />

          {error && <p style={{ fontSize: 13, color: '#C0522A', textAlign: 'center' }}>{error}</p>}
          {mensaje && <p style={{ fontSize: 13, color: 'var(--color-salvia)', textAlign: 'center' }}>{mensaje}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', height: 44, background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>

        <button
          onClick={() => router.push('/')}
          style={{ fontSize: 13, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Volver al login
        </button>

      </div>
    </main>
  )
}