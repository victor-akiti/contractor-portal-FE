'use client'

import downIconBlack from "@/assets/images/downIconBlack.svg"
import upIconBlack from "@/assets/images/upIconBlack.svg"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import FloatingProgressIndicator from "@/components/floatingProgressIndicator"
import Loading from "@/components/loading"
import Modal from "@/components/modal"
import PrimaryColorSmallLoadingIcon from "@/components/primaryColorLoadingIcon"
import SuccessMessage from "@/components/successMessage"
import Tabs from "@/components/tabs/index"
import { useAppSelector } from "@/redux/hooks"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import xlsx from "json-as-xlsx"
import moment from "moment"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import styles from "./styles/styles.module.css"


function useOutsideClick(ref, onClickOut, deps = []){
    useEffect(() => {
        const onClick = ({target}) => !ref?.contains(target) && onClickOut?.()
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, deps);
}



const Approvals = () => {
    const [activeTab, setActiveTab] = useState("pending-l2")
    const [activeFilter, setActiveFilter] = useState("All")
    const [searchQueryResults, setSearchQueryResults] = useState([])
    const[fetchingContractors, setFetchingContractors] = useState(true)
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [currentSearchFilter, setCurrentSearchFilter] = useState("all")
    const [actionProgress, setActionProgress] = useState("")
    const [returnToL2Data, setReturnToL2Data] = useState(null)
    const [l3Filters, setL3Filters] = useState(["All", "Healthy", "With Vendor", "Yet To Be Reviewed"])
    const [activeL3Filter, setActiveL3Filter] = useState("All")
    const [nameSortAscending, setNameSortAscending] = useState(true)
    const [dateSortAscending, setDateSortAscending] = useState(true)
    const [inviteToArchive, setInviteToArchive] = useState({})
    const [currentSort, setCurrentSort] = useState("alphabetical")
    const [tabLoading, setTabLoading] = useState(false)

    // Add missing tabData state
    const [tabData, setTabData] = useState({
        'pending-l2': { companies: [], loaded: false },
        'completed-l2': { companies: [], loaded: false },
        'l3': { companies: [], loaded: false },
        'in-progress': { companies: [], loaded: false },
        'returned': { companies: [], loaded: false },
        'invited': { invites: [], loaded: false },
        'park-requests': { companies: [], loaded: false }
    })

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
            label: "Invited",
            name: "invited"
        },
        {
            label: "In Progress",
            name: "in-progress"
        },
        {
            label: "Pending L2",
            name: "pending-l2"
        },
        {
            label: "L3",
            name: "l3"
        },
        {
            label: "Completed L2",
            name: "completed-l2"
        },
        {
            label: "Returned To Contractor",
            name: "returned"
        },
        // {
        //     label: "Park Requests",
        //     name: "park-requests"
        // }
    ])

    const inviteFilters = ["All", "Active", "Used", "Expired", "Archived"]
    const approvalStages = ["A", "B", "C", "D", "E", "F"]
    const tableHeaders = {
        invited: ["Company Name", "User Details", "Status"],
        inProgress: ["Contractor Name", "Last Contractor Update"],
        pendingL2: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        l3: ["Contractor Name", "Action", "Last Contractor Update"],
        completedL2: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        returned: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        parkRequests: ["Contractor Name", "Approval Stage", "Requested By", "Action"],
    }
    
    const user= useAppSelector(state => state?.user?.user)
    const searchResultRef = useRef(null)

    useEffect(() => {
        fetchAllApprovalsData()
    }, [])
    
    const setInviteToArchiveObject = invite => {
        let tempInviteToArchive = {...inviteToArchive}
        tempInviteToArchive = invite
        setInviteToArchive(tempInviteToArchive)
    }

    const unsetInviteToArchiveObject = () => {
        let tempInviteToArchive = {...inviteToArchive}
        tempInviteToArchive = {}
        setInviteToArchive(tempInviteToArchive)

        let tempArchiveStatusMessages = {...archiveStatusMessages}
        tempArchiveStatusMessages = {
            successMessage: "",
            errorMessage: ""
        }
        setArchiveStatusMessages(tempArchiveStatusMessages)
        setArchivingInvite(false)
    }

    const updateTabLabelsWithCounts = (counts) => {
        setApprovalsTabs(prevTabs => 
            prevTabs.map(tab => {
                let count = 0
                switch(tab.name) {
                    case 'invited':
                        count = counts.invites?.total || 0
                        break
                    case 'in-progress':
                        count = counts.inProgress || 0
                        break
                    case 'pending-l2':
                        count = counts.pendingL2 || 0
                        break
                    case 'l3':
                        count = counts.l3 || 0
                        break
                    case 'completed-l2':
                        count = counts.completedL2 || 0
                        break
                    case 'returned':
                        count = counts.returned || 0
                        break
                    case 'park-requests':
                        count = counts.parkRequested || 0
                        break
                }
                return {
                    ...tab,
                    label: count > 0 ? `${tab.label.split(' (')[0]} (${count})` : tab.label.split(' (')[0]
                }
            })
        )
    }

    const fetchAllApprovalsData = async () => {
        console.log("Fetching approvals data");
        
        try {
            // Fast counts load first (650ms vs 25-60 seconds)
            const countsRequest = await getProtected("companies/approvals/counts", user.role)
            setFetchingContractors(false)
            
            if (countsRequest.status === "OK") {
                updateTabLabelsWithCounts(countsRequest.data.counts)
            }
            
            // Load initial tab data (400ms vs 25-60 seconds)
            fetchTabData(activeTab)
            
        } catch (error) {
            console.log({error});
            setFetchingContractors(false)
        }
    }

    const fetchTabData = async (tab) => {
        console.log(`Loading ${tab} data`);
        setTabLoading(true)
        
        try {
            let endpoint = ""
            if (tab === "invited") {
                endpoint = `companies/invites?filter=${activeFilter.toLowerCase()}`
            } else {
                // Fix the endpoint mapping
                const tabEndpointMap = {
                    "pending-l2": "pending-l2",
                    "completed-l2": "completed-l2", 
                    "l3": "l3",
                    "in-progress": "in-progress",
                    "returned": "returned", // Backend expects this format
                    "park-requests": "park-requests"
                }
                endpoint = `companies/approvals/${tabEndpointMap[tab] || tab}`
            }
            
            const response = await getProtected(endpoint, user.role)
            
            if (response.status === "OK") {
                // Update tabData for filtering reference
                setTabData(prev => ({
                    ...prev,
                    [tab]: {
                        companies: tab === "invited" ? [] : response.data.companies || [],
                        invites: tab === "invited" ? response.data.invites || [] : [],
                        loaded: true
                    }
                }))
                
                // Update approvals for display
                let tempApprovals = {...approvals}
                if (tab === "invited") {
                    tempApprovals.invites = response.data.invites || []
                } else if (tab === "pending-l2") {
                    tempApprovals.pendingL2 = response.data.companies || []
                } else if (tab === "completed-l2") {
                    tempApprovals.completedL2 = response.data.companies || []
                } else if (tab === "l3") {
                    tempApprovals.l3 = response.data.companies || []
                } else if (tab === "in-progress") {
                    tempApprovals.inProgress = response.data.companies || []
                } else if (tab === "returned") {
                    tempApprovals.returned = response.data.companies || []
                } else if (tab === "park-requests") {
                    tempApprovals.parkRequested = response.data.companies || []
                }
                setApprovals(tempApprovals)
                
                // Update fixedApprovals for filtering reference
                let tempFixedApprovals = {...fixedApprovals}
                if (tab === "invited") {
                    tempFixedApprovals.invites = response.data.invites || []
                } else if (tab === "pending-l2") {
                    tempFixedApprovals.pendingL2 = response.data.companies || []
                } else if (tab === "completed-l2") {
                    tempFixedApprovals.completedL2 = response.data.companies || []
                } else if (tab === "l3") {
                    tempFixedApprovals.l3 = response.data.companies || []
                } else if (tab === "in-progress") {
                    tempFixedApprovals.inProgress = response.data.companies || []
                } else if (tab === "returned") {
                    tempFixedApprovals.returned = response.data.companies || []
                } else if (tab === "park-requests") {
                    tempFixedApprovals.parkRequested = response.data.companies || []
                }
                setFixedApprovals(tempFixedApprovals)
                
                console.log(`${tab} data loaded:`, response.data.companies?.length || response.data.invites?.length || 0, 'records')
            }
        } catch (error) {
            console.log({error})
        } finally {
            setTabLoading(false)
        }
    }

    const handleTabChange = (newTab) => {
        setActiveTab(newTab)
        setActiveFilter("All")
        setSearchQueryResults([])
        fetchTabData(newTab)
    }

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
            tempApprovals.invites = fixedApprovals.invites
            setApprovals(tempApprovals)
        } else if (newFilter === "Used") {
            let tempApprovals = {...approvals}
            tempApprovals.invites = fixedApprovals.invites.filter(item => item.used)
            setApprovals(tempApprovals)
        } else if (newFilter === "Expired") {
                let tempApprovals = {...approvals}
                let expiredInvites = []

                for (let index = 0; index < fixedApprovals.invites?.length; index++) {
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

                for (let index = 0; index < fixedApprovals.invites?.length; index++) {
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
        // Get data from tabData which contains the full dataset
        const fullData = tabData['pending-l2']?.companies || fixedApprovals.pendingL2 || []
        let tempApprovals = {...approvals}
        let filteredArray = []

        console.log(`Filtering L2 companies by stage: ${stage}, full data count:`, fullData.length);

        if (stage === "All") {
            tempApprovals.pendingL2 = fullData
            setApprovals(tempApprovals)
            return
        } else if (stage === "A") {
            for (let index = 0; index < fullData.length; index++) {
                const element = fullData[index];
                if (!element?.flags?.level && !element?.flags?.approvals?.level) {
                    filteredArray.push(element)
                }
            }
            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "B") {
            for (let index = 0; index < fullData.length; index++) {
                const element = fullData[index];
                if (element?.flags?.level === 1) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 1) {
                    filteredArray.push(element)
                }
            }
            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "C") {
            for (let index = 0; index < fullData.length; index++) {
                const element = fullData[index];
                if (element?.flags?.level === 2) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 2) {
                    filteredArray.push(element)
                }
            }
            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "D") {
            for (let index = 0; index < fullData.length; index++) {
                const element = fullData[index];
                if (element?.flags?.level === 3) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 3) {
                    filteredArray.push(element)
                }
            }
            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "E") {
            for (let index = 0; index < fullData.length; index++) {
                const element = fullData[index];
                if (element?.flags?.level === 4) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 4) {
                    filteredArray.push(element)
                }
            }
            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "F") {
            for (let index = 0; index < fullData.length; index++) {
                const element = fullData[index];
                if (element?.flags?.level === 5) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 5) {
                    filteredArray.push(element)
                }
            }
            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "G") {
            for (let index = 0; index < fullData.length; index++) {
                const element = fullData[index];
                if (element?.flags?.level === 6) {
                    filteredArray.push(element)
                } else if (!element?.flags?.level && element?.flags?.approvals?.level === 6) {
                    filteredArray.push(element)
                }
            }
            tempApprovals.pendingL2 = filteredArray
        }
        
        console.log(`Filtered ${stage} companies:`, filteredArray.length);
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

    const archiveInvite = async () => {
        try {
            setArchivingInvite(true)
            const archiveInviteRequest = await postProtected("invites/archive", inviteToArchive, user.role)

            setArchivingInvite(false)

            let tempArchiveStatusMessages = {...archiveStatusMessages}
            if (archiveInviteRequest.status === "OK") {
                
                tempArchiveStatusMessages.successMessage = "Invite archived successfully."
            } else {
                tempArchiveStatusMessages.errorMessage = archiveInviteRequest.error.message
            }
            setArchiveStatusMessages(tempArchiveStatusMessages)

            let tempApprovals = {...approvals}
            tempApprovals.invites = tempApprovals.invites.filter(item => item._id !== inviteToArchive._id)
            setApprovals(tempApprovals)
        } catch (error) {
            console.log({error});
        }
    }

    const removeInviteFromExpiredList = inviteID => {
        console.log({inviteID});
    }

   const searchVendors = async (query) => {
        console.log({query});
        
        if (!query || query.length < 2) {
            setSearchQueryResults([])
            return
        }
        
        let searchResults = []
        
        try {
            let filterParam = "all"
            
            // Map your current filter values to backend filter parameters
            switch (currentSearchFilter) {
                case "all": 
                    filterParam = "all"
                    break
                case "in progress": 
                    filterParam = "in progress"
                    break
                case "pending": 
                    filterParam = "pending"
                    break
                case "parked": 
                    filterParam = "parked"
                    break
                case "l3": 
                    filterParam = "l3"
                    break
                case "returned": 
                    filterParam = "returned"
                    break
                case "park requested": 
                    filterParam = "park requested"
                    break
                default:
                    filterParam = "all"
            }
            
            const response = await getProtected(
                `companies/search?query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filterParam)}`, 
                user.role
            )
            
            if (response.status === "OK") {
                searchResults = response.data.companies
            }
            
        } catch (error) {
            console.log({error})
            searchResults = []
        }

        setSearchQueryResults(searchResults)
        console.log({searchResults});
    }

    const capitalizeWord = word => {
        return word.charAt(0).toUpperCase() + word.slice(1)
    }

    const filterVendorsByQuery = (query, vendorList) => {
        console.log({query, vendorList: vendorList?.length});
        let mostRelevant = []
        let lessRelevant = []

        vendorList?.forEach(element => {
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

    const approveParkRequest = async (vendorID) => {
        setActionProgress("processing")
        try {
          const approveRequest = await getProtected(`approvals/hold/approve/${vendorID}`, user.role)
          console.log({approveRequest})

          if (approveRequest.status === "OK") {
            setActionProgress("success")

            removeFIP()
            const tempApprovals = {...approvals}

            tempApprovals.parkRequested = tempApprovals.parkRequested.filter(item => {
                if (item.vendor !== vendorID) {
                    return item
                } else {
                    tempApprovals.completedL2.unshift(item)
                }
            })

            setApprovals(tempApprovals)
          } else {
            setActionProgress("error")
          }
        } catch (error) {
          console.log({error})
        }
      }

      const declineParkRequest = async (vendorID) => {
        console.log("Decline");
        try {
          const declineRequest = await getProtected(`approvals/hold/cancel/${vendorID}`, user.role)
          console.log({declineRequest})
        } catch (error) {
          console.log({error})
        }
      }

      const revertToL2 = async (vendorID, from) => {
        console.log({vendorID, from});
        
        setActionProgress("processing")
        try {
            const revertRequest = await postProtected(`approvals/revert/l2/${vendorID}`, {from}, user.role)

            if (revertRequest.status === "OK") {
                setActionProgress("success")
                const tempApprovals = {...approvals}

                if (from === "parked") {
                    tempApprovals.completedL2 = tempApprovals.completedL2.filter(item => {
                        if (item.vendor !== vendorID) {
                            return item
                        } else {
                            tempApprovals.pendingL2.unshift(item)
                        }
                    })
                } else if (from === "l3") {
                    tempApprovals.l3 = tempApprovals.l3.filter(item => {
                        if (item.vendor !== vendorID) {
                            return item
                        } else {
                            tempApprovals.pendingL2.unshift(item)
                        }
                    })
                } else if (from === "park requests") {
                    tempApprovals.parkRequested = tempApprovals.parkRequested.filter(item => {
                        if (item.vendor !== vendorID) {
                            return item
                        } else {
                            tempApprovals.pendingL2.unshift(item)
                        }
                    })
                }

                cancelRevertToL2()
                removeFIP()
                
                setApprovals(tempApprovals)
            } else {
                setActionProgress("error")
            }

        } catch (error) {
            console.log({error})
        }
      }

      const removeFIP = () => {
        setTimeout(() => {
            setActionProgress("")
        }, 4000)
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

    //This function filters companies in the L3 category by the selected filter
    const filterL3Companies = (filter) => {

    }

    const showSortIcons = (index) => {
        if (activeTab === "invited") {
            return false
        } else{
            if (activeTab === "in-progress") {
                return true
            } else if (activeTab === "pending-l2" || activeTab === "completed-l2" || activeTab === "returned" ||  activeTab === "parkRequests") {
                if (index === 0 || index === 3) {
                    return true
                } else {
                    return false
                }
            } else if (activeTab === "l3") {
                if (index === 0 || index === 2) {
                    return true
                } else {
                    return false
                }
            }
        }
    }

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
            } else if (activeTab === "returned") {
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
            } else if (activeTab === "returned") {
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
            } else if (activeTab === "returned") {
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
            } else if (activeTab === "returned") {
                tempApprovals.returned = sortArrayNumerically(tempApprovals.returned)
            } 
        }
        
        setCurrentSort("numerical")
        setApprovals(tempApprovals)
        setDateSortAscending(!dateSortAscending)
    }

    const sortArrayNumerically = array => {
        console.log("Sorting", array?.length);
        
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
        console.log("Sorting", array?.length);
        
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

    const userIsCnPStaff = () => {
        return (user?.role === "C and P Staff" || user?.role === "Admin" || user?.role === "C&P Admin" || user?.role === "IT Admin" || user?.role === "Supervisor" || user?.role === "VRM" || user?.role === "HOD")
    }

    const [exportOptions, setExportOptions] = useState({
        root: "invited",
        selectedInviteType: "all",
        selectedStages: [],
        l2Stages: [],
        pendingL2Stages: [],
        exportType: "all",
        selectedVendors: []
    })

    const [exportVendorSearchResults, setExportVendorSearchResults] = useState([])
    const [selectedVendorsToExport, setSelectedVendorsToExport] = useState([])
    const [selectedVendorsToExportIDs, setSelectedVendorsToExportIDs] = useState([])
    const [vendorsToExport, setVendorsToExport] = useState([])
    const [showExportModal, setShowExportModal] = useState(false)

    const updateExportOptions = (option, value) => {
        let tempExportOptions = {...exportOptions}
        tempExportOptions[option] = value
        setExportOptions(tempExportOptions)
    }

    const toggleExportOptions = (option, value) => {
        let tempExportOptions = {...exportOptions}

        if (tempExportOptions[option].includes(value)) {
            tempExportOptions[option] = tempExportOptions[option].filter(item => item !== value)
        } else {
            tempExportOptions[option].push(value)
        }

        setExportOptions(tempExportOptions)
    }

    const getL2PendingStage = flags => {
        
        if ((!flags.level && !flags?.approvals?.level)) {
            return "A"
        } else if (flags?.approvals?.level === 1) {
            return "B"
        } else if (flags?.approvals?.level === 2) {
            return "C"
        } else if (flags?.approvals?.level === 3) {
            return "D"
        } else if (flags?.approvals?.level === 4) {
            return "E"
        } else if (flags?.approvals?.level === 5) {
            return "F"
        } else if (flags?.approvals?.level === 6) {
            return "G"
        } else if (flags?.approvals?.level === 7) {
            return "H"
        } else {
            return "NA"
        }

    }

    const findVendorsByName = vendorName => {
        let vendorSearchResults = []

        if (exportOptions.selectedStages.includes("inProgress")) {
            fixedApprovals.inProgress?.forEach(item => {
                if (String(item.companyName).toLowerCase() === String(vendorName).toLowerCase() || String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
                    vendorSearchResults.push({...item, stage: "In Progress"})
                }
            })
        }

        if (exportOptions.selectedStages.includes("l2")) {
            
            
            if (exportOptions.l2Stages.includes("pending")) {
                fixedApprovals.pendingL2?.forEach(item => {
                    if (String(item.companyName).toLowerCase() === String(vendorName).toLowerCase() || String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
                        if (item.flags.status === "pending" || item.flags.stage === "pending") {
                            
                            if (exportOptions.pendingL2Stages.includes("All")) {
                                vendorSearchResults.push({...item, l2Stage: "Pending", stage: "L2", l2PendingStage: getL2PendingStage(item.flags)})
                            } else {
                                if (exportOptions.pendingL2Stages.includes("A") && (!item.flags?.approvals?.level)) {
                                    vendorSearchResults.push({...item, l2PendingStage: "A", l2Stage: "Pending", stage: "L2"})
                                }

                                if (exportOptions.pendingL2Stages.includes("B") && (item.flags?.approvals?.level === 1)) {
                                    vendorSearchResults.push({...item, l2PendingStage: "B", l2Stage: "Pending", stage: "L2"})
                                }

                                if (exportOptions.pendingL2Stages.includes("C") && (item.flags?.approvals?.level === 2)) {
                                    vendorSearchResults.push({...item, l2PendingStage: "C", l2Stage: "Pending", stage: "L2"})
                                }

                                if (exportOptions.pendingL2Stages.includes("D") && (item.flags?.approvals?.level === 3)) {
                                    vendorSearchResults.push({...item, l2PendingStage: "D", l2Stage: "Pending", stage: "L2"})
                                }

                                if (exportOptions.pendingL2Stages.includes("E") && (item.flags?.approvals?.level === 4)) {
                                    vendorSearchResults.push({...item, l2PendingStage: "E", l2Stage: "Pending", stage: "L2"})
                                }

                                if (exportOptions.pendingL2Stages.includes("F") && (!item.flags?.approvals?.level === 5)) {
                                    vendorSearchResults.push({...item, l2PendingStage: "F", l2Stage: "Pending", stage: "L2"})
                                }

                                if (exportOptions.pendingL2Stages.includes("G") && (!item.flags?.approvals?.level === 6)) {
                                    vendorSearchResults.push({...item, l2PendingStage: "G", l2Stage: "Pending", stage: "L2"})
                                }

                                if (exportOptions.pendingL2Stages.includes("H") && (!item.flags?.approvals?.level === 7)) {
                                    vendorSearchResults.push({...item, l2PendingStage: "H", l2Stage: "Pending", stage: "L2"})
                                }
                            }
                        }
                    }
                })
            }

            if (exportOptions.l2Stages.includes("completed")) {
                fixedApprovals.completedL2?.forEach(item => {
                    if (String(item.companyName).toLowerCase() === String(vendorName).toLowerCase() || String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
                        if (item.flags.status === "parked" || item.flags.stage === "parked") {
                            vendorSearchResults.push({...item, l2Stage: "Completed", stage: "L2"})
                        }
                    }
                })
            }

            if (exportOptions.l2Stages.includes("returned")) {
                console.log("filtering returned");
                fixedApprovals.returned?.forEach(item => {
                    if (String(item.companyName).toLowerCase() === String(vendorName).toLowerCase() || String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
                        if (item.flags.status === "returned" || item.flags.stage === "returned") {
                            vendorSearchResults.push({...item, l2Stage: "Returned", stage: "L2"})
                        }
                    }
                })
            }

            if (exportOptions.l2Stages.includes("returnRequested")) {
                if (fixedApprovals.returnRequested) {
                    fixedApprovals.returnRequested?.forEach(item => {
                        if (String(item.companyName).toLowerCase() === String(vendorName).toLowerCase() || String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
                            if (item.flags.status === "park requested" || item.flags.stage === "park requested") {
                                vendorSearchResults.push({...item, l2Stage: "Return Requested", stage: "L2"})
                            }
                        }
                    })
                }
            }
        }

        if (exportOptions.selectedStages.includes("l3")) {
            fixedApprovals.l3?.forEach(item => {
                if (String(item.companyName).toLowerCase() === String(vendorName).toLowerCase() || String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
                    vendorSearchResults.push({...item, stage: "L3"})
                }
            })
        }

        vendorSearchResults = sortArrayByName(vendorSearchResults)
        let tempVendorSearchResults = [...vendorSearchResults]
        setExportVendorSearchResults(tempVendorSearchResults)
        
    }

    const addVendorToSelectedList = (vendorData) => {
        if (!selectedVendorsToExportIDs.includes(vendorData._id)) {
            let tempSelectedVendorsToExport = [...selectedVendorsToExport]
            tempSelectedVendorsToExport.push(vendorData)
            setSelectedVendorsToExport(tempSelectedVendorsToExport)

            let tempSelectedVendorsToExportIDS = [...selectedVendorsToExportIDs]
            tempSelectedVendorsToExportIDS.push(vendorData._id)
            setSelectedVendorsToExportIDs(tempSelectedVendorsToExportIDS)

            //Clear search results
            let tempExportSearchResults = [...exportVendorSearchResults]
            tempExportSearchResults= []
            setExportVendorSearchResults(tempExportSearchResults)
        }
    }

    const removeVendorFromSelectedVendorsToExport = vendorID => {
        if (selectedVendorsToExportIDs.includes(vendorID)) {
            let tempSelectedVendorsToExport = [...selectedVendorsToExport]
            tempSelectedVendorsToExport = tempSelectedVendorsToExport.filter(item => item._id !== vendorID)
            setSelectedVendorsToExport(tempSelectedVendorsToExport)

            let tempSelectedVendorsToExportIDS = [...selectedVendorsToExportIDs]
            tempSelectedVendorsToExportIDS = tempSelectedVendorsToExportIDS.filter(item => item !== vendorID)
            setSelectedVendorsToExportIDs(tempSelectedVendorsToExportIDS)
        }
    }

    const exportContractors = () => {
        if (exportOptions.root === "invited") {
            exportInvitedVendors()
        } else {
            exportRegisteredVendors()
        }
    }

    const exportInvitedVendors = () => {
        let tempVendorsToExport = [...vendorsToExport]

        if (exportOptions.selectedInviteType === "all") {
            tempVendorsToExport = fixedApprovals.invites
        } else if (exportOptions.selectedInviteType === "active") {
            let activeInvites = []

            for (let index = 0; index < fixedApprovals.invites?.length; index++) {
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
            tempVendorsToExport = activeInvites
        } else if (exportOptions.selectedInviteType === "used") {
            tempVendorsToExport = fixedApprovals.invites.filter(item => item.used)
        } else if (exportOptions.selectedInviteType === "expired") {
            let expiredInvites = []

            for (let index = 0; index < fixedApprovals.invites?.length; index++) {
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

            tempVendorsToExport = expiredInvites
        } else {
            tempVendorsToExport = []
        }

        setVendorsToExport(tempVendorsToExport)

        console.log({tempVendorsToExport});
        

        exportExcelFile(tempVendorsToExport)
        
    }

    const exportRegisteredVendors = () => {
        let tempVendorsToExport = [...vendorsToExport]
        tempVendorsToExport = []

        if (exportOptions.exportType === "select") {
            tempVendorsToExport = selectedVendorsToExport
        } else {
            if (exportOptions.selectedStages.includes("inProgress")) {
                let mappedStage = fixedApprovals.inProgress.map(item => {
                    return {...item, stage: "In Progress"}
                })
                tempVendorsToExport = [...tempVendorsToExport, ...mappedStage]
            } 

            if (exportOptions.selectedStages.includes("l3")) {
                let mappedStage = fixedApprovals.l3.map(item => {
                    return {...item, stage: "L3"}
                })
                tempVendorsToExport = [...tempVendorsToExport, ...mappedStage]
            }

            if (exportOptions.selectedStages.includes("l2")) {
                if (exportOptions.l2Stages.includes("returned")) {
                    let mappedL2Stage = fixedApprovals.returned.map(item => {
                        return {...item, l2Stage: "Returned", stage: "L2"}
                    })

                    tempVendorsToExport = [...tempVendorsToExport, ...mappedL2Stage]
                }

                if (exportOptions.l2Stages.includes("completed")) {
                    let mappedL2Stage = fixedApprovals.completedL2.map(item => {
                        return {...item, l2Stage: "Completed", stage: "L2"}
                    })
                    tempVendorsToExport = [...tempVendorsToExport, ...mappedL2Stage]
                }

                if (exportOptions.l2Stages.includes("pending")) {
                    fixedApprovals.pendingL2?.forEach((item) => {
                        if (exportOptions.pendingL2Stages.includes("All")) {
                            tempVendorsToExport.push({...item, l2PendingStage: getL2PendingStage(item.flags), l2Stage: "Pending", stage: "L2"})
                        } else {
                            if (exportOptions.pendingL2Stages.includes("A") && (!item.flags?.approvals?.level)) {
                                tempVendorsToExport.push({...item, l2PendingStage: "A", l2Stage: "Pending", stage: "L2"})
                            }
    
                            if (exportOptions.pendingL2Stages.includes("B") && (item.flags?.approvals?.level === 1)) {
                                tempVendorsToExport.push({...item, l2PendingStage: "B", l2Stage: "Pending", stage: "L2"})
                            }
    
                            if (exportOptions.pendingL2Stages.includes("C") && (item.flags?.approvals?.level === 2)) {
                                tempVendorsToExport.push({...item, l2PendingStage: "C", l2Stage: "Pending", stage: "L2"})
                            }
    
                            if (exportOptions.pendingL2Stages.includes("D") && (item.flags?.approvals?.level === 3)) {
                                tempVendorsToExport.push({...item, l2PendingStage: "D", l2Stage: "Pending", stage: "L2"})
                            }
    
                            if (exportOptions.pendingL2Stages.includes("E") && (item.flags?.approvals?.level === 4)) {
                                tempVendorsToExport.push({...item, l2PendingStage: "E", l2Stage: "Pending", stage: "L2"})
                            }
    
                            if (exportOptions.pendingL2Stages.includes("F") && (!item.flags?.approvals?.level === 5)) {
                                tempVendorsToExport.push({...item, l2PendingStage: "F", l2Stage: "Pending", stage: "L2"})
                            }
    
                            if (exportOptions.pendingL2Stages.includes("G") && (!item.flags?.approvals?.level === 6)) {
                                tempVendorsToExport.push({...item, l2PendingStage: "G", l2Stage: "Pending", stage: "L2"})
                            }
    
                            if (exportOptions.pendingL2Stages.includes("H") && (!item.flags?.approvals?.level === 7)) {
                                tempVendorsToExport.push({...item, l2PendingStage: "H", l2Stage: "Pending", stage: "L2"})
                            }
                        }
                        
                    })
                }
            }
        }

        console.log({tempVendorsToExport});
        

        tempVendorsToExport = sortArrayByName(tempVendorsToExport)

        exportRegisteredVendorsToExcel(tempVendorsToExport)
        
    }

    const exportRegisteredVendorsToExcel = (exportData) => {
        
        let data = [
            {
              sheet: "Vendors List",
              columns: [
                { label: "Company Name", value: "companyName" }, // Top level data
                { label: "Stage", value: "stage" }, // Custom format
                { label: "L2 Stage", value: "l2Stage" },
                { label: "Pending L2 Stage", value: "l2PendingStage" }, // Run functions
                { label: "Last Updated", value: row => {
                    const createdDate = new Date(row.updatedAt)
                    return createdDate
                }},

              ],
              content: exportData,
            },

          ]
          
          let settings = {
            fileName: "VendorListExport", // Name of the resulting spreadsheet
            extraLength: 3, // A bigger number means that columns will be wider
            writeMode: "writeFile", // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
            writeOptions: {}, // Style options from https://docs.sheetjs.com/docs/api/write-options
            RTL: false, // Display the columns from right-to-left (the default value is false)
          }
          
          xlsx(data, settings)
    }

    const inviteIsActive = invite => {
        const element = invite

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
            return true
        } else {
            return false
        }
    }

    const inviteHasExpired = invite => {
        const element = invite;

        let currentDate = new Date()
        let expiryDate = ""

        if (element?.expiry?._seconds ) {
            expiryDate = new Date(element?.expiry?._seconds * 1000)
        } else {
            expiryDate = new Date(element?.expiry)
        }

        if ((currentDate.getTime() > expiryDate.getTime()) && !element.used) {
            return true
        } else {
            return false
        }
    }

    const exportExcelFile = (exportData) => {
        let data = [
            {
              sheet: "Adults",
              columns: [
                { label: "Company Name", value: "companyName" }, // Top level data
                { label: "Email", value: "email" }, // Custom format
                { label: "Name", value: "name" }, // Run functions
                { label: "Sent On", value: row => {
                    const createdDate = new Date(row.createdAt)
                    return createdDate
                }},
                {
                    label: "Status", value: row => {
                        if (row.used) {
                            return "Used"
                        } else if (inviteIsActive(row)) {
                            return "Active"
                        } else if (inviteHasExpired(row)) {
                            return "Expired"
                        }
                    }
                }
              ],
              content: exportData,
            },

          ]
          
          let settings = {
            fileName: "VendorListExport", // Name of the resulting spreadsheet
            extraLength: 3, // A bigger number means that columns will be wider
            writeMode: "writeFile", // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
            writeOptions: {}, // Style options from https://docs.sheetjs.com/docs/api/write-options
            RTL: false, // Display the columns from right-to-left (the default value is false)
          }
          
          xlsx(data, settings)
    }

    const closeExportModal = () => {
        let tempExportOptions = {...exportOptions}
        tempExportOptions = {
            root: "invited",
            selectedInviteType: "all",
            selectedStages: [],
            l2Stages: [],
            pendingL2Stages: [],
            exportType: "all",
            selectedVendors: []
        }
        setExportOptions(tempExportOptions)

        let tempVendorsToExport = [...vendorsToExport]
        tempVendorsToExport = []
        setVendorsToExport(tempVendorsToExport)
        setShowExportModal(false)
    }

    return (
        <div className={styles.approvals}>
            {
                actionProgress && <FloatingProgressIndicator status={actionProgress} />
            }

            {
                returnToL2Data && <Modal>
                <div className={styles.revertToL2Div}>
                    <h3>Revert To L2</h3>

                    <p>You are about to move this vendor&apos;s application back to L2. Proceed?</p>

                    <div>
                        {
                            actionProgress !== "processing" && <button onClick={() => revertToL2(returnToL2Data.vendorID, returnToL2Data.from)}>Revert to L2</button>
                        }
                        
                        <button onClick={() => cancelRevertToL2()}>Cancel</button>
                    </div>

                    
                </div>
            </Modal>
            }

            {
                showExportModal && <Modal>
                <div className={styles.exportModal}>
                    <h2>Export Vendors</h2>

                    <hr />

                    <h4>Export options</h4>

                    <div className={styles.exportOptionsDiv}>
                        <div onClick={() => updateExportOptions("root", "invited")}>
                            <input type="radio" name="root" checked={exportOptions.root === "invited"} />
                            <label>Export invited vendors</label>
                        </div>

                        <div onClick={() => updateExportOptions("root", "registered")}>
                            <input type="radio" name="root"  checked={exportOptions.root === "registered"} />
                            <label>Export registered vendors</label>
                        </div>
                    </div>

                    {
                        exportOptions.root === "invited" && <div className={styles.exportOptionsDiv}>
                            <div onClick={() => updateExportOptions("selectedInviteType", "all")}>
                                <input type="radio" name="invite" checked={exportOptions.selectedInviteType === "all"} />
                                <label>All</label>
                            </div>

                            <div onClick={() => updateExportOptions("selectedInviteType", "active")}>
                                <input type="radio" name="invite" checked={exportOptions.selectedInviteType === "active"} />
                                <label>Active</label>
                            </div>

                            <div onClick={() => updateExportOptions("selectedInviteType", "used")}>
                                <input type="radio" name="invite" checked={exportOptions.selectedInviteType === "used"} />
                                <label>Used</label>
                            </div>

                            <div onClick={() => updateExportOptions("selectedInviteType", "expired")}>
                                <input type="radio" name="invite" checked={exportOptions.selectedInviteType === "expired"} />
                                <label>Expired</label>
                            </div>

                            <div onClick={() => updateExportOptions("selectedInviteType", "archived")}>
                                <input type="radio" name="invite" checked={exportOptions.selectedInviteType === "archived"} />
                                <label>Archived</label>
                            </div>
                        </div>
                    }

                    {
                        exportOptions.root !== "invited" && <>
                            <h5>Stage</h5>

                            <div className={styles.exportOptionsDiv}>
                                <div onChange={() => toggleExportOptions("selectedStages", "inProgress")}>
                                    <input type="checkbox" name="stage" checked={exportOptions.selectedStages.includes["inProgress"]} />
                                    <label>In Progress</label>
                                </div>

                                <div onChange={() => toggleExportOptions("selectedStages", "l2")}>
                                    <input type="checkbox" name="stage" checked={exportOptions.selectedStages.includes["l2"]} />
                                    <label>L2</label>
                                </div>

                                <div onChange={() => toggleExportOptions("selectedStages", "l3")}>
                                    <input type="checkbox" name="stage" checked={exportOptions.selectedStages.includes["l3"]} />
                                    <label>L3</label>
                                </div>
                            </div>

                            {
                                exportOptions.selectedStages.includes("l2") && <>
                                        <h5>L2 Status</h5>

                                        <div className={styles.exportOptionsDiv}>
                                            <div onChange={() => toggleExportOptions("l2Stages", "pending")}>
                                                <input type="checkbox" checked={exportOptions.l2Stages.includes("pending")} />
                                                <label>Pending L2</label>
                                            </div>

                                            <div onChange={() => toggleExportOptions("l2Stages", "completed")}>
                                                <input type="checkbox" checked={exportOptions.l2Stages.includes("completed")} />
                                                <label>Completed L2</label>
                                            </div>

                                            <div onChange={() => toggleExportOptions("l2Stages", "returned")}>
                                                <input type="checkbox" checked={exportOptions.l2Stages.includes("returned")} />
                                                <label>Returned to contractor</label>
                                            </div>

                                            <div onChange={() => toggleExportOptions("l2Stages", "returnRequested")}>
                                                <input type="checkbox" checked={exportOptions.l2Stages.includes("returnRequested")} />
                                                <label>Return requested</label>
                                            </div>
                                        </div>

                                        {
                                            exportOptions.l2Stages.includes("pending") && <>
                                                <h5>L2 Stage</h5>

                                                <div className={styles.exportOptionsDiv}>
                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "All")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>All Stages</label>
                                                    </div>

                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "A")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("A")} disabled={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>Stage A</label>
                                                    </div>

                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "B")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("B")} disabled={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>Stage B</label>
                                                    </div>

                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "C")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("C")} disabled={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>Stage C</label>
                                                    </div>

                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "D")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("D")} disabled={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>Stage D</label>
                                                    </div>

                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "E")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("E")} disabled={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>Stage E</label>
                                                    </div>

                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "F")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("F")} disabled={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>Stage F</label>
                                                    </div>

                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "G")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("G")} disabled={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>Stage G</label>
                                                    </div>

                                                    <div onChange={() => toggleExportOptions("pendingL2Stages", "H")}>
                                                        <input type="checkbox" checked={exportOptions.pendingL2Stages.includes("H")} disabled={exportOptions.pendingL2Stages.includes("All")} />
                                                        <label>Stage H</label>
                                                    </div>
                                                </div>
                                            </>
                                        }
                                </>
                            }

                            {
                                exportOptions.selectedStages?.length > 0 && <>
                                    <h5>Selection type</h5>

                                    <div className={styles.exportOptionsDiv}>
                                        <div onClick={() => updateExportOptions("exportType", "all")}>
                                            <input type="radio" name="specific" checked={exportOptions.exportType === "all"} />
                                            <label>All</label>
                                        </div>

                                        <div onClick={() => updateExportOptions("exportType", "select")}>
                                            <input type="radio" name="specific" checked={exportOptions.exportType === "select"} />
                                            <label>Select contractors</label>
                                        </div>
                                    </div>
                                </>
                            }

                            {
                                exportOptions.exportType === "select" && <div className={styles.searchVendorsDiv}>
                                <input placeholder="Search vendors" onChange={event => findVendorsByName(event.target.value)} />

                                <div className={styles.vendorSearchResultList}>
                                    {
                                        exportVendorSearchResults.map((item, index) => <p key={index} className={styles.vendorSearchResultItem} onClick={() => addVendorToSelectedList(item)}>{item.companyName}</p>)
                                    }
                                </div>
                                
                            </div>
                            }

                            {
                                exportOptions.exportType === "select" && <div className={styles.selectedVendorsToExportDiv}>
                                <h5>Selected vendors</h5>

                                <div>
                                    {
                                        selectedVendorsToExport.map((item, index) => <div key={index} className={styles.selectedVendorsToExportItem}>
                                        <p>{item.companyName}</p>

                                        <a onClick={() => removeVendorFromSelectedVendorsToExport(item._id)}>Remove</a>
                                    </div>)
                                    }
                                </div>

                                {
                                    selectedVendorsToExport?.length === 0 && <p className={styles.noSelectedVendorsText}>No selected vendors</p>
                                }
                            </div>
                            }
                        </>
                    }

                    <div className={styles.exportActionButtons}>
                        <button onClick={() => exportContractors()}>Export</button>

                        <button onClick={() => closeExportModal()}>Close</button>
                    </div>
                </div>
            </Modal>
            }

            <header>
                <h3>C&P Officer Dashboard</h3>

                <h5>Registration Approvals</h5>
                
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
                                searchQueryResults?.length > 0 && <div className={styles.searchResultsDiv} ref={searchResultRef}>
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


            {
                Object.values(inviteToArchive)?.length > 0 && <Modal>
                <div className={styles.confirmArchiveModalDiv}>
                    {
                        !archiveStatusMessages.successMessage && <p>You are about to archive this invite. You would only be able to restore the invite if the email is still unused.</p> 
                    }

                    <div className={styles.archiveStatusMessages}>
                    {
                        archiveStatusMessages.errorMessage && <ErrorText text={archiveStatusMessages.errorMessage} />
                    }

                    {
                        archiveStatusMessages.successMessage && <SuccessMessage message={archiveStatusMessages.successMessage} />
                    }
                    </div>

                    <div>
                        {!archiveStatusMessages.successMessage && <button disabled={archivingInvite} onClick={() => archiveInvite()}>Continue {archivingInvite && <ButtonLoadingIcon />}</button>}
                        <button disabled={archivingInvite} onClick={() => unsetInviteToArchiveObject()}>{archiveStatusMessages.successMessage ? "Close" : "Cancel"}</button>
                    </div>
                </div>
            </Modal>
            }

            {
                fetchingContractors && <div className={styles.loading}>
                    <Loading />
                    <p>Fetching Contractors...</p>
                </div>
            }

            {
                !fetchingContractors && <>
                    <div className={styles.exportToExcelDiv}>
                        <button onClick={() => setShowExportModal(true)}>Export to Excel</button>
                    </div>
                    <Tabs tabs={approvalsTabs} activeTab={activeTab} updateActiveTab={handleTabChange} />
                    

                    <div className={styles.inviteFilters}>
                        {
                            userIsCnPStaff() && <label>Filter: </label>
                        }

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
                            activeTab === "pending-l2" && userIsCnPStaff() && <div>
                                <p className={activeFilter === "All" && styles.active}  onClick={() => {
                                    setActiveFilter("All")
                                    filterL2Companies("All")
                                }}>{`All ${"All" === activeFilter ? `(${approvals.pendingL2?.length})` : ``}`}</p>
                            {
                                approvalStages.map((item, index) => <p className={item === activeFilter && styles.active} key={index} onClick={() => {
                                    setActiveFilter(item)
                                    filterL2Companies(item)
                                }}>{`Stage ${item} ${item === activeFilter ? `(${approvals.pendingL2?.length})` : ``}`}</p>)
                            }
                        </div>
                        }

                        {
                            activeTab === "l3" && <div>

                        {
                            l3Filters.map((item, index) => <p className={item === activeL3Filter && styles.active} key={index} onClick={() => {
                                setActiveL3Filter(item)
                                filterL3Companies(item)
                            }}>{`${item} ${item === activeL3Filter ? `(${approvals.l3?.length})` : ``}`}</p>)
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

                    {tabLoading ? 
                    <div className={styles.loading}>
                         <Loading />
                        <p>Loading data...</p>
                    </div>
                    :
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
                                activeTab === "invited" && approvals.invites.map((item, index) => <InvitedContractorItem 
                                setInviteToArchiveObject={invite => setInviteToArchiveObject(invite)} 
                                key={index} inviteDetails={item} 
                                index={index} user={user} 
                                activeFilter={activeFilter}
                                removeInviteFromExpired={inviteID => removeInviteFromExpiredList(inviteID)}
                                 />)
                            }

                            {
                                activeTab === "in-progress" && approvals.inProgress.map((item, index) => <InProgressItem key={index} user={user} companyRecord={item} index={index} />)
                            }


                            {
                                activeTab === "pending-l2" && approvals.pendingL2.map((item, index) => <PendingL2Item key={index} user={user} companyRecord={item} index={index} />)
                            }

                            {
                                activeTab === "l3" && approvals.l3.map((item, index) => <L3Item key={index} user={user} revertToL2={vendorID => setDataForReturnToL2(vendorID, "l3")
                                } companyRecord={item} index={index} />)
                            }

                            {
                                activeTab === "completed-l2" && approvals.completedL2.map((item, index) => <CompletedL2Item revertToL2={vendorID => setDataForReturnToL2(item._id, "parked")} key={index} user={user} companyRecord={item} index={index} />)
                            }

                            {
                                activeTab === "returned" && approvals.returned.map((item, index) => <ReturnedItem key={index} user={user} companyRecord={item} index={index} />)
                            }

                            {
                                activeTab === "park-requests" && approvals.parkRequested && approvals.parkRequested.map((item, index) => <ParkRequestedItem key={index} user={user} companyRecord={item} index={index} approveParkRequest={(vendorID) => {
                                    console.log("Accept");
                                    approveParkRequest(item._id)
                                }} declineParkRequest={(vendorID) => {
                                    console.log({item});
                                    
                                    setDataForReturnToL2(item._id, "park requests")
                                    // declineParkRequest(item._id)
                                }} />)
                            }
                        </tbody>
                    </table>}
                </>
            }
        </div>
    )
}

const InvitedContractorItem = ({inviteDetails, index, user, setInviteToArchiveObject, activeFilter, removeInviteFromExpired}) => {
    const inviteHasExpired = () => {
        const currentDate = new Date()
        let expiryDate = ""

        if (inviteDetails?.expiry?._seconds) {
            expiryDate = new Date(inviteDetails?.expiry?._seconds * 1000)
        } else {
            expiryDate = new Date(inviteDetails?.expiry)
        }
        


        if (currentDate.getTime() > expiryDate.getTime()) {
            return true
        } else {
            return false
        }

    }

    const hasCnPPermissions = () => {
        if (["Admin", "HOD", "VRM", "CnP Staff", "Supervisor"].includes(user.role)) {
            return true
        }
    }


    const getDateFromTimestamp = timestamp => {
        const date = new Date(timestamp)


        if (date) {
            return `${date.toDateString("en-NG")}`
        }

    }

    const getDateFromDateString = dateString => {


        if (dateString?._seconds) {
            const date = new Date(dateString?._seconds * 1000)

            if (date) {
                return `${date.toDateString("en-NG")}`
            }
        } else {
            const date = new Date(dateString)

            if (date) {
                return `${date.toDateString("en-NG")}`
            }
        }

    }

    const [sendReminderText, setSendReminderText] = useState("SEND REMINDER")
    const [renewText, setRenewText] = useState("EXTEND EXPIRY DATE")

    const sendReminder = async () => {
        try {
            setSendReminderText("SENDING REMINDER")
            const sendReminderRequest = await getProtected(`invites/remind/${inviteDetails._id}`, user.role)

            if (sendReminderRequest.status === "OK") {
                setSendReminderText("REMINDER SENT")

                if (activeFilter === "Expired") {
                    removeInviteFromExpired(inviteDetails._id)
                }
            }
        } catch (error) {
            console.log({error});
        }
    }

    const [renewing, setRenewing] = useState(false)

    const renewRequest = async () => {
        try {
            console.log("Renewing");
            setRenewText("EXTENDING EXPIRY DATE...")

            const renewInviteRequest = await getProtected(`invites/renew/${inviteDetails._id}`, user.role)

            console.log({renewInviteRequest});

            if (renewInviteRequest.status === "OK") {
                console.log("renewed");
                setRenewText("EXPIRY DATE EXTENDED")
            }
        } catch (error) {
            console.log({error});
            setRenewText("EXTEND EXPIRY DATE")
        }
    }

    

    return (
        <tr className={index%2 === 0 && styles.rowDarkBackground}>
            <td>
                <p className={styles.contractorName}>{String(inviteDetails.companyName).toLocaleUpperCase()}</p>
            </td>
            
            <td className={styles.userDetails}>
                <p>{`${inviteDetails.fname} ${inviteDetails.lname}`.toLocaleUpperCase()}</p>

                <p>{inviteDetails.vendorAppAdminProfile?.email ? inviteDetails.vendorAppAdminProfile?.email : inviteDetails.email}</p>

                <p>{inviteDetails?.phone?.number ? inviteDetails?.phone?.number : inviteDetails?.phone}</p>
            </td>

            <td className={styles.status}>
                {/* Show if invite has expired */}
                {
                    inviteHasExpired() && !inviteDetails.used && <>
                        <p className={styles.expiredText}>EXPIRED</p>
                        <p className={styles.statusDateText}>Expired: {getDateFromDateString(inviteDetails.expiry)}</p>
                        <div className={styles.renewRequestTextDiv}>
                            {
                                renewText !== "EXTENDED EXPIRY DATE" && hasCnPPermissions() && <a className={styles.renewText} onClick={() => renewRequest()}>{renewText}</a>
                            }
                            {
                                renewText === "EXTENDING EXPIRY DATE..."  && <PrimaryColorSmallLoadingIcon />
                            }

                        {
                            renewText === "EXTENDED EXPIRY DATE" && <p className={styles.reminderSentText}>EXPIRY DATE EXTENDED</p>
                        }
                        </div>
                        
                        <div></div>
                        {
                            hasCnPPermissions() && <Link href={`invites/${inviteDetails._id}`}>RESEND INVITE</Link>
                        }
                        
                    </>
                }

                {/* Show if invite has been used */}
                {
                    inviteDetails.used && <>
                        <p className={styles.usedText}>USED</p>
                        <p className={styles.statusDateText}>Sent: {getDateFromDateString(inviteDetails.timeApproved)}</p>
                        <p className={styles.statusDateText}>Used: {getDateFromTimestamp(inviteDetails.used)}</p>
                    </>
                }

                {/* Show if invite has not expired and has not been used */}
                {
                    !inviteHasExpired() && !inviteDetails.used && <>
                        <p className={styles.activeText}>ACTIVE</p>
                        <p className={styles.statusDateText}>Sent: {getDateFromDateString(inviteDetails.timeApproved ? inviteDetails.timeApproved : inviteDetails.createdAt)}</p>
                        {
                            inviteDetails.lastReminderSent && <p className={styles.statusDateText}>Last Reminder Sent: {getDateFromDateString(inviteDetails.lastReminderSent)}</p>
                        }
                        {
                            sendReminderText !== "REMINDER SENT" && <div className={styles.reminderDiv}>
                            <a onClick={() => sendReminder()} className={styles.renewText}>{sendReminderText}</a>
                            {
                                sendReminderText === "SENDING REMINDER" && <PrimaryColorSmallLoadingIcon />
                            }
                        </div>
                        }
                        {
                            sendReminderText === "REMINDER SENT" && <p className={styles.reminderSentText}>REMINDER SENT</p>
                        }
                        <div></div>
                        {
                            hasCnPPermissions() && <Link href={`invites/${inviteDetails._id}`}>RESEND INVITE</Link>
                        }
                    </>
                }

                {
                    (user.role === "Admin" || user.role === "HOD" || user.role === "VRM") && !inviteDetails.used && <p className={styles.deleteInviteText} onClick={() => setInviteToArchiveObject(inviteDetails)}>Archive Invite</p>
                }

                <p></p>
                <p></p>
            </td>
        </tr>
    )
}

const InProgressItem = ({index, companyRecord}) => {
    const getLastUpdated = () => {
        if (companyRecord.lastUpdate) {
            const lastUpdatedDate = new Date(companyRecord.lastUpdate._seconds * 1000)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.lastUpdate) {
            const lastUpdatedDate = new Date(companyRecord.lastUpdate._seconds * 1000)

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
        <tr className={[styles.inProgressItem, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <a>{companyRecord?.companyName}</a>
                <p>{companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}

const PendingL2Item = ({index, companyRecord, user}) => {
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
        <tr className={[styles.pendingL2Item, companyRecord.needsAttention ? styles.needsAttendionBackground : index%2 === 0 && styles.rowDarkBackground].join(" ")}>
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
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}


const L3Item = ({index, companyRecord, revertToL2, user}) => {
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

    return (
        <tr className={[styles.l3Item, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{String(companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email)}</p>
            </td>

            <td> 
                {
                    hasAdminPermissions(user.role) && <a onClick={() => {
                        console.log("clicked");
                        revertToL2(companyRecord.vendor)
                        
                    }}>MOVE TO L2</a>  
                }   
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}

const CompletedL2Item = ({index, companyRecord, revertToL2, user}) => {
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
        <tr className={[styles.completedL2Item, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{`Stage ${getCurrentStage()}`}</p>
            </td>

            <td>
                {
                    companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers?.length > 0 && <>
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

const ParkRequestedItem = ({index, companyRecord, approveParkRequest, declineParkRequest, user}) => {
    const getLastUpdated = () => {
        if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.approvalActivityHistory) {
            const lastUpdatedDate = new Date(companyRecord.approvalActivityHistory[0].date)

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

    const hasAdminPermissions = (role) => {
        return (["Admin", "HOD"].includes(role))
    }

    return (
        <tr className={[styles.parkRequestedItem, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{`Stage ${getCurrentStage()}`}</p>
            </td>

            <td>
                <p>{companyRecord?.flags?.hold?.requestedBy?.name}</p>
            </td>

            <td>
                {
                    companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers?.length > 0 && <>
                    </>
                }  
                {
                    hasAdminPermissions(user.role) && <>
                        <a  onClick={() => approveParkRequest(companyRecord._id)}>APPROVE PARK REQUEST</a>

                        <br />

                        <a  onClick={() => declineParkRequest(companyRecord._id)}>REJECT PARK REQUEST</a>
                            </>
                        }
                
            </td>

            
        </tr>
    )
}

const ReturnedItem = ({index, companyRecord}) => {
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
        <tr className={[styles.returnedItem, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
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