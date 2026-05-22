'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { patchProtected } from "@/requests/patch"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import styles from "../styles/styles.module.css"
import detailStyles from "./styles/detail.module.css"

// Form Template detail — read + light edit + publish.
//
// The full schema editor (drag-and-drop page/section/field builder) is a
// follow-up. This page covers what the user can do without it: see the
// template's metadata, edit its name/description/auto-migrate toggle,
// publish a working draft if one exists, list versions, and see which
// groups use this template.

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

interface FormVersion {
    _id: string;
    versionNumber: number;
    status: string;
    publishedAt?: string;
    createdAt?: string;
}

interface ContractorGroup {
    _id: string;
    name: string;
    isActive: boolean;
}

const TemplateDetailPage = () => {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const user = useSelector((state: any) => state.user.user)

    const [template, setTemplate] = useState<FormTemplate | null>(null)
    const [versions, setVersions] = useState<FormVersion[]>([])
    const [groups, setGroups] = useState<ContractorGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState("")

    const [showEditModal, setShowEditModal] = useState(false)
    const [editName, setEditName] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editAutoMigrate, setEditAutoMigrate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editError, setEditError] = useState("")

    const [publishing, setPublishing] = useState(false)
    const [publishError, setPublishError] = useState("")
    const [publishSuccess, setPublishSuccess] = useState("")

    const canEdit = ["Admin", "HOD"].includes(user?.role)

    const fetchAll = async () => {
        try {
            setLoading(true)
            setFetchError("")
            const [t, v, g] = await Promise.all([
                getProtected(`api/v2/form-templates/${params.id}`, user?.role),
                getProtected(`api/v2/form-templates/${params.id}/versions`, user?.role),
                getProtected(`api/v2/form-templates/${params.id}/groups`, user?.role),
            ])
            if (t?.status === "OK") setTemplate(t.data.template)
            else setFetchError(t?.error?.message || "Failed to load template")
            if (v?.status === "OK") setVersions(v.data?.versions || [])
            if (g?.status === "OK") setGroups(g.data?.groups || [])
        } catch (error: any) {
            console.error({ error })
            setFetchError(error?.message || "Failed to load template")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user?.role && params?.id) fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role, params?.id])

    const openEdit = () => {
        if (!template) return
        setEditName(template.name)
        setEditDescription(template.description || "")
        setEditAutoMigrate(!!template.autoMigrateOnSafePublish)
        setEditError("")
        setShowEditModal(true)
    }

    const saveEdit = async () => {
        if (!template) return
        const trimmed = editName.trim()
        if (!trimmed) {
            setEditError("Name is required")
            return
        }
        try {
            setSaving(true)
            setEditError("")
            const result = await patchProtected(
                `api/v2/form-templates/${template._id}`,
                {
                    name: trimmed,
                    description: editDescription.trim(),
                    autoMigrateOnSafePublish: editAutoMigrate,
                },
                user?.role
            )
            if (result?.status === "OK") {
                setTemplate(result.data.template)
                setShowEditModal(false)
            } else {
                setEditError(result?.error?.message || "Save failed")
            }
        } catch (error: any) {
            console.error({ error })
            setEditError(error?.message || "An unexpected error occurred")
        } finally {
            setSaving(false)
        }
    }

    const publishDraft = async () => {
        if (!template) return
        const draftId = template.workingDraftId
        if (!draftId) return
        if (!confirm("Publish the working draft? It becomes the new current version.")) return
        try {
            setPublishing(true)
            setPublishError("")
            setPublishSuccess("")
            const result = await postProtected(
                `api/v2/form-templates/${template._id}/publish`,
                {},
                user?.role
            )
            if (result?.status === "OK") {
                setPublishSuccess(
                    `Published v${result.data.newVersion?.versionNumber || "?"} — new contractors will use it.`
                )
                await fetchAll()
            } else {
                setPublishError(result?.error?.message || "Publish failed")
            }
        } catch (error: any) {
            console.error({ error })
            setPublishError(error?.message || "An unexpected error occurred")
        } finally {
            setPublishing(false)
        }
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.emptyState}>
                    <ButtonLoadingIcon />
                    <p>Loading template…</p>
                </div>
            </div>
        )
    }

    if (fetchError || !template) {
        return (
            <div className={styles.page}>
                <div className={styles.errorBanner}>
                    <ErrorText text={fetchError || "Template not found"} />
                    <Link className={styles.btnLink} href="/staff/form-templates">
                        ← Back to templates
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={detailStyles.backRow}>
                <Link className={styles.btnLink} href="/staff/form-templates">
                    ← All templates
                </Link>
            </div>

            <div className={styles.pageHeader}>
                <div>
                    <h2 className={styles.pageTitle}>{template.name}</h2>
                    {template.description && (
                        <p className={styles.pageSubtitle}>{template.description}</p>
                    )}
                    <div className={detailStyles.metaRow}>
                        <span className={`${styles.statusBadge} ${styles[`status_${template.status}`]}`}>
                            {template.status}
                        </span>
                        {template.autoMigrateOnSafePublish && (
                            <span className={styles.dotOn}>auto-migrate on</span>
                        )}
                        {template.forkedFrom && (
                            <span className={styles.forkBadge}>forked</span>
                        )}
                    </div>
                </div>
                {canEdit && (
                    <div className={detailStyles.headerActions}>
                        <button className={styles.btnSecondary} onClick={openEdit}>
                            Edit
                        </button>
                        {template.workingDraftId && (
                            <button
                                className={styles.btnPrimary}
                                onClick={publishDraft}
                                disabled={publishing}
                            >
                                Publish draft
                                {publishing && <ButtonLoadingIcon />}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {publishError && (
                <div className={styles.errorBanner}>
                    <ErrorText text={publishError} />
                </div>
            )}
            {publishSuccess && (
                <div className={detailStyles.successBanner}>
                    <SuccessMessage message={publishSuccess} />
                </div>
            )}

            {/* Schema editor placeholder */}
            <section className={detailStyles.section}>
                <h3 className={detailStyles.sectionTitle}>Form schema</h3>
                <div className={detailStyles.placeholder}>
                    <p>
                        The drag-and-drop schema editor is the next piece of work.
                        For now this page covers metadata and version management; pages,
                        sections and fields are still authored against the legacy
                        <code> pages.js</code> form. When the editor lands, this section
                        becomes the canvas.
                    </p>
                </div>
            </section>

            {/* Version history */}
            <section className={detailStyles.section}>
                <h3 className={detailStyles.sectionTitle}>Versions</h3>
                {versions.length === 0 ? (
                    <div className={detailStyles.placeholder}>
                        <p>No versions yet. Save a draft and publish it to start a version history.</p>
                    </div>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Version</th>
                                    <th>Status</th>
                                    <th>Published</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {versions.map((v) => (
                                    <tr key={v._id}>
                                        <td>
                                            v{v.versionNumber}
                                            {v._id === template.currentVersionId && (
                                                <span className={detailStyles.currentTag}>current</span>
                                            )}
                                            {v._id === template.workingDraftId && (
                                                <span className={detailStyles.draftTag}>draft</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[`status_${v.status}`]}`}>
                                                {v.status}
                                            </span>
                                        </td>
                                        <td className={styles.dim}>
                                            {v.publishedAt
                                                ? new Date(v.publishedAt).toLocaleString("en-NG")
                                                : "—"}
                                        </td>
                                        <td className={styles.dim}>
                                            {v.createdAt
                                                ? new Date(v.createdAt).toLocaleDateString("en-NG")
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Used by */}
            <section className={detailStyles.section}>
                <h3 className={detailStyles.sectionTitle}>Used by</h3>
                {groups.length === 0 ? (
                    <div className={detailStyles.placeholder}>
                        <p>No contractor groups are using this template yet.</p>
                    </div>
                ) : (
                    <ul className={detailStyles.groupList}>
                        {groups.map((g) => (
                            <li key={g._id}>
                                <span className={detailStyles.groupName}>{g.name}</span>
                                {!g.isActive && (
                                    <span className={detailStyles.inactiveTag}>inactive</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Edit modal */}
            {showEditModal && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Edit template</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formRow}>
                                <label>Name <span className={styles.required}>*</span></label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    disabled={saving}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>Description</label>
                                <textarea
                                    rows={3}
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    disabled={saving}
                                />
                            </div>
                            <div className={styles.formRowCheckbox}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={editAutoMigrate}
                                        onChange={(e) => setEditAutoMigrate(e.target.checked)}
                                        disabled={saving}
                                    />
                                    <span>Allow safe auto-migration</span>
                                </label>
                            </div>
                            {editError && (
                                <div className={styles.modalError}>
                                    <ErrorText text={editError} />
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setShowEditModal(false)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={saveEdit}
                                disabled={saving || !editName.trim()}
                            >
                                Save
                                {saving && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

export default TemplateDetailPage
