import { onAuthStateChanged } from "firebase/auth"
import { useEffect, useState } from "react"
import { auth } from "../lib/firebase"

export default function useFirebaseReady() {
    const [firebaseReady, setFirebaseReady] = useState(false)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                setFirebaseReady(true)
            }
        })
        return () => unsub()
    }, [])

    return firebaseReady
}
