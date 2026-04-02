import { staffApi } from "../apis/staffApi";
import type {
    CertReviewQueueResponse,
    ReviewCertificateRequest,
    ReviewCertificateBody,
} from "@/types/certificate.types";

export const certReviewSlice = staffApi.injectEndpoints({
    endpoints: (builder) => ({
        getCertReviewQueue: builder.query<CertReviewQueueResponse, { userRole: string }>({
            query: () => ({ url: "companies/certificates/pending-review", method: "GET" }),
            providesTags: ["CertReview"],
            extraOptions: (arg: any) => ({ userRole: arg.userRole }),
        }),

        reviewCertificate: builder.mutation<ApiSuccessResponse, ReviewCertificateRequest>({
            query: ({ certificateId, certStatus, reviewRemarks, internalComment }) => {
                const body: ReviewCertificateBody = {
                    certStatus,
                    reviewRemarks,
                    ...(internalComment?.trim() ? { internalComment: internalComment.trim() } : {}),
                };
                return {
                    url: `companies/certificates/${certificateId}/review`,
                    method: "PUT",
                    body,
                };
            },
            invalidatesTags: ["CertReview"],
            extraOptions: (arg: any) => ({ userRole: arg.userRole }),
        }),
    }),
});

export const { useGetCertReviewQueueQuery, useReviewCertificateMutation } = certReviewSlice;

// ---------------------------------------------------------------------------
// Local response type for the review mutation
// ---------------------------------------------------------------------------
interface ApiSuccessResponse {
    status: "OK" | "FAILED";
    message?: string;
    data?: unknown;
}
