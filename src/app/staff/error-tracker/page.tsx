'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { useRouter } from "next/navigation"
import { BACKEND_BASE_URL } from "@/lib/config"
import styles from "./styles/styles.module.css"

// ─── Types ──────────────────────────────────────────────────────────────────

type TopPath = { path: string; statusCode: number; count: number }

type ErrorStats = {
  total: number
  fiveXX: number
  fourXX: number
  topPaths: TopPath[]
}

type ErrorLog = {
  _id: string
  timestamp: string
  method: string
  path: string
  statusCode: number
  errorMessage: string
  stack?: string
  userId?: string
  userEmail?: string
  ip?: string
  userAgent?: string
  requestBody?: Record<string, any>
  responseTimeMs?: number
  source?: string
}

type Filters = {
  from: string
  to: string
  statusFilter: string
  method: string
  path: string
  page: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ["Admin", "IT Admin"]
const AUTO_REFRESH_SECS = 60
const STATUS_OPTIONS = ["", "5xx", "4xx", "500", "502", "403", "401", "404", "400", "408"]
const METHOD_OPTIONS = ["", "GET", "POST", "PUT", "DELETE", "PATCH"]

// ─── Utils ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function sevenDaysAgoISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

function toISORange(date: string, isEnd = false): string {
  return isEnd ? `${date}T23:59:59.999Z` : `${date}T00:00:00.000Z`
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  const day = d.getDate().toString().padStart(2, "0")
  const month = d.toLocaleDateString("en-GB", { month: "short" })
  const year = d.getFullYear()
  const time = d.toTimeString().slice(0, 8)
  return `${day} ${month} ${year} ${time}`
}

function formatDateRange(from: string, to: string): string {
  if (!from || !to) return "—"
  const fmt = (s: string) => {
    const d = new Date(s)
    return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`
  }
  return `${fmt(from)} – ${fmt(to)}`
}

function daysBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
}

function truncate(s: string, n: number): string {
  return s && s.length > n ? s.slice(0, n) + "…" : s ?? ""
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement("textarea")
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

const ErrorTrackerPage = () => {
  const user = useSelector((state: any) => state.user.user)
  const router = useRouter()

  const defaultFrom = sevenDaysAgoISO()
  const defaultTo = todayISO()

  // Filter bar editing state
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)
  const [statusFilter, setStatusFilter] = useState("")
  const [methodFilter, setMethodFilter] = useState("")
  const [pathFilter, setPathFilter] = useState("")
  const [filterError, setFilterError] = useState("")

  // Applied/active query filters
  const [filters, setFilters] = useState<Filters>({
    from: defaultFrom,
    to: defaultTo,
    statusFilter: "",
    method: "",
    path: "",
    page: 1,
  })

  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)
  const [accessDenied, setAccessDenied] = useState(false)
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null)

  // ─── Role guard ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.role) return
    if (!ALLOWED_ROLES.includes(user.role)) {
      router.push("/staff/approvals")
    }
  }, [user?.role, router])

  // ─── API helpers ─────────────────────────────────────────────────────────

  const apiFetch = useCallback(
    async (endpoint: string, params: Record<string, string | number>) => {
      const url = new URL(`${BACKEND_BASE_URL}/${endpoint}`)
      Object.entries(params).forEach(([k, v]) => {
        if (v !== "" && v !== undefined) url.searchParams.set(k, String(v))
      })
      const res = await fetch(url.toString(), {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true)
        throw new Error("ACCESS_DENIED")
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      return res.json()
    },
    []
  )

  const fetchAll = useCallback(
    async (f: Filters) => {
      setLoading(true)
      try {
        const fromISO = toISORange(f.from)
        const toISO = toISORange(f.to, true)
        const [statsData, errorsData] = await Promise.all([
          apiFetch("error-dashboard/api/stats", { from: fromISO, to: toISO }),
          apiFetch("error-dashboard/api/errors", {
            from: fromISO,
            to: toISO,
            statusFilter: f.statusFilter,
            method: f.method,
            path: f.path,
            page: f.page,
            limit: 25,
          }),
        ])
        setStats(statsData as ErrorStats)
        setErrors((errorsData as any).errors ?? [])
        setPagination({
          total: (errorsData as any).total ?? 0,
          page: (errorsData as any).page ?? 1,
          pages: (errorsData as any).pages ?? 1,
        })
      } catch (err: any) {
        if (err.message !== "ACCESS_DENIED") console.error(err)
      } finally {
        setLoading(false)
      }
    },
    [apiFetch]
  )

  const fetchErrorDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true)
      try {
        const detail = await apiFetch(`error-dashboard/api/errors/${id}`, {})
        setSelectedError(detail as ErrorLog)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingDetail(false)
      }
    },
    [apiFetch]
  )

  // ─── Data loading on filter changes ──────────────────────────────────────

  useEffect(() => {
    fetchAll(filters)
  }, [filters, fetchAll])

  // ─── Auto-refresh countdown ───────────────────────────────────────────────

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchAll(filtersRef.current)
          return AUTO_REFRESH_SECS
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [fetchAll])

  useEffect(() => {
    setCountdown(AUTO_REFRESH_SECS)
  }, [filters])

  // ─── Escape key handler ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedError(null)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ─── Event handlers ───────────────────────────────────────────────────────

  const handleApply = () => {
    setFilterError("")
    if (new Date(fromDate) > new Date(toDate)) {
      setFilterError("'From' date must be before 'To' date.")
      return
    }
    if (daysBetween(fromDate, toDate) > 30) {
      setFilterError("Date range cannot exceed 30 days.")
      return
    }
    setFilters({ from: fromDate, to: toDate, statusFilter, method: methodFilter, path: pathFilter, page: 1 })
  }

  const handleReset = () => {
    setFromDate(defaultFrom)
    setToDate(defaultTo)
    setStatusFilter("")
    setMethodFilter("")
    setPathFilter("")
    setFilterError("")
    setFilters({ from: defaultFrom, to: defaultTo, statusFilter: "", method: "", path: "", page: 1 })
  }

  const handlePageChange = (p: number) => {
    setFilters((prev) => ({ ...prev, page: p }))
  }

  const handleRowClick = (error: ErrorLog) => {
    setSelectedError(error)
    fetchErrorDetail(error._id)
  }

  const handleCopy = async (text: string, blockId: string) => {
    await copyToClipboard(text)
    setCopiedBlock(blockId)
    setTimeout(() => setCopiedBlock(null), 2000)
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderStatCards = () => (
    <div className={styles.statCards}>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Total Errors</div>
        <div className={styles.statValue}>{loading ? "—" : (stats?.total ?? 0)}</div>
      </div>
      <div className={`${styles.statCard} ${styles.statRed}`}>
        <div className={styles.statLabel}>5xx Server Errors</div>
        <div className={styles.statValue}>{loading ? "—" : (stats?.fiveXX ?? 0)}</div>
      </div>
      <div className={`${styles.statCard} ${styles.statOrange}`}>
        <div className={styles.statLabel}>4xx Client Errors</div>
        <div className={styles.statValue}>{loading ? "—" : (stats?.fourXX ?? 0)}</div>
      </div>
      <div className={`${styles.statCard} ${styles.statPurple}`}>
        <div className={styles.statLabel}>Selected Period</div>
        <div className={styles.statPeriod}>{formatDateRange(filters.from, filters.to)}</div>
      </div>
    </div>
  )

  const renderFiltersBar = () => (
    <div className={styles.filtersBar}>
      <div className={styles.filtersRow}>
        <div className={styles.filterGroup}>
          <label>From</label>
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>To</label>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            max={todayISO()}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>{o || "All"}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Method</label>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            {METHOD_OPTIONS.map((o) => (
              <option key={o} value={o}>{o || "All"}</option>
            ))}
          </select>
        </div>
        <div className={`${styles.filterGroup} ${styles.filterSearch}`}>
          <label>Search</label>
          <input
            type="text"
            placeholder="Path or error message..."
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <div className={styles.filterActions}>
          <button className={styles.applyBtn} onClick={handleApply}>Apply</button>
          <button className={styles.resetBtn} onClick={handleReset}>Reset</button>
        </div>
      </div>
      {filterError && <p className={styles.filterError}>{filterError}</p>}
    </div>
  )

  const renderTopPaths = () => {
    if (!stats?.topPaths?.length) return null
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Top Error Endpoints</h3>
        <div className={styles.topPathsGrid}>
          {stats.topPaths.map((p, i) => (
            <div
              key={i}
              className={`${styles.topPathCard} ${p.statusCode >= 500 ? styles.topPathRed : styles.topPathOrange}`}
            >
              <span className={styles.topPathBadge}>{p.statusCode}</span>
              <span className={styles.topPathPath} title={p.path}>{p.path}</span>
              <span className={styles.topPathCount}>{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMethodBadge = (method: string) => {
    const colorMap: Record<string, string> = {
      GET: styles.methodGet,
      POST: styles.methodPost,
      PUT: styles.methodPut,
      DELETE: styles.methodDelete,
      PATCH: styles.methodPatch,
    }
    return (
      <span className={`${styles.badge} ${colorMap[method] ?? styles.methodDefault}`}>
        {method}
      </span>
    )
  }

  const renderStatusBadge = (code: number) => (
    <span className={`${styles.badge} ${code >= 500 ? styles.statusRed : styles.statusOrange}`}>
      {code}
    </span>
  )

  const renderSkeleton = () => (
    <div className={styles.skeletonWrapper}>
      {[...Array(7)].map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          {[...Array(6)].map((__, j) => (
            <div key={j} className={styles.skeletonCell} />
          ))}
        </div>
      ))}
    </div>
  )

  const renderTable = () => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Error Log</h3>
      <div className={styles.tableWrapper}>
        {loading ? (
          renderSkeleton()
        ) : errors.length === 0 ? (
          <div className={styles.emptyState}>No errors in this period ✓</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Message</th>
                <th>Response Time</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err) => (
                <tr key={err._id} onClick={() => handleRowClick(err)} className={styles.tableRow}>
                  <td className={styles.timestampCell}>{formatTimestamp(err.timestamp)}</td>
                  <td>{renderMethodBadge(err.method)}</td>
                  <td className={styles.pathCell} title={err.path}>{truncate(err.path, 50)}</td>
                  <td>{renderStatusBadge(err.statusCode)}</td>
                  <td className={styles.msgCell} title={err.errorMessage}>
                    {truncate(err.errorMessage, 90)}
                  </td>
                  <td className={styles.rtCell}>
                    {err.responseTimeMs != null ? `${err.responseTimeMs}ms` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )

  const renderPagination = () => {
    if (!loading && pagination.total === 0) return null
    const { page, pages, total } = pagination
    const pageNums: number[] = []
    const start = Math.max(1, page - 2)
    const end = Math.min(pages, page + 2)
    for (let i = start; i <= end; i++) pageNums.push(i)

    return (
      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          Page {page} of {pages} ({total} total)
        </span>
        <div className={styles.paginationControls}>
          <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
            Prev
          </button>
          {start > 1 && (
            <>
              <button onClick={() => handlePageChange(1)}>1</button>
              <span className={styles.paginationEllipsis}>…</span>
            </>
          )}
          {pageNums.map((p) => (
            <button
              key={p}
              className={p === page ? styles.activePage : undefined}
              onClick={() => handlePageChange(p)}
            >
              {p}
            </button>
          ))}
          {end < pages && (
            <>
              <span className={styles.paginationEllipsis}>…</span>
              <button onClick={() => handlePageChange(pages)}>{pages}</button>
            </>
          )}
          <button disabled={page >= pages} onClick={() => handlePageChange(page + 1)}>
            Next
          </button>
        </div>
      </div>
    )
  }

  const renderCodeBlock = (label: string, content: string, blockId: string) => (
    <div className={styles.codeBlock}>
      <div className={styles.codeBlockHeader}>
        <span>{label}</span>
        <button
          className={styles.copyBtn}
          onClick={() => handleCopy(content, blockId)}
        >
          {copiedBlock === blockId ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className={styles.codeContent}>{content}</pre>
    </div>
  )

  const renderDetailModal = () => {
    if (!selectedError) return null
    const err = selectedError
    return (
      <div className={styles.modalBackdrop} onClick={() => setSelectedError(null)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3>Error Detail</h3>
            <button className={styles.modalClose} onClick={() => setSelectedError(null)}>
              ×
            </button>
          </div>
          <div className={styles.modalBody}>
            {loadingDetail && (
              <div className={styles.modalLoadingBar}>
                <div className={styles.modalLoadingProgress} />
              </div>
            )}
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Timestamp</span>
                <span className={styles.detailValue}>{formatTimestamp(err.timestamp)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Status Code</span>
                <span className={styles.detailValue}>{renderStatusBadge(err.statusCode)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Response Time</span>
                <span className={styles.detailValue}>
                  {err.responseTimeMs != null ? `${err.responseTimeMs}ms` : "—"}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Source</span>
                <span className={styles.detailValue}>{err.source ?? "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>User Email</span>
                <span className={styles.detailValue}>{err.userEmail ?? "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>User ID</span>
                <span className={`${styles.detailValue} ${styles.detailMono}`}>{err.userId ?? "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>IP Address</span>
                <span className={styles.detailValue}>{err.ip ?? "—"}</span>
              </div>
              <div className={`${styles.detailItem} ${styles.detailItemFull}`}>
                <span className={styles.detailLabel}>User Agent</span>
                <span className={`${styles.detailValue} ${styles.detailWrap}`}>{err.userAgent ?? "—"}</span>
              </div>
            </div>

            {err.errorMessage && renderCodeBlock(
              "Error Message",
              err.errorMessage,
              `msg-${err._id}`
            )}
            {err.stack && renderCodeBlock(
              "Stack Trace",
              err.stack,
              `stack-${err._id}`
            )}
            {err.requestBody && renderCodeBlock(
              "Request Body",
              JSON.stringify(err.requestBody, null, 2),
              `body-${err._id}`
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Access denied state ──────────────────────────────────────────────────

  if (accessDenied) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedIcon}>⛔</div>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <button className={styles.applyBtn} onClick={() => router.push("/staff/approvals")}>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // ─── Role loading state ───────────────────────────────────────────────────

  if (!user?.role) {
    return <div className={styles.container} />
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return <div className={styles.container} />
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2>Error Tracker</h2>
        <div className={styles.refreshBadge}>
          Auto-refresh in{" "}
          <span className={countdown <= 10 ? styles.countdownUrgent : styles.countdownNormal}>
            {countdown}s
          </span>
        </div>
      </div>

      {renderStatCards()}
      {renderFiltersBar()}
      {!loading && renderTopPaths()}
      {renderTable()}
      {!loading && renderPagination()}
      {renderDetailModal()}
    </div>
  )
}

export default ErrorTrackerPage
