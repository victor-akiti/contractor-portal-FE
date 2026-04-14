import { staffApi } from "../apis/staffApi";

export interface VendorSearchParams {
    q: string;
    category?: "all" | "name" | "activities" | "categories";
    status?: string;
    page?: number;
    limit?: number;
    userRole: string;
}

export const vendorSearchSlice = staffApi.injectEndpoints({
    endpoints: (builder) => ({
        vendorSearch: builder.query<any, VendorSearchParams>({
            query: ({ q, category = "all", status, page = 1, limit = 20 }) => {
                const params = new URLSearchParams();
                params.set("q", q);
                params.set("category", category);
                if (status) params.set("status", status);
                params.set("page", String(page));
                params.set("limit", String(limit));
                return {
                    url: `companies/vendor-search?${params.toString()}`,
                    method: "GET",
                };
            },
            providesTags: (r, e, arg) => [
                { type: "Search", id: `vendor-${arg.q}-${arg.category}-${arg.status}-${arg.page}` },
            ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
            keepUnusedDataFor: 300,
        }),
    }),
    overrideExisting: false,
});

export const { useVendorSearchQuery, useLazyVendorSearchQuery } = vendorSearchSlice;

export default vendorSearchSlice;
