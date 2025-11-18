'use client'
import { Inter } from 'next/font/google';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import './globals.css';
import ReduxProvider from './reduxProvider';
import { ThemeProvider } from '@/context/ThemeContext';

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en">
      <ThemeProvider>
        <ReduxProvider>
          <body className={inter.className}>
            {children}
          </body>
          <ToastContainer />
        </ReduxProvider>
      </ThemeProvider>
    </html>
  )
}