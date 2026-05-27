'use client'

// useConfirmDialog — promise-based confirmation modal hook.
//
// Replaces ad-hoc window.confirm() calls with the existing
// <ConfirmationDialog> wrapped in <Modal>, so destructive actions get the
// same look-and-feel the app already uses elsewhere (e.g. /staff/forms).
//
// Usage:
//   const { confirm, dialog } = useConfirmDialog()
//   ...
//   const ok = await confirm({
//     headerText: "Delete page?",
//     bodyText: "All sections and fields under it will be removed.",
//     confirmText: "Delete",
//     destructive: true,
//   })
//   if (!ok) return
//   ...
//   return <>{dialog}{...}</>

import { useCallback, useState } from "react"
import ConfirmationDialog from "@/components/confirmationDialog"
import Modal from "@/components/modal"

export interface ConfirmOptions {
    headerText: string
    bodyText: string
    confirmText?: string
    cancelText?: string
    destructive?: boolean
}

interface InternalState extends ConfirmOptions {
    resolve: (ok: boolean) => void
}

export const useConfirmDialog = () => {
    const [state, setState] = useState<InternalState | null>(null)

    const confirm = useCallback(
        (opts: ConfirmOptions) =>
            new Promise<boolean>((resolve) => {
                setState({ ...opts, resolve })
            }),
        [],
    )

    const handle = (ok: boolean) => {
        state?.resolve(ok)
        setState(null)
    }

    const dialog = state ? (
        <Modal>
            <ConfirmationDialog
                processing={false}
                errorMessage=""
                successMessage=""
                confirmText={state.confirmText || (state.destructive ? "Delete" : "Confirm")}
                cancelText={state.cancelText || "Cancel"}
                headerText={state.headerText}
                bodyText={state.bodyText}
                confirmAction={() => handle(true)}
                cancelAction={() => handle(false)}
            />
        </Modal>
    ) : null

    return { confirm, dialog }
}
