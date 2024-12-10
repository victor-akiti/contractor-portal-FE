'use client'
import styles from "./styles/styles.module.css"
import arrowRight from "@/assets/images/arrowRight.svg"
import arrowDown from "@/assets/images/arrowDown.svg"
import { useEffect, useState } from "react"
import Image from "next/image"


const Accordion = ({children, title, defaultOpen, noHeader = false}) => {
    const [accordionState, setAccordionState] = useState("open")

    const toggleAccordion = () => {
        if (accordionState === "open") {
            setAccordionState("closed")
        } else {
            setAccordionState("open")
        }
    }
    
    useEffect(() => {
        setAccordionState(defaultOpen ? "open" : "closed")
    }, [defaultOpen])

    return (
        <div className={styles.accordion}>
            {
                !noHeader && <header onClick={() => toggleAccordion()}>
                <h5>{title}</h5>

                <div>
                    <Image src={accordionState === "open" ? arrowDown: arrowRight} alt="accordion open icon" width={100} height={100} style={{width: "30px", height: "30px"}} />
                </div>
            </header>
            }

            {
                noHeader && <div className={styles.headingSpace}>

                </div>
            }

            {
                accordionState === "open" && <div className={styles.content}>
                    {children}
                </div>
            }

            <hr />
        </div>
    )
}

export default Accordion