import { staffApi } from "../apis/staffApi";

// Helper function to sort by needsAttention, then priority, then company name
const sortByCompanyName = (array: any[]) => {
    if (!Array.isArray(array)) return array;
    return [...array].sort((a, b) => {
        // First, sort by needsAttention (true comes first) - most urgent
        if (a.needsAttention && !b.needsAttention) return -1;
        if (!a.needsAttention && b.needsAttention) return 1;

        // Second, sort by priority (true comes first) - handles undefined gracefully
        const aPriority = a.flags?.isPriority || false;
        const bPriority = b.flags?.isPriority || false;
        if (aPriority && !bPriority) return -1;
        if (!aPriority && bPriority) return 1;

        // Within each group, sort alphabetically by company name
        return String(a.companyName || "")
            .toLowerCase()
            .localeCompare(String(b.companyName || "").toLowerCase());
    });
};

export const approvalSlice = staffApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /companies/approvals/counts
        getApprovalCounts: builder.query<any, string>({
            query: () => ({ url: "companies/approvals/counts", method: "GET" }),
            providesTags: ["Counts"],
            extraOptions: (role: string) => ({ userRole: role }),
        }),

        // GET /companies/approvals/all
        getAllCompanies: builder.query<any, { userRole: string }>({
            query: () => ({ url: `companies/approvals/all`, method: "GET" }),
            providesTags: ["All Companies"],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
            transformResponse: (response: any) => {
                if (response?.data?.companies) {
                    return {
                        ...response,
                        data: {
                            ...response.data,
                            companies: sortByCompanyName(response.data.companies),
                        },
                    };
                }
                return response;
            },
        }),

        // GET /companies/approvals/:tab
        getCompaniesByTab: builder.query<any, { tab: string; userRole: string }>({
            query: ({ tab }) => ({ url: `companies/approvals/${tab}`, method: "GET" }),
            providesTags: (r, e, arg) => [{ type: "Tab", id: arg.tab }],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
            transformResponse: (response: any) => {
                if (response?.data?.companies) {
                    return {
                        ...response,
                        data: {
                            ...response.data,
                            companies: sortByCompanyName(response.data.companies),
                        },
                    };
                }
                return response;
            },
        }),

        // GET /companies/invites?filter=... (modified for client-side filtering)
        getInvites: builder.query<any, { filter: string; userRole: string }>({
            query: ({ filter }) => ({
                url: `companies/invites?filter=${encodeURIComponent(filter === "All" ? "all" : filter)}`,
                method: "GET",
            }),
            providesTags: (r, e, arg) => [{ type: "Tab", id: "invited:" + arg.filter }],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
            transformResponse: (response: any) => {
                if (response?.data?.invites) {
                    return {
                        ...response,
                        data: {
                            ...response.data,
                            invites: sortByCompanyName(response.data.invites),
                        },
                    };
                }
                return response;
            },
        }),

        // GET /companies/search?query=...&filter=...
        searchCompanies: builder.query<any, { query: string; filter: string; userRole: string }>({
            query: ({ query, filter }) => ({
                url: `companies/search?query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`,
                method: "GET",
            }),
            providesTags: (r, e, arg) => [{ type: "Search", id: `${arg.query}-${arg.filter}` }],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
            keepUnusedDataFor: 60,
            transformResponse: (response: any) => {
                if (response?.data?.companies) {
                    return {
                        ...response,
                        data: {
                            ...response.data,
                            companies: sortByCompanyName(response.data.companies),
                        },
                    };
                }
                return response;
            },
        }),

        /* =========================
               MUTATIONS
               ========================= */

        // POST /approvals/process/:vendorId (for all approval stages)
        processApproval: builder.mutation<
            any,
            {
                vendorId: string;
                data: {
                    pages?: any;
                    selectedEndUsers?: any;
                    selectedServices?: any;
                    siteVisitRequired?: boolean;
                    dueDiligence?: any;
                    hodRemarkForEA?: any;
                };
                userRole: string;
            }
        >({
            query: ({ vendorId, data }) => ({
                url: `approvals/process/${vendorId}`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        "Counts",
                        { type: "Tab", id: "pending-l2" },
                        { type: "Tab", id: "l3" },
                        { type: "Tab", id: "completed-l2" },
                        { type: "Tab", id: "in-progress" },
                        { type: "Tab", id: "returned" },
                        { type: "Tab", id: "park-requests" },
                    ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),

        // POST /approvals/revert/l2/:vendorId
        revertToL2: builder.mutation<any, { vendorId: string; from: string; userRole: string }>({
            query: ({ vendorId, from }) => ({
                url: `approvals/revert/l2/${vendorId}`,
                method: "POST",
                body: { from },
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        "Counts",
                        { type: "Tab", id: "pending-l2" },
                        { type: "Tab", id: "l3" },
                        { type: "Tab", id: "completed-l2" },
                        { type: "Tab", id: "park-requests" },
                    ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),

        // GET /approvals/hold/approve/:vendorId
        approveParkRequest: builder.mutation<any, { vendorId: string; userRole: string }>({
            query: ({ vendorId }) => ({
                url: `approvals/hold/approve/${vendorId}`,
                method: "GET",
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : ["Counts", { type: "Tab", id: "park-requests" }, { type: "Tab", id: "completed-l2" }],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),

        // GET /approvals/hold/cancel/:vendorId
        declineParkRequest: builder.mutation<any, { vendorId: string; userRole: string }>({
            query: ({ vendorId }) => ({
                url: `approvals/hold/cancel/${vendorId}`,
                method: "GET",
            }),
            invalidatesTags: (result, error) =>
                error ? [] : ["Counts", { type: "Tab", id: "park-requests" }],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),

        // POST /invites/archive
        archiveInvite: builder.mutation<any, { inviteData: any; userRole: string }>({
            query: ({ inviteData }) => ({
                url: "invites/archive",
                method: "POST",
                body: inviteData,
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        "Counts",
                        { type: "Tab", id: "invited:all" },
                        { type: "Tab", id: "invited:All" },
                        { type: "Tab", id: "invited:Active" },
                        { type: "Tab", id: "invited:Expired" },
                        { type: "Tab", id: "invited:Used" },
                        { type: "Tab", id: "invited:Archived" },
                    ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),

        // GET /invites/remind/:inviteId
        sendReminder: builder.mutation<any, { inviteId: string; userRole: string }>({
            query: ({ inviteId }) => ({
                url: `invites/remind/${inviteId}`,
                method: "GET",
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        { type: "Tab", id: "invited:all" },
                        { type: "Tab", id: "invited:All" },
                    ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),

        // GET /invites/renew/:inviteId
        renewInvite: builder.mutation<any, { inviteId: string; userRole: string }>({
            query: ({ inviteId }) => ({
                url: `invites/renew/${inviteId}`,
                method: "GET",
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        { type: "Tab", id: "invited:all" },
                        { type: "Tab", id: "invited:All" },
                        { type: "Tab", id: "invited:Active" },
                        { type: "Tab", id: "invited:Expired" },
                    ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),

        // POST /approvals/priority/:companyID
        togglePriority: builder.mutation<
            any,
            { companyId: string; isPriority: boolean; userRole: string }
        >({
            query: ({ companyId, isPriority }) => ({
                url: `approvals/priority/${companyId}`,
                method: "POST",
                body: { isPriority },
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        "Counts",
                        { type: "Tab", id: "pending-l2" },
                        { type: "Tab", id: "l3" },
                        { type: "Tab", id: "completed-l2" },
                        { type: "Tab", id: "in-progress" },
                        { type: "Tab", id: "returned" },
                        { type: "Tab", id: "park-requests" },
                        "All Companies",
                    ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),

        sendReturnedReminders: builder.mutation<any, { vendorIds: string[]; userRole: string }>({
            query: ({ vendorIds }) => ({
                url: `approvals/reminders/bulk`,
                method: "POST",
                body: { vendorIds },
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        "Counts",
                        { type: "Tab", id: "returned" },
                        { type: "Tab", id: "in-progress" },
                        "All Companies",
                    ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),
        // POST /approvals/reminder/:vendorID - Send single reminder to returned contractor
        sendSingleReturnedReminder: builder.mutation<any, { vendorId: string; userRole: string }>({
            query: ({ vendorId }) => ({
                url: `approvals/reminder/${vendorId}`,
                method: "POST",
            }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        "Counts",
                        { type: "Tab", id: "returned" },
                        { type: "Tab", id: "in-progress" },
                        "All Companies",
                    ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
        }),
    }),
    overrideExisting: true,
});

// Export hooks from the slice - this works in Vite
export const {
    useGetApprovalCountsQuery,
    useGetCompaniesByTabQuery,
    useGetInvitesQuery,
    useSearchCompaniesQuery,
    useLazySearchCompaniesQuery,
    useProcessApprovalMutation,
    useRevertToL2Mutation,
    useApproveParkRequestMutation,
    useDeclineParkRequestMutation,
    useArchiveInviteMutation,
    useSendReminderMutation,
    useRenewInviteMutation,
    useTogglePriorityMutation,
    usePrefetch: usePrefetchApprovals,
    useGetAllCompaniesQuery,
    useSendReturnedRemindersMutation,
    useSendSingleReturnedReminderMutation,
} = approvalSlice;

export default approvalSlice;
