import {createSlice} from "@reduxjs/toolkit"

const userSlice = createSlice({
    name: 'user',
    initialState: {
        user: {}
    },
    reducers: {
        setUserData: (state: any, payload: any) => {
            console.log({payload: payload.payload.user});
            
            state.user = payload?.payload?.user   
        },
        clearUserData : (state) => {
            state.user = {}
        }
    }
})

export const {setUserData, clearUserData} = userSlice.actions

export const userReducer = userSlice.reducer