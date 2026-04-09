'use client'

import useDebounce from "@/hooks/useDebounce"
import { useLazyVendorSearchQuery } from "@/redux/features/vendorSearchSlice"
import { useAppSelector } from "@/redux/hooks"
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
import { useEffect, useState } from "react"
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
    { label: "Returned", value: "returned" },
    { label: "Parked", value: "parked" },
    { label: "Park Requested", value: "park requested" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
        case "approved":
            return styles.statusApproved
        case "returned":
            return styles.statusReturned
        case "parked":
        case "suspended":
            return styles.statusParked
        case "recommended for hold":
        case "park requested":
            return styles.statusParkRequested
        default:
            return styles.statusNeutral
    }
}

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

function VendorCard({ vendor, searchQuery }: { vendor: VendorResult; searchQuery: string }) {
    const { status, primaryContact, activities, jobCategories, hqAddress, matchedOn } = vendor
    // displayStage === "L3" is the authoritative L3 indicator; isApproved provides additional emphasis
    const isL3 = status?.displayStage === "L3"
    const isFullyApproved = isL3 && status?.isApproved
    const location = buildLocationString(hqAddress)

    const hasOnlyNameMatch =
        matchedOn.length === 1 && matchedOn[0].field === "companyName"

    // Sets of matched values for activity / category pills — used to highlight exactly
    // which pills triggered the match, using the value from matchedOn
    const nameMatched = matchedOn.some((m) => m.field === "companyName")
    const matchedActivityValues = new Set(
        matchedOn.filter((m) => m.field === "activity").map((m) => m.value.toLowerCase())
    )
    const matchedCategoryValues = new Set(
        matchedOn.filter((m) => m.field === "jobCategory").map((m) => m.value.toLowerCase())
    )

    return (
        <div className={`${styles.card} ${isL3 ? styles.cardApproved : ""}`}>
            {/* Header row */}
            <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                    <h3 className={styles.companyName}>
                        {nameMatched
                            ? <HighlightText text={vendor.companyName} query={searchQuery} />
                            : vendor.companyName}
                    </h3>
                    <div className={styles.badgeRow}>
                        {isL3 && (
                            <span className={`${styles.badge} ${styles.badgeL3}`}>
                                {isFullyApproved ? "L3 Approved" : "L3"}
                            </span>
                        )}
                        {status?.isPriority && (
                            <span className={`${styles.badge} ${styles.badgePriority}`}>
                                <FontAwesomeIcon icon={faStar} className={styles.starIcon} />
                                Priority
                            </span>
                        )}
                        <span className={`${styles.badge} ${styles.badgeStage}`}>
                            {status?.displayStage ?? "Unknown"}
                        </span>
                        <span className={`${styles.badge} ${getStatusClass(status?.status)}`}>
                            {status?.status ?? "Unknown"}
                        </span>
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
                            const isMatched =
                                matchedActivityValues.has(a.display.toLowerCase()) ||
                                matchedActivityValues.has(a.value.toLowerCase())
                            return (
                                <span
                                    key={i}
                                    className={`${styles.tag} ${isMatched ? styles.tagActivityMatched : styles.tagActivity}`}
                                >
                                    {isMatched
                                        ? <HighlightText text={a.display} query={searchQuery} />
                                        : a.display}
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
                            const isMatched = matchedCategoryValues.has(c.label.toLowerCase())
                            return (
                                <span
                                    key={i}
                                    className={`${styles.tag} ${isMatched ? styles.tagCategoryMatched : styles.tagCategory}`}
                                >
                                    {isMatched
                                        ? <HighlightText text={c.label} query={searchQuery} />
                                        : c.label}
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Matched by — only when there are non-name matches */}
            {!hasOnlyNameMatch && <MatchedBySection matchedOn={matchedOn} />}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorSearchPage() {
    const user = useAppSelector((state: any) => state.user.user)

    const [query, setQuery] = useState("")
    const [category, setCategory] = useState<"all" | "name" | "activities" | "categories">("all")
    const [statusFilter, setStatusFilter] = useState("")
    const [page, setPage] = useState(1)

    const debouncedQuery = useDebounce(query, 350)

    const [triggerSearch, { data, isLoading, isError, error }] = useLazyVendorSearchQuery()

    const isForbidden =
        isError && (error as any)?.status === 403

    const results: VendorResult[] = data?.data?.results ?? []
    const total: number = data?.data?.total ?? 0
    const totalPages = Math.ceil(total / (data?.data?.limit ?? 20))

    // Fire search whenever debounced query, category, status, or page changes
    useEffect(() => {
        if (debouncedQuery.length < 2) return
        triggerSearch({
            q: debouncedQuery,
            category,
            status: statusFilter || undefined,
            page,
            limit: 20,
            userRole: user?.role ?? "",
        })
    }, [debouncedQuery, category, statusFilter, page])

    // Reset page when search params change (not page itself)
    useEffect(() => {
        setPage(1)
    }, [debouncedQuery, category, statusFilter])

    // Determine empty-state type
    const showMinCharsHint = query.length > 0 && query.length < 2
    const showNoResults =
        !isLoading && !isError && debouncedQuery.length >= 2 && results.length === 0
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
                    {isLoading && <span className={styles.spinnerInline} />}
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

                {/* ── Loading ── */}
                {isLoading && (
                    <div className={styles.loadingState}>
                        <span className={styles.spinner} />
                        <p>Searching vendors…</p>
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
                        </div>

                        <div className={styles.resultsList}>
                            {results.map((vendor) => (
                                <VendorCard key={vendor._id} vendor={vendor} searchQuery={debouncedQuery} />
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
                                <span className={styles.pageInfo}>
                                    Page {page} of {totalPages}
                                </span>
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
