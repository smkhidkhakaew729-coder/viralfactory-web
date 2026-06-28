'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function VideoPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function generate() {
    const key = localStorage.getItem('vf_kie_key')
    if (!key) { setError('กรุณาใส่ Kie.ai API Key ในหน้า Settings ก่อน'); return }
    if (!prompt) { setError('กรุณาใส่ prompt ก่อน'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('https://klingai.com/api/v1/videos/text2video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ prompt, duration: 5, aspect_ratio: '9:16' })
      })
      const data = await res.json()
      if (data.code === 0) {
        setResult({ taskId: data.data?.task_id, status: 'processing' })
      } else {
        setError(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch { setError('เกิดข้อผิดพลาด ตรวจสอบ API Key') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">🎥 Video Gen</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        <div className="p-4 rounded-xl" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.3)'}}>
          <p className="text-purple-300 text-sm">ใช้ Kie.ai (Veo3) สร้างวิดีโอจาก text • ต้องมี Kie.ai API Key</p>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Prompt (ภาษาอังกฤษให้ผลดีกว่า)</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
            placeholder="A Thai woman selling products online, smiling, natural lighting, vertical video..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
        </div>
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300">{error}</div>}
        <button onClick={generate} disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
          {loading ? '⏳ กำลังสร้างวิดีโอ...' : '🎥 สร้างวิดีโอ'}
        </button>
        {result && (
          <div className="p-5 rounded-xl text-center" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-white font-semibold">กำลังสร้างวิดีโอ...</p>
            <p className="text-gray-400 text-sm mt-2">Task ID: {result.taskId}</p>
            <p className="text-gray-400 text-sm">รอประมาณ 3-5 นาที แล้วเช็คผลใน Kie.ai dashboard</p>
          </div>
        )}
      </main>
    </div>
  )
}
