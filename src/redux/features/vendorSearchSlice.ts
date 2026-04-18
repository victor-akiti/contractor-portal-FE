import { staffApi } from "../apis/staffApi";

export interface VendorSearchParams {
    q: string;
    category?: "all" | "name" | "activities" | "categories";
    status?: string;
    jobCategoryFilter?: string;
    page?: number;
    limit?: number;
    userRole: string;
}

export interface JobCategory {
    _id: string;
    category: string;
    userID: string;
    userName: string;
    createdAt: string;
    updatedAt: string;
}

export const vendorSearchSlice = staffApi.injectEndpoints({
    endpoints: (builder) => ({
        vendorSearch: builder.query<any, VendorSearchParams>({
            query: ({ q, category = "all", status, jobCategoryFilter, page = 1, limit = 20 }) => {
                const params = new URLSearchParams();
                params.set("q", q);
                params.set("category", category);
                if (status) params.set("status", status);
                if (jobCategoryFilter) params.set("jobCategoryFilter", jobCategoryFilter);
                params.set("page", String(page));
                params.set("limit", String(limit));
                return {
                    url: `companies/vendor-search?${params.toString()}`,
                    method: "GET",
                };
            },
            providesTags: (r, e, arg) => [
                { type: "Search", id: `vendor-${arg.q}-${arg.category}-${arg.status}-${arg.jobCategoryFilter}-${arg.page}` },
            ],
            extraOptions: (arg) => ({ userRole: arg.userRole }),
            keepUnusedDataFor: 300,
        }),
        getJobCategories: builder.query<JobCategory[], void>({
            query: () => ({ url: "jobCategories", method: "GET" }),
            keepUnusedDataFor: 600,
            transformResponse: (response: { data: JobCategory[] }) => response.data,
        }),
    }),
    overrideExisting: false,
});

export const { useVendorSearchQuery, useLazyVendorSearchQuery, useGetJobCategoriesQuery } = vendorSearchSlice;

export default vendorSearchSlice;
