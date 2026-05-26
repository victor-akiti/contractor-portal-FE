'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// Contractor Groups — list + create.
// One group → one FormTemplate (required at create, immutable except via fork).

interface FormTemplate {
    _id: string
    name: string
    status: string
    currentVersionId?: string | null
}

interface Group {
    _id: string
    name: string
    description?: string
    isActive: boolean
    formTemplateId?: FormTemplate | string | null
    createdAt?: string
}

const FormGroupsPage = () => {
    const user = useSelector((state: any) => state.user.user)
    const [groups, setGroups] = useState<Group[]>([])
    const [templates, setTemplates] = useState<FormTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState("")

    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [newTemplateId, setNewTemplateId] = useState("")
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState("")
    const [createSuccess, setCreateSuccess] = useState("")

    const canCreate = ["Admin", "HOD"].includes(user?.role)

    const fetchAll = async () => {
        try {
            setLoading(true)
            setFetchError("")
            const [g, t] = await Promise.all([
                getProtected("api/v2/groups?includeInactive=1", user?.role),
                getProtected("api/v2/form-templates", user?.role),
            ])
            if (g?.status === "OK") setGroups(g.data?.groups || [])
            else setFetchError(g?.error?.message || "Failed to load groups")
            if (t?.status === "OK") {
                // Only published templates can be assigned to a group at creation.
                setTemplates(
                    (t.data?.templates || []).filter(
                        (tpl: FormTemplate) => !!tpl.currentVersionId
                    )
                )
            }
        } catch (e: any) {
            setFetchError(e?.message || "Failed to load")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user?.role) fetchAll()
    }, [user?.role])

    const openCreate = () => {
        setNewName("")
        setNewDescription("")
        setNewTemplateId(templates[0]?._id || "")
        setCreateError("")
        setCreateSuccess("")
        setShowCreate(true)
    }

    const submitCreate = async () => {
        if (!newName.trim()) {
            setCreateError("Name is required")
            return
        }
        if (!newTemplateId) {
            setCreateError("A form template is required")
            return
        }
        try {
            setCreating(true)
            setCreateError("")
            const result = await postProtected(
                "api/v2/groups",
                {
                    name: newName.trim(),
                    description: newDescription.trim(),
                    formTemplateId: newTemplateId,
                },
                user?.role
            )
            if (result?.status === "OK") {
                setCreateSuccess(`Group "${newName.trim()}" created.`)
                await fetchAll()
                setTimeout(() => setShowCreate(false), 800)
            } else {
                setCreateError(result?.error?.message || "Create failed")
            }
        } catch (e: any) {
            setCreateError(e?.message || "Unexpected error")
        } finally {
            setCreating(false)
        }
    }

    const templateName = (t: FormTemplate | string | null | undefined): string => {
        if (!t) return "—"
        if (typeof t === "string") return t
        return t.name || "—"
    }

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2 className={styles.pageTitle}>Contractor Groups</h2>
                    <p className={styles.pageSubtitle}>
                        Groups classify invites by contractor type (e.g. Drilling, ICT).
                        Each group is bound to one form template at creation. To diverge a
                        group's form from a shared template, fork it.
                    </p>
                </div>
                {canCreate && (
                    <button className={styles.btnPrimary} onClick={openCreate}>
                        + Create group
                    </button>
                )}
            </div>

            {loading && (
                <div className={styles.emptyState}>
                    <ButtonLoadingIcon />
                    <p>Loading…</p>
                </div>
            )}

            {!loading && fetchError && (
                <div className={styles.errorBanner}>
                    <ErrorText text={fetchError} />
                    <button className={styles.btnLink} onClick={fetchAll}>Retry</button>
                </div>
            )}

            {!loading && !fetchError && groups.length === 0 && (
                <div className={styles.emptyState}>
                    <h4>No groups yet</h4>
                    <p>
                        {canCreate
                            ? templates.length === 0
                                ? "Create a published form template first, then come back here to make a group."
                                : "Click \"+ Create group\" to define your first contractor group."
                            : "No groups have been set up. An Admin or HOD can create one."}
                    </p>
                </div>
            )}

            {!loading && !fetchError && groups.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Template</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((g) => (
                                <tr key={g._id}>
                                    <td>
                                        <div className={styles.nameCell}>
                                            <span className={styles.nameText}>{g.name}</span>
                                            {g.description && (
                                                <span className={styles.descText}>{g.description}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{templateName(g.formTemplateId)}</td>
                                    <td>
                                        <span
                                            className={`${styles.statusBadge} ${
                                                g.isActive ? styles.status_active : styles.status_inactive
                                            }`}
                                        >
                                            {g.isActive ? "active" : "inactive"}
                                        </span>
                                    </td>
                                    <td className={styles.dim}>
                                        {g.createdAt
                                            ? new Date(g.createdAt).toLocaleDateString("en-NG")
                                            : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreate && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Create contractor group</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formRow}>
                                <label>Name <span className={styles.required}>*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Drilling Services"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    disabled={creating}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="What kind of contractor does this group classify?"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    disabled={creating}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>Form template <span className={styles.required}>*</span></label>
                                {templates.length === 0 ? (
                                    <div className={styles.inlineWarning}>
                                        No published templates available. Create and publish a template first.
                                    </div>
                                ) : (
                                    <select
                                        value={newTemplateId}
                                        onChange={(e) => setNewTemplateId(e.target.value)}
                                        disabled={creating}
                                    >
                                        <option value="">Select a template…</option>
                                        {templates.map((t) => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                )}
                                <p className={styles.helpText}>
                                    Template is immutable once the group is created. Use Fork to
                                    diverge later.
                                </p>
                            </div>

                            {createError && (
                                <div className={styles.modalError}><ErrorText text={createError} /></div>
                            )}
                            {createSuccess && (
                                <div className={styles.modalSuccess}><SuccessMessage message={createSuccess} /></div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setShowCreate(false)}
                                disabled={creating}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitCreate}
                                disabled={creating || !newName.trim() || !newTemplateId}
                            >
                                Create
                                {creating && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

export default FormGroupsPage
