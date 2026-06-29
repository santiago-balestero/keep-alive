'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Perfil() {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loadingNombre, setLoadingNombre] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [mensajeNombre, setMensajeNombre] = useState('')
  const [mensajePassword, setMensajePassword] = useState('')
  const [errorNombre, setErrorNombre] = useState('')
  const [errorPassword, setErrorPassword] = useState('')
  const [totalHistorias, setTotalHistorias] = useState(0)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        setNombre(user.user_metadata?.nombre || user.email?.split('@')[0] || '')
      }

      const { count } = await supabase
        .from('historias')
        .select('*', { count: 'exact', head: true })
        .eq('id_autor', user?.id)

      setTotalHistorias(count || 0)
    }

    fetchData()
  }, [])

  const handleGuardarNombre = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingNombre(true)
    setErrorNombre('')
    setMensajeNombre('')

    const { error } = await supabase.auth.updateUser({
      data: { nombre }
    })

    if (error) {
      setErrorNombre(error.message)
    } else {
      setMensajeNombre('Nombre actualizado correctamente.')
    }

    setLoadingNombre(false)
  }

  const handleGuardarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorPassword('')
    setMensajePassword('')

    if (password !== confirmar) {
      setErrorPassword('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 6) {
      setErrorPassword('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoadingPassword(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorPassword(error.message)
    } else {
      setMensajePassword('Contraseña actualizada correctamente.')
      setPassword('')
      setConfirmar('')
    }

    setLoadingPassword(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <header className="page-header">
        <div className="page-header-inner">
          <Image src="/logo.jpg" alt="Keep Alive" width={36} height={36} style={{ objectFit: 'contain', borderRadius: 12, cursor: 'pointer' }} onClick={() => router.push('/dashboard')} />
          <button onClick={() => router.push('/dashboard')} style={{ fontSize: 14, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Inicio
          </button>
        </div>
      </header>

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-terracota)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 600 }}>
            {nombre ? nombre[0].toUpperCase() : '?'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-texto)' }}>{nombre}</p>
            <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>{email}</p>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--color-borde)' }} />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ fontSize: 11, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Historias</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-terracota)' }}>{totalHistorias}</p>
          </div>
          <div style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ fontSize: 11, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plan</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-azul)' }}>Gratis</p>
          </div>
        </div>

        {/* Editar nombre */}
        <div style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nombre</h2>
          <form onSubmit={handleGuardarNombre} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setMensajeNombre('') }}
              placeholder="Tu nombre"
              required
              style={{ width: '100%', height: 44, padding: '0 14px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'var(--color-crema)', color: 'var(--color-texto)', outline: 'none' }}
            />
            {errorNombre && <p style={{ fontSize: 12, color: '#C0522A' }}>{errorNombre}</p>}
            {mensajeNombre && <p style={{ fontSize: 12, color: 'var(--color-salvia)' }}>✓ {mensajeNombre}</p>}
            <button
              type="submit"
              disabled={loadingNombre}
              style={{ height: 44, background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: loadingNombre ? 0.6 : 1 }}
            >
              {loadingNombre ? 'Guardando...' : 'Guardar nombre'}
            </button>
          </form>
        </div>

        {/* Cambiar contraseña */}
        <div style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cambiar contraseña</h2>
          <form onSubmit={handleGuardarPassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setMensajePassword('') }}
              placeholder="Nueva contraseña"
              required
              style={{ width: '100%', height: 44, padding: '0 14px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'var(--color-crema)', color: 'var(--color-texto)', outline: 'none' }}
            />
            <input
              type="password"
              value={confirmar}
              onChange={(e) => { setConfirmar(e.target.value); setMensajePassword('') }}
              placeholder="Confirmar contraseña"
              required
              style={{ width: '100%', height: 44, padding: '0 14px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'var(--color-crema)', color: 'var(--color-texto)', outline: 'none' }}
            />
            {errorPassword && <p style={{ fontSize: 12, color: '#C0522A' }}>{errorPassword}</p>}
            {mensajePassword && <p style={{ fontSize: 12, color: 'var(--color-salvia)' }}>✓ {mensajePassword}</p>}
            <button
              type="submit"
              disabled={loadingPassword}
              style={{ height: 44, background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: loadingPassword ? 0.6 : 1 }}
            >
              {loadingPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          style={{ height: 44, border: '1.5px solid var(--color-borde)', borderRadius: 12, fontSize: 14, color: 'var(--color-gris)', background: 'white', cursor: 'pointer' }}
        >
          Cerrar sesión
        </button>

      </div>
    </main>
  )
}