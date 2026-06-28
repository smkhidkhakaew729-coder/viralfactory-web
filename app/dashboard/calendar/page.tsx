'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CalendarPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [platform, setPlatform] = useState('Facebook')

  useEffect(() => {
    const saved = localStorage.getItem('vf_calendar')
    if (saved) setPosts(JSON.parse(saved))
  }, [])

  function addPost() {
    if (!text || !date) return
    const updated = [...posts, { id: Date.now(), text, date, platform, status: 'กำหนดการ' }].sort((a,b) => a.date.localeCompare(b.date))
    setPosts(updated)
    localStorage.setItem('vf_calendar', JSON.stringify(updated))
    setText(''); setDate('')
  }

  function remove(id: number) {
    const updated = posts.filter(p => p.id !== id)
    setPosts(updated)
    localStorage.setItem('vf_calendar', JSON.stringify(updated))
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">📅 Content Calendar</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="p-6 rounded-xl space-y-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <h3 className="font-bold text-white">เพิ่มแผนโพสต์</h3>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="เนื้อหา/หัวข้อ..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
              {['Facebook','TikTok','Instagram','YouTube'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={addPost}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
            + เพิ่มแผน
          </button>
        </div>
        <div className="space-y-3">
          {posts.length === 0 && <p className="text-gray-500 text-center py-8">ยังไม่มีแผนโพสต์</p>}
          {posts.map(p => (
            <div key={p.id} className="p-4 rounded-xl flex items-center gap-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="text-center min-w-16">
                <div className="text-purple-400 font-bold text-lg">{new Date(p.date).getDate()}</div>
                <div className="text-gray-500 text-xs">{new Date(p.date).toLocaleString('th-TH',{month:'short'})}</div>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{p.text.slice(0,60)}{p.text.length>60?'...':''}</p>
                <p className="text-gray-500 text-xs">{p.platform} • {new Date(p.date).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</p>
              </div>
              <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-300 text-sm">ลบ</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
