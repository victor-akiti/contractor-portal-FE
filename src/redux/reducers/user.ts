import { createSlice, PayloadAction } from "@reduxjs/toolkit"

// Define the user state interface
interface UserState {
    user: Record<string, any>
}

// Define the payload interface for setUserData
interface SetUserDataPayload {
    user: Record<string, any>
}

const userSlice = createSlice({
    name: 'user',
    initialState: {
        user: {}
    } as UserState,
    reducers: {
        // FIX: Proper PayloadAction type with explicit return type
        setUserData: (state: UserState, action: PayloadAction<SetUserDataPayload>) => {
            state.user = action.payload.user
            // No return needed - Immer handles the mutation
        },
        clearUserData: (state: UserState) => {
            state.user = {}
            // No return needed - Immer handles the mutation
        }
    }
})

export const { setUserData, clearUserData } = userSlice.actions

export const userReducer = userSlice.reducer