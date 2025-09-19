import { makeStore } from "@/redux/store"
import { setupListeners } from "@reduxjs/toolkit/query"
import { useRef } from "react"
import {Provider} from "react-redux"

const ReduxProvider = ({ children }: { children: React.ReactNode }) => {
    const storeRef = useRef<ReturnType<typeof makeStore>>()

    if (!storeRef.current) {
        storeRef.current = makeStore()
    // Setup listeners for automatic refetching
    setupListeners(storeRef.current.dispatch)
    }
    return <Provider store={storeRef.current}>{children}</Provider>
}

export default ReduxProvider