'use client'
import { Inter } from 'next/font/google'
import './globals.css'
import ReduxProvider from './reduxProvider'
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const inter = Inter({ subsets: ['latin'] })

// Initialize Firebase in the root layout
const firebaseConfig = {
  apiKey: "AIzaSyC0ZtnjPzHg6ieIeTYTuqwMiSgofrgulHw",
  authDomain: "amni-contractors.firebaseapp.com",
  databaseURL: "https://amni-contractors.firebaseio.com",
  projectId: "amni-contractors",
  storageBucket: "amni-contractors.appspot.com",
  messagingSenderId: "754512756573",
  appId: "1:754512756573:web:d5c79ebeca11ea64",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

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