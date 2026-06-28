'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const features = [
  { icon: '📈', label: 'Trend Finder', desc: 'วิเคราะห์เทรนด์ไวรัล' },
  { icon: '📝', label: 'Script AI', desc: 'เขียนสคริปต์ด้วย AI' },
  { icon: '🎬', label: 'Storyboard', desc: 'สร้าง Storyboard อัตโนมัติ' },
  { icon: '🎭', label: 'Characters', desc: 'สร้างตัวละคร AI' },
  { icon: '🎥', label: 'Video Gen', desc: 'สร้างวิดีโอด้วย AI' },
  { icon: '🖼️', label: 'Thumbnail', desc: 'ออกแบบ Thumbnail' },
  { icon: '📅', label: 'Calendar', desc: 'วางแผนโพสต์' },
  { icon: '📊', label: 'Analytics', desc: 'วิเคราะห์ผลลัพธ์' },
  { icon: '🏭', label: 'Factory', desc: 'ผลิตคอนเทนต์จำนวนมาก' },
  { icon: '🤝', label: 'Affiliate', desc: 'จัดการ Affiliate Links' },
  { icon: '✂️', label: 'Video Editor', desc: 'ตัดต่อวิดีโอ' },
  { icon: '🚀', label: 'Auto-Post', desc: 'โพสต์ Facebook อัตโนมัติ' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
        setLoading(false)
      }
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#0f0f1a'}}>
        <div className="text-purple-400 text-lg animate-pulse">⚡ กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <span className="font-bold text-white text-xl">ViralFactory AI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm hidden sm:block">{user?.email}</span>
          <button onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition">
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">สวัสดี! 👋</h2>
          <p className="text-gray-400">เลือกเครื่องมือที่ต้องการใช้งาน</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'วิดีโอที่สร้าง', value: '0' },
            { label: 'สคริปต์', value: '0' },
            { label: 'โพสต์อัตโนมัติ', value: '0' },
            { label: 'Credits', value: '100' },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-xl text-center" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {features.map(f => (
            <button key={f.label}
              className="p-5 rounded-xl text-left transition-all hover:scale-105 hover:border-purple-500/50 group"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-white text-sm mb-1">{f.label}</div>
              <div className="text-gray-500 text-xs">{f.desc}</div>
            </button>
          ))}
        </div>

        {/* Notice */}
        <div className="mt-10 p-5 rounded-xl" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.3)'}}>
          <p className="text-purple-300 text-sm">
            💡 <strong>เวอร์ชัน Web (Beta)</strong> — ใส่ API Keys ในหน้า Settings เพื่อเริ่มใช้งาน AI features ครบทุกฟีเจอร์
          </p>
        </div>
      </main>
    </div>
  )
}
