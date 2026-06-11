import { createApi } from "@reduxjs/toolkit/query/react"
import { baseQueryWithReauth } from "../baseQuery"

// Base Staff API
export const staffApi = createApi({
  reducerPath: 'staffApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    // V1 tags (legacy approval slice)
    'Counts', 'Tab', 'Invites', 'Search', 'All Companies', 'CertReview',
    // V2 tags - keep separate so V1 invalidations don't blow V2 caches
    // and vice-versa during the cutover.
    'V2SubsList',
    'V2Counts',
    'V2InviteList',
    'V2Submission',
    'V2SubCerts',
    'V2Comments',
    'V2Edits',
    'V2MigStatus',
    'V2Remarks',
    'V2Groups',
    'V2Staff',
  ],
  endpoints: () => ({}), // Empty - endpoints will be injected
})

export default staffApi
