'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Phase = 'idle' | 'running' | 'preview' | 'exporting' | 'done'
interface Sub { text: string; start: number; end: number }
interface BRoll { query: string; thumb: string; url: string }

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState('')
  const [gemKey, setGemKey] = useState('')
  const [googleTTSKey, setGoogleTTSKey] = useState('')
  const [pexelsKey, setPexelsKey] = useState('')
  const [fbToken, setFbToken] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [log, setLog] = useState<string[]>([])
  const [script, setScript] = useState('')
  const [subs, setSubs] = useState<Sub[]>([])
  const [brolls, setBrolls] = useState<BRoll[]>([])
  const [audioUrl, setAudioUrl] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [caption, setCaption] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [exportProgress, setExportProgress] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else { setUser(data.user); setLoading(false) }
    })
    setGemKey(localStorage.getItem('vf_gemini_key') || '')
    setGoogleTTSKey(localStorage.getItem('vf_google_tts_key') || '')
    setPexelsKey(localStorage.getItem('vf_pexels_key') || '')
    setFbToken(localStorage.getItem('vf_fb_token') || '')
  }, [router])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  function saveSettings() {
    localStorage.setItem('vf_gemini_key', gemKey)
    localStorage.setItem('vf_google_tts_key', googleTTSKey)
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
    if (d.error) throw new Error(d.error.message)
    return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  // Google Cloud TTS → mp3 blob
  async function googleTTS(text: string): Promise<Blob> {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleTTSKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'th-TH',
            name: 'th-TH-Neural2-C',  // เสียงผู้หญิงไทย Neural2
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.05,
            pitch: 0
          }
        })
      }
    )
    const d = await res.json()
    if (d.error) throw new Error(`Google TTS: ${d.error.message}`)
    // audioContent คือ base64 mp3
    const b64 = d.audioContent
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: 'audio/mpeg' })
  }

  async function runPipeline() {
    if (!topic.trim() || !gemKey) { setShowSettings(true); return }
    if (!googleTTSKey) { setShowSettings(true); alert('กรุณาใส่ Google TTS API Key ก่อน'); return }

    setPhase('running')
    setLog([])
    setScript(''); setSubs([]); setBrolls([])
    setAudioUrl(''); setAudioBlob(null); setVideoUrl(''); setCaption('')

    try {
      // 1. Script
      addLog('📝 เขียนสคริปต์ด้วย AI...')
      const sc = await gem(
        `เขียนสคริปต์วิดีโอ TikTok 45-60 วินาที เรื่อง "${topic}" ภาษาไทย
มี Hook ดึงดูด 3 วิแรก เนื้อหากระชับ CTA ท้าย
เขียนเป็นประโยคสั้นๆ ต่อเนื่อง ไม่ต้อง label ไม่ต้องมี emoji`
      )
      setScript(sc)
      addLog('✅ Script พร้อมแล้ว')

      // 2. ซับไทย + timing
      addLog('💬 สร้างซับไทยพร้อม timing...')
      const subRaw = await gem(
        `แบ่งข้อความนี้เป็นซับไตเติ้ล ประโยคละ 4-6 คำ
ตอบ JSON array เท่านั้น ห้ามมีข้อความอื่น:
[{"text":"ข้อความ","start":0,"end":3},{"text":"ข้อความ2","start":3,"end":6}]
start/end เป็นวินาทีต่อเนื่อง คำนวณตามความยาวประโยค (เฉลี่ย 2.5 วิต่อประโยค)
ข้อความ: ${sc}`
      )
      let parsedSubs: Sub[] = []
      try {
        const m = subRaw.match(/\[[\s\S]*\]/)
        if (m) parsedSubs = JSON.parse(m[0])
      } catch {}
      if (parsedSubs.length === 0) {
        // fallback
        const words = sc.replace(/\n/g, ' ').split(/\s+/).filter(Boolean)
        let t = 0
        for (let i = 0; i < words.length; i += 5) {
          const chunk = words.slice(i, i + 5).join(' ')
          parsedSubs.push({ text: chunk, start: t, end: t + 2.5 })
          t += 2.5
        }
      }
      setSubs(parsedSubs)
      addLog(`✅ ซับ ${parsedSubs.length} บรรทัดพร้อมแล้ว`)

      // 3. Google TTS
      addLog('🎙️ สร้างเสียงพากย์ด้วย Google TTS (ภาษาไทย)...')
      const ab = await googleTTS(sc)
      setAudioBlob(ab)
      setAudioUrl(URL.createObjectURL(ab))
      addLog('✅ เสียงพากย์พร้อมแล้ว')

      // 4. B-Roll
      addLog('🎬 หา B-Roll วิดีโอ...')
      const kwRaw = await gem(
        `จากสคริปต์นี้ หา 5 keyword ภาษาอังกฤษสั้นๆ สำหรับหา B-roll video portrait บน Pexels
ตอบ JSON array เท่านั้น: ["kw1","kw2","kw3","kw4","kw5"]
สคริปต์: ${sc.slice(0, 250)}`
      )
      let keywords = ['business success', 'online shopping', 'smartphone thailand', 'money', 'happy people']
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
              const file = vid.video_files?.find((f: any) => f.quality === 'sd') || vid.video_files?.[0]
              brollList.push({ query: kw, thumb: vid.image, url: file?.link || '' })
            }
          } catch {}
        }
        addLog(`✅ ได้ B-Roll ${brollList.length} คลิป`)
      } else {
        keywords.slice(0, 5).forEach(k => brollList.push({ query: k, thumb: '', url: '' }))
        addLog('⚠️ ไม่มี Pexels Key — จะใช้สีพื้นหลังแทน B-Roll')
      }
      setBrolls(brollList)

      // 5. Caption
      addLog('✍️ สร้าง Caption...')
      const cap = await gem(
        `เขียน Caption TikTok/Facebook ไวรัล เรื่อง "${topic}" ภาษาไทย
มี emoji hashtag CTA ไม่เกิน 5 บรรทัด`
      )
      setCaption(cap)
      addLog('✅ ทุกอย่างพร้อม! 🎉')

      setPhase('preview')

    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`)
      setPhase('idle')
    }
  }

  async function exportVideo() {
    if (!canvasRef.current) return
    setPhase('exporting')
    setExportProgress(0)
    addLog('🎬 กำลัง render วิดีโอ...')

    const canvas = canvasRef.current
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')!

    const totalDuration = subs.length > 0 ? subs[subs.length - 1].end + 1 : 30
    const FPS = 24
    const totalFrames = Math.ceil(totalDuration * FPS)

    // Load B-Roll images
    const bgImgs: HTMLImageElement[] = []
    for (const b of brolls) {
      if (b.thumb) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = b.thumb })
        bgImgs.push(img)
      }
    }

    // Canvas stream + audio track
    const canvasStream = canvas.captureStream(FPS)

    // Play audio + capture its track
    let audioEl: HTMLAudioElement | null = null
    if (audioBlob) {
      audioEl = new Audio(audioUrl)
      audioEl.play()
      try {
        const aCtx = new AudioContext()
        const src = aCtx.createMediaElementSource(audioEl)
        const dest = aCtx.createMediaStreamDestination()
        src.connect(dest)
        src.connect(aCtx.destination)
        dest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t))
      } catch {}
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm'

    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 4_000_000 })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      audioEl?.pause()
      const blob = new Blob(chunks, { type: 'video/webm' })
      setVideoUrl(URL.createObjectURL(blob))
      setPhase('done')
      addLog('🎉 คลิปพร้อม! กด Download ได้เลย')
    }

    recorder.start(100)

    const gradColors = [
      ['#1a0033', '#0a0a1e'],
      ['#001a33', '#0a1a0a'],
      ['#1a1a00', '#1a0000'],
      ['#001a1a', '#0a001a'],
      ['#0a1a33', '#1a0a00'],
    ]

    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / FPS
      const bgIdx = Math.min(Math.floor((t / totalDuration) * Math.max(bgImgs.length, 1)), Math.max(bgImgs.length - 1, 0))
      const subNow = subs.find(s => t >= s.start && t < s.end)

      // --- Background ---
      if (bgImgs[bgIdx]) {
        // Fill canvas maintaining aspect ratio (cover)
        const img = bgImgs[bgIdx]
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
        const w = img.naturalWidth * scale
        const h = img.naturalHeight * scale
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        // Dark vignette overlay
        const vig = ctx.createLinearGradient(0, 0, 0, canvas.height)
        vig.addColorStop(0, 'rgba(0,0,0,0.5)')
        vig.addColorStop(0.4, 'rgba(0,0,0,0.1)')
        vig.addColorStop(0.7, 'rgba(0,0,0,0.2)')
        vig.addColorStop(1, 'rgba(0,0,0,0.75)')
        ctx.fillStyle = vig
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        // Gradient fallback
        const [c1, c2] = gradColors[bgIdx % gradColors.length]
        const g = ctx.createLinearGradient(0, 0, 0, canvas.height)
        g.addColorStop(0, c1); g.addColorStop(1, c2)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // --- Top logo bar ---
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, canvas.width, 130)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 52px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('⚡ ViralFactory AI', canvas.width / 2, 85)

      // --- Topic text (top area) ---
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '38px sans-serif'
      ctx.fillText(topic.slice(0, 30), canvas.width / 2, 140)

      // --- Subtitle (bottom) ---
      if (subNow) {
        const subText = subNow.text
        ctx.font = 'bold 80px sans-serif'
        const tw = ctx.measureText(subText).width

        // Box shadow
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        const boxW = tw + 80
        const boxX = (canvas.width - boxW) / 2
        ctx.beginPath()
        ;(ctx as any).roundRect?.(boxX, 1660, boxW, 120, 20)
        ctx.fill()

        // Text
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.fillText(subText, canvas.width / 2, 1745)

        // Purple underline accent
        ctx.fillStyle = '#7C3AED'
        ctx.fillRect((canvas.width - tw) / 2, 1760, tw, 6)
      }

      // --- Progress bar ---
      const prog = t / totalDuration
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(0, canvas.height - 16, canvas.width, 16)
      const barGrad = ctx.createLinearGradient(0, 0, canvas.width * prog, 0)
      barGrad.addColorStop(0, '#7C3AED')
      barGrad.addColorStop(1, '#4F46E5')
      ctx.fillStyle = barGrad
      ctx.fillRect(0, canvas.height - 16, canvas.width * prog, 16)

      await new Promise(r => setTimeout(r, 1000 / FPS))
      setExportProgress(Math.round((frame / totalFrames) * 100))
    }

    await new Promise(r => setTimeout(r, 500))
    recorder.stop()
  }

  function downloadVideo() {
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `${topic || 'viral'}.webm`
    a.click()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
      <div className="text-purple-400 animate-pulse">⚡ กำลังโหลด...</div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
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
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition">⚙️</button>
          <button onClick={async () => { await createClient().auth.signOut(); router.push('/') }}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition">ออก</button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: '#141420', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">⚙️ Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            {[
              { label: 'Gemini API Key *', val: gemKey, set: setGemKey, ph: 'AIza...', link: 'https://aistudio.google.com/app/apikey', note: 'เขียน Script + ซับ + Caption (ฟรี)' },
              { label: 'Google TTS API Key * (เสียงพากย์)', val: googleTTSKey, set: setGoogleTTSKey, ph: 'AIza...', link: 'https://console.cloud.google.com/apis/library/texttospeech.googleapis.com', note: 'เปิด Text-to-Speech API ใน Google Cloud → ใช้ key เดียวกับ Gemini ได้เลย' },
              { label: 'Pexels API Key (B-Roll)', val: pexelsKey, set: setPexelsKey, ph: 'xxxxxx...', link: 'https://www.pexels.com/api/', note: 'วิดีโอพื้นหลัง ฟรี' },
              { label: 'Facebook Token (โพสต์)', val: fbToken, set: setFbToken, ph: 'EAAxxxxx...', link: 'https://developers.facebook.com/tools/explorer/', note: 'สำหรับโพสต์ Facebook' },
            ].map(f => (
              <div key={f.label}>
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-gray-200 font-semibold">{f.label}</label>
                  <a href={f.link} target="_blank" rel="noreferrer" className="text-purple-400 text-xs">เปิด →</a>
                </div>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 mb-1"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <p className="text-gray-600 text-xs">{f.note}</p>
              </div>
            ))}
            <div className="p-3 rounded-xl text-yellow-300 text-xs" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
              💡 <strong>Google TTS:</strong> ไปที่ console.cloud.google.com → เปิด "Cloud Text-to-Speech API" → สร้าง API Key → นำมาใส่ที่นี่ (ฟรี 1 ล้าน characters/เดือน)
            </div>
            <button onClick={saveSettings} className="w-full py-3 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)' }}>
              บันทึก
            </button>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-white font-black text-3xl mb-2">🎬 สร้างคลิปไวรัล</h1>
          <p className="text-gray-500 text-sm">AI เขียน Script → Google TTS เสียงไทย → ซับ → B-Roll → Export .webm</p>
        </div>

        {/* Input */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <div className="flex gap-3">
            <input value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && phase === 'idle' && runPipeline()}
              placeholder="หัวข้อ เช่น วิธีรวยจาก TikTok, รีวิวสินค้า..."
              disabled={phase === 'running' || phase === 'exporting'}
              className="flex-1 px-4 py-3.5 rounded-xl text-white placeholder-gray-600 focus:outline-none disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <button onClick={runPipeline} disabled={!topic.trim() || phase === 'running' || phase === 'exporting'}
              className="px-5 py-3.5 rounded-xl font-bold text-white disabled:opacity-40 whitespace-nowrap"
              style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}>
              {phase === 'running' ? '⏳ AI ทำงาน...' : '⚡ สร้างคลิป!'}
            </button>
          </div>
          {(!gemKey || !googleTTSKey) && (
            <p className="mt-2 text-yellow-400 text-xs">⚠️ ต้องใส่ Gemini Key + Google TTS Key — <button onClick={() => setShowSettings(true)} className="underline font-semibold">เปิด Settings</button></p>
          )}
        </div>

        {/* Log */}
        {log.length > 0 && (
          <div ref={logRef} className="rounded-2xl p-4 space-y-1 max-h-44 overflow-y-auto font-mono"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)', scrollbarWidth: 'thin' }}>
            {log.map((l, i) => (
              <div key={i} className="text-sm" style={{
                color: l.startsWith('✅') ? '#4ade80' : l.startsWith('❌') ? '#f87171'
                  : l.startsWith('⚠️') ? '#fbbf24' : l.startsWith('🎉') ? '#a78bfa' : '#94a3b8'
              }}>{l}</div>
            ))}
            {phase === 'running' && <div className="text-purple-400 text-sm animate-pulse">⏳ กำลังประมวลผล...</div>}
          </div>
        )}

        {/* Preview */}
        {(phase === 'preview' || phase === 'exporting' || phase === 'done') && (
          <div className="space-y-4">

            {/* Audio player */}
            {audioUrl && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-white font-bold text-sm mb-3">🎙️ เสียงพากย์ (Google TTS ภาษาไทย)</h3>
                <audio src={audioUrl} controls className="w-full" style={{ filter: 'invert(0.85) hue-rotate(200deg)' }} />
              </div>
            )}

            {/* Script */}
            {script && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between mb-3">
                  <h3 className="text-white font-bold text-sm">📝 Script</h3>
                  <button onClick={() => navigator.clipboard.writeText(script)} className="text-purple-400 text-xs">📋 คัดลอก</button>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{script}</p>
              </div>
            )}

            {/* Subs */}
            {subs.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-white font-bold text-sm mb-3">💬 ซับไทย ({subs.length} บรรทัด)</h3>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {subs.map((s, i) => (
                    <div key={i} className="flex gap-3 text-xs">
                      <span className="text-purple-400 font-mono w-16 shrink-0">{s.start}s–{s.end}s</span>
                      <span className="text-gray-300">{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B-Roll thumbs */}
            {brolls.filter(b => b.thumb).length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-white font-bold text-sm mb-3">🎬 B-Roll ({brolls.length} คลิป)</h3>
                <div className="grid grid-cols-5 gap-2">
                  {brolls.map((b, i) => (
                    <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '9/16', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {b.thumb
                        ? <img src={b.thumb} alt={b.query} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>🎬</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caption */}
            {caption && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between mb-3">
                  <h3 className="text-white font-bold text-sm">✍️ Caption</h3>
                  <button onClick={() => navigator.clipboard.writeText(caption)} className="text-purple-400 text-xs">📋 คัดลอก</button>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-line">{caption}</p>
              </div>
            )}

            {/* Export progress */}
            {phase === 'exporting' && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-purple-300 font-semibold">🎬 Rendering วิดีโอ...</span>
                  <span className="text-white font-bold">{exportProgress}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${exportProgress}%`, background: 'linear-gradient(90deg,#7C3AED,#4F46E5)' }} />
                </div>
                <p className="text-gray-500 text-xs mt-2">อย่าปิดหน้าต่าง — กำลัง render frame by frame</p>
              </div>
            )}

            {/* Video done */}
            {phase === 'done' && videoUrl && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <h3 className="text-green-300 font-bold">🎉 คลิปพร้อมแล้ว — มีเสียงพากย์ภาษาไทย!</h3>
                <video src={videoUrl} controls className="w-full rounded-xl" style={{ maxHeight: '400px', background: '#000' }} />
                <button onClick={downloadVideo}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg"
                  style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                  ⬇️ Download คลิป .webm
                </button>
              </div>
            )}

            {/* Action buttons */}
            {phase === 'preview' && (
              <div className="space-y-3">
                <button onClick={exportVideo}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg"
                  style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}>
                  🎬 Render คลิป .webm (มีเสียงพากย์)
                </button>
                <button onClick={() => { setPhase('idle'); setLog([]) }}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-400 border border-white/5 transition">
                  🔄 เริ่มใหม่
                </button>
              </div>
            )}

            {phase === 'done' && (
              <button onClick={() => { setPhase('idle'); setLog([]); setVideoUrl('') }}
                className="w-full py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-400 border border-white/5 transition">
                🔄 สร้างคลิปใหม่
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
