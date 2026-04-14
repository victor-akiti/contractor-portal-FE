'use client'

import useDebounce from "@/hooks/useDebounce"
import { useLazyVendorSearchQuery } from "@/redux/features/vendorSearchSlice"
import { useAppSelector } from "@/redux/hooks"
import Link from "next/link"
import {
    faBuilding,
    faChevronLeft,
    faChevronRight,
    faEnvelope,
    faGlobe,
    faMapMarkerAlt,
    faPhone,
    faStar,
    faSearch,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
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
    { label: "Company Name", value: "name" },
    { label: "Business Activities", value: "activities" },
    { label: "Job Categories", value: "categories" },
] as const

const STATUS_OPTIONS = [
    { label: "All Statuses", value: "" },
    { label: "Approved (L3)", value: "approved" },
    { label: "Pending", value: "pending" },
    { label: "In Progress", value: "in progress" },
    { label: "Parked", value: "parked" },
    { label: "Park Requested", value: "park requested" },
]

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

function MatchedBySection({ matchedOn }: { matchedOn: MatchedOn[] }) {
    // Group by field
    const grouped: Record<string, MatchedOn[]> = {}
    for (const m of matchedOn) {
        if (m.field === "companyName") continue // always visible; don't show in "Matched by"
        if (!grouped[m.field]) grouped[m.field] = []
        grouped[m.field].push(m)
    }

    const entries = Object.entries(grouped)
    if (entries.length === 0) return null

    return (
        <div className={styles.matchedBy}>
            <span className={styles.matchedByLabel}>Matched by:</span>
            {entries.map(([, items], i) => (
                <span key={i} className={styles.matchedByGroup}>
                    {i > 0 && <span className={styles.matchedBySep}> | </span>}
                    <span className={styles.matchedByField}>{items[0].label}</span>
                    {" — "}
                    <span className={styles.matchedByValues}>
                        {items.map((m) => m.value).join(" · ")}
                    </span>
                </span>
            ))}
        </div>
    )
}

function VendorCard({ vendor, searchQuery, isPinned }: { vendor: VendorResult; searchQuery: string; isPinned: boolean }) {
    const { status, primaryContact, activities, jobCategories, hqAddress, matchedOn } = vendor
    // displayStage === "L3" is the authoritative L3 indicator; isApproved provides additional emphasis
    const isL3 = status?.displayStage === "L3"
    const isFullyApproved = isL3 && status?.isApproved
    const location = buildLocationString(hqAddress)

    const hasOnlyNameMatch =
        matchedOn.length === 1 && matchedOn[0].field === "companyName"

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
                        {isPinned && (
                            <span className={`${styles.badge} ${styles.badgePinned}`} title="Shown first due to L3 status — a closer match may appear below">
                                Pinned
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
                        >
                            <FontAwesomeIcon icon={faGlobe} className={styles.metaIcon} />
                            {vendor.website}
                        </a>
                    )}
                </div>
            </div>

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

            {/* Matched by — only when there are non-name matches */}
            {!hasOnlyNameMatch && <MatchedBySection matchedOn={matchedOn} />}

            {/* Footer action */}
            <div className={styles.cardFooter}>
                <Link href={`/staff/vendor/${vendor._id}`} className={styles.viewLink}>
                    View vendor
                </Link>
            </div>
        </div>
    )
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

const LOADING_MESSAGE_DELAYS = [0, 1500, 3500, 6000] // ms from activation

// Maps category values to the scan-phase description used in loading messages.
const CATEGORY_SCAN_LABEL: Record<string, string> = {
    all: "names, Business Activities, and Job Categories",
    name: "Company Name",
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
    const filteredResults = allResults.filter(
        (v) =>
            v.status?.status !== "returned" &&
            v.status?.status !== "parked" &&
            v.status?.status !== "pending"
    )
    const results =
        sortOrder === "relevance"
            ? [...filteredResults].sort((a, b) => b.score - a.score)
            : filteredResults

    // Highest score among non-L3 results on this page — used to flag L3 cards
    // that are pinned above more relevant non-L3 matches.
    const maxNonL3Score = filteredResults
        .filter((v) => v.status?.displayStage !== "L3")
        .reduce((max, v) => Math.max(max, v.score), 0)
    const parkedResults = allResults.filter((v) => v.status?.status === "parked")
    // Pending vendors (not yet submitted into the approval pipeline) are grouped
    // with returned vendors — neither should appear in the main results list.
    const returnedResults = allResults.filter(
        (v) => v.status?.status === "returned" || v.status?.status === "pending"
    )
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

    return (
        <div className={styles.page}>
            {/* Page heading */}
            <header className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Vendor Search</h2>
                <p className={styles.pageSubtitle}>
                    Search the knowledge bank to find vendors and contractors quickly.
                </p>
            </header>

            {/* Search input */}
            <div className={styles.searchSection}>
                <label htmlFor="vendorSearchInput" className={styles.searchLabel}>
                    Search vendors by name, activity, or category
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

                {/* ── No results ── */}
                {showNoResults && (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyStateText}>
                            No vendors found matching &ldquo;{debouncedQuery}&rdquo;. Try a different term or category.
                        </p>
                    </div>
                )}

                {/* ── Results ── */}
                {!isLoading && !isError && results.length > 0 && (
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
                                    {hiddenParked > 0 && (
                                        <button
                                            className={`${styles.hiddenChip} ${showParked ? styles.hiddenChipActive : ""}`}
                                            onClick={() => setShowParked((v) => !v)}
                                        >
                                            {showParked ? "Hide" : "Show"} {hiddenParked} parked
                                        </button>
                                    )}
                                    {hiddenReturned > 0 && (
                                        <button
                                            className={`${styles.hiddenChip} ${showReturned ? styles.hiddenChipActive : ""}`}
                                            onClick={() => setShowReturned((v) => !v)}
                                        >
                                            {showReturned ? "Hide" : "Show"} {hiddenReturned} returned & pending
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Hidden groups — above main results */}
                        {showParked && parkedResults.length > 0 && (
                            <div className={styles.hiddenSection}>
                                <p className={styles.hiddenSectionLabel}>Parked vendors</p>
                                <div className={styles.resultsList}>
                                    {parkedResults.map((vendor) => (
                                        <VendorCard key={vendor._id} vendor={vendor} searchQuery={debouncedQuery} isPinned={false} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {showReturned && returnedResults.length > 0 && (
                            <div className={styles.hiddenSection}>
                                <p className={styles.hiddenSectionLabel}>Returned & pending vendors</p>
                                <div className={styles.resultsList}>
                                    {returnedResults.map((vendor) => (
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
            </div>
        </div>
    )
}
