'use client'
import Link from 'next/link'

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">📊 Analytics</span>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label:'วิดีโอทั้งหมด', value:'0', icon:'🎥' },
            { label:'สคริปต์', value:'0', icon:'📝' },
            { label:'โพสต์', value:'0', icon:'📘' },
            { label:'Credits', value:'100', icon:'⚡' },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-xl text-center" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="p-8 rounded-xl text-center" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-white font-bold text-xl mb-2">Analytics กำลังมา!</h3>
          <p className="text-gray-400">เชื่อมต่อ Facebook Insights และ TikTok Analytics เพื่อดูสถิติการเข้าถึงแบบ Real-time</p>
        </div>
      </main>
    </div>
  )
}
