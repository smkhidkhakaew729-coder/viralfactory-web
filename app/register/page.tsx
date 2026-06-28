'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return }
    if (password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/dashboard` }
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-white mb-3">ตรวจสอบอีเมลของคุณ</h2>
          <p className="text-gray-400 mb-6">เราส่งลิงก์ยืนยันไปที่ <span className="text-purple-300">{email}</span> แล้ว คลิกลิงก์เพื่อเปิดใช้งานบัญชี</p>
          <Link href="/login" className="text-purple-400 hover:text-purple-300">กลับไปหน้าเข้าสู่ระบบ →</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-3xl font-bold text-white">ViralFactory AI</h1>
          <p className="text-gray-400 mt-1">สมัครสมาชิกฟรี</p>
        </div>

        <form onSubmit={handleRegister} className="rounded-2xl p-8 space-y-5" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}>
          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-500/50 text-red-300 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">อีเมล</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">ยืนยันรหัสผ่าน</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
            style={{background:'linear-gradient(90deg,#7C3AED,#4F46E5)'}}>
            {loading ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิกฟรี'}
          </button>

          <p className="text-center text-gray-400 text-sm">
            มีบัญชีแล้ว?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300">เข้าสู่ระบบ</Link>
          </p>
        </form>
      </div>
    </main>
  )
}
