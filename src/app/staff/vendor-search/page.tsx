'use client'

import useDebounce from "@/hooks/useDebounce"
import { useLazyVendorSearchQuery } from "@/redux/features/vendorSearchSlice"
import { useAppSelector } from "@/redux/hooks"
import {
    faBuilding,
    faChevronDown,
    faChevronLeft,
    faChevronRight,
    faChevronUp,
    faDownload,
    faEnvelope,
    faGlobe,
    faMapMarkerAlt,
    faPhone,
    faSearch,
    faStar,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import xlsx from "json-as-xlsx"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import styles from "./styles/styles.module.css"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchedOn {
    field: "companyName" | "activity" | "jobCategory"
    label: string
    value: string
}

interface VendorResult {
    _id: string
    companyName: string
    companyUID: string
    registrationType: string
    website?: string | null
    taxIDNumber?: string
    hqAddress?: {
        country?: string
        state?: string
        city?: string
        line1?: string
    }
    primaryContact?: {
        firstName?: string
        familyName?: string
        designation?: string
        email?: string
        phone?: string
    } | null
    activities?: { display: string; value: string }[]
    jobCategories?: { label: string; name: string | null }[]
    endUsers?: { endUser: { name: string; email?: string; department?: string } }[]
    currentEndUsers?: string[]
    status: {
        displayStage: string
        approvalLevel: number
        status: string
        submitted: boolean
        isPriority: boolean
        isApproved: boolean
        lastApproved?: number | null
        submitTime?: number | null
        returnTime?: number | null
    }
    matchedOn: MatchedOn[]
    score: number
    createdAt: string
    updatedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_TABS = [
    { label: "All", value: "all" },
    { label: "Contractor Name", value: "name" },
    { label: "AMNI's Categorization", value: "categories" },
    { label: "Contractor Stated Business Activities", value: "activities" },
] as const

const STATUS_OPTIONS = [
    { label: "All Statuses", value: "" },
    { label: "Approved (L3)", value: "approved" },
    { label: "Not yet submitted", value: "in progress" },
    { label: "Under AMNI Review", value: "pending" },
    { label: "Parked", value: "parked" },
    { label: "Park Requested", value: "park requested" },
]

// Default "L3 First" client-side sort — L3 → Priority → stage hierarchy.
function stageSort(a: VendorResult, b: VendorResult): number {
    const aIsL3 = a.status?.displayStage === "L3"
    const bIsL3 = b.status?.displayStage === "L3"
    // 1. L3 first
    if (aIsL3 !== bIsL3) return aIsL3 ? -1 : 1
    // 2. Among non-L3: priority contractors next
    if (!aIsL3) {
        const aPri = a.status?.isPriority ?? false
        const bPri = b.status?.isPriority ?? false
        if (aPri !== bPri) return aPri ? -1 : 1
    }
    // 3. By approvalLevel descending — higher level = further in pipeline = shown first
    return (b.status?.approvalLevel ?? 0) - (a.status?.approvalLevel ?? 0)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildLocationString(hqAddress?: VendorResult["hqAddress"]): string {
    if (!hqAddress) return ""
    const parts = [hqAddress.state, hqAddress.country].filter(Boolean)
    return parts.join(", ")
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Wraps occurrences of `query` inside `text` with a highlighted <mark>.
 * Case-insensitive. Falls back to plain text if no substring found.
 */
function HighlightText({ text, query }: { text: string; query: string }) {
    if (!query || query.length < 2) return <>{text}</>

    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return <>{text}</>

    return (
        <>
            {text.slice(0, idx)}
            <mark className={styles.highlight}>{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    )
}

// function MatchedBySection({ matchedOn, searchQuery }: { matchedOn: MatchedOn[]; searchQuery: string }) {
//     // Group by field
//     const grouped: Record<string, MatchedOn[]> = {}
//     for (const m of matchedOn) {
//         if (m.field === "companyName") continue // always visible; don't show in "Matched by"
//         if (!grouped[m.field]) grouped[m.field] = []
//         grouped[m.field].push(m)
//     }

//     const entries = Object.entries(grouped)
//     if (entries.length === 0) return null

//     return (
//         <div className={styles.matchedBy}>
//             <span className={styles.matchedByLabel}>Matched by:</span>
//             {entries.map(([, items], i) => (
//                 <span key={i} className={styles.matchedByGroup}>
//                     {i > 0 && <span className={styles.matchedBySep}> | </span>}
//                     <span className={styles.matchedByField}>{items[0].label}</span>
//                     {" — "}
//                     <span className={styles.matchedByValues}>
//                         {items.map((m, j) => (
//                             <span key={j}>
//                                 {j > 0 && " · "}
//                                 <HighlightText text={m.value} query={searchQuery} />
//                             </span>
//                         ))}
//                     </span>
//                 </span>
//             ))}
//         </div>
//     )
// }

function VendorCard({ vendor, searchQuery, isPinned }: { vendor: VendorResult; searchQuery: string; isPinned: boolean }) {
    const { status, primaryContact, activities, jobCategories, hqAddress, matchedOn } = vendor
    const [expanded, setExpanded] = useState(false)

    // displayStage === "L3" is the authoritative L3 indicator; isApproved provides additional emphasis
    const isL3 = status?.displayStage === "L3" || status?.isApproved
    const isFullyApproved = isL3 && status?.isApproved
    const location = buildLocationString(hqAddress)

    // Substring match is the sole gate for visual highlighting.
    // matchedOn tells us *why* a result appeared (used only for the
    // "Matched by" footer); it must not gate per-pill highlighting because
    // the fuzzy engine can flag activities unrelated to the typed query.
    const q = searchQuery.toLowerCase()
    const activityIsMatch = (a: { display: string; value: string }) =>
        q.length >= 2 &&
        (a.display.toLowerCase().includes(q) || a.value.toLowerCase().includes(q))
    const categoryIsMatch = (c: { label: string }) =>
        q.length >= 2 && c.label.toLowerCase().includes(q)

    const matchedCategories = (jobCategories ?? []).filter(categoryIsMatch)
    const matchedActivities = (activities ?? []).filter(activityIsMatch)
    const hasMatchedPills = matchedCategories.length > 0 || matchedActivities.length > 0

    const hasDetails =
        !!primaryContact ||
        (jobCategories && jobCategories.length > 0) ||
        (activities && activities.length > 0)

    return (
        <div className={`${styles.card} ${isL3 ? styles.cardApproved : ""}`}>
            {/* Header row */}
            <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                    <h3 className={styles.companyName}>
                        <HighlightText text={vendor.companyName} query={searchQuery} />
                    </h3>
                    <div className={styles.badgeRow}>
                        {isL3 && (
                            <span className={`${styles.badge} ${styles.badgeL3}`}>
                                {isFullyApproved ? "L3 Approved" : "L3"}
                            </span>
                        )}
                        {!isL3 && (
                            <span className={`${styles.badge} ${styles.badgeStage}`}>
                                {status?.displayStage ?? "Unknown"}
                            </span>
                        )}
                        {status?.isPriority && !isL3 && (
                            <span className={`${styles.badge} ${styles.badgePriority}`}>
                                <FontAwesomeIcon icon={faStar} className={styles.starIcon} />
                                Priority
                            </span>
                        )}
                        {status?.status === "returned" && (
                            <span className={`${styles.badge} ${styles.badgeReturned}`}>
                                Returned
                            </span>
                        )}
                    </div>
                </div>

                <div className={styles.cardMeta}>
                    {location && (
                        <span className={styles.metaItem}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} className={styles.metaIcon} />
                            {location}
                        </span>
                    )}
                    {vendor.registrationType && (
                        <span className={styles.metaItem}>
                            <FontAwesomeIcon icon={faBuilding} className={styles.metaIcon} />
                            {vendor.registrationType}
                        </span>
                    )}
                    {vendor.website && (
                        <a
                            href={vendor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.metaLink}
                            title={vendor.website}
                        >
                            <FontAwesomeIcon icon={faGlobe} className={styles.metaIcon} />
                            Website
                        </a>
                    )}
                </div>
            </div>

            {/* Matched pills — always visible when collapsed */}
            {hasMatchedPills && !expanded && (
                <div className={styles.matchedPillsRow}>
                    {matchedCategories.map((c, i) => (
                        <span key={i} className={`${styles.tag} ${styles.tagCategoryMatched}`}>
                            <HighlightText text={c.label} query={searchQuery} />
                        </span>
                    ))}
                    {matchedActivities.map((a, i) => (
                        <span key={i} className={`${styles.tag} ${styles.tagActivityMatched}`}>
                            <HighlightText text={a.display} query={searchQuery} />
                        </span>
                    ))}
                </div>
            )}

            {/* Expandable details */}
            {expanded && (
                <div className={styles.detailsSection}>
                    {/* Contact */}
                    {primaryContact && (
                        <div className={styles.contactSection}>
                            <p className={styles.sectionLabel}>Primary Contact</p>
                            <div className={styles.contactInfo}>
                                <span className={styles.contactName}>
                                    {[primaryContact.firstName, primaryContact.familyName]
                                        .filter(Boolean)
                                        .join(" ")}
                                    {primaryContact.designation && (
                                        <span className={styles.designation}>
                                            {" "}— {primaryContact.designation}
                                        </span>
                                    )}
                                </span>
                                <div className={styles.contactDetails}>
                                    {primaryContact.email && (
                                        <a href={`mailto:${primaryContact.email}`} className={styles.contactLink}>
                                            <FontAwesomeIcon icon={faEnvelope} className={styles.metaIcon} />
                                            {primaryContact.email}
                                        </a>
                                    )}
                                    {primaryContact.phone && (
                                        <a href={`tel:${primaryContact.phone}`} className={styles.contactLink}>
                                            <FontAwesomeIcon icon={faPhone} className={styles.metaIcon} />
                                            {primaryContact.phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Job Categories */}
                    {jobCategories && jobCategories.length > 0 && (
                        <div className={styles.tagsSection}>
                            <p className={styles.sectionLabel}>Job Categories</p>
                            <div className={styles.tagList}>
                                {jobCategories.map((c, i) => {
                                    const isMatched = categoryIsMatch(c)
                                    return (
                                        <span
                                            key={i}
                                            className={`${styles.tag} ${isMatched ? styles.tagCategoryMatched : styles.tagCategory}`}
                                        >
                                            <HighlightText text={c.label} query={searchQuery} />
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Activities */}
                    {activities && activities.length > 0 && (
                        <div className={styles.tagsSection}>
                            <p className={styles.sectionLabel}>Business Activities</p>
                            <div className={styles.tagList}>
                                {activities.map((a, i) => {
                                    const isMatched = activityIsMatch(a)
                                    return (
                                        <span
                                            key={i}
                                            className={`${styles.tag} ${isMatched ? styles.tagActivityMatched : styles.tagActivity}`}
                                        >
                                            <HighlightText text={a.display} query={searchQuery} />
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className={styles.cardFooter}>
                {hasDetails && (
                    <button
                        className={styles.detailsToggle}
                        onClick={() => setExpanded((v) => !v)}
                        aria-expanded={expanded}
                    >
                        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className={styles.toggleIcon} />
                        {expanded ? "Hide details" : "Show details"}
                    </button>
                )}
                <Link href={`/staff/vendor/${vendor._id}`} className={styles.viewLink}>
                    View vendor
                </Link>
            </div>
        </div>
    )
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

const LOADING_MESSAGE_DELAYS = [0, 2000, 5000, 8000] // ms from activation

// Maps category values to the scan-phase description used in loading messages.
const CATEGORY_SCAN_LABEL: Record<string, string> = {
    all: "names, Business Activities, and Job Categories",
    name: "Contractor Name",
    activities: "Business Activities",
    categories: "Job Categories",
}

function buildLoadingMessages(category: string, statusFilter: string): string[] {
    const scanLabel = CATEGORY_SCAN_LABEL[category] ?? "all fields"
    const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? ""

    const line1 =
        category === "all"
            ? "Searching across all fields…"
            : `Searching by ${CATEGORY_TABS.find((t) => t.value === category)?.label ?? category}…`

    const line2 = statusFilter
        ? `Filtering by ${statusLabel}…`
        : `Scanning ${scanLabel}…`

    return [
        line1,
        line2,
        "This is taking a little longer than usual…",
        "Hang tight, almost there…",
    ]
}

/**
 * Returns a progressively more patient loading message the longer `isActive`
 * stays `true`. Messages reference the active category tab and status filter
 * so the user knows the search is using their current settings.
 * Resets to the first message as soon as `isActive` goes `false`.
 */
function useLoadingMessage(isActive: boolean, category: string, statusFilter: string): string {
    const [index, setIndex] = useState(0)
    const messagesRef = useRef<string[]>(buildLoadingMessages(category, statusFilter))

    useEffect(() => {
        if (!isActive) {
            setIndex(0)
            return
        }
        // Snapshot current filter settings when fetch starts.
        messagesRef.current = buildLoadingMessages(category, statusFilter)

        const timers = LOADING_MESSAGE_DELAYS.slice(1).map((delay, i) =>
            setTimeout(() => setIndex(i + 1), delay)
        )
        return () => timers.forEach(clearTimeout)
    }, [isActive])

    return messagesRef.current[index] ?? messagesRef.current[0]
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// Returns an array of page numbers and "…" ellipsis markers to render.
// Always shows first, last, current, and one neighbour on each side.
function buildPageRange(current: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

    const set = new Set<number>()
    set.add(1)
    set.add(total)
    for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) set.add(i)

    const sorted = Array.from(set).sort((a, b) => a - b)
    const result: (number | "…")[] = []
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…")
        result.push(sorted[i])
    }
    return result
}

export default function VendorSearchPage() {
    const user = useAppSelector((state: any) => state.user.user)

    const [query, setQuery] = useState("")
    const [category, setCategory] = useState<"all" | "name" | "activities" | "categories">("all")
    const [statusFilter, setStatusFilter] = useState("")
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)

    const [showParked, setShowParked] = useState(false)
    const [showReturned, setShowReturned] = useState(false)
    const [sortOrder, setSortOrder] = useState<"default" | "relevance">("default")

    const debouncedQuery = useDebounce(query, 200)

    const [triggerSearch, { data, isLoading, isFetching, isError, error }] = useLazyVendorSearchQuery()
    const inflightRef = useRef<{ abort: () => void } | null>(null)

    const loadingMessage = useLoadingMessage(isFetching, category, statusFilter)

    const isForbidden =
        isError && (error as any)?.status === 403

    const allResults: VendorResult[] = data?.data?.results ?? []
    // Parked contractors get their own separate toggle.
    const parkedResults = allResults.filter((v) => v.status?.status === "parked" || v.status?.status === "suspended")
    // Main results: must be submitted into the approval pipeline, not parked, not returned.
    // Using `submitted` as the gate is more reliable than matching status strings —
    // unsubmitted contractors can have various status.status values but submitted===false.
    const filteredResults = allResults.filter(
        (v) =>
            v.status?.submitted === true &&
            v.status?.status !== "parked" &&
            v.status?.status !== "suspended" &&
            v.status?.status !== "returned"
    )
    // Unsubmitted (pending) and returned contractors are grouped together — hidden
    // from the main list and accessible via the "partially completed" toggle.
    const returnedResults = allResults
        .filter(
            (v) =>
                v.status?.status !== "parked" &&
                (v.status?.submitted !== true || v.status?.status === "returned")
        )
        .sort((a, b) => (b.status?.isPriority ? 1 : 0) - (a.status?.isPriority ? 1 : 0))
    // "By Relevance" keeps backend score order; default applies stage hierarchy sort.
    const results =
        sortOrder === "relevance"
            ? [...filteredResults].sort((a, b) => b.score - a.score)
            : [...filteredResults].sort(stageSort)

    // Highest score among non-L3 results — used to flag L3 cards pinned above
    // more relevant non-L3 matches in the default sort.
    const maxNonL3Score = filteredResults
        .filter((v) => v.status?.displayStage !== "L3")
        .reduce((max, v) => Math.max(max, v.score), 0)
    const hiddenParked = parkedResults.length
    const hiddenReturned = returnedResults.length
    const total: number = data?.data?.total ?? 0
    const totalPages = Math.ceil(total / limit)

    // Fire search whenever debounced query, category, status, or page changes.
    // Abort any in-flight request before firing a new one to prevent
    // out-of-order responses from overwriting newer results.
    useEffect(() => {
        if (debouncedQuery.length < 2) return
        inflightRef.current?.abort()
        inflightRef.current = triggerSearch({
            q: debouncedQuery,
            category,
            status: statusFilter || undefined,
            page,
            limit,
            userRole: user?.role ?? "",
        }, /* preferCacheValue */ true)
    }, [debouncedQuery, category, statusFilter, page, limit])

    // Reset page and hidden toggles when search params or page size change
    useEffect(() => {
        setPage(1)
        setShowParked(false)
        setShowReturned(false)
    }, [debouncedQuery, category, statusFilter, limit])

    // Determine empty-state type
    const showMinCharsHint = query.length > 0 && query.length < 2
    const showNoResults =
        !isFetching && !isError && debouncedQuery.length >= 2 && results.length === 0
    const showPlaceholder = query.length === 0

    const exportToExcel = () => {
        const origin = typeof window !== "undefined" ? window.location.origin : ""

        const toRow = (v: VendorResult) => ({
            companyName: v.companyName,
            companyUID: v.companyUID,
            stage: v.status?.displayStage ?? "",
            l3Approved: v.status?.isApproved ? "Yes" : "No",
            priority: v.status?.isPriority ? "Yes" : "No",
            submitted: v.status?.submitted ? "Yes" : "No",
            registrationType: v.registrationType ?? "",
            location: buildLocationString(v.hqAddress),
            website: v.website ?? "",
            contactName: [v.primaryContact?.firstName, v.primaryContact?.familyName].filter(Boolean).join(" "),
            contactDesignation: v.primaryContact?.designation ?? "",
            contactEmail: v.primaryContact?.email ?? "",
            contactPhone: v.primaryContact?.phone ?? "",
            jobCategories: (v.jobCategories ?? []).map((c) => c.label).join(", "),
            activities: (v.activities ?? []).map((a) => a.display).join(", "),
            portalLink: `${origin}/staff/vendor/${v._id}`,
        })

        const columns = [
            { label: "Company Name", value: "companyName" },
            { label: "Company UID", value: "companyUID" },
            { label: "Stage", value: "stage" },
            { label: "L3 Approved", value: "l3Approved" },
            { label: "Priority", value: "priority" },
            { label: "Submitted", value: "submitted" },
            { label: "Registration Type", value: "registrationType" },
            { label: "Location", value: "location" },
            { label: "Website", value: "website" },
            { label: "Primary Contact", value: "contactName" },
            { label: "Designation", value: "contactDesignation" },
            { label: "Email", value: "contactEmail" },
            { label: "Phone", value: "contactPhone" },
            { label: "Job Categories", value: "jobCategories" },
            { label: "Business Activities", value: "activities" },
            { label: "Portal Link", value: "portalLink" },
        ]

        const sheets: Parameters<typeof xlsx>[0] = [
            { sheet: "Main Results", columns, content: results.map(toRow) },
            ...(returnedResults.length > 0
                ? [{ sheet: "Partially Completed", columns, content: returnedResults.map(toRow) }]
                : []),
            ...(parkedResults.length > 0
                ? [{ sheet: "Parked", columns, content: parkedResults.map(toRow) }]
                : []),
        ]

        const date = new Date().toISOString().slice(0, 10)
        const slug = debouncedQuery ? `_${debouncedQuery.replace(/[^a-zA-Z0-9]/g, "_")}` : ""
        xlsx(sheets, {
            fileName: `ContractorSearch${slug}_${date}`,
            extraLength: 3,
            writeMode: "writeFile",
            writeOptions: {},
            RTL: false,
        })
    }

    return (
        <div className={styles.page}>
            {/* Page heading */}
            <header className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Contractor Search</h2>
                <p className={styles.pageSubtitle}>
                    Search for contractors quickly by name, amni categorization, or contractor stated activities.
                </p>
            </header>

            {/* Search input */}
            <div className={styles.searchSection}>
                <label htmlFor="vendorSearchInput" className={styles.searchLabel}>
                    Search contractors by name, categorization, or stated activities
                </label>
                <div className={styles.searchInputWrapper}>
                    <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
                    <input
                        id="vendorSearchInput"
                        type="text"
                        className={styles.searchInput}
                        placeholder="e.g. Dredging, ACME Ltd, Waste Disposal…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                    />
                    {isFetching && <span className={styles.spinnerInline} />}
                </div>
            </div>

            {/* Category tabs + status filter */}
            <div className={styles.controls}>
                <div className={styles.categoryTabs} role="tablist">
                    {CATEGORY_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            role="tab"
                            aria-selected={category === tab.value}
                            className={`${styles.tabBtn} ${category === tab.value ? styles.tabBtnActive : ""}`}
                            onClick={() => setCategory(tab.value as typeof category)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className={styles.statusFilterWrapper}>
                    <select
                        className={styles.statusSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter by status"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className={styles.statusSelect}
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        aria-label="Results per page"
                    >
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>
            </div>

            {/* Results area */}
            <div className={styles.resultsArea}>
                {/* ── Error states ── */}
                {isForbidden && (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyStateText}>
                            You do not have permission to use Vendor Search.
                        </p>
                    </div>
                )}

                {isError && !isForbidden && (
                    <div className={`${styles.emptyState} ${styles.emptyStateError}`}>
                        <p className={styles.emptyStateText}>
                            Search is unavailable right now. Please try again.
                        </p>
                    </div>
                )}

                {/* ── Placeholder / hint states ── */}
                {!isError && showPlaceholder && (
                    <div className={styles.emptyState}>
                        <FontAwesomeIcon icon={faSearch} className={styles.emptyIcon} />
                        <p className={styles.emptyStateText}>
                            Type at least 2 characters to search
                        </p>
                    </div>
                )}

                {!isError && showMinCharsHint && (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyStateText}>
                            Type at least 2 characters to search
                        </p>
                    </div>
                )}

                {/* ── First-load spinner (no data yet) ── */}
                {isLoading && (
                    <div className={styles.loadingState}>
                        <span className={styles.spinner} />
                        <p>{loadingMessage}</p>
                    </div>
                )}


                {/* ── Results ── */}
                {!isLoading && !isError && !showPlaceholder && allResults.length > 0 && (
                    <>
                        <div className={styles.resultsHeader}>
                            <span className={styles.resultCount}>
                                {total} {total === 1 ? "result" : "results"}
                            </span>

                            <div className={styles.sortToggle} role="group" aria-label="Sort order">
                                <button
                                    className={`${styles.sortBtn} ${sortOrder === "default" ? styles.sortBtnActive : ""}`}
                                    onClick={() => setSortOrder("default")}
                                >
                                    L3 First
                                </button>
                                <button
                                    className={`${styles.sortBtn} ${sortOrder === "relevance" ? styles.sortBtnActive : ""}`}
                                    onClick={() => setSortOrder("relevance")}
                                >
                                    By Relevance
                                </button>
                            </div>
                            {(hiddenParked > 0 || hiddenReturned > 0) && (
                                <div className={styles.hiddenIndicator}>
                                    <span className={styles.hiddenLabel}>Not shown:</span>
                                    {hiddenReturned > 0 && (
                                        <button
                                            className={`${styles.hiddenChip} ${showReturned ? styles.hiddenChipActive : ""}`}
                                            onClick={() => setShowReturned((v) => !v)}
                                        >
                                            {showReturned ? "Hide" : "Show"} {hiddenReturned} partially completed
                                        </button>
                                    )}
                                    {hiddenParked > 0 && (
                                        <button
                                            className={`${styles.hiddenChip} ${showParked ? styles.hiddenChipActive : ""}`}
                                            onClick={() => setShowParked((v) => !v)}
                                        >
                                            {showParked ? "Hide" : "Show"} {hiddenParked} parked
                                        </button>
                                    )}
                                </div>
                            )}

                            <button className={styles.exportBtn} onClick={exportToExcel} title="Export all results to Excel">
                                <FontAwesomeIcon icon={faDownload} />
                                Export
                            </button>
                        </div>


                        {showReturned && returnedResults.length > 0 && (
                            <div className={styles.hiddenSection}>
                                <p className={styles.hiddenSectionLabel}>Partially completed contractors</p>
                                <div className={styles.resultsList}>
                                    {returnedResults.map((vendor) => (
                                        <VendorCard key={vendor._id} vendor={vendor} searchQuery={debouncedQuery} isPinned={false} />
                                    ))}
                                </div>
                            </div>
                        )}


                        {/* Hidden groups — above main results */}
                        {showParked && parkedResults.length > 0 && (
                            <div className={styles.hiddenSection}>
                                <p className={styles.hiddenSectionLabel}>Parked contractors</p>
                                <div className={styles.resultsList}>
                                    {parkedResults.map((vendor) => (
                                        <VendorCard key={vendor._id} vendor={vendor} searchQuery={debouncedQuery} isPinned={false} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Re-fetch loading overlay */}
                        {isFetching && !isLoading && (
                            <div className={styles.refetchOverlay}>
                                <span className={styles.spinner} />
                                <p className={styles.refetchMessage}>{loadingMessage}</p>
                            </div>
                        )}

                        <div className={`${styles.resultsList} ${isFetching ? styles.resultsListFetching : ""}`}>
                            {results.map((vendor) => (
                                <VendorCard
                                    key={vendor._id}
                                    vendor={vendor}
                                    searchQuery={debouncedQuery}
                                    isPinned={
                                        sortOrder === "default" &&
                                        vendor.status?.displayStage === "L3" &&
                                        vendor.score < maxNonL3Score
                                    }
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    className={styles.pageBtn}
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                    aria-label="Previous page"
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} />
                                </button>

                                {buildPageRange(page, totalPages).map((p, i) =>
                                    p === "…" ? (
                                        <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            className={`${styles.pageBtn} ${p === page ? styles.pageBtnCurrent : ""}`}
                                            onClick={() => setPage(p)}
                                            aria-label={`Page ${p}`}
                                            aria-current={p === page ? "page" : undefined}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}

                                <button
                                    className={styles.pageBtn}
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                    aria-label="Next page"
                                >
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>
                        )}
                    </>
                )}


                {/* ── No results ── */}
                {showNoResults && (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyStateText}>
                            No contractors found matching &ldquo;{debouncedQuery}&rdquo;. Try a different term or category.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
