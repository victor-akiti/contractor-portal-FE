import {configureStore} from "@reduxjs/toolkit"
import { userReducer } from "./reducers/user"

export const makeStore = () => {
    return configureStore ({
        reducer: {
            user: userReducer
        }
    })
}