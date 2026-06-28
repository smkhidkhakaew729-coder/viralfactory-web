'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [geminiKey, setGeminiKey] = useState('')
  const [kieKey, setKieKey] = useState('')
  const [fbToken, setFbToken] = useState('')
  const [pexelsKey, setPexelsKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setGeminiKey(localStorage.getItem('vf_gemini_key') || '')
    setKieKey(localStorage.getItem('vf_kie_key') || '')
    setFbToken(localStorage.getItem('vf_fb_token') || '')
    setPexelsKey(localStorage.getItem('vf_pexels_key') || '')
  }, [])

  function save() {
    localStorage.setItem('vf_gemini_key', geminiKey)
    localStorage.setItem('vf_kie_key', kieKey)
    localStorage.setItem('vf_fb_token', fbToken)
    localStorage.setItem('vf_pexels_key', pexelsKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">⚙️ Settings</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {[
          { label: '🤖 Gemini API Key', value: geminiKey, set: setGeminiKey, key: 'gemini', placeholder: 'AIza...', link: 'https://aistudio.google.com/app/apikey' },
          { label: '🎬 Kie.ai API Key (Video Gen)', value: kieKey, set: setKieKey, key: 'kie', placeholder: 'kie-...', link: 'https://kie.ai' },
          { label: '📘 Facebook Access Token', value: fbToken, set: setFbToken, key: 'fb', placeholder: 'EAAx...', link: 'https://developers.facebook.com/tools/explorer/' },
          { label: '📷 Pexels API Key (B-Roll)', value: pexelsKey, set: setPexelsKey, key: 'pexels', placeholder: 'pexels-...', link: 'https://www.pexels.com/api/' },
        ].map(f => (
          <div key={f.key} className="p-6 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-white">{f.label}</label>
              <a href={f.link} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300">รับ Key →</a>
            </div>
            <input
              type="password"
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition font-mono text-sm"
            />
          </div>
        ))}

        <button onClick={save}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all"
          style={{background: saved ? '#10b981' : 'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
          {saved ? '✅ บันทึกแล้ว!' : 'บันทึก API Keys'}
        </button>

        <p className="text-center text-gray-500 text-xs">API Keys เก็บในเบราว์เซอร์ของคุณเท่านั้น ไม่ได้ส่งไปที่ server</p>
      </main>
    </div>
  )
}
