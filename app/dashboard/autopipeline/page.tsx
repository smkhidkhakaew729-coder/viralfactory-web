'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'

const STEPS = [
  { id: 'trend', label: '📈 วิเคราะห์เทรนด์', desc: 'หาแนวทางที่ดีที่สุด' },
  { id: 'script', label: '📝 เขียนสคริปต์', desc: 'สร้าง Hook + Content + CTA' },
  { id: 'storyboard', label: '🎬 สร้าง Storyboard', desc: 'แบ่งฉากอัตโนมัติ' },
  { id: 'characters', label: '🎭 สร้างตัวละคร', desc: 'ออกแบบตัวละครหลัก' },
  { id: 'caption', label: '✍️ เขียน Caption', desc: 'Caption + Hashtag พร้อมโพสต์' },
  { id: 'save', label: '💾 บันทึกลง Cloud', desc: 'เก็บข้อมูลใน Supabase' },
]

type StepStatus = 'pending' | 'running' | 'done' | 'error'

export default function AutoPipelinePage() {
  const { setProject, saveProject } = useStore()
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState('60')
  const [style, setStyle] = useState('ดราม่า')
  const [running, setRunning] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({})
  const [results, setResults] = useState<Record<string, any>>({})
  const [error, setError] = useState('')

  function setStep(id: string, status: StepStatus, result?: any) {
    setStatuses(p => ({ ...p, [id]: status }))
    if (result !== undefined) setResults(p => ({ ...p, [id]: result }))
  }

  async function gem(prompt: string) {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) throw new Error('ไม่มี Gemini API Key')
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  function parseJSON(text: string) {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    const obj = text.match(/\{[\s\S]*\}/)
    if (obj) return JSON.parse(obj[0])
    return text
  }

  async function runPipeline() {
    const key = localStorage.getItem('vf_gemini_key')
    if (!key) { setError('กรุณาใส่ Gemini API Key ในหน้า Settings ก่อน'); return }
    if (!topic) { setError('กรุณาใส่หัวข้อก่อน'); return }

    setRunning(true); setError('')
    setStatuses({})
    setResults({})

    let script = '', storyboard: any[] = [], characters: any[] = [], caption = '', trend = ''

    try {
      // Step 1: Trend
      setStep('trend', 'running')
      trend = await gem(`วิเคราะห์ว่าเรื่อง "${topic}" ควรนำเสนอในแนวไหนให้ไวรัลที่สุดบน TikTok/Facebook ไทย ตอบสั้นๆ 2-3 ประโยค`)
      setStep('trend', 'done', trend)

      // Step 2: Script
      setStep('script', 'running')
      script = await gem(`เขียนสคริปต์วิดีโอสั้น ${duration} วินาที สไตล์${style} เรื่อง "${topic}" สำหรับ TikTok/Facebook ภาษาไทย มี Hook 3 วิแรก เนื้อหา CTA ท้าย แบ่งเป็น [HOOK] [CONTENT] [CTA]`)
      setStep('script', 'done', script)
      setProject({ topic, script, title: topic })

      // Step 3: Storyboard
      setStep('storyboard', 'running')
      const sbText = await gem(`แบ่งสคริปต์นี้เป็น Storyboard 5 ฉาก ตอบเป็น JSON array: [{"scene":1,"duration":"3s","visual":"ภาพ","dialogue":"บทพูด","camera":"มุมกล้อง","emotion":"อารมณ์"}] สคริปต์: ${script}`)
      storyboard = parseJSON(sbText)
      setStep('storyboard', 'done', storyboard)
      setProject({ storyboard })

      // Step 4: Characters
      setStep('characters', 'running')
      const chText = await gem(`สร้างตัวละคร 2-3 ตัวสำหรับเรื่อง "${topic}" ตอบเป็น JSON array: [{"name":"ชื่อ","role":"บทบาท","age":"อายุ","personality":"นิสัย","emoji":"🎭"}]`)
      characters = parseJSON(chText)
      setStep('characters', 'done', characters)
      setProject({ characters })

      // Step 5: Caption
      setStep('caption', 'running')
      caption = await gem(`เขียน Caption Facebook/TikTok ไวรัล ภาษาไทย สำหรับวิดีโอเรื่อง "${topic}" มี emoji และ hashtag พร้อมโพสต์`)
      setStep('caption', 'done', caption)

      // Step 6: Save
      setStep('save', 'running')
      await saveProject()
      setStep('save', 'done', 'บันทึกสำเร็จ')

    } catch (e: any) {
      setError(e.message || 'เกิดข้อผิดพลาด')
      Object.keys(statuses).forEach(k => {
        if (statuses[k] === 'running') setStep(k, 'error')
      })
    }

    setRunning(false)
  }

  const icons: Record<StepStatus, string> = {
    pending: '⬜',
    running: '⏳',
    done: '✅',
    error: '❌'
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">⚡ Auto Pipeline</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Input */}
        <div className="p-6 rounded-xl space-y-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <h3 className="font-bold text-white text-lg">🚀 กดปุ่มเดียว — AI ทำทุกอย่างเอง</h3>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="หัวข้อ เช่น แม่ค้าออนไลน์ที่กลายเป็นเศรษฐี..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          <div className="grid grid-cols-2 gap-3">
            <select value={duration} onChange={e => setDuration(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
              <option value="30">30 วินาที</option>
              <option value="60">60 วินาที</option>
              <option value="90">90 วินาที</option>
            </select>
            <select value={style} onChange={e => setStyle(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
              {['ดราม่า','ตลก','สร้างแรงบันดาลใจ','ให้ความรู้','รีวิว'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {error && <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300 text-sm">{error}</div>}
          <button onClick={runPipeline} disabled={running}
            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-60"
            style={{background: running ? 'rgba(124,58,237,0.5)' : 'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
            {running ? '⏳ กำลังรัน Pipeline...' : '⚡ รัน Auto Pipeline'}
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map(step => {
            const status = statuses[step.id] || 'pending'
            const result = results[step.id]
            return (
              <div key={step.id} className="p-4 rounded-xl transition-all"
                style={{
                  background: status === 'done' ? 'rgba(16,185,129,0.08)' : status === 'running' ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${status === 'done' ? 'rgba(16,185,129,0.3)' : status === 'running' ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`
                }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icons[status]}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">{step.label}</div>
                    <div className="text-gray-500 text-xs">{step.desc}</div>
                  </div>
                  {status === 'running' && <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
                </div>
                {status === 'done' && result && (
                  <div className="mt-3 text-xs text-gray-400 bg-black/20 rounded-lg p-3 max-h-24 overflow-hidden">
                    {typeof result === 'string' ? result.slice(0, 200) : JSON.stringify(result).slice(0, 200)}
                    {(typeof result === 'string' ? result.length : JSON.stringify(result).length) > 200 && '...'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Result Summary */}
        {statuses['save'] === 'done' && (
          <div className="p-6 rounded-xl text-center" style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)'}}>
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-white font-bold text-xl mb-2">Pipeline เสร็จสมบูรณ์!</h3>
            <p className="text-gray-400 text-sm mb-4">บันทึกทุกอย่างลง Supabase แล้ว</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/dashboard/script" className="px-4 py-2 rounded-lg text-sm border border-white/10 text-gray-300 hover:bg-white/5">ดู Script</Link>
              <Link href="/dashboard/storyboard" className="px-4 py-2 rounded-lg text-sm border border-white/10 text-gray-300 hover:bg-white/5">ดู Storyboard</Link>
              <Link href="/dashboard/autopost" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>🚀 โพสต์เลย</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
