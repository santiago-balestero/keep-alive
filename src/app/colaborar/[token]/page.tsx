'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

type EstadoVista = 'cargando' | 'pidiendo-nombre' | 'bienvenida' | 'eligiendo-topico' | 'respondiendo' | 'finalizado' | 'error'
type Colaborador = { id: string; email: string; id_historia: string; estado: string }
type Historia = { id: string; titulo: string; tipo: string; nombre_protagonista: string | null; descripcion: string | null }
type Topico = { id: number; nombre_es: string }
type Pregunta = { id: number; texto_es: string; texto_es_tercera: string; orden: number }

export default function ColaborarPage() {
  const [estado, setEstado] = useState<EstadoVista>('cargando')
  const [colaborador, setColaborador] = useState<Colaborador | null>(null)
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [topicoActivo, setTopicoActivo] = useState<Topico | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [indice, setIndice] = useState(0)
  const [respuesta, setRespuesta] = useState('')
  const [respuestasGuardadas, setRespuestasGuardadas] = useState<Record<number, string>>({})
  const [imagenesGuardadas, setImagenesGuardadas] = useState<Record<number, string>>({})
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [escuchando, setEscuchando] = useState(false)
  const [soportaVoz, setSoportaVoz] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [nombreColaborador, setNombreColaborador] = useState('')
  const [nombreInput, setNombreInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const supabase = createClient()
  const params = useParams()
  const token = params.token as string

  useEffect(() => {
    const init = async () => {
      const { data: colab, error } = await supabase
        .from('colaboradores').select('*').eq('token', token).single()

      if (error || !colab) {
        setErrorMsg('El link de invitación no es válido o ya expiró.')
        setEstado('error')
        return
      }

      setColaborador(colab)

      if (colab.estado === 'pendiente') {
        await supabase.from('colaboradores').update({ estado: 'aceptado' }).eq('id', colab.id)
      }

      const nombreGuardado = localStorage.getItem(`keepalive_nombre_${token}`)
      const userIdGuardado = localStorage.getItem(`keepalive_userid_${token}`)

      if (nombreGuardado && userIdGuardado) {
        setNombreColaborador(nombreGuardado)
        setUserId(userIdGuardado)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          const { data: anonData } = await supabase.auth.signInAnonymously()
          if (anonData?.user) {
            localStorage.setItem(`keepalive_userid_${token}`, anonData.user.id)
            setUserId(anonData.user.id)
          }
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
        } else {
          const { data: anonData } = await supabase.auth.signInAnonymously()
          if (anonData?.user) {
            setUserId(anonData.user.id)
            localStorage.setItem(`keepalive_userid_${token}`, anonData.user.id)
          }
        }
      }

      const { data: h } = await supabase.from('historias').select('*').eq('id', colab.id_historia).single()
      if (h) setHistoria(h)

      const { data: ht } = await supabase
        .from('historia_topicos').select('topicos(id, nombre_es)').eq('id_historia', colab.id_historia)
      if (ht) setTopicos(ht.map((row: any) => row.topicos).filter(Boolean))

      if (nombreGuardado) {
        setEstado('bienvenida')
      } else {
        setEstado('pidiendo-nombre')
      }
    }
    init()
  }, [token])

  const handleElegirTopico = async (topico: Topico) => {
    setTopicoActivo(topico)
    setIndice(0)
    const { data: p } = await supabase.from('preguntas').select('*').eq('id_topico', topico.id).order('orden')
    if (p) setPreguntas(p)

    if (userId) {
      const { data: r } = await supabase
        .from('respuestas').select('id_pregunta, contenido, imagen_url')
        .eq('id_historia', colaborador!.id_historia).eq('id_usuario', userId)
      if (r) {
        const mapaTexto: Record<number, string> = {}
        const mapaImagenes: Record<number, string> = {}
        r.forEach((resp) => {
          mapaTexto[resp.id_pregunta] = resp.contenido
          if (resp.imagen_url) mapaImagenes[resp.id_pregunta] = resp.imagen_url
        })
        setRespuestasGuardadas(mapaTexto)
        setImagenesGuardadas(mapaImagenes)
      }
    }
    setEstado('respondiendo')
  }

  useEffect(() => {
    if (preguntas[indice]) {
      setRespuesta(respuestasGuardadas[preguntas[indice].id] || '')
      setImagenPreview(imagenesGuardadas[preguntas[indice].id] || null)
      setImagenFile(null)
      setGuardado(false)
    }
  }, [indice, preguntas])

  const iniciarEscucha = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSoportaVoz(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'es-AR'
    recognition.continuous = true
    recognition.interimResults = true
    let textoBase = respuesta
    recognition.onresult = (event: any) => {
      let textoFinal = ''
      let textoInterim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          textoFinal += transcript + ' '
        } else {
          textoInterim += transcript
        }
      }
      setRespuesta(textoBase + textoFinal + textoInterim)
      if (textoFinal) textoBase = textoBase + textoFinal
      setGuardado(false)
    }
    recognition.onerror = () => setEscuchando(false)
    recognition.onend = () => setEscuchando(false)
    recognition.start()
    recognitionRef.current = recognition
    setEscuchando(true)
  }

  const detenerEscucha = () => {
    recognitionRef.current?.stop()
    setEscuchando(false)
  }

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
    setGuardado(false)
  }

  const handleEliminarImagen = () => {
    setImagenFile(null)
    setImagenPreview(null)
    setGuardado(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGuardar = async () => {
    const preguntaActual = preguntas[indice]
    if (!preguntaActual || !userId || !colaborador) return
    setLoading(true)

    let imagenUrl = imagenesGuardadas[preguntaActual.id] || null

    if (imagenFile) {
      setSubiendoImagen(true)
      const ext = imagenFile.name.split('.').pop()
      const path = `${colaborador.id_historia}/${preguntaActual.id}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('images').upload(path, imagenFile, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
        imagenUrl = urlData.publicUrl
      }
      setSubiendoImagen(false)
    }

    if (!imagenPreview && !imagenFile) imagenUrl = null

    const existe = respuestasGuardadas[preguntaActual.id] !== undefined
    if (existe) {
      await supabase.from('respuestas')
        .update({ contenido: respuesta, imagen_url: imagenUrl })
        .eq('id_historia', colaborador.id_historia)
        .eq('id_pregunta', preguntaActual.id)
        .eq('id_usuario', userId)
    } else {
      await supabase.from('respuestas').insert({
        id_historia: colaborador.id_historia,
        id_pregunta: preguntaActual.id,
        id_usuario: userId,
        contenido: respuesta,
        imagen_url: imagenUrl,
        nombre_autor: nombreColaborador || 'Colaborador',
      })
    }

    setRespuestasGuardadas((prev) => ({ ...prev, [preguntaActual.id]: respuesta }))
    if (imagenUrl) setImagenesGuardadas((prev) => ({ ...prev, [preguntaActual.id]: imagenUrl! }))
    setGuardado(true)
    setLoading(false)

    if (indice < preguntas.length - 1) {
      setTimeout(() => setIndice((prev) => prev + 1), 400)
    } else {
      setTimeout(() => setEstado('eligiendo-topico'), 600)
    }
  }

  const handleSaltar = () => {
    if (indice < preguntas.length - 1) setIndice((prev) => prev + 1)
    else setEstado('eligiendo-topico')
  }

  const preguntaActual = preguntas[indice]
  const textoPregunta = historia?.tipo === 'autobiografia' ? preguntaActual?.texto_es : preguntaActual?.texto_es_tercera

  if (estado === 'cargando') return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>Cargando invitación...</p>
    </main>
  )

  if (estado === 'error') return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 40 }}>❌</span>
        <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-texto)' }}>Link inválido</p>
        <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>{errorMsg}</p>
      </div>
    </main>
  )

  if (estado === 'finalizado') return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
        <span style={{ fontSize: 48 }}>🙌</span>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-texto)' }}>¡Gracias por contribuir!</h1>
        <p style={{ fontSize: 14, color: 'var(--color-gris)', lineHeight: 1.6 }}>
          Tus respuestas van a formar parte de la historia de {historia?.nombre_protagonista || 'esta persona'}. Es un regalo invaluable.
        </p>
      </div>
    </main>
  )

  if (estado === 'pidiendo-nombre') return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <Image src="/logo.png" alt="Keep Alive" width={80} height={80} className="object-contain rounded-2xl" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-texto)' }}>Hola, ¿cómo te llamás?</h1>
          <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>
            Tu nombre va a aparecer junto a tus respuestas en la historia.
          </p>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            placeholder="Tu nombre"
            value={nombreInput}
            onChange={(e) => setNombreInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nombreInput.trim()) {
                localStorage.setItem(`keepalive_nombre_${token}`, nombreInput.trim())
                setNombreColaborador(nombreInput.trim())
                setEstado('bienvenida')
              }
            }}
            autoFocus
            style={{
              width: '100%', height: 48, padding: '0 16px', fontSize: 14,
              border: '1.5px solid var(--color-borde)', borderRadius: 12,
              background: 'white', color: 'var(--color-texto)', outline: 'none', textAlign: 'center',
            }}
          />
          <button
            onClick={() => {
              if (!nombreInput.trim()) return
              localStorage.setItem(`keepalive_nombre_${token}`, nombreInput.trim())
              setNombreColaborador(nombreInput.trim())
              setEstado('bienvenida')
            }}
            disabled={!nombreInput.trim()}
            style={{
              width: '100%', height: 48, background: 'var(--color-terracota)',
              color: 'white', fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 12, cursor: 'pointer',
              opacity: nombreInput.trim() ? 1 : 0.4,
            }}
          >
            Continuar →
          </button>
        </div>
      </div>
    </main>
  )

  if (estado === 'bienvenida') return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <Image src="/logo.png" alt="Keep Alive" width={80} height={80} className="object-contain rounded-2xl" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-texto)' }}>
            Hola, {nombreColaborador}! 👋
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>Te invitaron a contribuir con recuerdos para la historia:</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-texto)', marginTop: 4 }}>"{historia?.titulo}"</p>
          {historia?.descripcion && <p style={{ fontSize: 12, color: 'var(--color-gris)' }}>{historia.descripcion}</p>}
        </div>
        <button
          onClick={() => setEstado('eligiendo-topico')}
          style={{
            width: '100%', height: 48, background: 'var(--color-terracota)',
            color: 'white', fontSize: 14, fontWeight: 600,
            border: 'none', borderRadius: 12, cursor: 'pointer',
          }}
        >
          Empezar a contribuir →
        </button>
      </div>
    </main>
  )

  if (estado === 'eligiendo-topico') return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <header className="page-header">
        <div className="page-header-inner">
          <Image src="/logo.png" alt="Keep Alive" width={36} height={36} className="object-contain rounded-xl" />
        </div>
      </header>
      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-texto)' }}>¿Sobre qué querés contar?</h1>
          <p style={{ fontSize: 14, color: 'var(--color-gris)', marginTop: 4 }}>Elegí un tópico para responder preguntas</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topicos.map((t) => (
            <button
              key={t.id}
              onClick={() => handleElegirTopico(t)}
              style={{
                background: 'white', border: '1.5px solid var(--color-borde)',
                borderRadius: 16, padding: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-texto)' }}>{t.nombre_es}</span>
              <span style={{ color: 'var(--color-azul)', fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setEstado('finalizado')}
          style={{ fontSize: 13, color: 'var(--color-gris)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
        >
          Ya terminé, cerrar
        </button>
      </div>
    </main>
  )

  if (estado === 'respondiendo') return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <header className="page-header">
        <div className="page-header-inner">
          <Image src="/logo.png" alt="Keep Alive" width={36} height={36} className="object-contain rounded-xl" />
          <button
            onClick={() => setEstado('eligiendo-topico')}
            style={{ fontSize: 14, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Tópicos
          </button>
        </div>
      </header>
      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Progreso */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-gris)' }}>
            <span style={{ fontWeight: 500 }}>{topicoActivo?.nombre_es}</span>
            <span>{indice + 1} / {preguntas.length}</span>
          </div>
          <div style={{ height: 6, background: 'var(--color-crema-oscuro)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--color-azul)', borderRadius: 6, width: `${((indice + 1) / preguntas.length) * 100}%`, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Tip */}
        <div style={{ background: '#FBF4EF', borderRadius: 16, padding: '12px 16px', borderLeft: '4px solid var(--color-terracota)' }}>
          <p style={{ fontSize: 13, color: 'var(--color-terracota)', lineHeight: 1.6 }}>
            {(() => {
              const consejos: Record<string, string[]> = {
                'Raíces e infancia': ['Pensá en olores, sonidos o lugares específicos de tu infancia.', 'Nombrá a las personas por su nombre, hacé la historia más personal.', '¿Había alguna rutina o tradición familiar que recuerdes con cariño?'],
                'Valores y personalidad': ['Contá una situación concreta donde pusiste en práctica ese valor.', 'Pensá en alguien que te haya influenciado y cómo lo hizo.', '¿Hubo un momento que te cambió la forma de ver la vida?'],
                'Familia propia y pareja': ['¿Cómo era un día típico en familia? Los detalles pequeños importan.', 'Contá una anécdota divertida o emotiva que los defina como familia.', 'Nombrá a cada persona y algo especial que la caracterice.'],
                'Trabajo y profesión': ['Contá una anécdota concreta, no solo el puesto que tenías.', '¿Hubo algún momento difícil o un logro del que estés orgulloso?', '¿Qué aprendiste de ese trabajo que te sirvió para la vida?'],
                'Hobbies y deportes': ['¿Cómo empezaste? ¿Hubo alguien que te introdujo a ese hobby?', 'Contá el mejor momento que viviste relacionado a esta pasión.', '¿Alguna vez compartiste este hobby con alguien especial?'],
                'Viajes': ['Contá un momento específico del viaje, no solo el destino.', '¿Hubo algo inesperado que pasó en ese viaje?', '¿Qué persona conociste o qué comida probaste que no olvidás?'],
                'Amistades': ['¿Cómo se conocieron? Los comienzos de las amistades son siempre especiales.', 'Contá una historia que solo vos y esa persona saben.', '¿Hubo alguna época donde esa amistad fue especialmente importante?'],
                'Momentos memorables': ['Describí dónde estabas, quiénes estaban y cómo te sentías.', '¿Por qué ese momento se quedó grabado en tu memoria?', 'Contá los detalles que hacen único ese recuerdo.'],
              }
              const lista = consejos[topicoActivo?.nombre_es || ''] || ['Describí quiénes estaban, cuándo y dónde ocurrió.', 'Los detalles pequeños son los que hacen única una historia.', 'Escribí con tus propias palabras, sin preocuparte por la forma.']
              return lista[indice % lista.length]
            })()}
          </p>
        </div>

        {/* Pregunta */}
        <div style={{ background: 'white', border: '2px solid var(--color-texto)', borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--color-texto)', lineHeight: 1.6 }}>{textoPregunta}</p>
        </div>

        {/* Respuesta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <textarea
              value={respuesta}
              onChange={(e) => { setRespuesta(e.target.value); setGuardado(false) }}
              placeholder="Escribí tu respuesta acá o usá el micrófono..."
              rows={5}
              style={{
                width: '100%', padding: '12px 56px 12px 16px', fontSize: 14,
                border: '2px solid var(--color-borde)', borderRadius: 16,
                background: 'white', color: 'var(--color-texto)', outline: 'none',
                resize: 'none', lineHeight: 1.6,
              }}
            />
            <button
              type="button"
              onClick={escuchando ? detenerEscucha : iniciarEscucha}
              style={{
                position: 'absolute', bottom: 12, right: 12,
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: escuchando ? '#ef4444' : 'var(--color-crema-oscuro)',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={escuchando ? 'white' : 'var(--color-gris)'} strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
            </button>
          </div>
          {escuchando && (
            <p style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              Escuchando... hablá ahora
            </p>
          )}
          {!soportaVoz && (
            <p style={{ fontSize: 12, color: 'var(--color-gris)' }}>Tu navegador no soporta reconocimiento de voz.</p>
          )}
          {guardado && (
            <p style={{ fontSize: 12, color: 'var(--color-azul)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Guardado
            </p>
          )}
        </div>

        {/* Foto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Foto (opcional)</p>
          {imagenPreview ? (
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-borde)' }}>
              <img src={imagenPreview} alt="Preview" style={{ width: '100%', objectFit: 'cover', maxHeight: 256 }} />
              <button
                onClick={handleEliminarImagen}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 32, height: 32, background: 'rgba(0,0,0,0.5)',
                  color: 'white', borderRadius: '50%', border: 'none',
                  cursor: 'pointer', fontSize: 18, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', height: 96, border: '2px dashed var(--color-borde)',
                borderRadius: 16, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'white', cursor: 'pointer',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gris)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span style={{ fontSize: 12, color: 'var(--color-gris)' }}>Subir foto</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagenChange} style={{ display: 'none' }} />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleSaltar}
            style={{
              flex: 1, height: 48, border: '1.5px solid var(--color-borde)',
              borderRadius: 16, fontSize: 14, color: 'var(--color-gris)',
              background: 'white', cursor: 'pointer',
            }}
          >
            Saltar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || (!respuesta.trim() && !imagenFile && !imagenPreview)}
            style={{
              flex: 2, height: 48, background: 'var(--color-texto)',
              color: 'white', fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 16, cursor: 'pointer',
              opacity: (loading || (!respuesta.trim() && !imagenFile && !imagenPreview)) ? 0.4 : 1,
            }}
          >
            {subiendoImagen ? 'Subiendo foto...' : loading ? 'Guardando...' : indice < preguntas.length - 1 ? 'Guardar y seguir →' : 'Finalizar tópico →'}
          </button>
        </div>
      </div>
    </main>
  )

  return null
}
