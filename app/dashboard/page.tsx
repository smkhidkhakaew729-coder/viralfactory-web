'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import type { User } from '@supabase/supabase-js'

const navItems = [
  { icon: '🏠', label: 'Dashboard', href: '/dashboard' },
  { icon: '⚡', label: 'Auto Pipeline', href: '/dashboard/autopipeline', hot: true },
  { icon: '🎬', label: 'Studio', href: '/dashboard/studio', hot: true },
  { icon: '📈', label: 'Trend Finder', href: '/dashboard/trends' },
  { icon: '📝', label: 'Script AI', href: '/dashboard/script' },
  { icon: '🎭', label: 'Storyboard', href: '/dashboard/storyboard' },
  { icon: '👤', label: 'Characters', href: '/dashboard/characters' },
  { icon: '🖼️', label: 'Thumbnail', href: '/dashboard/thumbnail' },
  { icon: '🏭', label: 'Factory', href: '/dashboard/factory' },
  { icon: '📅', label: 'Calendar', href: '/dashboard/calendar' },
  { icon: '🤝', label: 'Affiliate', href: '/dashboard/affiliate' },
  { icon: '🚀', label: 'Auto-Post', href: '/dashboard/autopost' },
  { icon: '📊', label: 'Analytics', href: '/dashboard/analytics' },
  { icon: '⚙️', label: 'Settings', href: '/dashboard/settings' },
]

const quickTools = [
  { icon: '⚡', label: 'Auto Pipeline', desc: 'กดเดียว AI ทำทุกอย่างเอง', href: '/dashboard/autopipeline', grad: 'linear-gradient(135deg,#7C3AED,#4F46E5)', glow: 'rgba(124,58,237,0.35)' },
  { icon: '🎬', label: 'Studio', desc: 'Script→เสียง→ซับ→B-Roll→โพสต์', href: '/dashboard/studio', grad: 'linear-gradient(135deg,#0ea5e9,#6366f1)', glow: 'rgba(14,165,233,0.35)' },
  { icon: '📝', label: 'Script AI', desc: 'เขียนสคริปต์ไวรัลด้วย AI', href: '/dashboard/script', grad: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.25)' },
  { icon: '🚀', label: 'Auto-Post', desc: 'โพสต์ Facebook ทันที', href: '/dashboard/autopost', grad: 'linear-gradient(135deg,#1877F2,#0a5dc2)', glow: 'rgba(24,119,242,0.25)' },
]

const allTools = [
  { icon: '📈', label: 'Trend Finder', desc: 'วิเคราะห์เทรนด์ไวรัล', href: '/dashboard/trends' },
  { icon: '📝', label: 'Script AI', desc: 'เขียนสคริปต์ด้วย AI', href: '/dashboard/script' },
  { icon: '🎭', label: 'Storyboard', desc: 'สร้าง Storyboard อัตโนมัติ', href: '/dashboard/storyboard' },
  { icon: '👤', label: 'Characters', desc: 'สร้างตัวละคร AI', href: '/dashboard/characters' },
  { icon: '🎥', label: 'Video Gen', desc: 'สร้างวิดีโอด้วย AI', href: '/dashboard/video' },
  { icon: '🖼️', label: 'Thumbnail', desc: 'ออกแบบ Thumbnail', href: '/dashboard/thumbnail' },
  { icon: '📅', label: 'Calendar', desc: 'วางแผนโพสต์', href: '/dashboard/calendar' },
  { icon: '📊', label: 'Analytics', desc: 'วิเคราะห์ผลลัพธ์', href: '/dashboard/analytics' },
  { icon: '🏭', label: 'Factory', desc: 'ผลิตคอนเทนต์จำนวนมาก', href: '/dashboard/factory' },
  { icon: '🤝', label: 'Affiliate', desc: 'จัดการ Affiliate Links', href: '/dashboard/affiliate' },
  { icon: '✂️', label: 'Video Editor', desc: 'ตัดต่อวิดีโอ', href: '/dashboard/editor' },
  { icon: '🚀', label: 'Auto-Post', desc: 'โพสต์อัตโนมัติ', href: '/dashboard/autopost' },
]

export default function DashboardPage() {
  const router = useRouter()
  const { project, setProject, projects, loadProjects } = useStore()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else { setUser(data.user); setLoading(false); loadProjects() }
    })
  }, [router])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/'); router.refresh()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#09090f'}}>
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">⚡</div>
        <div className="text-purple-400 text-sm">กำลังโหลด...</div>
      </div>
    </div>
  )

  const emailName = user?.email?.split('@')[0] || 'Creator'

  return (
    <div className="min-h-screen flex" style={{background:'#09090f'}}>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{background:'#0d0d18',borderRight:'1px solid rgba(255,255,255,0.06)'}}>

        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
              style={{background:'linear-gradient(135deg,#7C3AED,#4F46E5)'}}>V</div>
            <span className="font-black text-white text-base tracking-tight">ViralFactory</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/6 group"
              style={{color:'rgba(255,255,255,0.55)'}}
              onClick={() => setSidebarOpen(false)}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="group-hover:text-white transition-colors">{item.label}</span>
              {item.hot && (
                <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-md"
                  style={{background:'rgba(124,58,237,0.25)',color:'#a78bfa'}}>HOT</span>
              )}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{background:'rgba(255,255,255,0.04)'}}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{background:'linear-gradient(135deg,#7C3AED,#4F46E5)'}}>
              {emailName[0].toUpperCase()}
            </div>
            <span className="text-gray-400 text-xs truncate flex-1">{user?.email}</span>
          </div>
          <button onClick={handleLogout}
            className="w-full mt-2 py-2 text-xs text-gray-600 hover:text-gray-400 transition">
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5"
          style={{background:'rgba(9,9,15,0.85)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-400 hover:text-white p-1">
              ☰
            </button>
            <div>
              <h1 className="text-white font-bold text-base">สวัสดี, {emailName} 👋</h1>
              <p className="text-gray-600 text-xs">วันนี้จะสร้างคอนเทนต์เรื่องอะไร?</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/autopipeline"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
              ⚡ Auto Pipeline
            </Link>
            <Link href="/dashboard/settings"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition text-lg">⚙️</Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 py-6 max-w-5xl w-full mx-auto">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'คลิปที่สร้าง', value: projects.length.toString(), icon: '🎬' },
              { label: 'สคริปต์', value: projects.filter((p:any) => p.script).length.toString(), icon: '📝' },
              { label: 'โพสต์อัตโนมัติ', value: '0', icon: '🚀' },
              { label: 'Credits', value: '∞', icon: '⚡' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl"
                style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quick Tools */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">🔥 เครื่องมือหลัก</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickTools.map(t => (
                <Link key={t.href} href={t.href}
                  className="relative flex items-center gap-4 p-5 rounded-2xl overflow-hidden transition-all hover:scale-[1.02] group"
                  style={{background:t.grad,boxShadow:`0 4px 24px ${t.glow}`}}>
                  <span className="text-4xl">{t.icon}</span>
                  <div>
                    <div className="font-bold text-white text-base">{t.label}</div>
                    <div className="text-white/70 text-xs mt-0.5">{t.desc}</div>
                  </div>
                  <span className="ml-auto text-white/60 group-hover:text-white text-xl transition-transform group-hover:translate-x-1">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* All Tools */}
          <div className="mb-8">
            <h2 className="text-white font-bold text-base mb-4">🛠️ เครื่องมือทั้งหมด</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allTools.map(t => (
                <Link key={t.href} href={t.href}
                  className="p-4 rounded-2xl flex flex-col gap-2 transition-all hover:border-purple-500/40 hover:bg-white/6 group"
                  style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <span className="text-2xl">{t.icon}</span>
                  <div className="font-semibold text-white text-sm group-hover:text-purple-300 transition-colors">{t.label}</div>
                  <div className="text-gray-600 text-xs leading-tight">{t.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Current Project */}
          {project.topic && (
            <div className="mb-5 p-5 rounded-2xl" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)'}}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-purple-300 font-semibold text-sm">⚡ Project ปัจจุบัน</span>
                <button onClick={() => setProject({ topic:'', script:'', storyboard:[], characters:[], title:'' })}
                  className="text-xs text-gray-600 hover:text-gray-400 transition">เริ่มใหม่</button>
              </div>
              <p className="text-white font-bold">{project.title || project.topic}</p>
              <div className="flex gap-3 mt-3 flex-wrap">
                {project.script && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">✅ Script</span>}
                {project.storyboard?.length > 0 && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">✅ Storyboard</span>}
                {project.characters?.length > 0 && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">✅ Characters</span>}
              </div>
              <div className="flex gap-2 mt-4">
                <Link href="/dashboard/script"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{background:'rgba(124,58,237,0.4)'}}>ต่อ Script →</Link>
                <Link href="/dashboard/studio"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{background:'rgba(255,255,255,0.08)'}}>เปิด Studio →</Link>
              </div>
            </div>
          )}

          {/* Recent Projects */}
          {projects.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-bold text-sm mb-3">📁 Projects ล่าสุด</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {projects.slice(0,3).map((p: any) => (
                  <button key={p.id} onClick={() => setProject(p)}
                    className="p-4 rounded-2xl text-left hover:border-purple-500/40 transition group"
                    style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm mb-3"
                      style={{background:'rgba(124,58,237,0.2)'}}>🎬</div>
                    <p className="text-white font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">{p.title}</p>
                    <p className="text-gray-600 text-xs mt-1">{new Date(p.updated_at).toLocaleDateString('th-TH')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Setup hint */}
          <div className="p-4 rounded-2xl flex items-center gap-3"
            style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)'}}>
            <span className="text-2xl">💡</span>
            <p className="text-purple-300 text-sm">
              ใส่ Gemini API Key ใน{' '}
              <Link href="/dashboard/settings" className="underline font-semibold hover:text-white">Settings</Link>
              {' '}เพื่อเปิดใช้ AI ครบทุกฟีเจอร์
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
