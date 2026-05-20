import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const texto = data.choices?.[0]?.message?.content || ''

    if (!texto) {
      console.log('Groq error:', JSON.stringify(data))
      return NextResponse.json({ error: 'Respuesta vacía', details: data }, { status: 500 })
    }

    return NextResponse.json({ texto })
  } catch (error) {
    console.error('Error generando narrativa:', error)
    return NextResponse.json({ error: 'Error generando narrativa' }, { status: 500 })
  }
}