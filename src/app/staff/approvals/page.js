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
            name: "returned-to-contractor"
        },
        // {
        //     label: "Park Requests",
        //     name: "park-requests"
        // }
    ])

    const [inviteToArchive, setInviteToArchive] = useState({})


    const user= useAppSelector(state => state?.user?.user)



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
        invited: ["Company Name", "User Details", "Status"],
        inProgress: ["Contractor Name", "Last Contractor Update"],
        pendingL2: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        l3: ["Contractor Name", "Action", "Last Contractor Update"],
        completedL2: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        returned: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        parkRequests: ["Contractor Name", "Approval Stage", "Requested By", "Action"],
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

    const getActiveTableData = () => {
        switch (activeTab) {
            case "invited": 
                return invitedData
            case "in-progress":
                return tableHeaders["inProgress"]
            case "pendingL2":
                return tableHeaders["pendingL2"]
            case "l3":
                return tableHeaders["l3"]
            case "completed-l2":
                return tableHeaders["completedL2"]
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

                if (!element?.flags?.approvals?.level) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "B") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 1) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "C") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 2) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "D") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 3) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "E") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 4) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "F") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 5) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "G") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 6) {
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
        
        if (!companyRecord?.flags?.approvals?.level) {
            return "B"
        } else if (companyRecord?.flags?.approvals?.level === 1) {
            return "C"
        } else if (companyRecord?.flags?.approvals?.level === 2) {
            return "D"
        } else if (companyRecord?.flags?.approvals?.level === 3) {
            return "E"
        } else if (companyRecord?.flags?.approvals?.level === 4) {
            return "F"
        } else if (companyRecord?.flags?.approvals?.level === 5) {
            return "G"
        } else if (companyRecord?.flags?.approvals?.level === 6) {
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

    console.log({returnToL2Data});
    

    

    

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
                                searchQueryResults.length > 0 && <div className={styles.searchResultsDiv} ref={searchResultRef}>
                                {
                                    searchQueryResults.map((item, index) =>  <div key={index} className={styles.searchResultItem}>
                                    <div className={styles.searchResultMetaData}>
                                        <p>{String(item.companyName).toLocaleUpperCase()}</p>
                                        <p>{capitalizeWord(String(item?.flags?.status))}</p>
                                    </div>

                                    <div className={styles.searchResultsActionButtons}>
                                        <Link href={`/staff/vendor/${item?._id}`}><button>VIEW</button></Link>
                                        <Link href={`/staff/approvals/${item?._id}`}><button>{`Process to ${getNextStage(item)}`}</button></Link>
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
                Object.values(inviteToArchive).length > 0 && <Modal>
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
                                activeTab === "returned-to-contractor" && approvals.returned.map((item, index) => <ReturnedItem key={index} user={user} companyRecord={item} index={index} />)
                            }

                            {
                                activeTab === "park-requests" && approvals.parkRequested.map((item, index) => <ParkRequestedItem key={index} user={user} companyRecord={item} index={index} approveParkRequest={(vendorID) => {
                                    console.log("Accept");
                                    approveParkRequest(item._id)
                                }} declineParkRequest={(vendorID) => {
                                    console.log({item});
                                    
                                    setDataForReturnToL2(item._id, "park requests")
                                    // declineParkRequest(item._id)
                                }} />)
                            }
                        </tbody>
                    </table>
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
        // console.log({date});

        

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
        } else if (user.role === "End User" && companyRecord?.flags?.level === 2 && companyRecord.currentEndUsers.includes(user._id)) {
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
                    companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers.length > 0 && <>
                        {/* <p>End User: App Dev</p>
                        <p>Change end user(s)</p> */}
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