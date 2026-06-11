"use client"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { useEffect, useMemo, useState } from "react"
import styles from "../styles.module.css"
import { Submission } from "../types"

interface ProductCategory {
    main: string
    subs: string[]
}

interface Props {
    submissionId: string
    role: string
    submission: Submission
    onSaved: () => void | Promise<void>
    onClose: () => void
}

// Stage C / Stage D services selection.
//
// Replaces the older JobCategory-based list with the controlled Product
// Categories taxonomy from /api/v2/product-categories. The list is
// hierarchical: each main category groups one or more sub-services and
// the staff member ticks individual subs. selectedServices on the
// submission stays a flat list of sub-name strings so the BE schema
// (and any legacy V1 sync) doesn't need to change.
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
    // Forced decision: null means the End User has not yet chosen. Save
    // is blocked until they explicitly pick Yes or No.
    const [siteVisit, setSiteVisit] = useState<boolean | null>(
        typeof submission.siteVisitRequired === "boolean"
            ? submission.siteVisitRequired
            : null,
    )
    const [categories, setCategories] = useState<ProductCategory[]>([])
    const [edition, setEdition] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const r = await getProtected("api/v2/product-categories", role)
                if (cancelled) return
                if (r?.status === "OK" && Array.isArray(r.data?.categories)) {
                    setCategories(r.data.categories)
                    setEdition(r.data.edition || "")
                } else {
                    setError(r?.error?.message || "Couldn't load the services list.")
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Couldn't load the services list.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [role])

    const toggleSub = (sub: string) => {
        setPicked((prev) =>
            prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
        )
    }
    const toggleExpanded = (main: string) =>
        setExpanded((prev) => ({ ...prev, [main]: !prev[main] }))

    // Filter the tree by the search box. A main matches if its name
    // matches OR any of its subs match - only matching subs are shown
    // under a main matched by sub.
    const filteredCategories = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return categories
        const out: ProductCategory[] = []
        for (const c of categories) {
            const mainHit = c.main.toLowerCase().includes(q)
            const subHits = c.subs.filter((s) => s.toLowerCase().includes(q))
            if (mainHit) out.push({ main: c.main, subs: c.subs })
            else if (subHits.length) out.push({ main: c.main, subs: subHits })
        }
        return out
    }, [categories, search])

    // Auto-expand any main where any of its subs are picked - so the
    // user always sees their current selection even after a refresh.
    useEffect(() => {
        if (!categories.length || !picked.length) return
        const next: Record<string, boolean> = {}
        for (const c of categories) {
            if (c.subs.some((s) => picked.includes(s))) next[c.main] = true
        }
        setExpanded((prev) => ({ ...next, ...prev }))
        // run once on initial categories load so we don't keep
        // forcing the open state on subsequent picks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories])

    // Auto-expand any main whose subs match the active search.
    useEffect(() => {
        if (!search.trim()) return
        const next: Record<string, boolean> = {}
        for (const c of filteredCategories) next[c.main] = true
        setExpanded((prev) => ({ ...prev, ...next }))
    }, [search, filteredCategories])

    const allSubsForMain = (mainName: string) =>
        categories.find((c) => c.main === mainName)?.subs || []
    const mainSelectionState = (mainName: string): "none" | "some" | "all" => {
        const all = allSubsForMain(mainName)
        if (!all.length) return "none"
        const sel = all.filter((s) => picked.includes(s)).length
        if (sel === 0) return "none"
        if (sel === all.length) return "all"
        return "some"
    }
    const toggleWholeMain = (mainName: string) => {
        const all = allSubsForMain(mainName)
        const state = mainSelectionState(mainName)
        if (state === "all") {
            setPicked((prev) => prev.filter((s) => !all.includes(s)))
        } else {
            setPicked((prev) => Array.from(new Set([...prev, ...all])))
        }
    }

    const save = async () => {
        if (picked.length === 0) {
            setError("Pick at least one service before saving.")
            return
        }
        if (siteVisit === null) {
            setError("Choose Yes or No on the site visit question before saving.")
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
                setError(r?.error?.message || "We couldn't save your selection. Please try again.")
            }
        } catch (e: any) {
            setError(e?.message || "We couldn't save your selection. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal>
            <div className={styles.modalCard}>
                <div className={styles.modalHeader}>
                    <h3>Services this contractor will be evaluated for</h3>
                    <p className={styles.modalSub}>
                        Pick every service area that applies. Tick a main
                        category to select all of its services in one go, or
                        expand it to choose specific ones.
                        {edition && (
                            <>
                                {" "}
                                <em className={styles.dim}>({edition})</em>
                            </>
                        )}
                    </p>
                </div>
                <div className={`${styles.modalBody} ${styles.modalBodyServices}`}>
                    <div className={styles.servicesSection}>
                        <label className={styles.modalLabel}>
                            Selected services: {picked.length}
                        </label>
                        <div className={styles.servicesSearchWrap}>
                            <span className={styles.servicesSearchIcon}>⌕</span>
                            <input
                                type="search"
                                className={styles.servicesSearchInput}
                                placeholder="Search by category or service…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <div className={styles.serviceListWrap}>
                        {loading && <div className={styles.dim}>Loading services…</div>}
                        {!loading && filteredCategories.length === 0 && (
                            <div className={styles.dim}>
                                {search
                                    ? `No services match "${search}".`
                                    : "No services available."}
                            </div>
                        )}
                        {!loading &&
                            filteredCategories.map((c) => {
                                const open = !!expanded[c.main]
                                const state = mainSelectionState(c.main)
                                return (
                                    <div key={c.main} className={styles.serviceGroup}>
                                        <div className={styles.serviceGroupHeader}>
                                            <input
                                                type="checkbox"
                                                aria-label={`Select every service under ${c.main}`}
                                                ref={(el) => {
                                                    if (el) el.indeterminate = state === "some"
                                                }}
                                                checked={state === "all"}
                                                disabled={saving}
                                                onChange={() => toggleWholeMain(c.main)}
                                            />
                                            <button
                                                type="button"
                                                className={styles.serviceGroupToggle}
                                                onClick={() => toggleExpanded(c.main)}
                                                aria-expanded={open}
                                            >
                                                <span className={styles.serviceGroupChevron}>
                                                    {open ? "▾" : "▸"}
                                                </span>
                                                <span className={styles.serviceGroupName}>
                                                    {c.main}
                                                </span>
                                                <span className={styles.dim}>
                                                    {state === "all"
                                                        ? "all selected"
                                                        : state === "some"
                                                          ? `${c.subs.filter((s) => picked.includes(s)).length} of ${
                                                                allSubsForMain(c.main).length
                                                            } selected`
                                                          : `${c.subs.length} service${
                                                                c.subs.length === 1 ? "" : "s"
                                                            }`}
                                                </span>
                                            </button>
                                        </div>
                                        {open && (
                                            <div className={styles.serviceGroupBody}>
                                                {c.subs.map((s) => (
                                                    <label
                                                        key={s}
                                                        className={styles.serviceRow}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={picked.includes(s)}
                                                            disabled={saving}
                                                            onChange={() => toggleSub(s)}
                                                        />
                                                        <span>{s}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                    </div>

                    <div
                        className={`${styles.siteVisitBlock} ${
                            siteVisit === null ? styles.siteVisitBlockUnset : ""
                        }`}
                    >
                        <p className={styles.siteVisitQuestion}>
                            Does this contractor need a physical site visit
                            by an Amni team to verify their capacity?
                        </p>
                        <p className={styles.siteVisitHelp}>
                            Required answer. The application cannot move to
                            Due Diligence (Stage E) until you pick Yes or No.
                        </p>
                        <div className={styles.siteVisitChoices}>
                            <label
                                className={`${styles.siteVisitChoice} ${
                                    siteVisit === true ? styles.siteVisitChoiceOn : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="siteVisit"
                                    checked={siteVisit === true}
                                    disabled={saving}
                                    onChange={() => setSiteVisit(true)}
                                />
                                <span>Yes - site visit required</span>
                            </label>
                            <label
                                className={`${styles.siteVisitChoice} ${
                                    siteVisit === false ? styles.siteVisitChoiceOn : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="siteVisit"
                                    checked={siteVisit === false}
                                    disabled={saving}
                                    onChange={() => setSiteVisit(false)}
                                />
                                <span>No - not required</span>
                            </label>
                        </div>
                    </div>

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
                        disabled={saving || picked.length === 0 || siteVisit === null}
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
