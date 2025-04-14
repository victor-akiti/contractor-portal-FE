'use client'
import { useEffect, useRef, useState } from "react"
import styles from "./styles/styles.module.css"
import { getProtected } from "@/requests/get"
import moment from "moment"
import { useSelector } from "react-redux"
import { type } from "os"

const Events = () => {
    const [events, setEvents] = useState([])
    const [fixedEvents, setFixedEvents] = useState([])
    const [searchBy, setSearchBy] = useState("all")
    const [filterRange, setFilterRange] = useState({
        startDate: null,
        endDate: null
    })

    const startDateRef = useRef(null)
    const endDateRef = useRef(null)
    const searchInputRef = useRef(null)


    useEffect(() => {
        fetchAllEvents()
    }, [])

    const user = useSelector((state) => state.user.user)

    const fetchAllEvents= async () => {
        try {
            const fetchAllEventsRequest = await getProtected("events/all", user.role)

            console.log({fetchAllEventsRequest});

            if (fetchAllEventsRequest.status === "OK") {
                setEvents(fetchAllEventsRequest.data)
                setFixedEvents(fetchAllEventsRequest.data)
            }
            
        } catch (error) {
            console.log({error});
        }
    }

    const searchEvents = async (searchTerm) => {
        let tempEvents = [...fixedEvents]

        if (searchBy === "all") {
            tempEvents = tempEvents.filter(event => {
                if ((event.vendorName && event.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) || (event.userName && event.userName.toLowerCase().includes(searchTerm.toLowerCase()))) {
                    return event
                }
            })

        } else if (searchBy === "company") {
            tempEvents = tempEvents.filter(event => {
                if ((event.vendorName && event.vendorName.toLowerCase().includes(searchTerm.toLowerCase()))) {
                    return event
                }
            })
        } else if (searchBy === "user") {
            tempEvents = tempEvents.filter(event => {
                if ((event.userName && event.userName.toLowerCase().includes(searchTerm.toLowerCase()))) {
                    return event
                }
            })
        }


        setEvents(tempEvents)
        
    }
    
    const filterEventsByDate = () => {
        let tempEvents = [...fixedEvents]

        {
            if (filterRange.startDate && filterRange.endDate) {
                tempEvents = tempEvents.filter(event => {
                    const eventTimestamp = new Date(event.createdAt).getTime()
                    const startDateTimestamp = new Date(filterRange.startDate).getTime()
                    const endDateTimestamp = new Date(filterRange.endDate).getTime()
        
                    if ((eventTimestamp >= startDateTimestamp && eventTimestamp <= endDateTimestamp)) {
                        return event
                    } else if (startDateTimestamp === endDateTimestamp) {
                        const eventDate = new Date(event.createdAt)
                        const startDate = new Date(filterRange.startDate)

                        console.log({eventDate, startDate});
                        
        
                        if (eventDate.getDate() === startDate.getDate() + 1 && eventDate.getMonth() === startDate.getMonth() && eventDate.getFullYear() === startDate.getFullYear()) {
                            return event
                        }
                    }
                })
            }
        }

        setEvents(tempEvents)
    }

    const resetSearchAndFilter = () => {
        let tempEvents = [...fixedEvents]

        startDateRef.current.value = null
        endDateRef.current.value = null
        searchInputRef.current.value = null

        setEvents(tempEvents)
    }

    const updateFilterRange = (date, type) => {
        let tempFilterRange = {...filterRange}
        tempFilterRange[type] = date
        
        if (type === "startDate" && filterRange.endDate) {
            let startDate = new Date(date).getTime()
            let endDate = new Date(filterRange.endDate).getTime()

            if (startDate > endDate) {
                endDateRef.current.value = date
                tempFilterRange.endDate = date
            }
        } else if (type === "endDate" && filterRange.startDate) {
            let startDate = new Date(filterRange.startDate).getTime()
            let endDate = new Date(date).getTime()

            if (startDate > endDate) {
                startDateRef.current.value = date
                tempFilterRange.startDate = date
            }
        }

        setFilterRange(tempFilterRange)
    }
    


    return (
        <div className={styles.events}>
            <h2>Events</h2>

            <div className={styles.searchDiv}>
                <input placeholder="Search event logs" onChange={event => searchEvents(event.target.value)} ref={searchInputRef} />

                <select onChange={event => setSearchBy(event.target.value)}>
                    <option value="all">Search all</option>
                    <option value="company">Search by company name</option>
                    <option value="user">Search by user name</option>
                </select>

                {/* <button>Search</button> */}
            </div>

            <div className={styles.filterDiv}>
                <p>Filter by date:</p>

                <div>
                    <input type="date" placeholder="Start date" onChange={event => updateFilterRange(event.target.value, "startDate")} ref={startDateRef} />

                    <input type="date" placeholder="End date" onChange={event => updateFilterRange(event.target.value, "endDate")} ref={endDateRef} />

                    <button onClick={() => filterEventsByDate()}>Filter</button>

                    <button className={styles.resetButton} onClick={() => resetSearchAndFilter()}>Reset</button>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <td>
                            Company Name
                        </td>

                        <td>
                            Event
                        </td>

                        <td>
                            User
                        </td>

                        <td>
                            Time
                        </td>
                    </tr>
                </thead>

                <tbody>
                    {
                        events.map((event, index) => <tr key={index} className={index%2 === 0 && styles.darkBackground}>
                            <td>
                                {event.vendorName}
                            </td>

                            <td>
                                {event.eventDescription ? event.eventDescription : event.eventName}
                            </td>

                            <td>
                                {event.userName ? event.userName : event?.userID?.name ? event.userID.name : "Name Unavailable"}
                            </td>

                            <td>
                                {moment(event.createdAt).format("MMMM Do YYYY, h:mm:ss a")}
                            </td>
                        </tr>)
                    }
                </tbody>
            </table>
        </div>
    )
}

export default Events