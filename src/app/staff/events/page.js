'use client'
import { getProtected } from "@/requests/get"
import moment from "moment"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

const LIMIT = 100

const Events = () => {
    const [events, setEvents] = useState([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)

    const [searchBy, setSearchBy] = useState("all")
    const [search, setSearch] = useState("")
    const [filterRange, setFilterRange] = useState({ startDate: "", endDate: "" })
    const [appliedRange, setAppliedRange] = useState({ startDate: "", endDate: "" })

    const startDateRef = useRef(null)
    const endDateRef = useRef(null)
    const searchInputRef = useRef(null)
    const debounceRef = useRef(null)

    const user = useSelector((state) => state.user.user)

    const fetchEvents = useCallback(async (opts = {}) => {
        const p = opts.page ?? page
        const s = opts.search ?? search
        const sb = opts.searchBy ?? searchBy
        const range = opts.range ?? appliedRange

        const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
        if (s) { params.set("search", s); params.set("searchBy", sb) }
        if (range.startDate) params.set("startDate", range.startDate)
        if (range.endDate) params.set("endDate", range.endDate)

        setLoading(true)
        try {
            const res = await getProtected(`events/all?${params.toString()}`, user.role)
            if (res.status === "OK") {
                setEvents(res.data.events || [])
                setTotal(res.data.total || 0)
                setTotalPages(res.data.totalPages || 1)
            }
        } catch (error) {
            console.error({ error })
        } finally {
            setLoading(false)
        }
    }, [page, search, searchBy, appliedRange, user.role])

    useEffect(() => { fetchEvents() }, [fetchEvents])

    const onSearchChange = (value) => {
        setSearch(value)
        setPage(1)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchEvents({ search: value, page: 1 })
        }, 400)
    }

    const onSearchByChange = (value) => {
        setSearchBy(value)
        setPage(1)
        fetchEvents({ searchBy: value, page: 1 })
    }

    const applyDateFilter = () => {
        setAppliedRange(filterRange)
        setPage(1)
        fetchEvents({ range: filterRange, page: 1 })
    }

    const resetSearchAndFilter = () => {
        if (startDateRef.current) startDateRef.current.value = ""
        if (endDateRef.current) endDateRef.current.value = ""
        if (searchInputRef.current) searchInputRef.current.value = ""
        setSearch("")
        setSearchBy("all")
        setFilterRange({ startDate: "", endDate: "" })
        setAppliedRange({ startDate: "", endDate: "" })
        setPage(1)
        fetchEvents({ search: "", searchBy: "all", range: { startDate: "", endDate: "" }, page: 1 })
    }

    const updateFilterRange = (date, type) => {
        const next = { ...filterRange, [type]: date }
        if (type === "startDate" && filterRange.endDate && new Date(date) > new Date(filterRange.endDate)) {
            if (endDateRef.current) endDateRef.current.value = date
            next.endDate = date
        } else if (type === "endDate" && filterRange.startDate && new Date(filterRange.startDate) > new Date(date)) {
            if (startDateRef.current) startDateRef.current.value = date
            next.startDate = date
        }
        setFilterRange(next)
    }

    const goToPage = (p) => {
        const next = Math.min(Math.max(1, p), totalPages)
        if (next === page) return
        setPage(next)
        fetchEvents({ page: next })
    }

    return (
        <div className={styles.events}>
            <h2>Events</h2>

            <div className={styles.searchDiv}>
                <input placeholder="Search event logs" onChange={event => onSearchChange(event.target.value)} ref={searchInputRef} />

                <select value={searchBy} onChange={event => onSearchByChange(event.target.value)}>
                    <option value="all">Search all</option>
                    <option value="company">Search by company name</option>
                    <option value="user">Search by user name</option>
                </select>
            </div>

            <div className={styles.filterDiv}>
                <p>Filter by date:</p>

                <div>
                    <input type="date" placeholder="Start date" onChange={event => updateFilterRange(event.target.value, "startDate")} ref={startDateRef} />

                    <input type="date" placeholder="End date" onChange={event => updateFilterRange(event.target.value, "endDate")} ref={endDateRef} />

                    <button onClick={applyDateFilter}>Filter</button>

                    <button className={styles.resetButton} onClick={resetSearchAndFilter}>Reset</button>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
                <button disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>Prev</button>
                <span>Page {page} of {totalPages} ({total} total)</span>
                <button disabled={page >= totalPages || loading} onClick={() => goToPage(page + 1)}>Next</button>
                {loading && <span>Loading…</span>}
            </div>

            <table>
                <thead>
                    <tr>
                        <td>Company Name</td>
                        <td>Event</td>
                        <td>User</td>
                        <td>Time</td>
                    </tr>
                </thead>

                <tbody>
                    {
                        events.map((event, index) => <tr key={event._id || index} className={index%2 === 0 ? styles.darkBackground : undefined}>
                            <td>{event.vendorName}</td>
                            <td>{event.eventDescription ? event.eventDescription : event.eventName}</td>
                            <td>{event.userName ? event.userName : event?.userID?.name ? event.userID.name : "Name Unavailable"}</td>
                            <td>{moment(event.createdAt).format("MMMM Do YYYY, h:mm:ss a")}</td>
                        </tr>)
                    }
                </tbody>
            </table>
        </div>
    )
}

export default Events
