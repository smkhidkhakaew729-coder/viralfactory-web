'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'

type Step = 'script' | 'voice' | 'subtitle' | 'broll' | 'preview'

interface SubLine {
  text: string
  start: number
  end: number
}

interface BRoll {
  query: string
  url: string
  thumb: string
  duration: number
}

export default function StudioPage() {
  const { project, setProject } = useStore()

  // Step state
  const [step, setStep] = useState<Step>('script')

  // Script
  const [script, setScript] = useState(project.script || '')
  const [topic, setTopic] = useState(project.topic || '')
  const [scriptLoading, setScriptLoading] = useState(false)

  // Voice
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [pitch, setPitch] = useState(1)

  // Subtitle
  const [subLines, setSubLines] = useState<SubLine[]>([])
  const [subLoading, setSubLoading] = useState(false)

  // B-roll
  const [brolls, setBrolls] = useState<BRoll[]>([])
  const [brollLoading, setBrollLoading] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    function loadVoices() {
      const v = speechSynthesis.getVoices().filter(v => v.lang.startsWith('th') || v.lang.startsWith('en'))
      setVoices(v)
      const th = v.find(v => v.lang.startsWith('th'))
      setVoice(th || v[0] || null)
    }
    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  // --- Step 1: Script ---
  async function generateScript() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings ก่อน'); return }
    if (!topic) { setError('กรุณาใส่หัวข้อก่อน'); return }
    setScriptLoading(true); setError('')
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `เขียนสคริปต์วิดีโอสั้น 60 วินาที เรื่อง "${topic}" ภาษาไทย สำหรับ TikTok/Reels แนวตั้ง มี Hook ดึงดูด เนื้อหา และ CTA ท้าย เขียนเป็นประโยคสั้นๆ เหมาะพากย์เสียง ไม่ต้องมี [HOOK] [CONTENT] label แค่เนื้อหาล้วนๆ` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      setScript(text)
      setProject({ script: text, topic })
    } catch { setError('เกิดข้อผิดพลาด') }
    setScriptLoading(false)
  }

  // --- Step 2: Voice ---
  function previewVoice() {
    speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(script.slice(0, 100))
    if (voice) utt.voice = voice
    utt.rate = speed
    utt.pitch = pitch
    utt.lang = voice?.lang || 'th-TH'
    speechSynthesis.speak(utt)
    setSpeaking(true)
    utt.onend = () => setSpeaking(false)
  }

  function stopVoice() {
    speechSynthesis.cancel()
    setSpeaking(false)
  }

  // --- Step 3: Subtitle ---
  async function generateSubtitles() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ก่อน'); return }
    setSubLoading(true); setError('')
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `แบ่งข้อความนี้เป็นซับไตเติ้ล ประโยคละ 5-8 คำ ตอบเป็น JSON array: [{"text":"ข้อความ","start":0,"end":3}] (start/end เป็นวินาที ต่อเนื่องกัน) ข้อความ: ${script}` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const match = text.match(/\[[\s\S]*\]/)
      if (match) setSubLines(JSON.parse(match[0]))
      else setError('ไม่สามารถสร้างซับได้')
    } catch { setError('เกิดข้อผิดพลาด') }
    setSubLoading(false)
  }

  // --- Step 4: B-roll ---
  async function fetchBRoll() {
    const pexelsKey = localStorage.getItem('vf_pexels_key')
    const gemKey = localStorage.getItem('vf_gemini_key')
    if (!gemKey) { setError('กรุณาใส่ Gemini API Key ก่อน'); return }
    setBrollLoading(true); setError('')
    try {
      // หา keywords
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `จากสคริปต์นี้ หา 4 คำ keyword ภาษาอังกฤษสำหรับหา B-roll video บน Pexels ตอบเป็น JSON array of strings: ["keyword1","keyword2","keyword3","keyword4"] สคริปต์: ${script.slice(0,300)}` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const match = text.match(/\[[\s\S]*?\]/)
      const keywords: string[] = match ? JSON.parse(match[0]) : ['business','success','thailand','online']

      if (pexelsKey) {
        const results: BRoll[] = []
        for (const kw of keywords.slice(0,4)) {
          try {
            const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(kw)}&per_page=1&orientation=portrait`, {
              headers: { Authorization: pexelsKey }
            })
            const d = await r.json()
            const vid = d.videos?.[0]
            if (vid) {
              results.push({
                query: kw,
                url: vid.video_files?.find((f: any) => f.quality === 'sd')?.link || vid.video_files?.[0]?.link || '',
                thumb: vid.image,
                duration: vid.duration
              })
            }
          } catch {}
        }
        setBrolls(results)
      } else {
        // ไม่มี Pexels key แสดง keywords แทน
        setBrolls(keywords.map((k, i) => ({ query: k, url: '', thumb: '', duration: 5 })))
        setError('ไม่มี Pexels API Key — แสดงเฉพาะ keywords ค้นหาเอง')
      }
    } catch { setError('เกิดข้อผิดพลาด') }
    setBrollLoading(false)
  }

  const steps: { id: Step; label: string; icon: string }[] = [
    { id: 'script', label: 'สคริปต์', icon: '📝' },
    { id: 'voice', label: 'เสียงพากย์', icon: '🎙️' },
    { id: 'subtitle', label: 'ซับไทย', icon: '💬' },
    { id: 'broll', label: 'B-Roll', icon: '🎬' },
    { id: 'preview', label: 'Preview', icon: '▶️' },
  ]

  const stepIndex = steps.findIndex(s => s.id === step)

  function canNext() {
    if (step === 'script') return script.length > 0
    if (step === 'voice') return true
    if (step === 'subtitle') return subLines.length > 0
    if (step === 'broll') return true
    return false
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">🎬 Studio</span>
        <span className="text-xs text-gray-500 ml-1">มีสคริปต์ 1 ชุด ได้คลิปพร้อมโพสต์</span>
      </header>

      {/* Step bar */}
      <div className="border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button onClick={() => i <= stepIndex + 1 && setStep(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${step === s.id ? 'text-white' : i < stepIndex ? 'text-green-400' : 'text-gray-500'}`}
                style={step === s.id ? {background:'rgba(124,58,237,0.3)',border:'1px solid rgba(124,58,237,0.5)'} : {}}>
                <span>{i < stepIndex ? '✅' : s.icon}</span>
                <span className="hidden sm:block">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className="flex-1 h-px" style={{background: i < stepIndex ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {error && <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300 text-sm">{error}</div>}

        {/* STEP 1: Script */}
        {step === 'script' && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-xl">📝 สคริปต์</h2>
            <div className="flex gap-3">
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="หัวข้อ เช่น แม่ค้าออนไลน์รวยจาก TikTok..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              <button onClick={generateScript} disabled={scriptLoading}
                className="px-5 py-3 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap"
                style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
                {scriptLoading ? '⏳' : '✨ AI เขียน'}
              </button>
            </div>
            <textarea value={script} onChange={e => setScript(e.target.value)} rows={12}
              placeholder="พิมพ์หรือให้ AI เขียนสคริปต์..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none text-sm leading-relaxed" />
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{script.length} ตัวอักษร • ประมาณ {Math.ceil(script.length / 5)} วินาที</span>
            </div>
          </div>
        )}

        {/* STEP 2: Voice */}
        {step === 'voice' && (
          <div className="space-y-5">
            <h2 className="text-white font-bold text-xl">🎙️ เสียงพากย์</h2>
            <div className="p-5 rounded-xl space-y-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div>
                <label className="block text-sm text-gray-400 mb-2">เสียง</label>
                <select value={voice?.name || ''} onChange={e => setVoice(voices.find(v => v.name === e.target.value) || null)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                  {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">ความเร็ว: {speed}x</label>
                  <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e => setSpeed(Number(e.target.value))}
                    className="w-full accent-purple-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">ระดับเสียง: {pitch}</label>
                  <input type="range" min="0.5" max="2" step="0.1" value={pitch} onChange={e => setPitch(Number(e.target.value))}
                    className="w-full accent-purple-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={previewVoice} disabled={speaking}
                  className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                  style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
                  {speaking ? '🔊 กำลังพูด...' : '▶️ ทดสอบเสียง'}
                </button>
                {speaking && <button onClick={stopVoice} className="px-4 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5">⏹️ หยุด</button>}
              </div>
            </div>
            <div className="p-4 rounded-xl" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.2)'}}>
              <p className="text-purple-300 text-sm">💡 ใช้ Browser TTS (ฟรี) — สำหรับเสียงระดับโปร ใช้ ElevenLabs หรือ Google TTS API</p>
            </div>
          </div>
        )}

        {/* STEP 3: Subtitle */}
        {step === 'subtitle' && (
          <div className="space-y-5">
            <h2 className="text-white font-bold text-xl">💬 ซับไทย</h2>
            <button onClick={generateSubtitles} disabled={subLoading}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
              {subLoading ? '⏳ กำลังสร้างซับ...' : '💬 สร้างซับไทยอัตโนมัติ'}
            </button>
            {subLines.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subLines.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <span className="text-purple-400 text-xs w-16 shrink-0">{s.start}s – {s.end}s</span>
                    <input value={s.text} onChange={e => {
                      const updated = [...subLines]
                      updated[i] = { ...updated[i], text: e.target.value }
                      setSubLines(updated)
                    }} className="flex-1 bg-transparent text-white text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: B-Roll */}
        {step === 'broll' && (
          <div className="space-y-5">
            <h2 className="text-white font-bold text-xl">🎬 B-Roll Videos</h2>
            <button onClick={fetchBRoll} disabled={brollLoading}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
              {brollLoading ? '⏳ กำลังหา B-Roll...' : '🎬 หา B-Roll อัตโนมัติ'}
            </button>
            <div className="grid grid-cols-2 gap-4">
              {brolls.map((b, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
                  {b.thumb ? (
                    <img src={b.thumb} alt={b.query} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center" style={{background:'rgba(255,255,255,0.04)'}}>
                      <span className="text-gray-500 text-sm">🔍 {b.query}</span>
                    </div>
                  )}
                  <div className="p-3" style={{background:'rgba(255,255,255,0.04)'}}>
                    <p className="text-white text-sm font-semibold">{b.query}</p>
                    {b.url && <a href={b.url} target="_blank" rel="noreferrer" className="text-purple-400 text-xs hover:text-purple-300">⬇️ ดาวน์โหลด</a>}
                  </div>
                </div>
              ))}
            </div>
            {!localStorage.getItem('vf_pexels_key') && brolls.length === 0 && (
              <div className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <p className="text-gray-400 text-sm">💡 ใส่ Pexels API Key ในหน้า Settings เพื่อดึง B-Roll อัตโนมัติ (ฟรี)</p>
                <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" className="text-purple-400 text-xs hover:text-purple-300">รับ Pexels API Key ฟรี →</a>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Preview */}
        {step === 'preview' && (
          <div className="space-y-5">
            <h2 className="text-white font-bold text-xl">▶️ Preview & Export</h2>
            {/* Phone mockup preview */}
            <div className="flex justify-center">
              <div className="relative w-48 rounded-3xl overflow-hidden" style={{aspectRatio:'9/16',background:'#000',border:'3px solid rgba(255,255,255,0.2)'}}>
                <div className="absolute inset-0 flex flex-col justify-end p-3">
                  {/* Subtitle preview */}
                  {subLines.length > 0 && (
                    <div className="bg-black/70 rounded-lg px-3 py-2 mb-2 text-center">
                      <p className="text-white text-xs font-bold">{subLines[0]?.text}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs">⚡</div>
                    <p className="text-white text-xs font-semibold">{topic || 'ViralFactory AI'}</p>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gray-600 text-xs text-center px-4">
                    {brolls[0]?.thumb ? <img src={brolls[0].thumb} className="w-full h-full object-cover absolute inset-0" alt="" /> : '🎬 B-Roll จะปรากฏที่นี่'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <h3 className="text-white font-semibold mb-2 text-sm">สรุปโปรเจค</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">หัวข้อ</span><span className="text-white">{topic}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">สคริปต์</span><span className="text-green-400">{script.length > 0 ? '✅' : '❌'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ซับไทย</span><span className="text-green-400">{subLines.length > 0 ? `✅ ${subLines.length} บรรทัด` : '❌'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">B-Roll</span><span className="text-green-400">{brolls.length > 0 ? `✅ ${brolls.length} คลิป` : '❌'}</span></div>
                </div>
              </div>

              <button onClick={() => {
                const text = `${script}\n\n---ซับไทย---\n${subLines.map(s => `[${s.start}s] ${s.text}`).join('\n')}`
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `${topic || 'script'}.txt`; a.click()
              }}
                className="w-full py-3 rounded-xl font-semibold text-white border border-white/10 hover:bg-white/5">
                ⬇️ ดาวน์โหลด Script + ซับ (.txt)
              </button>

              <Link href="/dashboard/autopost"
                className="w-full py-3 rounded-xl font-semibold text-white text-center block"
                style={{background:'linear-gradient(90deg,#1877F2,#0a5dc2)'}}>
                📘 โพสต์ Facebook เลย
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-white/10">
          <button onClick={() => setStep(steps[stepIndex - 1].id)} disabled={stepIndex === 0}
            className="px-6 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-30">
            ← ย้อนกลับ
          </button>
          {stepIndex < steps.length - 1 && (
            <button onClick={() => setStep(steps[stepIndex + 1].id)} disabled={!canNext()}
              className="px-6 py-3 rounded-xl font-semibold text-white disabled:opacity-40"
              style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
              ถัดไป →
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
