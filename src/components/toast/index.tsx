"use client"
// Minimal top-right toast for ambient status messages (e.g. "Refreshing…").
// Stays out of the page flow so the table doesn't shift when refresh is
// in progress. Auto-dismisses if `transient` is true; otherwise the
// caller controls the lifetime.

import { useEffect, useState } from "react"
import styles from "./styles.module.css"

export interface ToastProps {
    show: boolean
    message: string
    tone?: "info" | "success" | "error"
    transient?: boolean
    onDismiss?: () => void
}

const Toast = ({ show, message, tone = "info", transient = false, onDismiss }: ToastProps) => {
    const [visible, setVisible] = useState(show)
    useEffect(() => {
        setVisible(show)
        if (show && transient) {
            const t = setTimeout(() => {
                setVisible(false)
                onDismiss?.()
            }, 2400)
            return () => clearTimeout(t)
        }
    }, [show, transient, onDismiss])
    if (!visible) return null
    return (
        <div className={`${styles.toast} ${styles[`tone_${tone}`]}`} role="status">
            <span className={styles.dot} />
            <span className={styles.msg}>{message}</span>
        </div>
    )
}

export default Toast
