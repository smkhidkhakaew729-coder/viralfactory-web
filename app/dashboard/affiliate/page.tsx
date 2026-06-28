'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AffiliatePage() {
  const [links, setLinks] = useState<any[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState('TikTok Shop')
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('vf_aff_links')
    if (saved) setLinks(JSON.parse(saved))
  }, [])

  function addLink() {
    if (!name || !url) return
    const updated = [...links, { id: Date.now(), name, url, platform, clicks: 0, earnings: 0 }]
    setLinks(updated)
    localStorage.setItem('vf_aff_links', JSON.stringify(updated))
    setName(''); setUrl('')
  }

  function removeLink(id: number) {
    const updated = links.filter(l => l.id !== id)
    setLinks(updated)
    localStorage.setItem('vf_aff_links', JSON.stringify(updated))
  }

  async function genCaption(link: any) {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { alert('กรุณาใส่ Gemini API Key ในหน้า Settings'); return }
    setLoading(true)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `เขียน Caption ขาย Affiliate สินค้า "${link.name}" บน ${link.platform} ภาษาไทย กระตุ้นซื้อ มี emoji hashtag และบอกให้กดลิงก์ในไบโอ` }] }] })
      })
      const data = await res.json()
      setCaption(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
    } catch {}
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">🤝 Affiliate Manager</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="p-6 rounded-xl space-y-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <h3 className="font-bold text-white">เพิ่มลิงก์ Affiliate</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อสินค้า"
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
              {['TikTok Shop','Shopee','Lazada'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="ลิงก์ Affiliate"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          <button onClick={addLink}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
            + เพิ่มลิงก์
          </button>
        </div>

        <div className="space-y-3">
          {links.map(l => (
            <div key={l.id} className="p-5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-white">{l.name}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">{l.platform}</span>
                </div>
                <button onClick={() => removeLink(l.id)} className="text-red-400 hover:text-red-300 text-sm">ลบ</button>
              </div>
              <p className="text-gray-500 text-xs mb-3 truncate">{l.url}</p>
              <div className="flex gap-3">
                <button onClick={() => navigator.clipboard.writeText(l.url)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5">📋 Copy</button>
                <button onClick={() => genCaption(l)} disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-lg border border-purple-500/50 text-purple-300 hover:bg-purple-900/20">
                  {loading ? '⏳' : '✨ สร้าง Caption'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {caption && (
          <div className="p-5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold text-white">Caption ที่สร้าง</h3>
              <button onClick={() => navigator.clipboard.writeText(caption)} className="text-xs text-purple-400">📋 Copy</button>
            </div>
            <p className="text-gray-200 text-sm whitespace-pre-wrap">{caption}</p>
          </div>
        )}
      </main>
    </div>
  )
}
