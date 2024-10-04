'use client'
import StageA from "@/components/approvalComponents/stageA"
import styles from "./styles/styles.module.css"
import { useParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { getProtected } from "@/requests/get"

const Approval = () => {
    const params = useParams()
    const [vendorData, setVendorData] = useState({
        approvalData:{},
        pages: []
    })
    

    console.log({pathname: params.id});
    
    useEffect(() => {
        if (params.id) {
            fetchVendorData(params.id)
        }
    }, [params])

    const fetchVendorData = async (vendorID) => {
        try {
            const fetchVendorDataRequest = await getProtected(`companies//approval-data/${vendorID}`)

            console.log({fetchVendorDataRequest});

            if (fetchVendorDataRequest.status === "OK") {
                let tempVendorData = {...vendorData}
                tempVendorData.approvalData = fetchVendorDataRequest.data.approvalData
                tempVendorData.pages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages
                setVendorData(tempVendorData)
            }

            
            
        } catch (error) {
            console.log({error});
        }
    }

    return (
        <div>
            <StageA approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} />
        </div>
    )
}

export default Approval