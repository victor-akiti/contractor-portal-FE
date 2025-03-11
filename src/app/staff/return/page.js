'use client'

import Link from "next/link"
import styles from "./styles/styles.module.css"
import Tabs from "@/components/tabs/index"
import { useEffect, useRef, useState } from "react"
import { getProtected } from "@/requests/get"
import moment from "moment"
import { useAppSelector } from "@/redux/hooks"
import Modal from "@/components/modal"
import Loading from "@/components/loading"
import { postProtected } from "@/requests/post"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import SuccessMessage from "@/components/successMessage"
import PrimaryColorSmallLoadingIcon from "@/components/primaryColorLoadingIcon"
import FloatingProgressIndicator from "@/components/floatingProgressIndicator"
import { all } from "underscore"
import upIconBlack from "@/assets/images/upIconBlack.svg"
import downIconBlack from "@/assets/images/downIconBlack.svg"
import Image from "next/image"

function useOutsideClick(ref, onClickOut, deps = []){
    useEffect(() => {
        const onClick = ({target}) => !ref?.contains(target) && onClickOut?.()
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, deps);
}



const Approvals = () => {
    useEffect(() => {
        fetchAllApprovalsData()

        // triggerInviteMigration()
    }, [])
    const searchResultRef = useRef(null)

    
    

    

    const [approvals, setApprovals] = useState({
        completedL2: [],
        inProgress: [],
        invites: [],
        l3: [],
        pendingL2: [],
        returned: []
    })

    const [fixedApprovals, setFixedApprovals] = useState({
        completedL2: [],
        inProgress: [],
        invites: [],
        l3: [],
        pendingL2: [],
        returned: []
    })

    const [approvalsTabs, setApprovalsTabs] = useState([

        {
            label: "Pending L2",
            name: "pending-l2"
        },
        {
            label: "Completed L2",
            name: "completed-l2"
        },
        {
            label: "Returned To Contractor",
            name: "returned-to-contractor"
        },
        // {
        //     label: "Park Requests",
        //     name: "park-requests"
        // }
    ])

    const [inviteToArchive, setInviteToArchive] = useState({})


    const user= useAppSelector(state => state?.user?.user)




    const fetchAllApprovalsData = async () => {
        console.log("Fetching approvals data");
        try {
            const fetchAllApprovalsDataRequest = await getProtected("companies/approvals/all", user.role)

            console.log({fetchAllApprovalsDataRequest});
            setFetchingContractors(false)

            if (fetchAllApprovalsDataRequest.status === "OK") {
                console.log({allApprovalsData: fetchAllApprovalsDataRequest.data});
                
                let tempApprovals = {...approvals}
                tempApprovals = fetchAllApprovalsDataRequest.data
                setApprovals(tempApprovals)

                tempApprovals = {...fixedApprovals}
                tempApprovals = fetchAllApprovalsDataRequest.data
                setFixedApprovals(tempApprovals)

                if (fetchAllApprovalsDataRequest?.data?.parkRequested && fetchAllApprovalsDataRequest?.data?.parkRequested?.length > 0 && (user.role === "Admin" || user.role === "HOD" || user.role === "Supervisor" || user.role === "C&P Admin" || user.role === "IT Admin")) {
                    console.log("Park requests are available");
                    
                    let tempApprovalsTabs = [...approvalsTabs]
                    tempApprovalsTabs.push({
                        label: "Park Requests",
                        name: "park-requests"
                    })
                    setApprovalsTabs(tempApprovalsTabs)
                }

            }
        } catch (error) {
            console.log({error});
        }
    }



    const tableHeaders = {
        pendingL2: ["Select", "Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        completedL2: ["Select","Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        returned: ["Select","Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
    }

    const [activeTab, setActiveTab] = useState("pending-l2")
    const [activeFilter, setActiveFilter] = useState("All")
    const inviteFilters = ["All", "Active", "Used", "Expired", "Archived"]
    const approvalStages = ["A", "B", "C", "D", "E", "F"]
    const [searchQueryResults, setSearchQueryResults] = useState([])
    const[fetchingContractors, setFetchingContractors] = useState(true)
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [currentSearchFilter, setCurrentSearchFilter] = useState("all")
    const [actionProgress, setActionProgress] = useState("")
    const [returnToL2Data, setReturnToL2Data] = useState(null)

    const getActiveTable = () => {
        switch (activeTab) {
            case "invited": 
                return tableHeaders["invited"]
            case "in-progress":
                return tableHeaders["inProgress"]
            case "pendingL2":
                return tableHeaders["pendingL2"]
            case "l3":
                return tableHeaders["l3"]
            case "completed-l2":
                return tableHeaders["completedL2"]
            case "park-requests":
                return tableHeaders["parkRequests"]
            default:
                return tableHeaders["returned"]
        }
    }


    useOutsideClick(searchResultRef.current, () => {
        console.log("out click");

        let tempSearchQueryResults = [...searchQueryResults]
        tempSearchQueryResults = []
        setSearchQueryResults(tempSearchQueryResults)
        
    }, [searchQueryResults])



    const filterInvites = newFilter => {
        if (newFilter === "All") {
            let tempApprovals = {...approvals}
            tempApprovals = fixedApprovals
            setApprovals(tempApprovals)
        } else if (newFilter === "Used") {
            let tempApprovals = {...approvals}
            tempApprovals.invites = fixedApprovals.invites.filter(item => item.used)
            setApprovals(tempApprovals)
        } else if (newFilter === "Expired") {
                let tempApprovals = {...approvals}
                let expiredInvites = []

                for (let index = 0; index < fixedApprovals.invites.length; index++) {
                    const element = fixedApprovals.invites[index];

                    let currentDate = new Date()
                    let expiryDate = ""

                    if (element?.expiry?._seconds ) {
                        expiryDate = new Date(element?.expiry?._seconds * 1000)
                    } else {
                        expiryDate = new Date(element?.expiry)
                    }

                    if ((currentDate.getTime() > expiryDate.getTime()) && !element.used) {
                        expiredInvites.push(element)
                    }
                }

                console.log({expiredInvites});

                tempApprovals.invites = expiredInvites
            setApprovals(tempApprovals)
        } else if (newFilter === "Active") {
            let tempApprovals = {...approvals}
                let activeInvites = []

                for (let index = 0; index < fixedApprovals.invites.length; index++) {
                    const element = fixedApprovals.invites[index];

                    let currentDate = new Date()
                    let expiryDate = ""

                    

                    if (element?.expiry?._seconds ) {
                        expiryDate = new Date(element?.expiry?._seconds * 1000)
                    } else {
                        expiryDate = new Date(element?.expiry)
                    }

                    if (element.email === "testotesta@amni.com") {
                        console.log({expiryDate, element, expiry: element.expiry});
                    }

                    if ((currentDate.getTime() < expiryDate.getTime()) && !element.used) {
                        activeInvites.push(element)
                    }
                }

                console.log({activeInvites});

                tempApprovals.invites = activeInvites
            setApprovals(tempApprovals)
        }
    }

    const filterL2Companies = stage => {
        let tempApprovals = {...approvals}

        console.log({stage});
        let filteredArray = []

        if (stage === "All") {
            tempApprovals.pendingL2 = fixedApprovals.pendingL2
        } else if (stage === "A") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (!element?.flags?.level && !element?.flags?.approvals?.level) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "B") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.level === 1) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 1) {
                    filteredArray.push(element)
                }
                
            }


            
            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "C") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.level === 2) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 2) {
                    filteredArray.push(element)
                }
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "D") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.level === 3) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 3) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "E") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.level === 4) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 4) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "F") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.level === 5) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level &&element?.flags?.approvals?.level === 5) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "G") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.level === 6) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 6) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        }
        
        setApprovals(tempApprovals)
    }

    const filterInvitedCompaniesByNameOrEmail = name => {
        setActiveFilter("")
        let tempApprovals = {...approvals}
        tempApprovals.invites = fixedApprovals.invites.filter(item => String(item.companyName).toLocaleLowerCase().includes(String(name).toLocaleLowerCase()) || String(item.email).toLocaleLowerCase().includes(String(name).toLocaleLowerCase()) )
        setApprovals(tempApprovals)
    }

    const [archivingInvite, setArchivingInvite] = useState()
    const [archiveStatusMessages, setArchiveStatusMessages] = useState({
        errorMessage: "",
        successMessage: ""
    })

    const searchVendors = query => {
        console.log({query});
        let searchResults = [...searchQueryResults]
        switch (currentSearchFilter) {
            case "all": 
                searchResults = filterVendorsByQuery(query, fixedApprovals.all)
                break
            
            case "in progress": 
                searchResults = filterVendorsByQuery(query, fixedApprovals.inProgress)
                break
            
            case "pending": 
                searchResults = filterVendorsByQuery(query, fixedApprovals.pendingL2)
                break
            
            case "parked": 
                searchResults = filterVendorsByQuery(query, fixedApprovals.completedL2)
                break
            
            case "l3": 
                searchResults = filterVendorsByQuery(query, fixedApprovals.l3)
                break
            
            case "returned": 
                searchResults = filterVendorsByQuery(query, fixedApprovals.returned)
                break
            
            case "park requested": 
                searchResults = filterVendorsByQuery(query, fixedApprovals.parkRequested)
            
        }

        setSearchQueryResults(searchResults)

        console.log({searchResults});
        
        
    }

    const capitalizeWord = word => {
        return word.charAt(0).toUpperCase() + word.slice(1)
    }

    const filterVendorsByQuery = (query, vendorList) => {
        console.log({query, vendorList: vendorList.length});
        let mostRelevant = []
        let lessRelevant = []

        vendorList.forEach(element => {
            if (String(element.companyName).toLowerCase().startsWith(String(query).toLowerCase())) {
                mostRelevant.push(element)
            } else if (String(element.companyName).toLowerCase().includes(String(query).toLowerCase())) {
                lessRelevant.push(element)
            }
        });

        mostRelevant = sortListAlphabetically(mostRelevant)
        lessRelevant = sortListAlphabetically(lessRelevant)

        console.log({mostRelevant, lessRelevant});
        

        
        
        return [...mostRelevant, ...lessRelevant]
    }

    const sortListAlphabetically = list => {
        return list.sort((a, b) => {
                
    
            if (a?.companyName && b?.companyName) {
                const titleA = a?.companyName.toUpperCase(); // ignore upper and lowercase
            const titleB = b?.companyName.toUpperCase(); // ignore upper and lowercase
            if (titleA < titleB) {
              return -1;
            }
            if (titleA > titleB) {
              return 1;
            }
            } else {
                return 0
            }
          
            // names must be equal
            return 0;
        });
    }

    const getNextStage = (companyRecord) => {
       
        
        if (!companyRecord?.flags?.approvals?.level && !companyRecord?.flags?.level) {
            return "B"
        } else if (companyRecord?.flags?.level === 1 || companyRecord?.flags?.approvals?.level === 1) {
            return "C"
        } else if (companyRecord?.flags?.level === 2 || companyRecord?.flags?.approvals?.level === 2) {
            return "D"
        } else if (companyRecord?.flags?.level === 3 || companyRecord?.flags?.approvals?.level === 3) {
            return "E"
        } else if (companyRecord?.flags?.level === 4 || companyRecord?.flags?.approvals?.level === 4) {
            return "F"
        } else if (companyRecord?.flags?.level === 5 || companyRecord?.flags?.approvals?.level === 5) {
            return "G"
        } else if (companyRecord?.flags?.level === 6 || companyRecord?.flags?.approvals?.level === 6) {
            return "H"
        }
    }

      const setDataForReturnToL2 = (vendorID, from) => {
        setActionProgress("")
        let tempReturnToL2Data = {...returnToL2Data}
        tempReturnToL2Data = {
            vendorID,
            from
        }
        setReturnToL2Data(tempReturnToL2Data)
      }

      const cancelRevertToL2 = () => {
        let tempReturnToL2Data = {...returnToL2Data}
        tempReturnToL2Data = null
        setReturnToL2Data(tempReturnToL2Data)
      }

      console.log({returnToL2Data});
      

    console.log({currentSearchFilter});

    const [l3Filters, setL3Filters] = useState(["All", "Healthy", "With Vendor", "Yet To Be Reviewed"])
    const [activeL3Filter, setActiveL3Filter] = useState("All")
    const [nameSortAscending, setNameSortAscending] = useState(true)
    const [dateSortAscending, setDateSortAscending] = useState(true)
    
    //This function filters companies in the L3 category by the selected filter
    const filterL3Companies = (filter) => {

    }

    const showSortIcons = (index) => {
        if (activeTab === "invited") {
            return false
        } else{
            if (activeTab === "in-progress") {
                return true
            } else if (activeTab === "pending-l2" || activeTab === "completed-l2" || activeTab === "returned-to-contractor" ||  activeTab === "parkRequests") {
                if (index === 1 || index === 4) {
                    return true
                } else {
                    return false
                }
            } else if (activeTab === "l3") {
                if (index === 1 || index === 3) {
                    return true
                } else {
                    return false
                }
            }
        }
    }

    const [currentSort, setCurrentSort] = useState("alphabetical")

    const getSortToPerform = index => {
        if (index === 0) {
            toggleNameSort()
        } else {
            toggleDateSort()
        }
    }
    const toggleNameSort = () => {  
        let tempApprovals = {}

        console.log({currentSort});
        

        if (currentSort === "alphabetical") {
            tempApprovals = {...approvals}
        } else {
            tempApprovals = {...fixedApprovals}
        }

        console.log({nameSortAscending});
        

        if (nameSortAscending) {
            
            if (activeTab === "pending-l2") {
                tempApprovals.pendingL2 = sortArrayByNameDescending(tempApprovals.pendingL2)
            } else if (activeTab === "completed-l2") {
                tempApprovals.completedL2 = sortArrayByNameDescending(tempApprovals.completedL2)
            } else if (activeTab === "in-progress") {
                tempApprovals.inProgress = sortArrayByNameDescending(tempApprovals.inProgress)
            } else if (activeTab === "l3") {
                tempApprovals.l3 = sortArrayByNameDescending(tempApprovals.l3)
            } else if (activeTab === "returned-to-contractor") {
                tempApprovals.returned = sortArrayByNameDescending(tempApprovals.returned)
            } 
        } else {

            
            if (activeTab === "pending-l2") {
                tempApprovals.pendingL2 = sortArrayByName(tempApprovals.pendingL2)
            } else if (activeTab === "completed-l2") {
                tempApprovals.completedL2 = sortArrayByName(tempApprovals.completedL2)
            } else if (activeTab === "in-progress") {
                tempApprovals.inProgress = sortArrayByName(tempApprovals.inProgress)
            } else if (activeTab === "l3") {
                tempApprovals.l3 = sortArrayByName(tempApprovals.l3)
            } else if (activeTab === "returned-to-contractor") {
                tempApprovals.returned = sortArrayByName(tempApprovals.returned)
            } 
        }

        
        setApprovals(tempApprovals)
        setCurrentSort("alphabetical")
        setNameSortAscending(!nameSortAscending)
    }

    const sortArrayByName = (array) => {
        console.log("Sorting ascending");
        
        return array.sort((a, b) => {
            if (String(a.companyName).toLowerCase() > String(b.companyName).toLowerCase()) {
                return 1
            } else {
                return -1
            }
        })
    }

    const sortArrayByNameDescending = (array) => {
        console.log("Sorting descending");
        
        return array.sort((a, b) => {
            if (String(a.companyName).toLowerCase() > String(b.companyName).toLowerCase()) {
                return -1
            } else {
                return 1
            }
        })
    }

    const toggleDateSort = () => {
        console.log("Toggle date sort");
        
        let tempApprovals = {}

        if (currentSort === "numerical") {
            tempApprovals = {...approvals}
        } else {
            tempApprovals = {...fixedApprovals}
        }

        if (dateSortAscending) {
            if (activeTab === "pending-l2") {
                tempApprovals.pendingL2 = sortArrayNumericallyDescending(tempApprovals.pendingL2)
            } else if (activeTab === "completed-l2") {
                tempApprovals.completedL2 = sortArrayNumericallyDescending(tempApprovals.completedL2)
            } else if (activeTab === "in-progress") {
                tempApprovals.inProgress = sortArrayNumericallyDescending(tempApprovals.inProgress)
            } else if (activeTab === "l3") {
                tempApprovals.l3 = sortArrayNumericallyDescending(tempApprovals.l3)
            } else if (activeTab === "returned-to-contractor") {
                tempApprovals.returned = sortArrayNumericallyDescending(tempApprovals.returned)
            } 
        } else {
            if (activeTab === "pending-l2") {
                tempApprovals.pendingL2 = sortArrayNumerically(tempApprovals.pendingL2)
            } else if (activeTab === "completed-l2") {
                tempApprovals.completedL2 = sortArrayNumerically(tempApprovals.completedL2)
            } else if (activeTab === "in-progress") {
                tempApprovals.inProgress = sortArrayNumerically(tempApprovals.inProgress)
            } else if (activeTab === "l3") {
                tempApprovals.l3 = sortArrayNumerically(tempApprovals.l3)
            } else if (activeTab === "returned-to-contractor") {
                tempApprovals.returned = sortArrayNumerically(tempApprovals.returned)
            } 
        }
        
        setCurrentSort("numerical")
        setApprovals(tempApprovals)
        setDateSortAscending(!dateSortAscending)
    }
    

    console.log({currentSort});
    


    const sortArrayNumerically = array => {
        console.log("Sorting", array.length);
        
        const sortedArray =  array.sort((a, b) => {
            let aDate = null
            let bDate = null

            console.log({a});
            

            if (a.lastUpdate) {
                aDate = new Date(a.lastUpdate._seconds * 1000)

            } else if (a.lastApproved) {
                aDate = new Date(a.lastApproved)

            } else if (a.approvalActivityHistory) {
                aDate = new Date(a.approvalActivityHistory[0].date)
            } else {
                aDate = new Date()
            }

            aDate = aDate.getTime()

            if (b.lastUpdate) {
                bDate = new Date(b.lastUpdate._seconds * 1000)
            } else if (b.lastApproved) {
                bDate = new Date(b.lastApproved)
            } else if (b.approvalActivityHistory) {
                bDate = new Date(b.approvalActivityHistory[0].date)
            } else {
                bDate= new Date()
            }

            bDate = bDate.getTime()
            console.log({aDate, bDate});
            


          return aDate - bDate;
        });

        console.log({sortedArray});

        return sortedArray
        
    }

    const sortArrayNumericallyDescending = array => {
        console.log("Sorting", array.length);
        
        const sortedArray =  array.sort((a, b) => {
            let aDate = null
            let bDate = null

            console.log({a});
            

            if (a.lastUpdate) {
                aDate = new Date(a.lastUpdate._seconds * 1000)

            } else if (a.lastApproved) {
                aDate = new Date(a.lastApproved)

            } else if (a.approvalActivityHistory) {
                aDate = new Date(a.approvalActivityHistory[0].date)
            } else {
                aDate = new Date()
            }

            aDate = aDate.getTime()

            if (b.lastUpdate) {
                bDate = new Date(b.lastUpdate._seconds * 1000)
            } else if (b.lastApproved) {
                bDate = new Date(b.lastApproved)
            } else if (b.approvalActivityHistory) {
                bDate = new Date(b.approvalActivityHistory[0].date)
            } else {
                bDate= new Date()
            }

            bDate = bDate.getTime()

            


          return bDate - aDate;
        });

        console.log({sortedArray});

        return sortedArray
        
    }

    const getIconToDisplay = (index) => {
        if (index === 0) {
            if (nameSortAscending) {
                return upIconBlack 
            } else {
                return downIconBlack
            }
        } else {
            if (dateSortAscending) {
                return upIconBlack 
            } else {
                return downIconBlack
            }
        }
    }

    const vendorIsPending = vendorData => {
        return (vendorData?.flags?.status === "pending")
    }

    console.log({returnToL2Data});

    const [selectedVendors, setSelectedVendors] = useState([])
    const [selectedVendorsData, setSelectedVendorsData] = useState([])

    const toggleVendorSelection = (vendorData) => {
        if (selectedVendors.includes(vendorData._id)) {
            setSelectedVendors(selectedVendors.filter(vendor => vendor !== vendorData._id))
            setSelectedVendorsData(selectedVendorsData.filter(vendor => vendor._id !== vendorData._id))
        } else {
            setSelectedVendors([...selectedVendors, vendorData._id])
            setSelectedVendorsData([...selectedVendorsData, vendorData])
        }
    }

    console.log({selectedVendorsData});
    

    const clearSelectedVendors = () => {
        setSelectedVendors([])
        setSelectedVendorsData([])
    }

    const [showReturnApplicationsModal, setShowReturnApplicationsModal] = useState(false)

    const closeReturnApplicationsModal = () => {
        setShowReturnApplicationsModal(false)
        

        if (returnApplicationStatus.status === "success") {
            console.log("is success");
            
            clearSelectedVendors()
        }

        setReturnApplicationStatus({
            status: "",
            message: ""
        })
    }

    const openReturnApplicationsModal = () => {
        setShowReturnApplicationsModal(true)
    }

    const [returnApplicationStatus, setReturnApplicationStatus] = useState({
        status: "",
        message: "",
    })

    console.log({selectedVendors});
    
    const returnApplications = async () => {
        try {
            setReturnApplicationStatus({
                status: "returning",
                message: ""
            })

            const returnApplicationsRequest = await postProtected("approvals/existing/return", {selectedVendors}, user.role)

            console.log({returnApplicationsRequest});
            

            if (returnApplicationsRequest.status === "OK") {
                setReturnApplicationStatus({
                    status: "success",
                    message: returnApplicationsRequest.message
                })

                fetchAllApprovalsData()
            } else {
                setReturnApplicationStatus({
                    status: "error",
                    message: returnApplicationsRequest.error.message
                })
            }
        } catch (error) {
            console.log({error});
            
        }


    }
    

    

    

    return (
        <div className={styles.approvals}>
            {
                actionProgress && <FloatingProgressIndicator status={actionProgress} />
            }

            {
                showReturnApplicationsModal && <Modal>
                <div className={styles.returnApplicationsModal}>
                    <h2>Return Applications To Vendors</h2>

                    <div>
                        <p className={styles.modalBodyText}>You are about to return the following vendors applications. After re-submission, their applications will be returned to stage A.</p>

                        <div>
                            {
                                selectedVendorsData.map((item, index) => <p key={index} className={styles.companyItem}>{item.companyName}</p>)
                            }
                        </div>
                    </div>

                    {
                        returnApplicationStatus.status === "success" && <SuccessMessage message={"Vendor applications returned."} />
                    }

                    {
                        returnApplicationStatus.status === "error" && <ErrorText text={returnApplicationStatus.message} />
                    }

                    <div className={styles.footer}>
                        {
                            returnApplicationStatus.status !== "success" && <button onClick={() => returnApplications()}>Continue {returnApplicationStatus.status === "returning" && <ButtonLoadingIcon />}</button>
                        }
                        <button onClick={() => closeReturnApplicationsModal()}>{returnApplicationStatus.status === "success" ? "Close" : "Cancel"}</button>
                    </div>
                </div>
            </Modal>
            }

            <header>
                <h3>C&P Officer Dashboard</h3>

                <h5>Registration Returns</h5>
                
                {
                    !fetchingContractors && activeTab !== "invited" && <>
                        <label>Quick Search</label>

                        
                        <div className={styles.searchFilterDiv}>
                            <input  placeholder="Type company name..." onChange={event => searchVendors(event.target.value)}/>

                            <select onChange={(event) => setCurrentSearchFilter(event.target.value)}>
                                <option value={"all"}>All Registered Vendors</option>
                                <option value={"in progress"}>In Progress</option>
                                <option value={"pending"}>Pending L2</option>
                                <option value={"parked"}>Completed L2</option>
                                <option value={"l3"}>L3</option>
                                <option value={"returned"}>Returned</option>
                                <option value={"park requested"}>Park Requested</option>
                            </select>

                            {
                                searchQueryResults.length > 0 && <div className={styles.searchResultsDiv} ref={searchResultRef}>
                                {
                                    searchQueryResults.map((item, index) =>  <div key={index} className={styles.searchResultItem}>
                                    <div className={styles.searchResultMetaData}>
                                        <p>{String(item.companyName).toLocaleUpperCase()}</p>
                                        <p>{capitalizeWord(String(item?.flags?.status))}</p>
                                    </div>

                                    <div className={styles.searchResultsActionButtons}>
                                        <Link href={`/staff/vendor/${item?._id}`}><button>VIEW</button></Link>
                                        {
                                            vendorIsPending(item) && <Link href={`/staff/approvals/${item?._id}`}><button>{`Process to ${getNextStage(item)}`}</button></Link>
                                        }
                                    </div>
                                </div>)
                                }
                            </div>
                            }
                        </div>
                    </>
                }
            </header>

            <div className={styles.stageAReturnButtonDiv}>
                <button className={selectedVendors.length === 0 ? styles.inactive : styles.active} onClick={() => {
                    if (selectedVendors.length > 0) {
                        openReturnApplicationsModal()
                    }
                } }>Stage A Return</button>

                <button onClick={() => clearSelectedVendors()} className={styles.clearButton}>Clear Selected List</button>
            </div>


            {
                fetchingContractors && <div className={styles.loading}>
                    <Loading />
                    <p>Fetching Contractors...</p>
                </div>
            }

            {
                !fetchingContractors && <>
                        <Tabs tabs={approvalsTabs} activeTab={activeTab} updateActiveTab={newActiveTab => {
                            setActiveTab(newActiveTab)
                            setActiveFilter("All")
                        }} />

                    <div className={styles.inviteFilters}>
                        <label>Filter: </label>

                        {
                            activeTab === "invited" && <div>
                            {
                                inviteFilters.map((item, index) => <p className={item === activeFilter && styles.active} key={index} onClick={() => {
                                    setActiveFilter(item)
                                    filterInvites(item)
                                }}>{item}</p>)
                            }

                            <input placeholder="Filter by company name or email address" onChange={event => filterInvitedCompaniesByNameOrEmail(event.target.value)} />
                            </div>
                        }



                        {
                            activeTab === "pending-l2" && <div>
                                <p className={activeFilter === "All" && styles.active}  onClick={() => {
                                    setActiveFilter("All")
                                    filterL2Companies("All")
                                }}>{`All ${"All" === activeFilter ? `(${approvals.pendingL2.length})` : ``}`}</p>
                            {
                                approvalStages.map((item, index) => <p className={item === activeFilter && styles.active} key={index} onClick={() => {
                                    setActiveFilter(item)
                                    filterL2Companies(item)
                                }}>{`Stage ${item} ${item === activeFilter ? `(${approvals.pendingL2.length})` : ``}`}</p>)
                            }
                        </div>
                        }

                        {
                            activeTab === "l3" && <div>

                        {
                            l3Filters.map((item, index) => <p className={item === activeL3Filter && styles.active} key={index} onClick={() => {
                                setActiveL3Filter(item)
                                filterL3Companies(item)
                            }}>{`${item} ${item === activeL3Filter ? `(${approvals.l3.length})` : ``}`}</p>)
                        }
                    </div>
                        }
                        

                    </div>

                    {
                        errorMessage && <ErrorText />
                    }

                    {
                        successMessage && <SuccessMessage />
                    }

                    <table>
                        <thead>
                            { getActiveTable().map((item, index) => <td key={index}>
                                <div className={styles.tableHeading} onClick={() => getSortToPerform(index)}>
                                    {
                                        showSortIcons(index) && <Image src={getIconToDisplay(index)} alt="sort icon" width={15} height={15}  />
                                    }
                                    <p>{item}</p>
                                </div>
                            </td>)}
                        </thead>

                        <tbody>

                            {
                                activeTab === "pending-l2" && approvals.pendingL2.map((item, index) => <PendingL2Item key={index} user={user} companyRecord={item} index={index} selectedVendors={selectedVendors} toggleVendorSelection={vendorData => toggleVendorSelection(vendorData)} />)
                            }


                            {
                                activeTab === "completed-l2" && approvals.completedL2.map((item, index) => <CompletedL2Item revertToL2={vendorID => setDataForReturnToL2(item._id, "parked")} key={index} user={user} companyRecord={item} index={index} selectedVendors={selectedVendors} toggleVendorSelection={vendorData => toggleVendorSelection(vendorData)} />)
                            }

                            {
                                activeTab === "returned-to-contractor" && approvals.returned.map((item, index) => <ReturnedItem key={index} user={user} companyRecord={item} index={index} selectedVendors={selectedVendors} toggleVendorSelection={vendorData => toggleVendorSelection(vendorData)} />)
                            }
                        </tbody>
                    </table>
                </>
            }

            

            
        </div>
    )
}




const PendingL2Item = ({index, companyRecord, user, selectedVendors, toggleVendorSelection}) => {
    const userCanViewActions = () => {
        if (user.role === "Admin" || user.role === "HOD" || user.role === "Executive Approver") {
            return true
        } else if (user.role === "User") {
            return false
        } else if (companyRecord?.flags?.level === 2 && companyRecord.currentEndUsers.includes(user._id)) {
            return true
        } else if (user.role === "VRM" && (!companyRecord?.flags?.level ||companyRecord?.flags?.level === 3)) {
            return true
        } else if (user.role === "CO" && (!companyRecord?.flags?.level || companyRecord?.flags?.level === 2)) {
            return true
        } else if ((user.role === "GM" || user.role === "supervisor") && (!companyRecord?.flags?.level || companyRecord?.flags?.level === 4)) {
            return true
        } else {
            return false
        }
    }
    const getCurrentStage = () => {
        if (!companyRecord?.flags?.approvals?.level && !companyRecord?.flags?.level) {
            return "A"
        } else if (companyRecord?.flags?.level === 1 || companyRecord?.flags?.approvals?.level === 1) {
            return "B"
        } else if (companyRecord?.flags?.level === 2 || companyRecord?.flags?.approvals?.level === 2) {
            return "C"
        } else if (companyRecord?.flags?.level === 3 || companyRecord?.flags?.approvals?.level === 3) {
            return "D"
        } else if (companyRecord?.flags?.level === 4 || companyRecord?.flags?.approvals?.level === 4) {
            return "E"
        } else if (companyRecord?.flags?.level === 5 || companyRecord?.flags?.approvals?.level === 5) {
            return "F"
        } else if (companyRecord?.flags?.level === 6 || companyRecord?.flags?.approvals?.level === 6) {
            return "G"
        }
    }

    const getNextStage = () => {
        if (!companyRecord?.flags?.approvals?.level && !companyRecord?.flags?.level) {
            return "B"
        } else if (companyRecord?.flags?.level === 1 || companyRecord?.flags?.approvals?.level === 1) {
            return "C"
        } else if (companyRecord?.flags?.level === 2 || companyRecord?.flags?.approvals?.level === 2) {
            return "D"
        } else if (companyRecord?.flags?.level === 3 || companyRecord?.flags?.approvals?.level === 3) {
            return "E"
        } else if (companyRecord?.flags?.level === 4 || companyRecord?.flags?.approvals?.level === 4) {
            return "F"
        } else if (companyRecord?.flags?.level === 5 || companyRecord?.flags?.approvals?.level === 5) {
            return "G"
        } else if (companyRecord?.flags?.level === 6 || companyRecord?.flags?.approvals?.level === 6) {
            return "H"
        }
    }

    const getLastUpdated = () => {
        
        if (companyRecord.lastUpdate) {
            const lastUpdatedDate = new Date(companyRecord.lastUpdate._seconds * 1000)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.approvalActivityHistory) {
            const lastUpdatedDate = new Date(companyRecord.approvalActivityHistory[0].date)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.updatedAt) {
            const lastUpdatedDate = new Date(companyRecord.updatedAt)

            return lastUpdatedDate.toISOString()
        }
    }

    return (
        <tr className={[selectedVendors.includes(companyRecord._id) && styles.selectedVendor,styles.pendingL2Item, companyRecord.needsAttention ? styles.needsAttendionBackground : index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <input checked={selectedVendors.includes(companyRecord._id)} type="checkbox" onClick={() => toggleVendorSelection(companyRecord)} />
            </td>
            <td>
                <Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{`Stage ${getCurrentStage()}`}</p>
            </td>

            <td>
                {
                    userCanViewActions() && <Link href={`/staff/approvals/${companyRecord._id}`}>{`PROCESS TO STAGE ${getNextStage()}`}</Link>
                }
                {/* {
                    companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers.length > 0 && <>
                        <p>End User: App Dev</p>
                        <p>Change end user(s)</p>
                    </>
                } */}
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}




const CompletedL2Item = ({index, companyRecord, revertToL2, user, selectedVendors, toggleVendorSelection}) => {
    const getLastUpdated = () => {
        if (companyRecord.lastUpdate) {
            const lastUpdatedDate = new Date(companyRecord.lastUpdate._seconds * 1000)
            

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.approvalActivityHistory) {
            const lastUpdatedDate = new Date(companyRecord.approvalActivityHistory[0].date)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.updatedAt) {
            const lastUpdatedDate = new Date(companyRecord.updatedAt)

            return lastUpdatedDate.toISOString()
        }
    } 

    const hasAdminPermissions = (role) => {
        return (["Admin", "HOD"].includes(role))
    }

    const getCurrentStage = () => {
        if (!companyRecord?.flags?.approvals?.level) {
            return "A"
        } else if (companyRecord?.flags?.approvals?.level === 1) {
            return "B"
        } else if (companyRecord?.flags?.approvals?.level === 2) {
            return "C"
        } else if (companyRecord?.flags?.approvals?.level === 3) {
            return "D"
        } else if (companyRecord?.flags?.approvals?.level === 4) {
            return "E"
        } else if (companyRecord?.flags?.approvals?.level === 5) {
            return "F"
        } else if (companyRecord?.flags?.approvals?.level === 6) {
            return "G"
        }
    }

    return (
        <tr className={[selectedVendors.includes(companyRecord._id) && styles.selectedVendor,styles.completedL2Item, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <input checked={selectedVendors.includes(companyRecord._id)} type="checkbox" onClick={() => toggleVendorSelection(companyRecord)} />
            </td>
            <td>
                <Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{`Stage ${getCurrentStage()}`}</p>
            </td>

            <td>
                {
                    companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers.length > 0 && <>
                        {/* <p>End User: App Dev</p>
                        <p>Change end user(s)</p> */}
                    </>
                }  
                {
                    hasAdminPermissions(user.role) && <a onClick={() => revertToL2(companyRecord.vendor)}>REVERT TO PENDING L2</a>
                }

                
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}

const ReturnedItem = ({index, companyRecord, selectedVendors, toggleVendorSelection}) => {
    const getLastUpdated = () => {
        if (companyRecord.lastUpdate) {
            const lastUpdatedDate = new Date(companyRecord.lastUpdate._seconds * 1000)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.approvalActivityHistory) {
            const lastUpdatedDate = new Date(companyRecord.approvalActivityHistory[0].date)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.updatedAt) {
            const lastUpdatedDate = new Date(companyRecord.updatedAt)

            return lastUpdatedDate.toISOString()
        }
    }

    const getCurrentStage = () => {
        if (!companyRecord?.flags?.approvals?.level) {
            return "A"
        } else if (companyRecord?.flags?.approvals?.level === 1) {
            return "B"
        } else if (companyRecord?.flags?.approvals?.level === 2) {
            return "C"
        } else if (companyRecord?.flags?.approvals?.level === 3) {
            return "D"
        } else if (companyRecord?.flags?.approvals?.level === 4) {
            return "E"
        } else if (companyRecord?.flags?.approvals?.level === 5) {
            return "F"
        } else if (companyRecord?.flags?.approvals?.level === 6) {
            return "G"
        }
    }

    return (
        <tr className={[selectedVendors.includes(companyRecord._id) && styles.selectedVendor, styles.returnedItem, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <input checked={selectedVendors.includes(companyRecord._id)} type="checkbox" onClick={() => toggleVendorSelection(companyRecord)} />
            </td>
            <td>
                <Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{`Stage ${getCurrentStage()}`}</p>
            </td>

            <td>
                <Link href={`/staff/vendor/${companyRecord._id}`}>VIEW</Link>
                
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}


export default Approvals