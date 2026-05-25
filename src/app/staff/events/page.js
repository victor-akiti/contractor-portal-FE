'use client'
import { useGetAllEventsQuery } from "@/redux/features/eventsSlice"
import moment from "moment"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

const PAGE_SIZE = 100

const Events = () => {
    const [searchInput, setSearchInput] = useState("")
    const [search, setSearch] = useState("")
    const [searchBy, setSearchBy] = useState("all")
    const [page, setPage] = useState(1)
    const [appliedRange, setAppliedRange] = useState({ startDate: "", endDate: "" })
    const [filterRange, setFilterRange] = useState({ startDate: "", endDate: "" })

    const startDateRef = useRef(null)
    const endDateRef = useRef(null)
    const searchInputRef = useRef(null)

    const user = useSelector((state) => state.user.user)

    // Debounce search input -> server query
    useEffect(() => {
        const handle = setTimeout(() => {
            setSearch(searchInput)
            setPage(1)
        }, 350)
        return () => clearTimeout(handle)
    }, [searchInput])

    // Reset to first page when search scope changes
    useEffect(() => {
        setPage(1)
    }, [searchBy])

    const { data, isFetching, isLoading } = useGetAllEventsQuery(
        {
            userRole: user?.role,
            page,
            limit: PAGE_SIZE,
            search,
            searchBy,
            startDate: appliedRange.startDate || undefined,
            endDate: appliedRange.endDate || undefined,
        },
        { skip: !user?.role }
    )

    const events = data?.events ?? []
    const total = data?.total ?? 0
    const totalPages = data?.totalPages ?? 1
    const currentPage = data?.page ?? page

    const filterEventsByDate = () => {
        setAppliedRange({ ...filterRange })
        setPage(1)
    }

    const resetSearchAndFilter = () => {
        if (startDateRef.current) startDateRef.current.value = ""
        if (endDateRef.current) endDateRef.current.value = ""
        if (searchInputRef.current) searchInputRef.current.value = ""

        setSearchInput("")
        setSearch("")
        setFilterRange({ startDate: "", endDate: "" })
        setAppliedRange({ startDate: "", endDate: "" })
        setPage(1)
    }

    const updateFilterRange = (date, type) => {
        let tempFilterRange = { ...filterRange }
        tempFilterRange[type] = date

        if (type === "startDate" && filterRange.endDate) {
            let startDate = new Date(date).getTime()
            let endDate = new Date(filterRange.endDate).getTime()

            if (startDate > endDate) {
                if (endDateRef.current) endDateRef.current.value = date
                tempFilterRange.endDate = date
            }
        } else if (type === "endDate" && filterRange.startDate) {
            let startDate = new Date(filterRange.startDate).getTime()
            let endDate = new Date(date).getTime()

            if (startDate > endDate) {
                if (startDateRef.current) startDateRef.current.value = date
                tempFilterRange.startDate = date
            }
        }

        setFilterRange(tempFilterRange)
    }

    const goToPage = (next) => {
        const clamped = Math.max(1, Math.min(totalPages, next))
        if (clamped !== currentPage) setPage(clamped)
    }

    return (
        <div className={styles.events}>
            <h2>Events</h2>

            <div className={styles.searchDiv}>
                <input
                    placeholder="Search event logs"
                    onChange={event => setSearchInput(event.target.value)}
                    ref={searchInputRef}
                />

                <select value={searchBy} onChange={event => setSearchBy(event.target.value)}>
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

                    <button onClick={filterEventsByDate}>Filter</button>

                    <button className={styles.resetButton} onClick={resetSearchAndFilter}>Reset</button>
                </div>
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
                    {events.map((event, index) => (
                        <tr key={event._id || index} className={index % 2 === 0 ? styles.darkBackground : undefined}>
                            <td>{event.vendorName}</td>
                            <td>{event.eventDescription ? event.eventDescription : event.eventName}</td>
                            <td>{event.userName ? event.userName : event?.userID?.name ? event.userID.name : "Name Unavailable"}</td>
                            <td>{moment(event.createdAt).format("MMMM Do YYYY, h:mm:ss a")}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className={styles.paginationDiv}>
                <span>
                    {isLoading || isFetching
                        ? "Loading…"
                        : total === 0
                            ? "No events"
                            : `Page ${currentPage} of ${totalPages} — ${total.toLocaleString()} events`}
                </span>

                <div>
                    <button onClick={() => goToPage(1)} disabled={currentPage <= 1 || isFetching}>First</button>
                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1 || isFetching}>Prev</button>
                    <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages || isFetching}>Next</button>
                    <button onClick={() => goToPage(totalPages)} disabled={currentPage >= totalPages || isFetching}>Last</button>
                </div>
            </div>
        </div>
    )
}

export default Events
