import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ConfigProvider } from '@/contexts/ConfigContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Chat Interface',
  description: 'Chat interface for n8n webhook integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <ConfigProvider>
            <div className="min-h-screen">
              {children}
            </div>
          </ConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}