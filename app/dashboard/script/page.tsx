'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ScriptPage() {
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState('60')
  const [style, setStyle] = useState('ดราม่า')
  const [loading, setLoading] = useState(false)
  const [script, setScript] = useState('')
  const [error, setError] = useState('')

  async function generate() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings ก่อน'); return }
    if (!topic) { setError('กรุณาใส่หัวข้อก่อน'); return }
    setLoading(true); setError(''); setScript('')
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `เขียนสคริปต์วิดีโอสั้น ${duration} วินาที สไตล์${style} เรื่อง "${topic}" สำหรับ TikTok/Facebook Reels ภาษาไทย มี Hook 3 วิแรก, เนื้อหา, CTA ท้าย แบ่งเป็น [HOOK] [CONTENT] [CTA] ชัดเจน` }] }] })
      })
      const data = await res.json()
      setScript(data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถสร้างได้')
    } catch { setError('เกิดข้อผิดพลาด ลองใหม่') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">📝 Script AI</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-2">หัวข้อ / เรื่องราว</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="เช่น แม่ค้าออนไลน์ที่กลายเป็นเศรษฐี..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">ความยาว (วินาที)</label>
            <select value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
              <option value="30">30 วินาที</option>
              <option value="60">60 วินาที</option>
              <option value="90">90 วินาที</option>
              <option value="180">3 นาที</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">สไตล์</label>
            <select value={style} onChange={e => setStyle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
              {['ดราม่า','ตลก','สร้างแรงบันดาลใจ','ให้ความรู้','รีวิว','เปิดเผยความลับ'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300">{error}</div>}
        <button onClick={generate} disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
          {loading ? '⏳ กำลังสร้างสคริปต์...' : '✍️ สร้างสคริปต์'}
        </button>
        {script && (
          <div className="p-6 rounded-xl whitespace-pre-wrap text-gray-200 text-sm leading-relaxed" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            {script}
            <button onClick={() => navigator.clipboard.writeText(script)}
              className="mt-4 px-4 py-2 rounded-lg text-sm border border-white/10 text-gray-300 hover:bg-white/5 block">
              📋 Copy สคริปต์
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
