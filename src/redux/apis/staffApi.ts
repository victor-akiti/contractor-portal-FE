import { createApi } from "@reduxjs/toolkit/query/react"
import { baseQueryWithReauth } from "../baseQuery"

// Base Staff API
export const staffApi = createApi({
  reducerPath: 'staffApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Counts', 'Tab', 'Invites', 'Search'],
  endpoints: () => ({}), // Empty - endpoints will be injected
})

export default staffApi
