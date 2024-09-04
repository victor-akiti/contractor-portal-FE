import {useSelector, useDispatch, useStore} from "react-redux"

export const useAppSelector = useSelector.withTypes()
export const useAppDispatch = useDispatch.withTypes()
export const useAppStore = useStore.withTypes()