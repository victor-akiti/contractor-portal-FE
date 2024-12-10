import { makeStore } from "@/redux/store"
import { useRef } from "react"
import {Provider} from "react-redux"

const ReduxProvider = ({children}) => {
    const storeRef = useRef<any>()

    if (!storeRef.current) {
        storeRef.current = makeStore()
    }
    return <Provider store={storeRef.current}>{children}</Provider>
}

export default ReduxProvider