'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// Form Templates list + create.
//
// Lists templates from GET /api/v2/form-templates and opens a modal to POST
// /api/v2/form-templates. The list refreshes after a successful create.
//
// Permissions are gated server-side (HOD + Admin); this page does not show
// the "Create" button at all if the user lacks the role.

interface FormTemplate {
    _id: string;
    name: string;
    description?: string;
    status: "draft" | "published" | "archived";
    currentVersionId?: string | null;
    workingDraftId?: string | null;
    autoMigrateOnSafePublish?: boolean;
    forkedFrom?: { templateId: string; versionId: string } | null;
    createdAt?: string;
    updatedAt?: string;
}

const FormTemplatesPage = () => {
    const user = useSelector((state: any) => state.user.user)
    const [templates, setTemplates] = useState<FormTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState("")

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newName, setNewName] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [autoMigrate, setAutoMigrate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState("")
    const [createSuccess, setCreateSuccess] = useState("")

    const canCreate = ["Admin", "HOD"].includes(user?.role)
    const canArchive = user?.role === "Admin"

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            setFetchError("")
            const result = await getProtected("api/v2/form-templates", user?.role)
            if (result?.status === "OK") {
                setTemplates(result.data?.templates || [])
            } else {
                setFetchError(result?.error?.message || "Failed to load templates")
            }
        } catch (error: any) {
            console.error({ error })
            setFetchError(error?.message || "Failed to load templates")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user?.role) fetchTemplates()
    }, [user?.role])

    const openCreateModal = () => {
        setNewName("")
        setNewDescription("")
        setAutoMigrate(false)
        setCreateError("")
        setCreateSuccess("")
        setShowCreateModal(true)
    }

    const closeCreateModal = () => {
        setShowCreateModal(false)
        setCreateError("")
        setCreateSuccess("")
    }

    const submitCreate = async () => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            setCreateError("Name is required")
            return
        }
        try {
            setCreating(true)
            setCreateError("")
            const result = await postProtected(
                "api/v2/form-templates",
                {
                    name: trimmedName,
                    description: newDescription.trim(),
                    autoMigrateOnSafePublish: autoMigrate,
                },
                user?.role
            )

            if (result?.status === "OK") {
                setCreateSuccess(`Template "${trimmedName}" created.`)
                // Refresh list immediately so the new row is visible behind the modal close.
                await fetchTemplates()
                // Auto-close after a brief pause so the user sees the confirmation.
                setTimeout(() => closeCreateModal(), 1000)
            } else {
                setCreateError(result?.error?.message || "Failed to create template")
            }
        } catch (error: any) {
            console.error({ error })
            setCreateError(error?.message || "An unexpected error occurred")
        } finally {
            setCreating(false)
        }
    }

    const renderCreateModal = () => (
        <Modal>
            <div className={styles.modalCard}>
                <div className={styles.modalHeader}>
                    <h3>Create form template</h3>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.formRow}>
                        <label htmlFor="ft-name">Name <span className={styles.required}>*</span></label>
                        <input
                            id="ft-name"
                            type="text"
                            placeholder="e.g. Standard Contractor Registration"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={creating}
                        />
                    </div>

                    <div className={styles.formRow}>
                        <label htmlFor="ft-desc">Description</label>
                        <textarea
                            id="ft-desc"
                            rows={3}
                            placeholder="What's this form for? Who fills it out?"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            disabled={creating}
                        />
                    </div>

                    <div className={styles.formRowCheckbox}>
                        <label htmlFor="ft-automigrate">
                            <input
                                id="ft-automigrate"
                                type="checkbox"
                                checked={autoMigrate}
                                onChange={(e) => setAutoMigrate(e.target.checked)}
                                disabled={creating}
                            />
                            <span>Allow safe auto-migration</span>
                        </label>
                        <p className={styles.helpText}>
                            When you publish a new version with only optional additive
                            changes, in-flight contractors are silently moved to it on
                            their next visit. Destructive or required changes always
                            require manual migration.
                        </p>
                    </div>

                    {createError && (
                        <div className={styles.modalError}>
                            <ErrorText text={createError} />
                        </div>
                    )}
                    {createSuccess && (
                        <div className={styles.modalSuccess}>
                            <SuccessMessage message={createSuccess} />
                        </div>
                    )}
                </div>

                <div className={styles.modalActions}>
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={closeCreateModal}
                        disabled={creating}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={submitCreate}
                        disabled={creating || !newName.trim()}
                    >
                        Create
                        {creating && <ButtonLoadingIcon />}
                    </button>
                </div>
            </div>
        </Modal>
    )

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2 className={styles.pageTitle}>Form Templates</h2>
                    <p className={styles.pageSubtitle}>
                        Templates power the contractor registration form. A template can
                        be assigned to one or many contractor groups. Edits create new
                        versions; in-flight contractors stay on the version they started
                        with unless explicitly migrated.
                    </p>
                </div>
                {canCreate && (
                    <button className={styles.btnPrimary} onClick={openCreateModal}>
                        + Create new template
                    </button>
                )}
            </div>

            {showCreateModal && renderCreateModal()}

            {loading && (
                <div className={styles.emptyState}>
                    <ButtonLoadingIcon />
                    <p>Loading templates…</p>
                </div>
            )}

            {!loading && fetchError && (
                <div className={styles.errorBanner}>
                    <ErrorText text={fetchError} />
                    <button className={styles.btnLink} onClick={fetchTemplates}>
                        Retry
                    </button>
                </div>
            )}

            {!loading && !fetchError && templates.length === 0 && (
                <div className={styles.emptyState}>
                    <h4>No form templates yet</h4>
                    <p>
                        {canCreate
                            ? "Create your first template to get started. You can publish it later and assign it to a contractor group."
                            : "No templates have been set up yet. An Admin or HOD can create one."}
                    </p>
                </div>
            )}

            {!loading && !fetchError && templates.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Current version</th>
                                <th>Draft</th>
                                <th>Auto-migrate</th>
                                <th>Last updated</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((t) => (
                                <tr key={t._id}>
                                    <td>
                                        <div className={styles.nameCell}>
                                            <span className={styles.nameText}>{t.name}</span>
                                            {t.description && (
                                                <span className={styles.descText}>{t.description}</span>
                                            )}
                                            {t.forkedFrom && (
                                                <span className={styles.forkBadge}>forked</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[`status_${t.status}`]}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td>{t.currentVersionId ? "yes" : <span className={styles.dim}>—</span>}</td>
                                    <td>{t.workingDraftId ? "yes" : <span className={styles.dim}>—</span>}</td>
                                    <td>
                                        {t.autoMigrateOnSafePublish ? (
                                            <span className={styles.dotOn}>on</span>
                                        ) : (
                                            <span className={styles.dim}>off</span>
                                        )}
                                    </td>
                                    <td className={styles.dim}>
                                        {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString("en-NG") : "—"}
                                    </td>
                                    <td className={styles.actionsCell}>
                                        <Link className={styles.btnLink} href={`/staff/form-templates/${t._id}`}>
                                            Open
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default FormTemplatesPage
