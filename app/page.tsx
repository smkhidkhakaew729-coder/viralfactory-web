import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <div className="text-center max-w-2xl">
        {/* Logo */}
        <div className="mb-6 text-6xl">⚡</div>
        <h1 className="text-5xl font-bold mb-4" style={{background:'linear-gradient(90deg,#a78bfa,#60a5fa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          ViralFactory AI
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          สร้างคอนเทนต์ไวรัลด้วย AI — Script • Storyboard • Video • Auto-Post
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/register"
            className="px-8 py-3 rounded-xl font-semibold text-white transition-all"
            style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
            สมัครสมาชิกฟรี
          </Link>
          <Link href="/login"
            className="px-8 py-3 rounded-xl font-semibold border border-purple-500 text-purple-300 hover:bg-purple-900/30 transition-all">
            เข้าสู่ระบบ
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { icon:'📈', label:'Trend Finder' },
            { icon:'📝', label:'Script AI' },
            { icon:'🎬', label:'Video Gen' },
            { icon:'📅', label:'Auto-Post' },
          ].map(f => (
            <div key={f.label} className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}>
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="text-sm text-gray-400">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
