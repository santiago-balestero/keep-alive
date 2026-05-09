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
    <main className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-[#6B8FC2] hover:underline"
        >
          ← Inicio
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Avatar y datos básicos */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center text-white text-2xl font-medium">
            {nombre ? nombre[0].toUpperCase() : '?'}
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-[#141414] capitalize">{nombre}</p>
            <p className="text-sm text-[#888888]">{email}</p>
          </div>
        </div>

        <div className="h-px bg-[#DDDDDD]" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex flex-col gap-1">
            <p className="text-xs text-[#888888] uppercase tracking-wide">Historias</p>
            <p className="text-2xl font-medium text-[#141414]">{totalHistorias}</p>
          </div>
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex flex-col gap-1">
            <p className="text-xs text-[#888888] uppercase tracking-wide">Plan</p>
            <p className="text-2xl font-medium text-[#141414]">Gratis</p>
          </div>
        </div>

        {/* Editar nombre */}
        <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-xs font-medium text-[#888888] uppercase tracking-wide">Nombre</h2>
          <form onSubmit={handleGuardarNombre} className="flex flex-col gap-3">
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setMensajeNombre('') }}
              placeholder="Tu nombre"
              required
              className="w-full h-10 px-3 text-sm border border-[#DDDDDD] rounded-md bg-[#F2F2F2] text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2]"
            />
            {errorNombre && <p className="text-xs text-red-500">{errorNombre}</p>}
            {mensajeNombre && <p className="text-xs text-[#6B8FC2]">✓ {mensajeNombre}</p>}
            <button
              type="submit"
              disabled={loadingNombre}
              className="h-10 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {loadingNombre ? 'Guardando...' : 'Guardar nombre'}
            </button>
          </form>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-xs font-medium text-[#888888] uppercase tracking-wide">Cambiar contraseña</h2>
          <form onSubmit={handleGuardarPassword} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setMensajePassword('') }}
              placeholder="Nueva contraseña"
              required
              className="w-full h-10 px-3 text-sm border border-[#DDDDDD] rounded-md bg-[#F2F2F2] text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2]"
            />
            <input
              type="password"
              value={confirmar}
              onChange={(e) => { setConfirmar(e.target.value); setMensajePassword('') }}
              placeholder="Confirmar contraseña"
              required
              className="w-full h-10 px-3 text-sm border border-[#DDDDDD] rounded-md bg-[#F2F2F2] text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2]"
            />
            {errorPassword && <p className="text-xs text-red-500">{errorPassword}</p>}
            {mensajePassword && <p className="text-xs text-[#6B8FC2]">✓ {mensajePassword}</p>}
            <button
              type="submit"
              disabled={loadingPassword}
              className="h-10 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {loadingPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full h-10 border border-[#DDDDDD] rounded-md text-sm text-[#888888] bg-white hover:bg-[#F2F2F2] transition-colors"
        >
          Cerrar sesión
        </button>

      </div>
    </main>
  )
}