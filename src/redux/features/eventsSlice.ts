import { staffApi } from "../apis/staffApi";

export interface EventsQueryParams {
    userRole: string;
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: "all" | "company" | "user";
    startDate?: string;
    endDate?: string;
}

export interface EventsResponse {
    events: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const eventsSlice = staffApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllEvents: builder.query<EventsResponse, EventsQueryParams>({
            query: ({ page = 1, limit = 100, search, searchBy = "all", startDate, endDate }) => {
                const params = new URLSearchParams();
                params.set("page", String(page));
                params.set("limit", String(limit));
                if (search && search.trim()) params.set("search", search.trim());
                if (searchBy) params.set("searchBy", searchBy);
                if (startDate) params.set("startDate", startDate);
                if (endDate) params.set("endDate", endDate);
                return { url: `events/all?${params.toString()}`, method: "GET" };
            },
            providesTags: (r, e, arg) => [
                { type: "Events", id: `p${arg.page ?? 1}-l${arg.limit ?? 100}-s${arg.search ?? ""}-by${arg.searchBy ?? "all"}-sd${arg.startDate ?? ""}-ed${arg.endDate ?? ""}` },
            ],
            extraOptions: (arg: any) => ({ userRole: arg.userRole }),
            transformResponse: (response: any): EventsResponse => {
                const data = response?.data ?? {};
                if (Array.isArray(data)) {
                    return { events: data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
                }
                return {
                    events: Array.isArray(data.events) ? data.events : [],
                    total: typeof data.total === "number" ? data.total : 0,
                    page: typeof data.page === "number" ? data.page : 1,
                    limit: typeof data.limit === "number" ? data.limit : 100,
                    totalPages: typeof data.totalPages === "number" ? data.totalPages : 1,
                };
            },
        }),
    }),
});

export const { useGetAllEventsQuery } = eventsSlice;

export default eventsSlice;
