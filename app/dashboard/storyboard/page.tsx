'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function StoryboardPage() {
  const router = useRouter()
  const { project, setProject, saveProject } = useStore()
  const [script, setScript] = useState(project.script || '')
  const [loading, setLoading] = useState(false)
  const [scenes, setScenes] = useState<any[]>([])
  const [error, setError] = useState('')

  async function generate() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings ก่อน'); return }
    if (!script) { setError('กรุณาใส่สคริปต์ก่อน'); return }
    setLoading(true); setError(''); setScenes([])
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `แบ่งสคริปต์นี้เป็น Storyboard 5-8 ฉาก ตอบเป็น JSON array: [{"scene":1,"duration":"3s","visual":"ภาพที่ต้องการ","dialogue":"บทพูด","camera":"มุมกล้อง","emotion":"อารมณ์"}] สคริปต์: ${script}` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const json = text.match(/\[[\s\S]*\]/)
      if (json) {
        const parsed = JSON.parse(json[0])
        setScenes(parsed)
        setProject({ storyboard: parsed })
        await saveProject()
      } else setError('ไม่สามารถสร้างได้ ลองใหม่')
    } catch { setError('เกิดข้อผิดพลาด') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">🎬 Storyboard</span>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-5">
        <textarea value={script} onChange={e => setScript(e.target.value)} rows={5} placeholder="วางสคริปต์ที่นี่..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300">{error}</div>}
        <button onClick={generate} disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
          {loading ? '⏳ กำลังสร้าง Storyboard...' : '🎬 สร้าง Storyboard'}
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenes.map((s, i) => (
            <div key={i} className="p-5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white">{s.scene}</span>
                <span className="text-gray-400 text-sm">{s.duration} • {s.camera}</span>
                <span className="ml-auto text-xs px-2 py-1 rounded-full bg-purple-900/40 text-purple-300">{s.emotion}</span>
              </div>
              <div className="mb-2"><span className="text-xs text-gray-500">ภาพ: </span><span className="text-gray-200 text-sm">{s.visual}</span></div>
              <div><span className="text-xs text-gray-500">บทพูด: </span><span className="text-gray-200 text-sm">"{s.dialogue}"</span></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
