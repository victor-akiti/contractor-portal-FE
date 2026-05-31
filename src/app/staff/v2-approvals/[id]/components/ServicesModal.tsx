"use client"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { useEffect, useState } from "react"
import styles from "../styles.module.css"
import { Submission } from "../types"

interface Category { _id: string; category: string }

interface Props {
    submissionId: string
    role: string
    submission: Submission
    onSaved: () => void | Promise<void>
    onClose: () => void
}

// Stage D - assigned End User records services + site visit. Services
// come from the controlled JobCategory collection so V2 stays consistent
// with the legacy stageB/C selectors.
const ServicesModal = ({
    submissionId,
    role,
    submission,
    onSaved,
    onClose,
}: Props) => {
    const initial = Array.isArray((submission as any)?.selectedServices)
        ? [...(submission as any).selectedServices]
        : Array.isArray(submission?.jobCategories)
          ? (submission as any).jobCategories
                .map((j: any) => (typeof j === "string" ? j : j?.category))
                .filter(Boolean)
          : []

    const [picked, setPicked] = useState<string[]>(initial)
    const [siteVisit, setSiteVisit] = useState(!!submission.siteVisitRequired)
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const r = await getProtected("jobCategories", role)
                if (cancelled) return
                if (r?.status === "OK" && Array.isArray(r.data)) {
                    setCategories(
                        r.data.map((j: any) => ({
                            _id: String(j._id),
                            category: String(j.category),
                        })),
                    )
                } else {
                    setError(r?.error?.message || "Could not load job categories")
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Could not load job categories")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [role])

    const toggle = (cat: string) => {
        setPicked((prev) =>
            prev.includes(cat) ? prev.filter((s) => s !== cat) : [...prev, cat],
        )
    }

    const save = async () => {
        if (picked.length === 0) {
            setError("Pick at least one service before saving.")
            return
        }
        setSaving(true)
        setError("")
        try {
            const r = await postProtected(
                `api/v2/submissions/${submissionId}/services`,
                { selectedServices: picked, siteVisitRequired: siteVisit },
                role,
            )
            if (r?.status === "OK") {
                await onSaved()
                onClose()
            } else {
                setError(r?.error?.message || "Could not save services")
            }
        } catch (e: any) {
            setError(e?.message || "Unexpected error")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal>
            <div className={styles.modalCard}>
                <div className={styles.modalHeader}>
                    <h3>Record Services & Site Visit</h3>
                    <p className={styles.modalSub}>
                        Record the services this contractor is being evaluated
                        for. Stage D cannot advance to Stage E until at least
                        one service is recorded.
                    </p>
                </div>
                <div className={styles.modalBody}>
                    <label className={styles.modalLabel}>
                        Services ({picked.length} selected)
                    </label>
                    <input
                        type="search"
                        className={styles.searchInput}
                        placeholder="Search services..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        disabled={saving}
                    />
                    <div className={styles.serviceListWrap}>
                        {loading && <div className={styles.dim}>Loading services...</div>}
                        {!loading && categories.length === 0 && (
                            <div className={styles.dim}>
                                No services configured. Add them under Job Categories.
                            </div>
                        )}
                        {!loading &&
                            categories
                                .filter((c) =>
                                    c.category.toLowerCase().includes(search.trim().toLowerCase()),
                                )
                                .map((c) => {
                                    const checked = picked.includes(c.category)
                                    return (
                                        <label key={c._id} className={styles.serviceRow}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={saving}
                                                onChange={() => toggle(c.category)}
                                            />
                                            <span>{c.category}</span>
                                        </label>
                                    )
                                })}
                    </div>

                    <label className={styles.modalLabel} style={{ marginTop: 16 }}>
                        <input
                            type="checkbox"
                            checked={siteVisit}
                            disabled={saving}
                            onChange={(e) => setSiteVisit(e.target.checked)}
                        />
                        <span style={{ marginLeft: 8 }}>
                            Site visit required before approval
                        </span>
                    </label>

                    {error && <ErrorText text={error} />}
                </div>
                <div className={styles.modalActions}>
                    <button
                        className={styles.btnSecondary}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.btnPrimary}
                        onClick={save}
                        disabled={saving || picked.length === 0}
                    >
                        Save
                        {saving && <ButtonLoadingIcon />}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default ServicesModal
