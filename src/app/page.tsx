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
        setError('Email o contraseña incorrectos.')
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
    <main className="min-h-screen bg-white flex flex-col sm:flex-row">

      {/* Panel izquierdo — solo desktop */}
      <div className="hidden sm:flex w-[420px] flex-shrink-0 bg-[#141414] flex-col items-center justify-center p-12 gap-8">
        <Image
          src="/logo.jpg"
          alt="Keep Alive"
          width={120}
          height={120}
          className="object-contain rounded-2xl"
        />
        <div className="text-center flex flex-col gap-3">
          <h2 className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-lora)' }}>
            Tu historia,<br />tu legado.
          </h2>
          <p className="text-sm text-white/40 leading-relaxed">
            Preservá y compartí las historias de vida que merecen ser recordadas para siempre.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-16">

        {/* Logo mobile */}
        <div className="sm:hidden mb-8 flex flex-col items-center gap-4">
          <Image
            src="/logo.jpg"
            alt="Keep Alive"
            width={80}
            height={80}
            className="object-contain rounded-2xl"
          />
          <p className="text-sm text-[#888888]">Tu historia, tu legado.</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#141414]">
              {isLogin ? 'Bienvenido' : 'Crear cuenta'}
            </h1>
            <p className="text-sm text-[#888888] mt-1">
              {isLogin ? 'Ingresá a tu cuenta para continuar' : 'Completá tus datos para empezar'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 text-sm border border-[#E8E8E8] rounded-xl bg-[#FAFAFA] text-[#141414] focus:outline-none focus:border-[#6B8FC2] focus:bg-white transition-colors"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 px-4 text-sm border border-[#E8E8E8] rounded-xl bg-[#FAFAFA] text-[#141414] focus:outline-none focus:border-[#6B8FC2] focus:bg-white transition-colors"
            />

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
            {message && (
              <div className="bg-[#EEF3FA] border border-[#D0DFF0] rounded-xl px-4 py-3">
                <p className="text-sm text-[#6B8FC2]">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#2A2A2A] active:scale-[0.98] disabled:opacity-50 transition-all mt-1"
            >
              {loading ? 'Cargando...' : isLogin ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#EEEEEE]" />
            <span className="text-xs text-[#BBBBBB]">o</span>
            <div className="flex-1 h-px bg-[#EEEEEE]" />
          </div>

          <button
            onClick={() => supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${window.location.origin}/dashboard` }
            })}
            className="w-full h-12 border border-[#E8E8E8] rounded-xl text-sm text-[#4A4A4A] bg-white hover:bg-[#FAFAFA] active:scale-[0.98] flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setMessage('') }}
              className="text-sm text-[#6B8FC2] hover:underline"
            >
              {isLogin ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
            </button>
            {isLogin && (
              <button
                onClick={() => router.push('/recuperar-contrasena')}
                className="text-sm text-[#BBBBBB] hover:text-[#888888] transition-colors"
              >
                Olvidé mi contraseña
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}