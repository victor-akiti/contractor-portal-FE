import { staffApi } from "../apis/staffApi";

export const eventsSlice = staffApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllEvents: builder.query<any[], { userRole: string }>({
            query: () => ({ url: "events/all", method: "GET" }),
            providesTags: ["Events"],
            extraOptions: (arg: any) => ({ userRole: arg.userRole }),
            transformResponse: (response: any) => {
                if (Array.isArray(response?.data)) return response.data;
                if (Array.isArray(response?.data?.events)) return response.data.events;
                return [];
            },
        }),
    }),
});

export const { useGetAllEventsQuery } = eventsSlice;

export default eventsSlice;
