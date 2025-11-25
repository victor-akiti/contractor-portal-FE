"use client";

import downIconBlack from "@/assets/images/downIconBlack.svg";
import upIconBlack from "@/assets/images/upIconBlack.svg";
import ErrorText from "@/components/errorText";
import Loading from "@/components/loading";
import SuccessMessage from "@/components/successMessage";
import Tabs from "@/components/tabs/index";
import { useAppSelector } from "@/redux/hooks";
import { getProtected } from "@/requests/get";
import { postProtected } from "@/requests/post";
import xlsx from "json-as-xlsx";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/styles.module.css";

// RTK Query hooks for background caching
import {
  useApproveParkRequestMutation,
  useArchiveInviteMutation,
  useGetApprovalCountsQuery,
  useGetCompaniesByTabQuery,
  useGetInvitesQuery,
  useLazySearchCompaniesQuery,
  usePrefetchApprovals,
  useRenewInviteMutation,
  useRevertToL2Mutation,
  useSendReminderMutation,
} from "@/redux/features/approvalSlice";

// Extracted UI
import ApprovalsTabs from "./ui/ApprovalsTabs";
import DataTable from "./ui/DataTable";
import FilterControls from "./ui/FilterControls";
import FloatingControls from "./ui/FloatingControls";
import SearchBar from "./ui/SearchBar";

// Extracted Modals
import ArchiveInviteModal from "./modals/ArchiveInviteModal";
import ExportModal from "./modals/ExportModal";
import RevertToL2Modal from "./modals/RevertToL2Modal";

// Extracted Rows
import { toast } from "react-toastify";
import CompletedL2Row from "./rows/CompletedL2Row";
import InProgressRow from "./rows/InProgressRow";
import InvitedContractorRow from "./rows/InvitedContractorRow";
import L3Row from "./rows/L3Row";
import ParkRequestedRow from "./rows/ParkRequestedRow";
import PendingL2Row from "./rows/PendingL2Row";
import ReturnedRow from "./rows/ReturnedRow";

const approvalStages = ["A", "B", "C", "D", "E", "F"]; // "G"];

function useOutsideClick(ref: React.RefObject<HTMLElement>, onClickOut: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) {
        onClickOut();
      }
    }

    // mousedown fires before focus/click, avoids flicker
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onClickOut]);
}

export const getL2PendingStage = (flags: any) => {
  if (!flags.level && !flags?.approvals?.level) return "A";
  if (flags?.approvals?.level === 1) return "B";
  if (flags?.approvals?.level === 2) return "C";
  if (flags?.approvals?.level === 3) return "D";
  if (flags?.approvals?.level === 4) return "E";
  if (flags?.approvals?.level === 5) return "F";
  if (flags?.approvals?.level === 6) return "G";
  if (flags?.approvals?.level === 7) return "H";
  return "NA";
};

export const shouldShowEndUsers = (activeFilter: string) => {
  return activeFilter === "C" || activeFilter === "E";
};

export default function ApprovalsContainer() {
  const prefetchTab = usePrefetchApprovals("getCompaniesByTab");
  const prefetchInvites = usePrefetchApprovals("getInvites");

  // State - exact match with original
  const [activeTab, setActiveTab] = useState("pending-l2");
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQueryResults, setSearchQueryResults] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentSearchFilter, setCurrentSearchFilter] = useState("all");
  const [actionProgress, setActionProgress] = useState("");
  const [returnToL2Data, setReturnToL2Data] = useState<any>(null);
  const [l3Filters, setL3Filters] = useState([
    "All",
    "Healthy",
    "With Vendor",
    "Yet To Be Reviewed",
  ]);
  const [activeL3Filter, setActiveL3Filter] = useState("All");
  const [nameSortAscending, setNameSortAscending] = useState(true);
  const [dateSortAscending, setDateSortAscending] = useState(true);
  const [inviteToArchive, setInviteToArchive] = useState<any>({});
  const [currentSort, setCurrentSort] = useState("alphabetical");

  // Keep legacy state for backward compatibility but populate from RTK Query
  const [tabData, setTabData] = useState<any>({
    "pending-l2": { companies: [], loaded: false },
    "completed-l2": { companies: [], loaded: false },
    l3: { companies: [], loaded: false },
    "in-progress": { companies: [], loaded: false },
    returned: { companies: [], loaded: false },
    invited: { invites: [], loaded: false },
    "park-requests": { companies: [], loaded: false },
  });

  const [approvals, setApprovals] = useState<any>({
    completedL2: [],
    inProgress: [],
    invites: [],
    l3: [],
    pendingL2: [],
    returned: [],
    parkRequested: [],
  });

  const [fixedApprovals, setFixedApprovals] = useState<any>({
    completedL2: [],
    inProgress: [],
    invites: [],
    l3: [],
    pendingL2: [],
    returned: [],
    parkRequested: [],
  });

  const [approvalsTabs, setApprovalsTabs] = useState<any[]>([
    { label: "Invited", name: "invited" },
    { label: "In Progress", name: "in-progress" },
    { label: "Pending L2", name: "pending-l2" },
    { label: "L3", name: "l3" },
    { label: "Completed L2", name: "completed-l2" },
    { label: "Returned To Contractor", name: "returned" },
    { label: "Park Requests", name: "park-requests" },
  ]);

  const inviteFilters = ["All", "Active", "Used", "Expired", "Archived"];

  const tableHeaders: any = {
    invited: ["Company Name", "User Details", "Status"],
    inProgress: ["Contractor Name", "Last Contractor Update"],
    pendingL2: shouldShowEndUsers(activeFilter)
      ? ["Contractor Name", "Approval Stage", "End Users", "Action", "Last Contractor Update"]
      : ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
    l3: ["Contractor Name", "Action", "Last Contractor Update"],
    completedL2: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
    returned: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
    parkRequests: ["Contractor Name", "Approval Stage", "Requested By", "Action"],
  };

  const user = useAppSelector((state: any) => state?.user?.user);

  const [searchOpen, setSearchOpen] = useState(false);
  const searchResultRef = useRef<any>(null);

  // RTK Query hooks - declarative data fetching
  const {
    data: countsData,
    isLoading: countsLoading,
    error: countsError,
  } = useGetApprovalCountsQuery(user?.role || "", {
    skip: !user?.role,
  });

  const {
    data: tabDataRTK,
    isLoading: tabLoading,
    error: tabError,
    isFetching: tabFetching,
  } = useGetCompaniesByTabQuery(
    { tab: activeTab, userRole: user?.role || "" },
    {
      skip: !user?.role || activeTab === "invited",
    },
  );

  const {
    data: invitesDataRTK,
    isLoading: invitesLoading,
    error: invitesError,
    isFetching: invitesFetching,
  } = useGetInvitesQuery(
    { filter: "All", userRole: user?.role || "" },
    {
      skip: !user?.role || activeTab !== "invited",
    },
  );

  const [lazySearch, { isFetching: isLazySearchLoading }] = useLazySearchCompaniesQuery();

  // prefetch once in background
  useEffect(() => {
    if (!user?.role || !countsData) return;

    const tabsToPrefetch = [
      "in-progress",
      "pending-l2",
      "l3",
      "completed-l2",
      "returned",
      "park-requests",
    ];

    // invites too
    prefetchInvites({ filter: "All", userRole: user.role }, { force: false });

    tabsToPrefetch.forEach((tab) => {
      prefetchTab({ tab, userRole: user.role }, { force: false });
    });
  }, [user?.role, countsData, prefetchTab, prefetchInvites]);

  // RTK Query mutations
  const [revertToL2Mutation] = useRevertToL2Mutation();
  const [approveParkMutation] = useApproveParkRequestMutation();
  const [archiveInviteMutation] = useArchiveInviteMutation();
  const [sendReminderMutation] = useSendReminderMutation();
  const [renewInviteMutation] = useRenewInviteMutation();

  // Compute loading state
  const fetchingContractors = countsLoading;
  const currentTabLoading = activeTab === "invited" ? invitesLoading : tabLoading;

  // Update tab labels when counts data changes
  useEffect(() => {
    if (countsData?.data?.counts) {
      updateTabLabelsWithCounts(countsData.data.counts);
    }
  }, [countsData]);

  // ✅ Update fixedApprovals for all tabs as data becomes available (even if not opened)
  useEffect(() => {
    // Handle invites data
    if (invitesDataRTK?.data?.invites && !invitesLoading && !invitesFetching) {
      const allInvites = invitesDataRTK.data.invites;
      setFixedApprovals((prev) => ({ ...prev, invites: allInvites }));

      // Keep backward compatibility for the Invited tab
      const temp = { ...approvals };
      if (activeFilter === "All") {
        temp.invites = allInvites;
      } else if (activeFilter === "Used") {
        temp.invites = allInvites.filter((i: any) => i.used);
      } else if (activeFilter === "Expired") {
        const expired: any[] = [];
        for (const element of allInvites || []) {
          const currentDate = new Date();
          const expiryDate = element?.expiry?._seconds
            ? new Date(element.expiry._seconds * 1000)
            : new Date(element.expiry);
          if (currentDate.getTime() > expiryDate.getTime() && !element.used) expired.push(element);
        }
        temp.invites = expired;
      } else if (activeFilter === "Active") {
        const active: any[] = [];
        for (const element of allInvites || []) {
          const currentDate = new Date();
          const expiryDate = element?.expiry?._seconds
            ? new Date(element.expiry._seconds * 1000)
            : new Date(element.expiry);
          if (currentDate.getTime() < expiryDate.getTime() && !element.used) active.push(element);
        }
        temp.invites = active;
      } else if (activeFilter === "Archived") {
        temp.invites = allInvites.filter((i: any) => i.archived);
      }

      setTabData((prev) => ({
        ...prev,
        invited: {
          companies: [],
          invites: temp.invites,
          loaded: true,
        },
      }));

      setApprovals(temp);
    }
  }, [invitesDataRTK, invitesLoading, invitesFetching, activeFilter]);

  // ✅ Update fixedApprovals for all company tabs (background population)
  useEffect(() => {
    if (tabDataRTK?.data?.companies && !tabLoading && !tabFetching) {
      const companies = tabDataRTK.data.companies;

      const updateKeyMap: Record<string, string> = {
        "pending-l2": "pendingL2",
        "completed-l2": "completedL2",
        l3: "l3",
        "in-progress": "inProgress",
        returned: "returned",
        "park-requests": "parkRequested",
      };

      const updateKey = updateKeyMap[activeTab];
      if (updateKey) {
        // Always update fixedApprovals regardless of tab visibility
        setFixedApprovals((prev) => ({ ...prev, [updateKey]: companies }));

        // Maintain backward compatibility for current tab display
        setTabData((prev) => ({
          ...prev,
          [activeTab]: {
            companies: companies,
            invites: [],
            loaded: true,
          },
        }));

        setApprovals((prev) => ({ ...prev, [updateKey]: companies }));
      }
    }
  }, [tabDataRTK, tabLoading, tabFetching, activeTab]);

  const setInviteToArchiveObject = (invite: any) => {
    setInviteToArchive(invite);
  };

  const unsetInviteToArchiveObject = () => {
    setInviteToArchive({});
    setArchiveStatusMessages({ successMessage: "", errorMessage: "" });
    setArchivingInvite(false);
  };

  const updateTabLabelsWithCounts = (counts: any) => {
    setApprovalsTabs((prev) =>
      prev.map((tab) => {
        let count = 0;
        switch (tab.name) {
          case "invited":
            count = counts.invites?.total || 0;
            break;
          case "in-progress":
            count = counts.inProgress || 0;
            break;
          case "pending-l2":
            count = counts.pendingL2 || 0;
            break;
          case "l3":
            count = counts.l3 || 0;
            break;
          case "completed-l2":
            count = counts.completedL2 || 0;
            break;
          case "returned":
            count = counts.returned || 0;
            break;
          case "park-requests":
            count = counts.parkRequested || 0;
            break;
        }
        return {
          ...tab,
          label: count > 0 ? `${tab.label.split(" (")[0]} (${count})` : tab.label.split(" (")[0],
        };
      }),
    );
  };

  // Simplified tab change - let RTK Query handle the data fetching
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;

    setActiveTab(newTab);
    setActiveFilter("All");
    setSearchQueryResults([]);
    // No manual fetchTabData call - RTK Query handles this automatically
  };

  const getActiveTable = () => {
    switch (activeTab) {
      case "invited":
        return tableHeaders.invited;
      case "in-progress":
        return tableHeaders.inProgress;
      case "pending-l2":
        return tableHeaders.pendingL2;
      case "l3":
        return tableHeaders.l3;
      case "completed-l2":
        return tableHeaders.completedL2;
      case "park-requests":
        return tableHeaders.parkRequests;
      default:
        return tableHeaders.returned;
    }
  };

  const onClickOut = useCallback(() => {
    setSearchQueryResults([]);
    setSearchOpen(false);
  }, []);

  useOutsideClick(searchResultRef, onClickOut);

  const filterInvites = (newFilter: string) => {
    const temp = { ...approvals };
    if (newFilter === "All") {
      temp.invites = fixedApprovals.invites;
    } else if (newFilter === "Used") {
      temp.invites = fixedApprovals.invites.filter((i: any) => i.used);
    } else if (newFilter === "Expired") {
      const expired: any[] = [];
      for (const element of fixedApprovals.invites || []) {
        const currentDate = new Date();
        const expiryDate = element?.expiry?._seconds
          ? new Date(element.expiry._seconds * 1000)
          : new Date(element.expiry);
        if (currentDate.getTime() > expiryDate.getTime() && !element.used) expired.push(element);
      }
      temp.invites = expired;
    } else if (newFilter === "Active") {
      const active: any[] = [];
      for (const element of fixedApprovals.invites || []) {
        const currentDate = new Date();
        const expiryDate = element?.expiry?._seconds
          ? new Date(element.expiry._seconds * 1000)
          : new Date(element.expiry);
        if (currentDate.getTime() < expiryDate.getTime() && !element.used) active.push(element);
      }
      temp.invites = active;
    }
    setApprovals(temp);
  };

  // Treat L2 stages as a set to quickly detect when "activeFilter" is a stage choice.
  const l2StageSet = useMemo(() => new Set<string>(["All", ...approvalStages]), [approvalStages]);

  useEffect(() => {
    if (activeTab === "pending-l2" && l2StageSet.has(activeFilter)) {
      // Use the latest data in fixedApprovals / tabData, not the previous render’s snapshot.
      filterL2Companies(activeFilter);
    }
  }, [activeTab, activeFilter, l2StageSet, tabDataRTK, fixedApprovals.pendingL2]);

  const filterL2Companies = (stage: string) => {
    const full = tabData["pending-l2"]?.companies || fixedApprovals.pendingL2 || [];
    const temp = { ...approvals };
    const arr: any[] = [];
    if (stage === "All") {
      temp.pendingL2 = full;
      setApprovals(temp);
      return;
    }
    const push = (el: any) => arr.push(el);
    for (const el of full) {
      const lv = el?.flags?.level;
      const ap = el?.flags?.approvals?.level;
      if (stage === "A" && !lv && !ap) push(el);
      if (stage === "B" && (lv === 1 || (!lv && ap === 1))) push(el);
      if (stage === "C" && (lv === 2 || (!lv && ap === 2))) push(el);
      if (stage === "D" && (lv === 3 || (!lv && ap === 3))) push(el);
      if (stage === "E" && (lv === 4 || (!lv && ap === 4))) push(el);
      if (stage === "F" && (lv === 5 || (!lv && ap === 5))) push(el);
      if (stage === "G" && (lv === 6 || (!lv && ap === 6))) push(el);
    }
    temp.pendingL2 = arr;
    setApprovals(temp);
  };

  const filterInvitedCompaniesByNameOrEmail = (name: string) => {
    const temp = { ...approvals };
    temp.invites = fixedApprovals.invites.filter(
      (item: any) =>
        String(item.companyName).toLowerCase().includes(String(name).toLowerCase()) ||
        String(item.email).toLowerCase().includes(String(name).toLowerCase()),
    );
    setApprovals(temp);
  };

  const [archivingInvite, setArchivingInvite] = useState<any>();
  const [archiveStatusMessages, setArchiveStatusMessages] = useState({
    errorMessage: "",
    successMessage: "",
  });

  const archiveInvite = async () => {
    try {
      setArchivingInvite(true);

      // Try RTK mutation first, fallback to original API
      try {
        await archiveInviteMutation({ inviteData: inviteToArchive, userRole: user.role }).unwrap();
        setArchivingInvite(false);
        setArchiveStatusMessages({
          errorMessage: "",
          successMessage: "Invite archived successfully.",
        });
      } catch (rtkError) {
        // Fallback to original API
        const res = await postProtected("invites/archive", inviteToArchive, user.role);
        setArchivingInvite(false);
        const msgs = { errorMessage: "", successMessage: "" };
        if (res.status === "OK") {
          msgs.successMessage = "Invite archived successfully.";
        } else {
          msgs.errorMessage = res.error.message;
        }
        setArchiveStatusMessages(msgs);
      }

      const temp = { ...approvals };
      temp.invites = temp.invites.filter((i: any) => i._id !== inviteToArchive._id);
      setApprovals(temp);
    } catch (e) { }
  };

  const removeInviteFromExpiredList = (inviteID: string) => { };

  const getFilterParam = (currentSearchFilter: string) => {
    let filterParam = "all";
    switch (currentSearchFilter) {
      case "in progress":
        filterParam = "in progress";
        break;
      case "pending":
        filterParam = "pending";
        break;
      case "parked":
        filterParam = "parked";
        break;
      case "l3":
        filterParam = "l3";
        break;
      case "returned":
        filterParam = "returned";
        break;
      case "park requested":
        filterParam = "park requested";
        break;
      default:
        filterParam = "all";
    }
    return filterParam;
  };

  const searchVendors = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchQueryResults([]);
      return;
    }

    const filterParam = getFilterParam(currentSearchFilter);

    let searchResults: any[] = [];
    try {
      // Try RTK Query cache first
      try {
        const result = await lazySearch({
          query,
          filter: filterParam,
          userRole: user.role,
        }).unwrap();
        searchResults = result.data.companies || [];
      } catch {
        console.info("RTK Query search failed, falling back to original API");
        // Fallback to original API
        const response = await getProtected(
          `companies/search?query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filterParam)}`,
          user.role,
        );
        if (response.status === "OK") {
          searchResults = response.data.companies;
        }
      }
    } catch (e) {
      searchResults = [];
    }
    setSearchQueryResults(searchResults);
  };

  const capitalizeWord = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

  const sortListAlphabetically = (list: any[]) =>
    list.sort((a, b) => {
      const nameA = String(a?.companyName || "").toLowerCase();
      const nameB = String(b?.companyName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const getNextStage = (companyRecord: any) => {
    if (!companyRecord?.flags?.approvals?.level && !companyRecord?.flags?.level) return "B";
    if (companyRecord?.flags?.level === 1 || companyRecord?.flags?.approvals?.level === 1)
      return "C";
    if (companyRecord?.flags?.level === 2 || companyRecord?.flags?.approvals?.level === 2)
      return "D";
    if (companyRecord?.flags?.level === 3 || companyRecord?.flags?.approvals?.level === 3)
      return "E";
    if (companyRecord?.flags?.level === 4 || companyRecord?.flags?.approvals?.level === 4)
      return "F";
    if (companyRecord?.flags?.level === 5 || companyRecord?.flags?.approvals?.level === 5)
      return "G";
    if (companyRecord?.flags?.level === 6 || companyRecord?.flags?.approvals?.level === 6)
      return "H";
  };

  const approveParkRequest = async (vendorID: string) => {
    setActionProgress("processing");
    try {
      // Try RTK mutation first, fallback to original API
      try {
        await approveParkMutation({ vendorId: vendorID, userRole: user.role }).unwrap();
        setActionProgress("success");
        removeFIP();
      } catch {
        // Fallback to original API
        const res = await getProtected(`approvals/hold/approve/${vendorID}`, user.role);
        if (res.status === "OK") {
          setActionProgress("success");
          removeFIP();
        } else {
          setActionProgress("error");
        }
      }

      const temp = { ...approvals };
      temp.parkRequested = temp.parkRequested.filter((item: any) => {
        if (item.vendor !== vendorID) {
          return item;
        } else {
          temp.completedL2.unshift(item);
        }
      });
      setApprovals(temp);
    } catch (e) {
      setActionProgress("error");
    }
  };

  const declineParkRequest = async (vendorID: string) => {
    try {
      await getProtected(`approvals/hold/cancel/${vendorID}`, user.role);
    } catch (e) {
      console.warn({ e });
    }
  };

  const revertToL2 = async (vendorID: string, from: string) => {
    setActionProgress("processing");
    try {
      // Try RTK mutation first, fallback to original API
      try {
        await revertToL2Mutation({ vendorId: vendorID, from, userRole: user.role }).unwrap();
        setActionProgress("success");
      } catch {
        // Fallback to original API
        const res = await postProtected(`approvals/revert/l2/${vendorID}`, { from }, user.role);
        if (res.status === "OK") {
          setActionProgress("success");
        } else {
          setActionProgress("error");
          return;
        }
      }

      const temp: any = { ...approvals };
      const move = (fromKey: string) => {
        temp[fromKey] = temp[fromKey].filter((item: any) => {
          if (item.vendor !== vendorID) {
            return item;
          } else {
            temp.pendingL2.unshift(item);
          }
        });
      };
      if (from === "parked") move("completedL2");
      else if (from === "l3") move("l3");
      else if (from === "park requests") move("parkRequested");

      cancelRevertToL2();
      removeFIP();
      setApprovals(temp);
    } catch (e) {
      setActionProgress("error");
    }
  };

  const removeFIP = () => {
    setTimeout(() => setActionProgress(""), 4000);
  };
  const setDataForReturnToL2 = (vendorID: string, from: string) => {
    setActionProgress("");
    setReturnToL2Data({ vendorID, from });
  };
  const cancelRevertToL2 = () => setReturnToL2Data(null);

  const filterL3Companies = (filter: string) => { };

  const showSortIcons = (index: number) => {
    if (activeTab === "invited") return false;
    if (activeTab === "in-progress") return true;
    if (
      activeTab === "pending-l2" ||
      activeTab === "completed-l2" ||
      activeTab === "returned" ||
      activeTab === "park-requests"
    )
      return index === 0 || index === 3;
    if (activeTab === "l3") return index === 0 || index === 2;
    return false;
  };

  const getSortToPerform = (index: number) => {
    if (index === 0) toggleNameSort();
    else toggleDateSort();
  };

  const sortArrayByName = (array: any[] = []) =>
    [...array].sort((a, b) =>
      String(a.companyName || "")
        .toLowerCase()
        .localeCompare(String(b.companyName || "").toLowerCase()),
    );

  const sortArrayByNameDescending = (array: any[] = []) => {
    return [...array]?.sort((a, b) =>
      String(b.companyName || "")
        .toLowerCase()
        .localeCompare(String(a.companyName || "").toLowerCase()),
    );
  };

  const toggleNameSort = () => {
    const temp: any = currentSort === "alphabetical" ? { ...approvals } : { ...fixedApprovals };
    if (nameSortAscending) {
      if (activeTab === "pending-l2") temp.pendingL2 = sortArrayByNameDescending(temp.pendingL2);
      else if (activeTab === "completed-l2")
        temp.completedL2 = sortArrayByNameDescending(temp.completedL2);
      else if (activeTab === "in-progress")
        temp.inProgress = sortArrayByNameDescending(temp.inProgress);
      else if (activeTab === "l3") temp.l3 = sortArrayByNameDescending(temp.l3);
      else if (activeTab === "returned") temp.returned = sortArrayByNameDescending(temp.returned);
    } else {
      if (activeTab === "pending-l2") temp.pendingL2 = sortArrayByName(temp.pendingL2);
      else if (activeTab === "completed-l2") temp.completedL2 = sortArrayByName(temp.completedL2);
      else if (activeTab === "in-progress") temp.inProgress = sortArrayByName(temp.inProgress);
      else if (activeTab === "l3") temp.l3 = sortArrayByName(temp.l3);
      else if (activeTab === "returned") temp.returned = sortArrayByName(temp.returned);
    }
    setApprovals(temp);
    setCurrentSort("alphabetical");
    setNameSortAscending(!nameSortAscending);
  };

  const sortArrayNumerically = (array: any[]) =>
    array.sort((a, b) => {
      const extract = (x: any) => {
        if (x.lastUpdate) return new Date(x.lastUpdate._seconds * 1000).getTime();
        if (x.lastApproved) return new Date(x.lastApproved).getTime();
        if (x.approvalActivityHistory) return new Date(x.approvalActivityHistory[0].date).getTime();
        return new Date().getTime();
      };
      return extract(a) - extract(b);
    });

  const sortArrayNumericallyDescending = (array: any[]) =>
    array.sort((a, b) => {
      const extract = (x: any) => {
        if (x.lastUpdate) return new Date(x.lastUpdate._seconds * 1000).getTime();
        if (x.lastApproved) return new Date(x.lastApproved).getTime();
        if (x.approvalActivityHistory) return new Date(x.approvalActivityHistory[0].date).getTime();
        return new Date().getTime();
      };
      return extract(b) - extract(a);
    });

  const toggleDateSort = () => {
    const temp: any = currentSort === "numerical" ? { ...approvals } : { ...fixedApprovals };
    if (dateSortAscending) {
      if (activeTab === "pending-l2")
        temp.pendingL2 = sortArrayNumericallyDescending(temp.pendingL2);
      else if (activeTab === "completed-l2")
        temp.completedL2 = sortArrayNumericallyDescending(temp.completedL2);
      else if (activeTab === "in-progress")
        temp.inProgress = sortArrayNumericallyDescending(temp.inProgress);
      else if (activeTab === "l3") temp.l3 = sortArrayNumericallyDescending(temp.l3);
      else if (activeTab === "returned")
        temp.returned = sortArrayNumericallyDescending(temp.returned);
    } else {
      if (activeTab === "pending-l2") temp.pendingL2 = sortArrayNumerically(temp.pendingL2);
      else if (activeTab === "completed-l2")
        temp.completedL2 = sortArrayNumerically(temp.completedL2);
      else if (activeTab === "in-progress") temp.inProgress = sortArrayNumerically(temp.inProgress);
      else if (activeTab === "l3") temp.l3 = sortArrayNumerically(temp.l3);
      else if (activeTab === "returned") temp.returned = sortArrayNumerically(temp.returned);
    }
    setCurrentSort("numerical");
    setApprovals(temp);
    setDateSortAscending(!dateSortAscending);
  };

  const getIconToDisplay = (index: number) => {
    if (index === 0) return nameSortAscending ? upIconBlack : downIconBlack;
    return dateSortAscending ? upIconBlack : downIconBlack;
  };

  const vendorIsPending = (vendorData: any) => vendorData?.flags?.status === "pending";
  const userIsCnPStaff = () =>
    user?.role === "C and P Staff" ||
    user?.role === "Admin" ||
    user?.role === "C&P Admin" ||
    user?.role === "IT Admin" ||
    user?.role === "Supervisor" ||
    user?.role === "VRM" ||
    user?.role === "HOD";

  const [exportOptions, setExportOptions] = useState<any>({
    root: "invited",
    selectedInviteType: "all",
    selectedStages: [],
    l2Stages: [],
    pendingL2Stages: [],
    exportType: "all",
    selectedVendors: [],
  });
  const [exportVendorSearchResults, setExportVendorSearchResults] = useState<any[]>([]);
  const [selectedVendorsToExport, setSelectedVendorsToExport] = useState<any[]>([]);
  const [selectedVendorsToExportIDs, setSelectedVendorsToExportIDs] = useState<string[]>([]);
  const [vendorsToExport, setVendorsToExport] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  const updateExportOptions = (option: string, value: any) =>
    setExportOptions((p: any) => ({ ...p, [option]: value }));
  const toggleExportOptions = (option: string, value: any) => {
    setExportOptions((p: any) => {
      const has = p[option].includes(value);
      return {
        ...p,
        [option]: has ? p[option].filter((x: any) => x !== value) : [...p[option], value],
      };
    });
  };

  const findVendorsByName = (vendorName: string) => {
    let vendorSearchResults: any[] = [];
    const push = (item: any) => vendorSearchResults.push(item);
    if (exportOptions.selectedStages.includes("inProgress")) {
      fixedApprovals.inProgress?.forEach((item: any) => {
        if (String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase()))
          push({ ...item, stage: "In Progress" });
      });
    }
    if (exportOptions.selectedStages.includes("l2")) {
      if (exportOptions.l2Stages.includes("pending")) {
        fixedApprovals.pendingL2?.forEach((item: any) => {
          if (String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
            if (item.flags.status === "pending" || item.flags.stage === "pending") {
              if (exportOptions.pendingL2Stages.includes("All"))
                push({
                  ...item,
                  l2Stage: "Pending",
                  stage: "L2",
                  l2PendingStage: getL2PendingStage(item.flags),
                });
              else {
                const L = item.flags?.approvals?.level;
                if (exportOptions.pendingL2Stages.includes("A") && !L)
                  push({ ...item, l2PendingStage: "A", l2Stage: "Pending", stage: "L2" });
                if (exportOptions.pendingL2Stages.includes("B") && L === 1)
                  push({ ...item, l2PendingStage: "B", l2Stage: "Pending", stage: "L2" });
                if (exportOptions.pendingL2Stages.includes("C") && L === 2)
                  push({ ...item, l2PendingStage: "C", l2Stage: "Pending", stage: "L2" });
                if (exportOptions.pendingL2Stages.includes("D") && L === 3)
                  push({ ...item, l2PendingStage: "D", l2Stage: "Pending", stage: "L2" });
                if (exportOptions.pendingL2Stages.includes("E") && L === 4)
                  push({ ...item, l2PendingStage: "E", l2Stage: "Pending", stage: "L2" });
                if (exportOptions.pendingL2Stages.includes("F") && L === 5)
                  push({ ...item, l2PendingStage: "F", l2Stage: "Pending", stage: "L2" });
                if (exportOptions.pendingL2Stages.includes("G") && L === 6)
                  push({ ...item, l2PendingStage: "G", l2Stage: "Pending", stage: "L2" });
                if (exportOptions.pendingL2Stages.includes("H") && L === 7)
                  push({ ...item, l2PendingStage: "H", l2Stage: "Pending", stage: "L2" });
              }
            }
          }
        });
      }
      if (exportOptions.l2Stages.includes("completed")) {
        fixedApprovals.completedL2?.forEach((item: any) => {
          if (String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
            if (item.flags.status === "parked" || item.flags.stage === "parked")
              push({ ...item, l2Stage: "Completed", stage: "L2" });
          }
        });
      }
      if (exportOptions.l2Stages.includes("returned")) {
        fixedApprovals.returned?.forEach((item: any) => {
          if (String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
            if (item.flags.status === "returned" || item.flags.stage === "returned")
              push({ ...item, l2Stage: "Returned", stage: "L2" });
          }
        });
      }
      if (exportOptions.l2Stages.includes("returnRequested") && fixedApprovals.returnRequested) {
        fixedApprovals.returnRequested?.forEach((item: any) => {
          if (String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase())) {
            if (item.flags.status === "park requested" || item.flags.stage === "park requested")
              push({ ...item, l2Stage: "Return Requested", stage: "L2" });
          }
        });
      }
    }
    if (exportOptions.selectedStages.includes("l3")) {
      fixedApprovals.l3?.forEach((item: any) => {
        if (String(item.companyName).toLowerCase().includes(String(vendorName).toLowerCase()))
          push({ ...item, stage: "L3" });
      });
    }
    vendorSearchResults = sortListAlphabetically(vendorSearchResults);
    setExportVendorSearchResults([...vendorSearchResults]);
  };

  const addVendorToSelectedList = (vendorData: any) => {
    if (!selectedVendorsToExportIDs.includes(vendorData._id)) {
      setSelectedVendorsToExport((prev) => [...prev, vendorData]);
      setSelectedVendorsToExportIDs((prev) => [...prev, vendorData._id]);
      setExportVendorSearchResults([]);
    }
  };

  const removeVendorFromSelectedVendorsToExport = (vendorID: string) => {
    if (selectedVendorsToExportIDs.includes(vendorID)) {
      setSelectedVendorsToExport((prev) => prev.filter((i) => i._id !== vendorID));
      setSelectedVendorsToExportIDs((prev) => prev.filter((i) => i !== vendorID));
    }
  };

  const exportContractors = () => {
    if (exportOptions.root === "invited") exportInvitedVendors();
    else exportRegisteredVendors();
  };

  const exportInvitedVendors = () => {
    let temp = [...vendorsToExport];

    if (exportOptions.selectedInviteType === "all") {
      temp = fixedApprovals.invites;
    } else if (exportOptions.selectedInviteType === "active") {
      const active: any[] = [];
      for (const element of fixedApprovals.invites || []) {
        const currentDate = new Date();
        const expiryDate = element?.expiry?._seconds
          ? new Date(element.expiry._seconds * 1000)
          : new Date(element.expiry);
        if (currentDate.getTime() < expiryDate.getTime() && !element.used) active.push(element);
      }
      temp = active;
    } else if (exportOptions.selectedInviteType === "used") {
      temp = fixedApprovals.invites.filter((i: any) => i.used);
    } else if (exportOptions.selectedInviteType === "expired") {
      const expired: any[] = [];
      for (const element of fixedApprovals.invites || []) {
        const currentDate = new Date();
        const expiryDate = element?.expiry?._seconds
          ? new Date(element.expiry._seconds * 1000)
          : new Date(element.expiry);
        if (currentDate.getTime() > expiryDate.getTime() && !element.used) expired.push(element);
      }
      temp = expired;
    } else {
      temp = [];
    }

    // 🚨 New: prevent exporting empty data
    if (!temp || temp.length === 0) {
      toast.info(
        "No invite records available to export. Try loading data or adjusting your filter.",
      );
      return;
    }

    setVendorsToExport(temp);
    exportExcelFile(temp);
  };

  const exportRegisteredVendors = () => {
    let temp: any[] = [];

    if (exportOptions.exportType === "select") {
      temp = selectedVendorsToExport;
    } else {
      if (exportOptions.selectedStages.includes("inProgress")) {
        temp = [
          ...temp,
          ...fixedApprovals.inProgress.map((i: any) => ({
            ...i,
            stage: "In Progress",
            portalAdminName: i.contractorDetails?.name,
            portalAdminEmail: i.contractorDetails?.email,
            portalAdminPhone:
              typeof i.contractorDetails?.phone === "string"
                ? i.contractorDetails?.phone
                : i.contractorDetails?.phone?.internationalNumber ||
                i.contractorDetails?.phone?.nationalNumber,
          })),
        ];
      }
      if (exportOptions.selectedStages.includes("l3")) {
        temp = [
          ...temp,
          ...fixedApprovals.l3.map((i: any) => ({
            ...i,
            stage: "L3",
          })),
        ];
      }
      if (exportOptions.selectedStages.includes("l2")) {
        if (exportOptions.l2Stages.includes("returned")) {
          temp = [
            ...temp,
            ...fixedApprovals.returned.map((i: any) => ({
              ...i,
              l2Stage: "Returned",
              stage: "L2",
              portalAdminName: i.contractorDetails?.name,
              portalAdminEmail: i.contractorDetails?.email,
              portalAdminPhone:
                typeof i.contractorDetails?.phone === "string"
                  ? i.contractorDetails?.phone
                  : i.contractorDetails?.phone?.internationalNumber ||
                  i.contractorDetails?.phone?.nationalNumber,
            })),
          ];
        }
        if (exportOptions.l2Stages.includes("completed")) {
          temp = [
            ...temp,
            ...fixedApprovals.completedL2.map((i: any) => ({
              ...i,
              l2Stage: "Completed",
              stage: "L2",
              portalAdminName: i.contractorDetails?.name,
              portalAdminEmail: i.contractorDetails?.email,
              portalAdminPhone:
                typeof i.contractorDetails?.phone === "string"
                  ? i.contractorDetails?.phone
                  : i.contractorDetails?.phone?.internationalNumber ||
                  i.contractorDetails?.phone?.nationalNumber,
            })),
          ];
        }
        if (exportOptions.l2Stages.includes("pending")) {
          fixedApprovals.pendingL2?.forEach((item: any) => {
            if (exportOptions.pendingL2Stages.includes("All"))
              temp.push({
                ...item,
                l2PendingStage: getL2PendingStage(item.flags),
                l2Stage: "Pending",
                stage: "L2",
                portalAdminName: item.contractorDetails?.name,
                portalAdminEmail: item.contractorDetails?.email,
                portalAdminPhone:
                  typeof item.contractorDetails?.phone === "string"
                    ? item.contractorDetails?.phone
                    : item.contractorDetails?.phone?.internationalNumber ||
                    item.contractorDetails?.phone?.nationalNumber,
              });
            else {
              const L = item.flags?.approvals?.level;
              if (exportOptions.pendingL2Stages.includes("A") && !L)
                temp.push({
                  ...item,
                  l2PendingStage: "A",
                  l2Stage: "Pending",
                  stage: "L2",
                  portalAdminName: item.contractorDetails?.name,
                  portalAdminEmail: item.contractorDetails?.email,
                  portalAdminPhone:
                    typeof item.contractorDetails?.phone === "string"
                      ? item.contractorDetails?.phone
                      : item.contractorDetails?.phone?.internationalNumber ||
                      item.contractorDetails?.phone?.nationalNumber,
                });
              if (exportOptions.pendingL2Stages.includes("B") && L === 1)
                temp.push({
                  ...item,
                  l2PendingStage: "B",
                  l2Stage: "Pending",
                  stage: "L2",
                  portalAdminName: item.contractorDetails?.name,
                  portalAdminEmail: item.contractorDetails?.email,
                  portalAdminPhone:
                    typeof item.contractorDetails?.phone === "string"
                      ? item.contractorDetails?.phone
                      : item.contractorDetails?.phone?.internationalNumber ||
                      item.contractorDetails?.phone?.nationalNumber,
                });
              if (exportOptions.pendingL2Stages.includes("C") && L === 2)
                temp.push({
                  ...item,
                  l2PendingStage: "C",
                  l2Stage: "Pending",
                  stage: "L2",
                  portalAdminName: item.contractorDetails?.name,
                  portalAdminEmail: item.contractorDetails?.email,
                  portalAdminPhone:
                    typeof item.contractorDetails?.phone === "string"
                      ? item.contractorDetails?.phone
                      : item.contractorDetails?.phone?.internationalNumber ||
                      item.contractorDetails?.phone?.nationalNumber,
                });
              if (exportOptions.pendingL2Stages.includes("D") && L === 3)
                temp.push({
                  ...item,
                  l2PendingStage: "D",
                  l2Stage: "Pending",
                  stage: "L2",
                  portalAdminName: item.contractorDetails?.name,
                  portalAdminEmail: item.contractorDetails?.email,
                  portalAdminPhone:
                    typeof item.contractorDetails?.phone === "string"
                      ? item.contractorDetails?.phone
                      : item.contractorDetails?.phone?.internationalNumber ||
                      item.contractorDetails?.phone?.nationalNumber,
                });
              if (exportOptions.pendingL2Stages.includes("E") && L === 4)
                temp.push({
                  ...item,
                  l2PendingStage: "E",
                  l2Stage: "Pending",
                  stage: "L2",
                  portalAdminName: item.contractorDetails?.name,
                  portalAdminEmail: item.contractorDetails?.email,
                  portalAdminPhone:
                    typeof item.contractorDetails?.phone === "string"
                      ? item.contractorDetails?.phone
                      : item.contractorDetails?.phone?.internationalNumber ||
                      item.contractorDetails?.phone?.nationalNumber,
                });
              if (exportOptions.pendingL2Stages.includes("F") && L === 5)
                temp.push({
                  ...item,
                  l2PendingStage: "F",
                  l2Stage: "Pending",
                  stage: "L2",
                  portalAdminName: item.contractorDetails?.name,
                  portalAdminEmail: item.contractorDetails?.email,
                  portalAdminPhone:
                    typeof item.contractorDetails?.phone === "string"
                      ? item.contractorDetails?.phone
                      : item.contractorDetails?.phone?.internationalNumber ||
                      item.contractorDetails?.phone?.nationalNumber,
                });
              if (exportOptions.pendingL2Stages.includes("G") && L === 6)
                temp.push({
                  ...item,
                  l2PendingStage: "G",
                  l2Stage: "Pending",
                  stage: "L2",
                  portalAdminName: item.contractorDetails?.name,
                  portalAdminEmail: item.contractorDetails?.email,
                  portalAdminPhone:
                    typeof item.contractorDetails?.phone === "string"
                      ? item.contractorDetails?.phone
                      : item.contractorDetails?.phone?.internationalNumber ||
                      item.contractorDetails?.phone?.nationalNumber,
                });
              if (exportOptions.pendingL2Stages.includes("H") && L === 7)
                temp.push({
                  ...item,
                  l2PendingStage: "H",
                  l2Stage: "Pending",
                  stage: "L2",
                  portalAdminName: item.contractorDetails?.name,
                  portalAdminEmail: item.contractorDetails?.email,
                  portalAdminPhone:
                    typeof item.contractorDetails?.phone === "string"
                      ? item.contractorDetails?.phone
                      : item.contractorDetails?.phone?.internationalNumber ||
                      item.contractorDetails?.phone?.nationalNumber,
                });
            }
          });
        }
      }
    }

    // 🚨 New: prevent exporting empty data
    if (!temp || temp.length === 0) {
      toast.info("No vendor records available to export. Please ensure the data is loaded.");
      return;
    }

    temp = sortListAlphabetically(temp);
    exportRegisteredVendorsToExcel(temp);
  };

  const exportRegisteredVendorsToExcel = (exportData: any[]) => {
    const data: any = [
      {
        sheet: "Vendors List",
        columns: [
          { label: "Company Name", value: "companyName" },
          { label: "Stage", value: "stage" },
          { label: "L2 Stage", value: "l2Stage" },
          { label: "Pending L2 Stage", value: "l2PendingStage" },
          { label: "Last Updated", value: (row: any) => new Date(row.updatedAt) },
          // Vendor Portal Admin details
          { label: "Portal Admin Name", value: "portalAdminName" },
          { label: "Portal Admin Email", value: "portalAdminEmail" },
          { label: "Portal Admin Phone", value: "portalAdminPhone" },
        ],
        content: exportData,
      },
    ];
    const settings: any = {
      fileName: "VendorListExport",
      extraLength: 3,
      writeMode: "writeFile",
      writeOptions: {},
      RTL: false,
    };
    xlsx(data, settings);
  };

  const inviteIsActive = (invite: any) => {
    const currentDate = new Date();
    const expiryDate = invite?.expiry?._seconds
      ? new Date(invite.expiry._seconds * 1000)
      : new Date(invite.expiry);
    return currentDate.getTime() < expiryDate.getTime() && !invite.used;
  };

  const inviteHasExpired = (invite: any) => {
    const currentDate = new Date();
    const expiryDate = invite?.expiry?._seconds
      ? new Date(invite.expiry._seconds * 1000)
      : new Date(invite.expiry);
    return currentDate.getTime() > expiryDate.getTime() && !invite.used;
  };

  const exportExcelFile = (exportData: any[]) => {
    const data: any = [
      {
        sheet: "Adults",
        columns: [
          { label: "Company Name", value: "companyName" },
          { label: "Email", value: "email" },
          { label: "Name", value: "name" },
          { label: "Sent On", value: (row: any) => new Date(row.createdAt) },
          {
            label: "Status",
            value: (row: any) =>
              row.used
                ? "Used"
                : inviteIsActive(row)
                  ? "Active"
                  : inviteHasExpired(row)
                    ? "Expired"
                    : "",
          },
        ],
        content: exportData,
      },
    ];
    const settings: any = {
      fileName: "VendorListExport",
      extraLength: 3,
      writeMode: "writeFile",
      writeOptions: {},
      RTL: false,
    };
    xlsx(data, settings);
  };

  const closeExportModal = () => {
    setExportOptions({
      root: "invited",
      selectedInviteType: "all",
      selectedStages: [],
      l2Stages: [],
      pendingL2Stages: [],
      exportType: "all",
      selectedVendors: [],
    });
    setVendorsToExport([]);
    setShowExportModal(false);
  };

  const getdisplayRows = () => {
    // If tab hasn't finished its first load yet, return []
    if (!tabData[activeTab]?.loaded) return [];

    switch (activeTab) {
      case "invited":
        return approvals.invites;
      case "in-progress":
        return approvals.inProgress;
      case "pending-l2":
        return approvals.pendingL2;
      case "l3":
        return approvals.l3;
      case "completed-l2":
        return approvals.completedL2;
      case "returned":
        return approvals.returned;
      case "park-requests":
        return approvals.parkRequested || [];
      default:
        return [];
    }
  };

  const displayRows = useMemo(getdisplayRows, [activeTab, approvals]);

  // Render
  return (
    <div className={styles.approvals}>
      {actionProgress && <FloatingControls status={actionProgress} />}

      {returnToL2Data && (
        <RevertToL2Modal
          actionProgress={actionProgress}
          onConfirm={() => revertToL2(returnToL2Data.vendorID, returnToL2Data.from)}
          onCancel={cancelRevertToL2}
        />
      )}

      {showExportModal && (
        <ExportModal
          exportOptions={exportOptions}
          updateExportOptions={updateExportOptions}
          toggleExportOptions={toggleExportOptions}
          exportVendorSearchResults={exportVendorSearchResults}
          addVendorToSelectedList={addVendorToSelectedList}
          selectedVendorsToExport={selectedVendorsToExport}
          removeVendorFromSelectedVendorsToExport={removeVendorFromSelectedVendorsToExport}
          exportContractors={exportContractors}
          closeExportModal={closeExportModal}
          findVendorsByName={findVendorsByName}
        />
      )}

      <header>
        <h3>C&P Officer Dashboard</h3>
        <h5>Registration Approvals</h5>
        {!fetchingContractors && activeTab !== "invited" && (
          <SearchBar
            onQuery={searchVendors}
            isLoading={isLazySearchLoading}
            onFilterChange={setCurrentSearchFilter}
            results={searchQueryResults}
            filterParam={getFilterParam(currentSearchFilter)}
            resultRef={searchResultRef}
            searchOpen={searchOpen}
            setSearchOpen={() => setSearchOpen(true)}
            vendorIsPending={(v: any) => v?.flags?.status === "pending"}
            getNextStage={getNextStage}
            capitalizeWord={capitalizeWord}
          />
        )}
      </header>

      {Object.values(inviteToArchive)?.length > 0 && (
        <ArchiveInviteModal
          archivingInvite={archivingInvite}
          archiveStatusMessages={archiveStatusMessages}
          onArchive={archiveInvite}
          onClose={unsetInviteToArchiveObject}
        />
      )}

      {fetchingContractors && (
        <div className={styles.loading}>
          <Loading message="Fetching Contractors..." />
        </div>
      )}

      {!fetchingContractors && (
        <>
          <div className={styles.exportToExcelDiv}>
            <button onClick={() => setShowExportModal(true)}>Export to Excel</button>
          </div>

          <ApprovalsTabs
            TabsComponent={Tabs}
            tabs={approvalsTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          <FilterControls
            userIsCnPStaff={userIsCnPStaff()}
            activeTab={activeTab}
            inviteFilters={inviteFilters}
            activeFilter={activeFilter}
            onInviteFilter={filterInvites}
            onNameOrEmailFilter={filterInvitedCompaniesByNameOrEmail}
            approvalStages={approvalStages}
            l3Filters={l3Filters}
            activeL3Filter={activeL3Filter}
            setActiveFilter={setActiveFilter}
            setActiveL3Filter={setActiveL3Filter}
            filterL2Companies={filterL2Companies}
            filterL3Companies={filterL3Companies}
            approvals={approvals}
          />

          {errorMessage && <ErrorText text={errorMessage} />}
          {successMessage && <SuccessMessage message={successMessage} />}

          {currentTabLoading ? (
            <div className={styles.loading}>
              <Loading message="Loading data..." />
            </div>
          ) : (
            <DataTable
              headers={getActiveTable()}
              onHeaderClick={getSortToPerform}
              showSortIcons={showSortIcons}
              getIcon={getIconToDisplay}
              ImageComponent={Image}
            >
              {activeTab === "invited" &&
                approvals.invites.map((item: any, index: number) => (
                  <InvitedContractorRow
                    key={index}
                    inviteDetails={item}
                    index={index}
                    user={user}
                    activeFilter={activeFilter}
                    setInviteToArchiveObject={setInviteToArchiveObject}
                    removeInviteFromExpired={removeInviteFromExpiredList}
                  />
                ))}
              {activeTab === "in-progress" &&
                displayRows?.map((item: any, index: number) => (
                  <InProgressRow key={index} companyRecord={item} index={index} />
                ))}
              {activeTab === "pending-l2" &&
                displayRows?.map((item: any, index: number) => {
                  return (
                    <PendingL2Row
                      key={index}
                      companyRecord={item}
                      index={index}
                      user={user}
                      activeFilter={activeFilter}
                    />
                  );
                })}
              {activeTab === "l3" &&
                displayRows?.map((item: any, index: number) => (
                  <L3Row
                    key={index}
                    companyRecord={item}
                    index={index}
                    user={user}
                    revertToL2={(vendorID: string) => setDataForReturnToL2(vendorID, "l3")}
                  />
                ))}
              {activeTab === "completed-l2" &&
                displayRows?.map((item: any, index: number) => (
                  <CompletedL2Row
                    key={index}
                    companyRecord={item}
                    index={index}
                    user={user}
                    revertToL2={(vendorID: string) => setDataForReturnToL2(item._id, "parked")}
                  />
                ))}
              {activeTab === "returned" &&
                displayRows?.map((item: any, index: number) => (
                  <ReturnedRow key={index} companyRecord={item} index={index} />
                ))}
              {activeTab === "park-requests" &&
                displayRows &&
                displayRows?.map((item: any, index: number) => (
                  <ParkRequestedRow
                    key={index}
                    companyRecord={item}
                    index={index}
                    approveParkRequest={() => approveParkRequest(item._id)}
                    declineParkRequest={() => declineParkRequest(item._id)}
                    user={user}
                  />
                ))}
            </DataTable>
          )}
        </>
      )}
    </div>
  );
}
