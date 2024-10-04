'use client'
import Image from 'next/image'
import styles from './page.module.css'
import { getProtected } from '@/requests/get'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  useEffect(() => {
    getCurrentAuthState()
  }, [])

  const router = useRouter()

  const getCurrentAuthState = async () => {
    try {
      const currentAuthState = await getProtected("auth/current-auth-state")

      if (currentAuthState.status === "Failed") {
        router.push("/login")
      } else {
        if (currentAuthState.data.role === "User") {
          router.push("/contractor/dashboard")

          
        } else {
          router.push("/staff/approvals")

          localStorage.setItem("role", "Staff")
          localStorage.setItem("user", JSON.stringify(currentAuthState.data))
        }
      }

      
      
    } catch (error) {
      console.log({error});
    }
  }

  return (
    <main className={styles.main}>
      
    </main>
  )
}
