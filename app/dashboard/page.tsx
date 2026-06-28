'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import type { User } from '@supabase/supabase-js'

const features = [
  { icon: '📈', label: 'Trend Finder', desc: 'วิเคราะห์เทรนด์ไวรัล', href: '/dashboard/trends' },
  { icon: '📝', label: 'Script AI', desc: 'เขียนสคริปต์ด้วย AI', href: '/dashboard/script' },
  { icon: '🎬', label: 'Storyboard', desc: 'สร้าง Storyboard อัตโนมัติ', href: '/dashboard/storyboard' },
  { icon: '🎭', label: 'Characters', desc: 'สร้างตัวละคร AI', href: '/dashboard/characters' },
  { icon: '🎥', label: 'Video Gen', desc: 'สร้างวิดีโอด้วย AI', href: '/dashboard/video' },
  { icon: '🖼️', label: 'Thumbnail', desc: 'ออกแบบ Thumbnail', href: '/dashboard/thumbnail' },
  { icon: '📅', label: 'Calendar', desc: 'วางแผนโพสต์', href: '/dashboard/calendar' },
  { icon: '📊', label: 'Analytics', desc: 'วิเคราะห์ผลลัพธ์', href: '/dashboard/analytics' },
  { icon: '🏭', label: 'Factory', desc: 'ผลิตคอนเทนต์จำนวนมาก', href: '/dashboard/factory' },
  { icon: '🤝', label: 'Affiliate', desc: 'จัดการ Affiliate Links', href: '/dashboard/affiliate' },
  { icon: '✂️', label: 'Video Editor', desc: 'ตัดต่อวิดีโอ', href: '/dashboard/editor' },
  { icon: '🚀', label: 'Auto-Post', desc: 'โพสต์ Facebook อัตโนมัติ', href: '/dashboard/autopost' },
]

export default function DashboardPage() {
  const router = useRouter()
  const { project, setProject, projects, loadProjects } = useStore()
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
        loadProjects()
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
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <span className="font-bold text-white text-xl">ViralFactory AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings"
            className="px-4 py-2 rounded-lg text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition">
            ⚙️ Settings
          </Link>
          <span className="text-gray-500 text-sm hidden sm:block">{user?.email}</span>
          <button onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition">
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">สวัสดี! 👋</h2>
          <p className="text-gray-400">เลือกเครื่องมือที่ต้องการใช้งาน</p>
        </div>

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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {features.map(f => (
            <Link key={f.label} href={f.href}
              className="p-5 rounded-xl text-left transition-all hover:scale-105 hover:border-purple-500/50 block"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-white text-sm mb-1">{f.label}</div>
              <div className="text-gray-500 text-xs">{f.desc}</div>
            </Link>
          ))}
        </div>

        {/* Current Project */}
        {project.topic && (
          <div className="mt-8 p-5 rounded-xl" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.3)'}}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-300 font-semibold">⚡ Project ปัจจุบัน</span>
              <button onClick={() => setProject({ topic:'', script:'', storyboard:[], characters:[], title:'' })}
                className="text-xs text-gray-500 hover:text-gray-300">เริ่มใหม่</button>
            </div>
            <p className="text-white font-bold">{project.title || project.topic}</p>
            <div className="flex gap-3 mt-3 text-xs">
              {project.script && <span className="text-green-400">✅ Script</span>}
              {project.storyboard?.length > 0 && <span className="text-green-400">✅ Storyboard</span>}
              {project.characters?.length > 0 && <span className="text-green-400">✅ Characters</span>}
            </div>
          </div>
        )}

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="mt-6">
            <h3 className="text-white font-semibold mb-3">📁 Projects ล่าสุด</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {projects.slice(0,3).map((p: any) => (
                <button key={p.id} onClick={() => setProject(p)}
                  className="p-4 rounded-xl text-left hover:border-purple-500/50 transition"
                  style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <p className="text-white font-semibold text-sm truncate">{p.title}</p>
                  <p className="text-gray-500 text-xs mt-1">{new Date(p.updated_at).toLocaleDateString('th-TH')}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-5 rounded-xl" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.3)'}}>
          <p className="text-purple-300 text-sm">
            💡 ใส่ API Keys ในหน้า <Link href="/dashboard/settings" className="underline">Settings</Link> เพื่อเริ่มใช้งาน AI features ครบทุกฟีเจอร์
          </p>
        </div>
      </main>
    </div>
  )
}
