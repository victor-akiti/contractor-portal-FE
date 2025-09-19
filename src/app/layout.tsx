'use client'
import { Inter } from 'next/font/google'
import './globals.css'
import ReduxProvider from './reduxProvider'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en">
      <ReduxProvider><body className={inter.className}>{children}</body></ReduxProvider>
    </html>
  )
}