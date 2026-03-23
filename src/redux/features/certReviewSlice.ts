import { staffApi } from "../apis/staffApi";

export const certReviewSlice = staffApi.injectEndpoints({
    endpoints: (builder) => ({
        getCertReviewQueue: builder.query<any, { userRole: string }>({
            query: () => ({ url: "companies/certificates/pending-review", method: "GET" }),
            providesTags: ["CertReview"],
            extraOptions: (arg: any) => ({ userRole: arg.userRole }),
        }),

        reviewCertificate: builder.mutation<
            any,
            { certificateId: string; certStatus: "approved" | "rejected"; reviewRemarks?: string; userRole: string }
        >({
            query: ({ certificateId, certStatus, reviewRemarks }) => ({
                url: `companies/certificates/${certificateId}/review`,
                method: "PUT",
                body: { certStatus, reviewRemarks },
            }),
            invalidatesTags: ["CertReview"],
            extraOptions: (arg: any) => ({ userRole: arg.userRole }),
        }),

    }),
});

export const { useGetCertReviewQueueQuery, useReviewCertificateMutation } = certReviewSlice;
