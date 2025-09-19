// store/index.ts (your makeStore file)
import { configureStore } from "@reduxjs/toolkit";
import { staffApi } from "./apis/staffApi";
import { userReducer } from "./reducers/user";

export const makeStore = () => {
    return configureStore ({
        reducer: {
            user: userReducer,
            // Add the RTK Query API reducer
            [staffApi.reducerPath]: staffApi.reducer,
        },
        // Add the RTK Query middleware
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: {
                    // Ignore RTK Query action types
                    ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
                },
            }).concat(staffApi.middleware),
    })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']