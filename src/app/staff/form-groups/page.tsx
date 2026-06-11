'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { deleteProtected } from "@/requests/delete"
import { getProtected } from "@/requests/get"
import { patchProtected } from "@/requests/patch"
import { postProtected } from "@/requests/post"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// Contractor Groups - list + create.
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
    // Admin + HOD can also deactivate / reactivate a group.
    const canManage = ["Admin", "HOD"].includes(user?.role)

    // Deactivation modal state. The impact counts come from a one-shot
    // call to /api/v2/groups/:id/impact so the actor sees how many live
    // invites and submissions the dead category leaves stranded before
    // they confirm. Deactivation is soft - those records keep flowing
    // through the pipeline; only NEW invites and new group-moves into
    // this group are blocked.
    const [deactivatingGroup, setDeactivatingGroup] = useState<Group | null>(null)
    const [impact, setImpact] = useState<{
        pendingInvites: number
        usedInvites: number
        liveSubmissions: number
        approvedSubmissions: number
    } | null>(null)
    const [impactLoading, setImpactLoading] = useState(false)
    const [deactivating, setDeactivating] = useState(false)
    const [deactivateError, setDeactivateError] = useState("")
    const [reactivatingId, setReactivatingId] = useState<string | null>(null)

    const openDeactivate = async (g: Group) => {
        setDeactivatingGroup(g)
        setImpact(null)
        setDeactivateError("")
        try {
            setImpactLoading(true)
            const r = await getProtected(`api/v2/groups/${g._id}/impact`, user?.role)
            if (r?.status === "OK") {
                setImpact(r.data?.impact || null)
            } else {
                setDeactivateError(r?.error?.message || "Could not load impact")
            }
        } catch (e: any) {
            setDeactivateError(e?.message || "Could not load impact")
        } finally {
            setImpactLoading(false)
        }
    }

    const submitDeactivate = async () => {
        if (!deactivatingGroup) return
        try {
            setDeactivating(true)
            setDeactivateError("")
            const r = await deleteProtected(
                `api/v2/groups/${deactivatingGroup._id}`,
                undefined,
                user?.role,
            )
            if (r?.status === "OK") {
                await fetchAll()
                setDeactivatingGroup(null)
            } else {
                setDeactivateError(r?.error?.message || "Couldn't deactivate the category. Please try again.")
            }
        } catch (e: any) {
            setDeactivateError(e?.message || "Unexpected error")
        } finally {
            setDeactivating(false)
        }
    }

    const reactivate = async (g: Group) => {
        try {
            setReactivatingId(g._id)
            const r = await patchProtected(
                `api/v2/groups/${g._id}`,
                { isActive: true },
                user?.role,
            )
            if (r?.status === "OK") await fetchAll()
            else setFetchError(r?.error?.message || "Couldn't reactivate the category. Please try again.")
        } catch (e: any) {
            setFetchError(e?.message || "Couldn't reactivate the category. Please try again.")
        } finally {
            setReactivatingId(null)
        }
    }

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
        if (!t) return "-"
        if (typeof t === "string") return t
        return t.name || "-"
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
                                <th>Form Template</th>
                                <th>Status</th>
                                <th>Created</th>
                                {canManage && <th>Actions</th>}
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
                                            className={`${styles.statusBadge} ${g.isActive ? styles.status_active : styles.status_inactive
                                                }`}
                                        >
                                            {g.isActive ? "active" : "inactive"}
                                        </span>
                                    </td>
                                    <td className={styles.dim}>
                                        {g.createdAt
                                            ? new Date(g.createdAt).toLocaleDateString("en-NG")
                                            : "-"}
                                    </td>
                                    {canManage && (
                                        <td>
                                            {g.isActive ? (
                                                <button
                                                    className={styles.btnLinkDanger}
                                                    onClick={() => openDeactivate(g)}
                                                    title="Stop new invites being created under this category. Contractors already in it carry on as normal."
                                                >
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button
                                                    className={styles.btnLink}
                                                    onClick={() => reactivate(g)}
                                                    disabled={reactivatingId === g._id}
                                                >
                                                    Reactivate
                                                    {reactivatingId === g._id && <ButtonLoadingIcon />}
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {deactivatingGroup && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Deactivate &ldquo;{deactivatingGroup.name}&rdquo;?</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <p>
                                Staff will no longer see this category when creating
                                or reassigning an invite. Contractors already in this
                                category carry on with their applications as normal,
                                on the form they were originally invited to.
                            </p>
                            {impactLoading && (
                                <p className={styles.helpText}>Checking who&apos;s currently in this category…</p>
                            )}
                            {impact && (
                                <div className={styles.impactBox}>
                                    <p className={styles.helpText}>
                                        Currently in this category:
                                    </p>
                                    <ul>
                                        <li>
                                            <strong>{impact.pendingInvites}</strong> invite
                                            {impact.pendingInvites === 1 ? "" : "s"} awaiting review or not yet used
                                        </li>
                                        <li>
                                            <strong>{impact.liveSubmissions}</strong> contractor
                                            {impact.liveSubmissions === 1 ? "" : "s"} still working through the application
                                        </li>
                                        <li>
                                            <strong>{impact.approvedSubmissions}</strong> approved contractor
                                            {impact.approvedSubmissions === 1 ? "" : "s"}
                                        </li>
                                    </ul>
                                    <p className={styles.helpText}>
                                        Deactivating doesn&apos;t affect any of these. The
                                        category simply stops appearing in the &ldquo;new invite&rdquo;
                                        dropdown. You can reactivate it any time.
                                    </p>
                                </div>
                            )}
                            {deactivateError && (
                                <div className={styles.modalError}><ErrorText text={deactivateError} /></div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setDeactivatingGroup(null)}
                                disabled={deactivating}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnDanger}
                                onClick={submitDeactivate}
                                disabled={deactivating || impactLoading}
                            >
                                Deactivate group
                                {deactivating && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
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
