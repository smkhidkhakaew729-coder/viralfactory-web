'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'

export default function CharactersPage() {
  const { project, setProject, saveProject } = useStore()
  const [story, setStory] = useState(project.topic || '')
  const [loading, setLoading] = useState(false)
  const [chars, setChars] = useState<any[]>([])
  const [error, setError] = useState('')

  async function generate() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings ก่อน'); return }
    setLoading(true); setError(''); setChars([])
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `สร้างตัวละคร 3-4 ตัวสำหรับเรื่อง "${story || 'ละครชีวิต'}" ตอบเป็น JSON array: [{"name":"ชื่อ","role":"บทบาท","age":"อายุ","personality":"นิสัย","background":"ประวัติ","motivation":"แรงจูงใจ","emoji":"🎭"}]` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const json = text.match(/\[[\s\S]*\]/)
      if (json) {
        const parsed = JSON.parse(json[0])
        setChars(parsed)
        setProject({ characters: parsed })
        await saveProject()
      } else setError('ไม่สามารถสร้างได้')
    } catch { setError('เกิดข้อผิดพลาด') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">🎭 Characters</span>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-5">
        <div className="flex gap-3">
          <input value={story} onChange={e => setStory(e.target.value)} placeholder="ชื่อเรื่อง / หัวข้อ เช่น ความรักสามเส้า, ธุรกิจครอบครัว..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            onKeyDown={e => e.key === 'Enter' && generate()} />
          <button onClick={generate} disabled={loading}
            className="px-6 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
            {loading ? '⏳' : '✨ สร้าง'}
          </button>
        </div>
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chars.map((c, i) => (
            <div key={i} className="p-5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{c.emoji}</span>
                <div>
                  <div className="font-bold text-white">{c.name}</div>
                  <div className="text-purple-400 text-sm">{c.role} • {c.age}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">นิสัย: </span><span className="text-gray-300">{c.personality}</span></div>
                <div><span className="text-gray-500">ประวัติ: </span><span className="text-gray-300">{c.background}</span></div>
                <div><span className="text-gray-500">แรงจูงใจ: </span><span className="text-gray-300">{c.motivation}</span></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
