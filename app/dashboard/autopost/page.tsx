'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function AutoPostPage() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<any[]>([])

  async function postNow() {
    const token = localStorage.getItem('vf_fb_token')
    if (!token) { setError('กรุณาใส่ Facebook Access Token ในหน้า Settings ก่อน'); return }
    if (!message) { setError('กรุณาใส่ข้อความก่อน'); return }
    setLoading(true); setError(''); setResult('')
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/me/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: token })
      })
      const data = await res.json()
      if (data.id) {
        setResult(`โพสต์สำเร็จ! Post ID: ${data.id}`)
        setPosts(p => [{ id: data.id, message, time: new Date().toLocaleString('th-TH'), status: '✅ สำเร็จ' }, ...p])
        setMessage('')
      } else {
        setError(data.error?.message || 'เกิดข้อผิดพลาด')
      }
    } catch { setError('เกิดข้อผิดพลาด ตรวจสอบ Access Token') }
    setLoading(false)
  }

  async function generateCaption() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings'); return }
    setLoading(true)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'เขียน Caption Facebook ไวรัล ภาษาไทย 1 โพสต์ ดึงดูดความสนใจ มี emoji และ hashtag' }] }] })
      })
      const data = await res.json()
      setMessage(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
    } catch {}
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">🚀 Auto-Post Facebook</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">ข้อความโพสต์</label>
            <button onClick={generateCaption} disabled={loading} className="text-xs text-purple-400 hover:text-purple-300">✨ AI เขียนให้</button>
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
            placeholder="พิมพ์ข้อความที่ต้องการโพสต์..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
        </div>
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300">{error}</div>}
        {result && <div className="p-4 rounded-xl bg-green-900/30 border border-green-500/50 text-green-300">{result}</div>}
        <button onClick={postNow} disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{background:'linear-gradient(90deg,#1877F2,#0a5dc2)'}}>
          {loading ? '⏳ กำลังโพสต์...' : '📘 โพสต์ Facebook ทันที'}
        </button>
        {posts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-white font-semibold">ประวัติโพสต์</h3>
            {posts.map((p, i) => (
              <div key={i} className="p-4 rounded-xl flex justify-between items-start" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <div>
                  <p className="text-gray-200 text-sm">{p.message.slice(0,80)}...</p>
                  <p className="text-gray-500 text-xs mt-1">{p.time}</p>
                </div>
                <span className="text-sm">{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
