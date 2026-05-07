'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Revisá tu email para confirmar tu cuenta.')
      }
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#DDDDDD] p-8 flex flex-col items-center gap-5">
        
        <Image
          src="/logo.jpg"
          alt="Keep Alive"
          width={120}
          height={120}
          className="object-contain"
        />

        <div className="text-center">
          <h1 className="text-lg font-medium text-[#141414]">
            {isLogin ? 'Bienvenido' : 'Crear cuenta'}
          </h1>
          <p className="text-sm text-[#888888] mt-1">
            {isLogin ? 'Ingresá a tu cuenta' : 'Completá tus datos para empezar'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-10 px-3 text-sm border border-[#DDDDDD] rounded-md bg-[#F2F2F2] text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2]"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-10 px-3 text-sm border border-[#DDDDDD] rounded-md bg-[#F2F2F2] text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2]"
          />

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
          {message && (
            <p className="text-xs text-[#6B8FC2] text-center">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : isLogin ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-[#DDDDDD]" />
          <span className="text-xs text-[#888888]">o continuar con</span>
          <div className="flex-1 h-px bg-[#DDDDDD]" />
        </div>

        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })}
          className="w-full h-10 border border-[#DDDDDD] rounded-md text-sm text-[#4A4A4A] bg-[#F2F2F2] hover:bg-[#E8E8E8] transition-colors"
        >
          Google
        </button>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-xs text-[#6B8FC2] hover:underline"
        >
          {isLogin ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
        </button>

        {isLogin && (
          <button className="text-xs text-[#888888] hover:underline">
            Olvidé mi contraseña
          </button>
        )}
      </div>
    </main>
  )
}