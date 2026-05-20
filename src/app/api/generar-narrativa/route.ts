import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    )

    const data = await response.json()
    console.log('Gemini response status:', response.status)
    console.log('Gemini response data:', JSON.stringify(data))

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!texto) {
      console.log('Gemini blocked or empty:', data.promptFeedback || data.candidates?.[0]?.finishReason)
      return NextResponse.json({ error: 'Respuesta vacía de Gemini', details: data }, { status: 500 })
    }

    return NextResponse.json({ texto })
  } catch (error) {
    console.error('Error generando narrativa:', error)
    return NextResponse.json({ error: 'Error generando narrativa' }, { status: 500 })
  }
}