'use client'
import Link from 'next/link'

export default function EditorPage() {
  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← กลับ</Link>
        <span className="font-bold text-white text-xl">✂️ Video Editor</span>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="p-8 rounded-xl text-center" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <div className="text-5xl mb-4">✂️</div>
          <h3 className="text-white font-bold text-xl mb-2">Video Editor</h3>
          <p className="text-gray-400 mb-6">ตัดต่อวิดีโอ, เพิ่มซับไตเติ้ล, B-Roll อัตโนมัติ</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            {[
              { icon:'🎙️', label:'TTS', desc:'แปลงข้อความเป็นเสียง' },
              { icon:'📝', label:'Subtitle', desc:'สร้างซับไตเติ้ลอัตโนมัติ' },
              { icon:'🎬', label:'B-Roll', desc:'หาวิดีโอประกอบจาก Pexels' },
              { icon:'⬇️', label:'Export', desc:'ดาวน์โหลดวิดีโอ' },
            ].map(f => (
              <div key={f.label} className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-white text-sm">{f.label}</div>
                <div className="text-gray-500 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-purple-400 text-sm mt-6">🚧 กำลังพัฒนา — จะพร้อมเร็วๆ นี้</p>
        </div>
      </main>
    </div>
  )
}
