import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ConfigProvider } from '@/contexts/ConfigContext'
import { ReduxProvider } from '@/providers/ReduxProvider'
import { FirebaseProvider } from '@/contexts/FirebaseContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'WebhookIQ',
  description: 'Chat interface for n8n webhook integration',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <FirebaseProvider>
          <ReduxProvider>
            <ThemeProvider>
              <ConfigProvider>
                <div className="min-h-screen">
                  {children}
                </div>
              </ConfigProvider>
            </ThemeProvider>
          </ReduxProvider>
        </FirebaseProvider>
      </body>
    </html>
  )
}