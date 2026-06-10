// V2 RTK Query slice. Injects every hot-path V2 endpoint into the shared
// staffApi so list pages, the detail page, and the invites surface all
// share one cache, get automatic request deduplication, and benefit from
// tag-based invalidation when mutations fire.
//
// Mutations preserve the {status, data, error} envelope the components
// already consume: helpers like postProtected/getProtected return that
// shape on both success and 4xx failure paths. We mirror the same shape
// via transformErrorResponse so component logic does not have to change.

import { staffApi } from "../apis/staffApi"

// ── Helpers ─────────────────────────────────────────────────────────────────

// BE returns: { status: "OK", data: {...} } on success, and 4xx with
// { status: "Failed", error: { message } } on failure. RTK Query parses
// the 4xx body into error.data; we re-shape it back into the FAILED
// envelope so call sites can keep doing `if (r?.status === "OK")`.
const failedEnvelope = (response: any, meta: any) => {
    // RTK Query passes the parsed BE body as response when the status is
    // non-2xx. Fall back to a synthetic shape if the BE returned an empty
    // body (network / 5xx with no JSON).
    if (response && typeof response === "object" && "status" in response) {
        return response
    }
    return {
        status: "FAILED",
        error: {
            message:
                response?.error?.message ||
                response?.message ||
                `Request failed with status ${meta?.response?.status ?? "?"}`,
        },
    }
}

const passThrough = <T = any>(response: T) => response

// Build URL with optional query string from a Record<string,string|undefined>.
// Drops undefined / empty values so the BE sees a clean query.
const withQuery = (path: string, params?: Record<string, string | undefined>) => {
    if (!params) return path
    const usp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, String(v))
    })
    const qs = usp.toString()
    return qs ? `${path}?${qs}` : path
}

// ── Endpoints ───────────────────────────────────────────────────────────────

export const v2Slice = staffApi.injectEndpoints({
    endpoints: (builder) => ({
        // ── Submissions list / counts / detail ─────────────────────────
        // params mirrors the existing URLSearchParams contract:
        //   status, search, sortBy, priorityPin, approved, limit, etc.
        getV2Submissions: builder.query<any, Record<string, string | undefined>>({
            query: (params) => ({
                url: withQuery("api/v2/submissions", params),
                method: "GET",
            }),
            providesTags: ["V2SubsList"],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        getV2SubmissionCounts: builder.query<any, void>({
            query: () => ({ url: "api/v2/submission-counts", method: "GET" }),
            providesTags: ["V2Counts"],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        getV2Submission: builder.query<any, string>({
            query: (id) => ({ url: `api/v2/submissions/${id}`, method: "GET" }),
            providesTags: (_r, _e, id) => [{ type: "V2Submission", id }],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        getV2SubmissionCertificates: builder.query<any, string>({
            query: (id) => ({
                url: `api/v2/submissions/${id}/certificates`,
                method: "GET",
            }),
            providesTags: (_r, _e, id) => [{ type: "V2SubCerts", id }],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        // Detail-page side data. Each tagged separately so a comment
        // post / edit / delete only invalidates the comments query, not
        // the entire submission detail.
        getV2SubmissionComments: builder.query<any, string>({
            query: (id) => ({
                url: `api/v2/submissions/${id}/comments`,
                method: "GET",
            }),
            providesTags: (_r, _e, id) => [{ type: "V2Comments", id }],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        getV2SubmissionEdits: builder.query<any, string>({
            query: (id) => ({
                url: `api/v2/submissions/${id}/edits`,
                method: "GET",
            }),
            providesTags: (_r, _e, id) => [{ type: "V2Edits", id }],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        getV2SubmissionMigrationStatus: builder.query<any, string>({
            query: (id) => ({
                url: `api/v2/submissions/${id}/migration-status`,
                method: "GET",
            }),
            providesTags: (_r, _e, id) => [{ type: "V2MigStatus", id }],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        getV2SubmissionRemarks: builder.query<any, string>({
            query: (id) => ({
                url: `api/v2/submissions/${id}/remarks`,
                method: "GET",
            }),
            providesTags: (_r, _e, id) => [{ type: "V2Remarks", id }],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        // ── Invites list / lookups ─────────────────────────────────────
        getV2Invites: builder.query<any, { status?: string }>({
            query: ({ status }) => ({
                url: withQuery("api/v2/invites", status ? { status } : undefined),
                method: "GET",
            }),
            providesTags: ["V2InviteList"],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        getV2Groups: builder.query<any, void>({
            query: () => ({ url: "api/v2/groups", method: "GET" }),
            providesTags: ["V2Groups"],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        findV2InviteByEmail: builder.query<any, string>({
            query: (email) => ({
                url: `api/v2/invites/find-by-email?email=${encodeURIComponent(email)}`,
                method: "GET",
            }),
            // Email lookups are intent-driven (on blur) so a short cache
            // makes the experience snappier if the user blurs back into
                // the same address.
            keepUnusedDataFor: 60,
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        findV2SimilarCompanies: builder.query<any, string>({
            query: (q) => ({
                url: `api/v2/invites/find-similar?q=${encodeURIComponent(q)}`,
                method: "GET",
            }),
            keepUnusedDataFor: 60,
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        // Staff list for the Recommended By autocomplete. Long TTL - the
        // staff directory rarely changes mid-session.
        getStaffAll: builder.query<any, void>({
            query: () => ({ url: "users/staff/all", method: "GET" }),
            providesTags: ["V2Staff"],
            keepUnusedDataFor: 600,
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        // ── Submission mutations ───────────────────────────────────────
        // Generic POST /api/v2/submissions/:id/:action covers advance,
        // return, request-park, approve-park, decline-park, release-park,
        // retrieve, return-to-previous-stage, return-for-eba-correction,
        // park-at-l2, change-group, return-to-earlier-stage,
        // final-approve, replace-portal-admin.
        v2SubmissionAction: builder.mutation<
            any,
            { id: string; action: string; body?: any }
        >({
            query: ({ id, action, body }) => ({
                url: `api/v2/submissions/${id}/${action}`,
                method: "POST",
                body: body || {},
            }),
            invalidatesTags: (_r, error, arg) =>
                error
                    ? []
                    : [
                          "V2SubsList",
                          "V2Counts",
                          { type: "V2Submission", id: arg.id },
                          { type: "V2SubCerts", id: arg.id },
                          { type: "V2Comments", id: arg.id },
                          { type: "V2Edits", id: arg.id },
                          { type: "V2Remarks", id: arg.id },
                          { type: "V2MigStatus", id: arg.id },
                      ],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        setV2Priority: builder.mutation<
            any,
            { id: string; isPriority: boolean }
        >({
            query: ({ id, isPriority }) => ({
                url: `api/v2/submissions/${id}/priority`,
                method: "PUT",
                body: { isPriority },
            }),
            invalidatesTags: (_r, error, arg) =>
                error
                    ? []
                    : ["V2SubsList", { type: "V2Submission", id: arg.id }],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        // ── Invite mutations ───────────────────────────────────────────
        createV2Invite: builder.mutation<any, any>({
            query: (body) => ({
                url: "api/v2/invites",
                method: "POST",
                body,
            }),
            invalidatesTags: (_r, error) =>
                error ? [] : ["V2InviteList", "V2Counts"],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        // POST /api/v2/invites/:id/:action covers approve, reject,
        // supervisor-approve, supervisor-return, void, resend.
        v2InviteAction: builder.mutation<
            any,
            { id: string; action: string; body?: any }
        >({
            query: ({ id, action, body }) => ({
                url: `api/v2/invites/${id}/${action}`,
                method: "POST",
                body: body || {},
            }),
            invalidatesTags: (_r, error) =>
                error ? [] : ["V2InviteList", "V2Counts"],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),

        // PATCH /api/v2/invites/:id/resubmit is on its own verb so the
        // generic action helper can't cover it.
        resubmitV2Invite: builder.mutation<
            any,
            { id: string; body: any }
        >({
            query: ({ id, body }) => ({
                url: `api/v2/invites/${id}/resubmit`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_r, error) =>
                error ? [] : ["V2InviteList", "V2Counts"],
            transformResponse: passThrough,
            transformErrorResponse: failedEnvelope,
        }),
    }),
    overrideExisting: true,
})

export const {
    useGetV2SubmissionsQuery,
    useLazyGetV2SubmissionsQuery,
    useGetV2SubmissionCountsQuery,
    useGetV2SubmissionQuery,
    useGetV2SubmissionCertificatesQuery,
    useLazyGetV2SubmissionCertificatesQuery,
    useGetV2SubmissionCommentsQuery,
    useGetV2SubmissionEditsQuery,
    useGetV2SubmissionMigrationStatusQuery,
    useGetV2SubmissionRemarksQuery,
    useGetV2InvitesQuery,
    useGetV2GroupsQuery,
    useFindV2InviteByEmailQuery,
    useLazyFindV2InviteByEmailQuery,
    useFindV2SimilarCompaniesQuery,
    useLazyFindV2SimilarCompaniesQuery,
    useGetStaffAllQuery,
    useV2SubmissionActionMutation,
    useSetV2PriorityMutation,
    useCreateV2InviteMutation,
    useV2InviteActionMutation,
    useResubmitV2InviteMutation,
} = v2Slice

export default v2Slice
