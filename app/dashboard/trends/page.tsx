'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function TrendsPage() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any[]>([])
  const [error, setError] = useState('')

  async function analyze() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings ก่อน'); return }
    setLoading(true); setError(''); setResult([])
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `วิเคราะห์ 5 เทรนด์ไวรัลล่าสุดสำหรับหัวข้อ "${topic || 'ทั่วไป'}" บน TikTok และ Facebook ในไทย ตอบเป็น JSON array: [{"rank":1,"title":"...","reason":"...","hashtags":["..."],"score":95}]` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const json = text.match(/\[[\s\S]*\]/)
      if (json) setResult(JSON.parse(json[0]))
      else setError('ไม่สามารถวิเคราะห์ได้ ลองใหม่')
    } catch { setError('เกิดข้อผิดพลาด ลองใหม่') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">📈 Trend Finder</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex gap-3 mb-8">
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="หัวข้อที่สนใจ เช่น ความรัก, อาหาร, การเงิน..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            onKeyDown={e => e.key === 'Enter' && analyze()} />
          <button onClick={analyze} disabled={loading}
            className="px-6 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
            {loading ? '⏳' : '🔍 วิเคราะห์'}
          </button>
        </div>
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300 mb-4">{error}</div>}
        <div className="space-y-4">
          {result.map((t, i) => (
            <div key={i} className="p-5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-purple-400">#{t.rank}</span>
                <h3 className="font-bold text-white text-lg">{t.title}</h3>
                <span className="ml-auto text-green-400 font-bold">{t.score}%</span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{t.reason}</p>
              <div className="flex flex-wrap gap-2">
                {t.hashtags?.map((h: string, j: number) => (
                  <span key={j} className="px-3 py-1 rounded-full text-xs text-purple-300" style={{background:'rgba(124,58,237,0.2)'}}>{h}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
