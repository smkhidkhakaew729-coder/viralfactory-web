'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function FactoryPage() {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState('5')
  const [loading, setLoading] = useState(false)
  const [contents, setContents] = useState<any[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  async function generate() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings ก่อน'); return }
    setLoading(true); setError(''); setContents([]); setProgress(0)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `สร้างคอนเทนต์ ${count} ชิ้น เรื่อง "${topic}" สำหรับ TikTok/Facebook ตอบเป็น JSON array: [{"title":"หัวข้อ","hook":"ประโยคเปิด 3 วิ","caption":"caption สั้น","hashtags":["#tag1"],"type":"ประเภท"}]` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const json = text.match(/\[[\s\S]*\]/)
      if (json) { setContents(JSON.parse(json[0])); setProgress(100) }
      else setError('ไม่สามารถสร้างได้')
    } catch { setError('เกิดข้อผิดพลาด') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">🏭 Content Factory</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="หัวข้อ เช่น ขายของออนไลน์, ลดน้ำหนัก..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          </div>
          <select value={count} onChange={e => setCount(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
            {['3','5','10','15','20'].map(n => <option key={n}>{n} ชิ้น</option>)}
          </select>
        </div>
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300">{error}</div>}
        <button onClick={generate} disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
          {loading ? `⏳ กำลังผลิต ${count} คอนเทนต์...` : `🏭 ผลิต ${count} คอนเทนต์`}
        </button>
        <div className="space-y-3">
          {contents.map((c, i) => (
            <div key={i} className="p-5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-400 font-bold">#{i+1}</span>
                <h3 className="font-semibold text-white">{c.title}</h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">{c.type}</span>
              </div>
              <p className="text-yellow-300 text-sm mb-2">🪝 Hook: {c.hook}</p>
              <p className="text-gray-300 text-sm mb-2">{c.caption}</p>
              <div className="flex flex-wrap gap-1">
                {c.hashtags?.map((h: string, j: number) => <span key={j} className="text-xs text-purple-400">{h}</span>)}
              </div>
              <button onClick={() => navigator.clipboard.writeText(`${c.hook}\n\n${c.caption}\n\n${c.hashtags?.join(' ')}`)}
                className="mt-2 text-xs px-3 py-1 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5">📋 Copy</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
