'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Status = 'idle' | 'loading' | 'done' | 'error'

interface StepState {
  status: Status
  data: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState('')
  const [gemKey, setGemKey] = useState('')
  const [fbToken, setFbToken] = useState('')
  const [pexelsKey, setPexelsKey] = useState('')
  const [running, setRunning] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [brolls, setBrolls] = useState<{query:string;thumb:string;url:string}[]>([])
  const [postResult, setPostResult] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const [steps, setSteps] = useState<Record<string,StepState>>({
    trend:     { status:'idle', data:'' },
    script:    { status:'idle', data:'' },
    voice:     { status:'idle', data:'' },
    subtitle:  { status:'idle', data:'' },
    broll:     { status:'idle', data:'' },
    caption:   { status:'idle', data:'' },
    post:      { status:'idle', data:'' },
  })

  const setStep = (key: string, patch: Partial<StepState>) =>
    setSteps(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else { setUser(data.user); setLoading(false) }
    })
    setGemKey(localStorage.getItem('vf_gemini_key') || '')
    setFbToken(localStorage.getItem('vf_fb_token') || '')
    setPexelsKey(localStorage.getItem('vf_pexels_key') || '')
    function loadV() {
      const v = speechSynthesis.getVoices()
      setVoices(v)
    }
    loadV()
    speechSynthesis.onvoiceschanged = loadV
  }, [router])

  function saveSettings() {
    localStorage.setItem('vf_gemini_key', gemKey)
    localStorage.setItem('vf_fb_token', fbToken)
    localStorage.setItem('vf_pexels_key', pexelsKey)
    setShowSettings(false)
  }

  async function gem(prompt: string) {
    if (!gemKey) throw new Error('ใส่ Gemini API Key ก่อน')
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemKey}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] }) }
    )
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  async function runAll() {
    if (!topic.trim()) return
    if (!gemKey) { setShowSettings(true); return }
    setRunning(true)
    setPostResult('')
    setBrolls([])
    // reset all
    Object.keys(steps).forEach(k => setStep(k, { status:'idle', data:'' }))

    try {
      // STEP 1: Trend
      setStep('trend', { status:'loading' })
      const trendText = await gem(`วิเคราะห์เทรนด์ไวรัล เรื่อง "${topic}" บน TikTok/Reels ตอนนี้ ให้ 3 มุมมองที่น่าสนใจที่สุด แต่ละอันให้คำแนะนำ 1 ประโยค`)
      setStep('trend', { status:'done', data: trendText })

      // STEP 2: Script
      setStep('script', { status:'loading' })
      const scriptText = await gem(`เขียนสคริปต์วิดีโอ 60 วินาที เรื่อง "${topic}" ภาษาไทย สำหรับ TikTok/Reels แนวตั้ง มี Hook 3 วิแรกที่ดึงดูด เนื้อหากระชับ และ CTA ท้าย เขียนเป็นประโยคสั้นๆ ต่อเนื่องพูดเลย ไม่ต้องมี label`)
      setStep('script', { status:'done', data: scriptText })

      // STEP 3: Voice
      setStep('voice', { status:'loading' })
      await new Promise<void>((resolve) => {
        speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance(scriptText)
        const thVoice = voices.find(v => v.lang.startsWith('th'))
        if (thVoice) { utt.voice = thVoice; utt.lang = thVoice.lang }
        utt.rate = 1.1
        utt.onend = () => resolve()
        utt.onerror = () => resolve()
        speechSynthesis.speak(utt)
        setSpeaking(true)
      })
      setSpeaking(false)
      setStep('voice', { status:'done', data: 'เสียงพากย์เสร็จแล้ว ✅' })

      // STEP 4: Subtitle
      setStep('subtitle', { status:'loading' })
      const subRaw = await gem(`แบ่งข้อความนี้เป็นซับไตเติ้ล ประโยคละ 5-8 คำ ตอบเป็น JSON array: [{"text":"ข้อความ","start":0,"end":3}] start/end เป็นวินาทีต่อเนื่อง ข้อความ: ${scriptText}`)
      const subMatch = subRaw.match(/\[[\s\S]*\]/)
      const subs = subMatch ? JSON.parse(subMatch[0]) : []
      const subDisplay = subs.slice(0,4).map((s:any) => `[${s.start}s] ${s.text}`).join('\n') + (subs.length > 4 ? `\n...+${subs.length-4} บรรทัด` : '')
      setStep('subtitle', { status:'done', data: subDisplay })

      // STEP 5: B-Roll
      setStep('broll', { status:'loading' })
      const kwRaw = await gem(`จากสคริปต์นี้ หา 4 keyword ภาษาอังกฤษสำหรับหา B-roll video บน Pexels ตอบ JSON array: ["kw1","kw2","kw3","kw4"] สคริปต์: ${scriptText.slice(0,200)}`)
      const kwMatch = kwRaw.match(/\[[\s\S]*?\]/)
      const keywords: string[] = kwMatch ? JSON.parse(kwMatch[0]) : ['business','success','smartphone','money']
      const brollResults: typeof brolls = []
      if (pexelsKey) {
        for (const kw of keywords.slice(0,3)) {
          try {
            const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(kw)}&per_page=1&orientation=portrait`, { headers:{ Authorization: pexelsKey } })
            const d = await r.json()
            const vid = d.videos?.[0]
            if (vid) brollResults.push({ query:kw, thumb:vid.image, url:vid.video_files?.[0]?.link||'' })
          } catch {}
        }
      } else {
        keywords.slice(0,3).forEach(k => brollResults.push({ query:k, thumb:'', url:'' }))
      }
      setBrolls(brollResults)
      setStep('broll', { status:'done', data: keywords.join(', ') })

      // STEP 6: Caption
      setStep('caption', { status:'loading' })
      const captionText = await gem(`เขียน Caption Facebook/TikTok ไวรัล สำหรับวิดีโอเรื่อง "${topic}" ภาษาไทย มี emoji hashtag และ CTA กระชับ`)
      setStep('caption', { status:'done', data: captionText })

    } catch (e: any) {
      console.error(e)
    }

    setRunning(false)
  }

  async function postFacebook() {
    const caption = steps.caption.data
    if (!fbToken || !caption) return
    setStep('post', { status:'loading' })
    try {
      const res = await fetch('https://graph.facebook.com/v21.0/me/feed', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: caption, access_token: fbToken })
      })
      const d = await res.json()
      if (d.id) { setStep('post', { status:'done', data:`✅ โพสต์สำเร็จ ID: ${d.id}` }); setPostResult(`✅ โพสต์แล้ว!`) }
      else setStep('post', { status:'error', data: d.error?.message || 'Error' })
    } catch { setStep('post', { status:'error', data:'เกิดข้อผิดพลาด' }) }
  }

  function download() {
    const txt = [
      `หัวข้อ: ${topic}`,
      `\n--- TREND ---\n${steps.trend.data}`,
      `\n--- SCRIPT ---\n${steps.script.data}`,
      `\n--- SUBTITLE ---\n${steps.subtitle.data}`,
      `\n--- CAPTION ---\n${steps.caption.data}`,
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type:'text/plain;charset=utf-8' }))
    a.download = `${topic}.txt`; a.click()
  }

  const done = (k:string) => steps[k].status === 'done'
  const anyDone = Object.values(steps).some(s => s.status === 'done')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#09090f'}}>
      <div className="text-purple-400 text-sm animate-pulse">⚡ กำลังโหลด...</div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#09090f'}}>

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3"
        style={{background:'rgba(9,9,15,0.9)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
            style={{background:'linear-gradient(135deg,#7C3AED,#4F46E5)'}}>V</div>
          <span className="font-black text-white">ViralFactory AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-xs hidden sm:block">{user?.email}</span>
          <button onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition">⚙️</button>
          <button onClick={async () => { await createClient().auth.signOut(); router.push('/') }}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition">ออก</button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{background:'#141420',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">⚙️ Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            {[
              { label:'Gemini API Key', val:gemKey, set:setGemKey, ph:'AIza...', link:'https://aistudio.google.com/app/apikey' },
              { label:'Facebook Token', val:fbToken, set:setFbToken, ph:'EAAxxxxx...', link:'https://developers.facebook.com/tools/explorer/' },
              { label:'Pexels API Key', val:pexelsKey, set:setPexelsKey, ph:'xxxxxx...', link:'https://www.pexels.com/api/' },
            ].map(f => (
              <div key={f.label}>
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-gray-400">{f.label}</label>
                  <a href={f.link} target="_blank" rel="noreferrer" className="text-purple-400 text-xs">รับฟรี →</a>
                </div>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}} />
              </div>
            ))}
            <button onClick={saveSettings}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
              บันทึก
            </button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* Hero Input */}
        <div className="rounded-2xl p-6" style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)'}}>
          <h1 className="text-white font-black text-2xl mb-1">⚡ กดเดียว AI ทำทุกอย่าง</h1>
          <p className="text-gray-500 text-sm mb-5">ใส่หัวข้อ → Trend → Script → เสียงพากย์ → ซับ → B-Roll → Caption → โพสต์</p>
          <div className="flex gap-3">
            <input value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !running && runAll()}
              placeholder="หัวข้อ เช่น รีวิวสินค้า, วิธีรวยจาก TikTok, แม่ค้าออนไลน์..."
              disabled={running}
              className="flex-1 px-4 py-3.5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition disabled:opacity-50"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}} />
            <button onClick={runAll} disabled={running || !topic.trim()}
              className="px-6 py-3.5 rounded-xl font-bold text-white disabled:opacity-40 whitespace-nowrap transition-all hover:opacity-90"
              style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)',boxShadow:'0 0 20px rgba(124,58,237,0.4)'}}>
              {running ? '⏳ รันอยู่...' : '⚡ รันเลย!'}
            </button>
          </div>
          {!gemKey && (
            <p className="mt-3 text-yellow-500 text-xs">⚠️ ยังไม่มี Gemini Key — <button onClick={() => setShowSettings(true)} className="underline">กด Settings</button> เพื่อใส่ก่อน</p>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-3">

          {/* Progress bar */}
          {running && (
            <div className="h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{width:`${(Object.values(steps).filter(s=>s.status==='done').length/6)*100}%`,background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}} />
            </div>
          )}

          {([
            { key:'trend',    icon:'📈', label:'วิเคราะห์เทรนด์' },
            { key:'script',   icon:'📝', label:'เขียนสคริปต์ AI' },
            { key:'voice',    icon:'🎙️', label:'เสียงพากย์ TTS' },
            { key:'subtitle', icon:'💬', label:'ซับไทยอัตโนมัติ' },
            { key:'broll',    icon:'🎬', label:'หา B-Roll วิดีโอ' },
            { key:'caption',  icon:'✍️', label:'สร้าง Caption' },
          ] as const).map(s => (
            <div key={s.key} className="rounded-2xl overflow-hidden transition-all"
              style={{background: done(s.key) ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                      border:`1px solid ${done(s.key) ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.07)'}`}}>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{background: done(s.key) ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)'}}>
                  {steps[s.key].status === 'loading' ? (
                    <span className="animate-spin text-sm">⏳</span>
                  ) : done(s.key) ? '✅' : s.icon}
                </div>
                <span className={`font-semibold text-sm ${done(s.key) ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                {steps[s.key].status === 'loading' && (
                  <span className="ml-auto text-purple-400 text-xs animate-pulse">กำลังประมวลผล...</span>
                )}
              </div>
              {/* Content */}
              {done(s.key) && steps[s.key].data && (
                <div className="px-5 pb-4">
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto pr-1"
                    style={{scrollbarWidth:'thin'}}>
                    {steps[s.key].data}
                  </div>
                  {(s.key === 'script' || s.key === 'caption') && (
                    <button onClick={() => navigator.clipboard.writeText(steps[s.key].data)}
                      className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition">
                      📋 คัดลอก
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* B-Roll Thumbs */}
          {brolls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {brolls.map((b, i) => (
                <div key={i} className="rounded-xl overflow-hidden relative group" style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                  {b.thumb
                    ? <img src={b.thumb} alt={b.query} className="w-full h-24 object-cover" />
                    : <div className="w-full h-24 flex items-center justify-center text-gray-600 text-xs" style={{background:'rgba(255,255,255,0.03)'}}>🎬 {b.query}</div>}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    {b.url && <a href={b.url} target="_blank" rel="noreferrer" className="text-white text-xs bg-purple-600 px-2 py-1 rounded">⬇️ Download</a>}
                  </div>
                  <div className="px-2 py-1.5 text-xs text-gray-500 truncate" style={{background:'rgba(0,0,0,0.4)'}}>{b.query}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons — โชว์หลังจาก caption เสร็จ */}
        {done('caption') && (
          <div className="rounded-2xl p-5 space-y-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <h3 className="text-white font-bold text-sm mb-2">🚀 ขั้นตอนสุดท้าย</h3>

            {/* Post Facebook */}
            {fbToken ? (
              <button onClick={postFacebook} disabled={steps.post.status === 'loading'}
                className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-50 transition hover:opacity-90"
                style={{background:'linear-gradient(90deg,#1877F2,#0a5dc2)'}}>
                {steps.post.status === 'loading' ? '⏳ กำลังโพสต์...' : '📘 โพสต์ Facebook เลย!'}
              </button>
            ) : (
              <button onClick={() => setShowSettings(true)}
                className="w-full py-3.5 rounded-xl font-bold border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 transition">
                ⚠️ ใส่ Facebook Token เพื่อโพสต์
              </button>
            )}

            {postResult && <div className="p-3 rounded-xl text-green-300 text-sm text-center" style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)'}}>{postResult}</div>}
            {steps.post.status === 'error' && <div className="p-3 rounded-xl text-red-300 text-sm" style={{background:'rgba(239,68,68,0.1)'}}>{steps.post.data}</div>}

            {/* Download */}
            <button onClick={download}
              className="w-full py-3.5 rounded-xl font-bold border border-white/10 text-gray-300 hover:bg-white/5 transition">
              ⬇️ ดาวน์โหลด Script + ซับ + Caption (.txt)
            </button>

            {/* Run Again */}
            <button onClick={runAll} disabled={running}
              className="w-full py-3 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition">
              🔄 รันใหม่อีกครั้ง
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
