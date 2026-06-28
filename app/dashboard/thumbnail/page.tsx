'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ThumbnailPage() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [ideas, setIdeas] = useState<any[]>([])
  const [error, setError] = useState('')

  async function generate() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings ก่อน'); return }
    setLoading(true); setError(''); setIdeas([])
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `แนะนำ 4 ไอเดีย Thumbnail สำหรับวิดีโอ "${topic}" บน TikTok/YouTube ตอบเป็น JSON: [{"title":"หัวข้อ thumbnail","headline":"ตัวอักษรหลัก","subtext":"ตัวอักษรรอง","bg":"สีพื้นหลัง hex","textColor":"สีตัวอักษร hex","elements":"องค์ประกอบที่ควรมี","style":"สไตล์"}]` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const json = text.match(/\[[\s\S]*\]/)
      if (json) setIdeas(JSON.parse(json[0]))
      else setError('ไม่สามารถสร้างได้')
    } catch { setError('เกิดข้อผิดพลาด') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">🖼️ Thumbnail Ideas</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-5">
        <div className="flex gap-3">
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="หัวข้อวิดีโอ เช่น วิธีรวยจากออนไลน์..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            onKeyDown={e => e.key === 'Enter' && generate()} />
          <button onClick={generate} disabled={loading}
            className="px-6 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
            {loading ? '⏳' : '🎨 สร้าง'}
          </button>
        </div>
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map((idea, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="h-32 flex flex-col items-center justify-center p-4 text-center" style={{background:idea.bg || '#1a0a2e'}}>
                <div className="font-black text-xl leading-tight" style={{color:idea.textColor || '#fff'}}>{idea.headline}</div>
                {idea.subtext && <div className="text-sm mt-1 opacity-80" style={{color:idea.textColor || '#fff'}}>{idea.subtext}</div>}
              </div>
              <div className="p-4" style={{background:'rgba(255,255,255,0.04)'}}>
                <div className="font-semibold text-white text-sm mb-1">{idea.title}</div>
                <div className="text-gray-400 text-xs">{idea.elements}</div>
                <div className="text-purple-400 text-xs mt-1">สไตล์: {idea.style}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
