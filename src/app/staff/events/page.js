'use client'
import { useEffect, useState } from "react"
import styles from "./styles/styles.module.css"
import { getProtected } from "@/requests/get"
import moment from "moment"
import { useSelector } from "react-redux"

const Events = () => {
    const [events, setEvents] = useState([])

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
            }
            
        } catch (error) {
            console.log({error});
        }
    }


    return (
        <div className={styles.events}>
            <h2>Events</h2>

            <div>
                <input placeholder="Search event logs" />

                <button>Search</button>
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