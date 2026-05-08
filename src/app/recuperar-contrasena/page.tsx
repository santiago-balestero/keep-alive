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
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#DDDDDD] p-8 flex flex-col items-center gap-5">

        <Image src="/logo.jpg" alt="Keep Alive" width={120} height={120} className="object-contain" />

        <div className="text-center">
          <h1 className="text-lg font-medium text-[#141414]">Recuperar contraseña</h1>
          <p className="text-sm text-[#888888] mt-1">Ingresá tu email y te enviamos un link para resetearla</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-10 px-3 text-sm border border-[#DDDDDD] rounded-md bg-[#F2F2F2] text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2]"
          />

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          {mensaje && <p className="text-xs text-[#6B8FC2] text-center">{mensaje}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>

        <button
          onClick={() => router.push('/')}
          className="text-xs text-[#6B8FC2] hover:underline"
        >
          ← Volver al login
        </button>

      </div>
    </main>
  )
}