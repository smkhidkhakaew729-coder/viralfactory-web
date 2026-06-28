import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ViralFactory AI',
  description: 'AI Viral Content Factory — สร้างคอนเทนต์ไวรัลด้วย AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
