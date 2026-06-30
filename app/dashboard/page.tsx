'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Phase = 'idle' | 'running' | 'preview' | 'exporting' | 'done'

interface Sub { text: string; start: number; end: number }
interface BRoll { query: string; thumb: string; url: string; blob?: Blob }

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState('')
  const [gemKey, setGemKey] = useState('')
  const [pexelsKey, setPexelsKey] = useState('')
  const [fbToken, setFbToken] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [log, setLog] = useState<string[]>([])
  const [script, setScript] = useState('')
  const [subs, setSubs] = useState<Sub[]>([])
  const [brolls, setBrolls] = useState<BRoll[]>([])
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [exportProgress, setExportProgress] = useState(0)
  const [caption, setCaption] = useState('')
  const [currentSub, setCurrentSub] = useState('')
  const [currentBroll, setCurrentBroll] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else { setUser(data.user); setLoading(false) }
    })
    setGemKey(localStorage.getItem('vf_gemini_key') || '')
    setPexelsKey(localStorage.getItem('vf_pexels_key') || '')
    setFbToken(localStorage.getItem('vf_fb_token') || '')
  }, [router])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  function saveSettings() {
    localStorage.setItem('vf_gemini_key', gemKey)
    localStorage.setItem('vf_pexels_key', pexelsKey)
    localStorage.setItem('vf_fb_token', fbToken)
    setShowSettings(false)
  }

  async function gem(prompt: string) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    )
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  // TTS via browser SpeechSynthesis → record to AudioContext → Blob
  async function recordTTS(text: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const ctx = new AudioContext()
        const dest = ctx.createMediaStreamDestination()
        const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' })
        const chunks: BlobPart[] = []
        rec.ondataavailable = e => chunks.push(e.data)
        rec.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }))
        rec.start()
        const utt = new SpeechSynthesisUtterance(text)
        const voices = speechSynthesis.getVoices()
        const th = voices.find(v => v.lang.startsWith('th'))
        if (th) { utt.voice = th; utt.lang = th.lang }
        utt.rate = 1.05
        utt.onend = () => { setTimeout(() => rec.stop(), 300) }
        utt.onerror = () => reject(new Error('TTS error'))
        speechSynthesis.speak(utt)
      } catch (e) { reject(e) }
    })
  }

  async function runPipeline() {
    if (!topic.trim() || !gemKey) { setShowSettings(true); return }
    setPhase('running')
    setLog([])
    setScript(''); setSubs([]); setBrolls([]); setAudioBlob(null); setVideoUrl(''); setCaption('')

    try {
      // 1. Script
      addLog('📝 กำลังเขียนสคริปต์ด้วย AI...')
      const sc = await gem(`เขียนสคริปต์วิดีโอ TikTok 45-60 วินาที เรื่อง "${topic}" ภาษาไทย มี Hook ดึงดูด 3 วิแรก เนื้อหากระชับ และ CTA ท้าย เขียนเป็นประโยคสั้นๆ ต่อเนื่อง ไม่ต้อง label`)
      setScript(sc)
      addLog('✅ Script พร้อมแล้ว')

      // 2. Subtitle
      addLog('💬 สร้างซับไทย...')
      const subRaw = await gem(`แบ่งข้อความนี้เป็นซับไตเติ้ล ประโยคละ 4-6 คำ ตอบ JSON array เท่านั้น ไม่ต้องมีอะไรอื่น: [{"text":"ข้อความ","start":0,"end":3}] start/end เป็นวินาทีต่อเนื่อง ข้อความ: ${sc}`)
      let parsedSubs: Sub[] = []
      try {
        const m = subRaw.match(/\[[\s\S]*\]/)
        if (m) parsedSubs = JSON.parse(m[0])
      } catch {}
      if (parsedSubs.length === 0) {
        // fallback: แบ่งเองจากจำนวนคำ
        const words = sc.split(/\s+/)
        let t = 0
        for (let i = 0; i < words.length; i += 5) {
          const chunk = words.slice(i, i + 5).join(' ')
          parsedSubs.push({ text: chunk, start: t, end: t + 3 })
          t += 3
        }
      }
      setSubs(parsedSubs)
      addLog(`✅ ซับ ${parsedSubs.length} บรรทัดพร้อมแล้ว`)

      // 3. TTS Voice
      addLog('🎙️ กำลังสร้างเสียงพากย์...')
      let ab: Blob | null = null
      try {
        ab = await recordTTS(sc)
        setAudioBlob(ab)
        addLog('✅ เสียงพากย์พร้อมแล้ว')
      } catch {
        addLog('⚠️ เสียงพากย์ไม่ได้ (browser ไม่รองรับ recording) — จะใช้เสียงในตอน preview')
      }

      // 4. B-Roll keywords + fetch
      addLog('🎬 กำลังหา B-Roll วิดีโอ...')
      const kwRaw = await gem(`จากสคริปต์นี้ หา 5 keyword ภาษาอังกฤษสำหรับหา B-roll video ใน Pexels เป็น vertical/portrait video ตอบ JSON array เท่านั้น: ["kw1","kw2","kw3","kw4","kw5"] สคริปต์: ${sc.slice(0, 300)}`)
      let keywords: string[] = ['business success', 'online shopping', 'smartphone', 'money thailand', 'happy people']
      try {
        const m = kwRaw.match(/\[[\s\S]*?\]/)
        if (m) keywords = JSON.parse(m[0])
      } catch {}

      const brollList: BRoll[] = []
      if (pexelsKey) {
        for (const kw of keywords.slice(0, 5)) {
          try {
            const r = await fetch(
              `https://api.pexels.com/videos/search?query=${encodeURIComponent(kw)}&per_page=3&orientation=portrait`,
              { headers: { Authorization: pexelsKey } }
            )
            const d = await r.json()
            const vid = d.videos?.[0]
            if (vid) {
              const file = vid.video_files?.find((f: any) => f.quality === 'sd' || f.quality === 'hd')
              brollList.push({ query: kw, thumb: vid.image, url: file?.link || '' })
            }
          } catch {}
        }
        addLog(`✅ ได้ B-Roll ${brollList.length} คลิปจาก Pexels`)
      } else {
        keywords.slice(0, 5).forEach(k => brollList.push({ query: k, thumb: '', url: '' }))
        addLog('⚠️ ไม่มี Pexels Key — จะใช้สีพื้นหลังแทน B-Roll')
      }
      setBrolls(brollList)

      // 5. Caption
      addLog('✍️ สร้าง Caption...')
      const cap = await gem(`เขียน Caption TikTok/Facebook ไวรัล เรื่อง "${topic}" ภาษาไทย มี emoji hashtag CTA กระชับ ไม่เกิน 5 บรรทัด`)
      setCaption(cap)
      addLog('✅ Caption พร้อมแล้ว')

      addLog('🎉 ทุกอย่างพร้อม! กด "Preview คลิป" ด้านล่างได้เลย')
      setPhase('preview')

    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`)
      setPhase('idle')
    }
  }

  // Render video on canvas — combine B-Roll thumbs + subtitle overlay
  async function exportVideo() {
    setPhase('exporting')
    setExportProgress(0)
    addLog('🎬 กำลัง render วิดีโอ...')

    const canvas = canvasRef.current!
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')!

    const totalDuration = subs.length > 0 ? subs[subs.length - 1].end : 30
    const FPS = 24
    const totalFrames = totalDuration * FPS

    // Load B-Roll images
    const bgImages: HTMLImageElement[] = []
    for (const b of brolls) {
      if (b.thumb) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise<void>((res, rej) => {
            img.onload = () => res()
            img.onerror = () => res() // skip on error
            img.src = b.thumb
          })
          bgImages.push(img)
        } catch {}
      }
    }

    // Record canvas stream
    const stream = canvas.captureStream(FPS)

    // Add audio if available
    let audioTrack: MediaStreamTrack | null = null
    if (audioBlob) {
      try {
        const audioEl = new Audio(URL.createObjectURL(audioBlob))
        audioEl.play()
        const aCtx = new AudioContext()
        const src = aCtx.createMediaElementSource(audioEl)
        const dest = aCtx.createMediaStreamDestination()
        src.connect(dest)
        src.connect(aCtx.destination)
        audioTrack = dest.stream.getAudioTracks()[0]
        if (audioTrack) stream.addTrack(audioTrack)
      } catch {}
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = e => chunks.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setVideoUrl(url)
      setPhase('done')
      addLog('🎉 วิดีโอพร้อมแล้ว! กด Download ได้เลย')
    }

    recorder.start()

    // Render frames
    const colors = ['#1a0a2e', '#0a1a2e', '#0a2e1a', '#2e1a0a', '#1a1a0a']
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / FPS
      const subIdx = subs.findIndex(s => t >= s.start && t < s.end)
      const bgIdx = Math.floor((t / totalDuration) * Math.max(bgImages.length, 1)) % Math.max(bgImages.length, 1)

      // Background
      if (bgImages[bgIdx]) {
        ctx.drawImage(bgImages[bgIdx], 0, 0, 1080, 1920)
        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, 0, 1080, 1920)
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, 1920)
        grad.addColorStop(0, colors[bgIdx % colors.length])
        grad.addColorStop(1, '#09090f')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 1080, 1920)
      }

      // Logo watermark top
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('⚡ ViralFactory AI', 540, 80)

      // Subtitle bottom
      if (subIdx >= 0 && subs[subIdx]) {
        const sub = subs[subIdx]
        const subText = sub.text

        // Box
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        const tw = ctx.measureText(subText).width + 80
        ctx.beginPath()
        ctx.roundRect(540 - tw/2, 1650, tw, 110, 16)
        ctx.fill()

        // Text
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 72px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(subText, 540, 1730)
      }

      // Progress bar bottom
      const prog = t / totalDuration
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(0, 1900, 1080, 20)
      ctx.fillStyle = 'rgba(124,58,237,0.9)'
      ctx.fillRect(0, 1900, 1080 * prog, 20)

      // Wait for next frame
      await new Promise(r => setTimeout(r, 1000 / FPS))
      setExportProgress(Math.round((frame / totalFrames) * 100))
    }

    recorder.stop()
  }

  function downloadVideo() {
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `${topic || 'viral-clip'}.webm`
    a.click()
  }

  function downloadCaption() {
    const txt = `หัวข้อ: ${topic}\n\n--- SCRIPT ---\n${script}\n\n--- CAPTION ---\n${caption}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }))
    a.download = `${topic}.txt`; a.click()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
      <div className="text-purple-400 text-sm animate-pulse">⚡ กำลังโหลด...</div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3"
        style={{ background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>V</div>
          <span className="font-black text-white">ViralFactory AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-xs hidden sm:block">{user?.email}</span>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition text-lg">⚙️</button>
          <button onClick={async () => { await createClient().auth.signOut(); router.push('/') }}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition">ออก</button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: '#141420', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">⚙️ Settings — API Keys</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            {[
              { label: 'Gemini API Key *จำเป็น', val: gemKey, set: setGemKey, ph: 'AIza...', link: 'https://aistudio.google.com/app/apikey', note: 'สำหรับเขียน Script + ซับ + Caption' },
              { label: 'Pexels API Key (B-Roll)', val: pexelsKey, set: setPexelsKey, ph: 'xxxxxx...', link: 'https://www.pexels.com/api/', note: 'สำหรับดึงวิดีโอพื้นหลัง ฟรี' },
              { label: 'Facebook Token (โพสต์)', val: fbToken, set: setFbToken, ph: 'EAAxxxxx...', link: 'https://developers.facebook.com/tools/explorer/', note: 'สำหรับโพสต์ Facebook' },
            ].map(f => (
              <div key={f.label}>
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-gray-300 font-semibold">{f.label}</label>
                  <a href={f.link} target="_blank" rel="noreferrer" className="text-purple-400 text-xs">รับฟรี →</a>
                </div>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 mb-1"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <p className="text-gray-600 text-xs">{f.note}</p>
              </div>
            ))}
            <button onClick={saveSettings}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)' }}>
              บันทึก
            </button>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Hero */}
        <div className="text-center py-4">
          <h1 className="text-white font-black text-3xl mb-2">🎬 สร้างคลิปไวรัล</h1>
          <p className="text-gray-500 text-sm">ใส่หัวข้อ → AI เขียน Script + เสียงพากย์ + ซับไทย + B-Roll → Export .webm</p>
        </div>

        {/* Input */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <div className="flex gap-3">
            <input value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && phase === 'idle' && runPipeline()}
              placeholder="หัวข้อ เช่น วิธีรวยจาก TikTok, รีวิวสินค้า, แม่ค้าออนไลน์..."
              disabled={phase === 'running' || phase === 'exporting'}
              className="flex-1 px-4 py-3.5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <button onClick={runPipeline}
              disabled={!topic.trim() || phase === 'running' || phase === 'exporting'}
              className="px-5 py-3.5 rounded-xl font-bold text-white disabled:opacity-40 whitespace-nowrap"
              style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}>
              {phase === 'running' ? '⏳ AI ทำงาน...' : '⚡ สร้างคลิป!'}
            </button>
          </div>
          {!gemKey && (
            <p className="mt-2 text-yellow-500 text-xs">⚠️ ต้องใส่ Gemini Key ก่อน — <button onClick={() => setShowSettings(true)} className="underline">เปิด Settings</button></p>
          )}
        </div>

        {/* Log */}
        {log.length > 0 && (
          <div ref={logRef} className="rounded-2xl p-4 space-y-1 max-h-48 overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)', scrollbarWidth: 'thin' }}>
            {log.map((l, i) => (
              <div key={i} className="text-sm font-mono"
                style={{ color: l.startsWith('✅') ? '#4ade80' : l.startsWith('❌') ? '#f87171' : l.startsWith('⚠️') ? '#fbbf24' : l.startsWith('🎉') ? '#a78bfa' : '#94a3b8' }}>
                {l}
              </div>
            ))}
            {phase === 'running' && <div className="text-purple-400 text-sm animate-pulse">⏳ กำลังประมวลผล...</div>}
          </div>
        )}

        {/* Preview section */}
        {(phase === 'preview' || phase === 'exporting' || phase === 'done') && (
          <div className="space-y-4">

            {/* Script preview */}
            {script && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-bold text-sm">📝 Script</h3>
                  <button onClick={() => navigator.clipboard.writeText(script)} className="text-purple-400 text-xs hover:text-purple-300">📋 คัดลอก</button>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{script}</p>
              </div>
            )}

            {/* Subs preview */}
            {subs.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-white font-bold text-sm mb-3">💬 ซับไทย ({subs.length} บรรทัด)</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {subs.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="text-purple-400 font-mono w-16 shrink-0">{s.start}s–{s.end}s</span>
                      <span className="text-gray-300">{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B-Roll thumbs */}
            {brolls.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-white font-bold text-sm mb-3">🎬 B-Roll วิดีโอ ({brolls.length} คลิป)</h3>
                <div className="grid grid-cols-5 gap-2">
                  {brolls.map((b, i) => (
                    <div key={i} className="rounded-xl overflow-hidden aspect-[9/16]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      {b.thumb
                        ? <img src={b.thumb} alt={b.query} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs text-gray-600" style={{ background: 'rgba(255,255,255,0.03)' }}>🎬</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caption */}
            {caption && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-bold text-sm">✍️ Caption</h3>
                  <button onClick={() => navigator.clipboard.writeText(caption)} className="text-purple-400 text-xs hover:text-purple-300">📋 คัดลอก</button>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-line">{caption}</p>
              </div>
            )}

            {/* Phone preview mockup */}
            {phase === 'preview' && brolls.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-white font-bold text-sm mb-4">📱 Preview คลิป (9:16)</h3>
                <div className="flex justify-center">
                  <div className="relative w-44 rounded-3xl overflow-hidden" style={{ aspectRatio: '9/16', border: '2px solid rgba(255,255,255,0.15)' }}>
                    {brolls[0]?.thumb && <img src={brolls[0].thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                    {subs[0] && (
                      <div className="absolute bottom-12 left-0 right-0 text-center px-2">
                        <span className="inline-block bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">{subs[0].text}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-0 right-0 text-center">
                      <span className="text-white text-xs font-bold opacity-80">⚡ ViralFactory</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Export */}
            {phase === 'exporting' && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-purple-300 font-semibold">🎬 กำลัง render วิดีโอ...</span>
                  <span className="text-white font-bold">{exportProgress}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${exportProgress}%`, background: 'linear-gradient(90deg,#7C3AED,#4F46E5)' }} />
                </div>
                <p className="text-gray-500 text-xs mt-2">กรุณารอสักครู่ — อย่าปิดหน้าต่างนี้</p>
              </div>
            )}

            {/* Done */}
            {phase === 'done' && videoUrl && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <h3 className="text-green-300 font-bold">🎉 คลิปพร้อมแล้ว!</h3>
                <video src={videoUrl} controls className="w-full rounded-xl max-h-96" style={{ background: '#000' }} />
                <button onClick={downloadVideo}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg"
                  style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                  ⬇️ Download คลิป (.webm)
                </button>
              </div>
            )}

            {/* Action buttons */}
            {phase === 'preview' && (
              <div className="space-y-3">
                <button onClick={exportVideo}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg transition hover:opacity-90"
                  style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}>
                  🎬 Render เป็นคลิป .webm
                </button>
                <button onClick={downloadCaption}
                  className="w-full py-3 rounded-xl font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition">
                  ⬇️ Download Script + Caption (.txt)
                </button>
                <button onClick={() => { setPhase('idle'); setLog([]) }}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-400 transition">
                  🔄 เริ่มใหม่
                </button>
              </div>
            )}

            {phase === 'done' && (
              <div className="space-y-3">
                <button onClick={downloadCaption}
                  className="w-full py-3 rounded-xl font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition">
                  ⬇️ Download Script + Caption (.txt)
                </button>
                <button onClick={() => { setPhase('idle'); setLog([]); setVideoUrl('') }}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-400 transition">
                  🔄 สร้างคลิปใหม่
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
