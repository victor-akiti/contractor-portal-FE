import { createSlice } from "@reduxjs/toolkit"

const userSlice = createSlice({
    name: 'user',
    initialState: {
        user: {}
    },
    reducers: {
        setUserData: (state: any, payload: any) => {

            state.user = payload?.payload?.user
        },
        clearUserData: (state) => {
            state.user = {}
        }
    }
})

export const { setUserData, clearUserData } = userSlice.actions

export const userReducer = userSlice.reducer