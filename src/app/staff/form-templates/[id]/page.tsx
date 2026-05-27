'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import FormBuilder, { FormSchema } from "@/components/form/FormBuilder"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { patchProtected } from "@/requests/patch"
import { putProtected } from "@/requests/put"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
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
    const { confirm, dialog: confirmDialog } = useConfirmDialog()

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

    // Draft schema editor state — now uses the visual FormBuilder.
    const [draftSchema, setDraftSchema] = useState<FormSchema | null>(null)
    const [draftSchemaDirty, setDraftSchemaDirty] = useState(false)
    const [draftSaving, setDraftSaving] = useState(false)
    const [draftSaveError, setDraftSaveError] = useState("")
    const [draftSaveSuccess, setDraftSaveSuccess] = useState("")

    const canEdit = ["Admin", "HOD"].includes(user?.role)

    const fetchAll = async () => {
        try {
            setLoading(true)
            setFetchError("")
            const [t, v, g, d] = await Promise.all([
                getProtected(`api/v2/form-templates/${params.id}`, user?.role),
                getProtected(`api/v2/form-templates/${params.id}/versions`, user?.role),
                getProtected(`api/v2/form-templates/${params.id}/groups`, user?.role),
                getProtected(`api/v2/form-templates/${params.id}/draft`, user?.role),
            ])
            if (t?.status === "OK") setTemplate(t.data.template)
            else setFetchError(t?.error?.message || "Failed to load template")
            if (v?.status === "OK") setVersions(v.data?.versions || [])
            if (g?.status === "OK") setGroups(g.data?.groups || [])
            if (d?.status === "OK") {
                const loaded = d.data?.draft?.schema
                setDraftSchema(loaded || { version: 1, pages: [] })
                setDraftSchemaDirty(false)
            }
        } catch (error: any) {
            console.error({ error })
            setFetchError(error?.message || "Failed to load template")
        } finally {
            setLoading(false)
        }
    }

    const saveDraftSchema = async () => {
        if (!template || !draftSchema) return
        setDraftSaveError("")
        setDraftSaveSuccess("")

        // Hard gate: any duplicate keys across pages/sections/fields blocks
        // the save. The builder surfaces these inline, but we re-check here
        // in case the schema arrived via Import JSON or a stale draft.
        const seen = new Map<string, string>() // key → "page" / "section in X" / "field in Y"
        const dupes: string[] = []
        ;(draftSchema.pages || []).forEach((p) => {
            const pk = p?.key
            if (pk) {
                if (seen.has(pk)) dupes.push(`"${pk}" (page collides with ${seen.get(pk)})`)
                else seen.set(pk, "page")
            }
            ;(p.sections || []).forEach((s) => {
                const sk = s?.key
                if (sk) {
                    if (seen.has(sk)) dupes.push(`"${sk}" (section collides with ${seen.get(sk)})`)
                    else seen.set(sk, `section "${s.title}"`)
                }
                ;(s.fields || []).forEach((f) => {
                    const fk = f?.key
                    if (fk) {
                        if (seen.has(fk)) dupes.push(`"${fk}" (field collides with ${seen.get(fk)})`)
                        else seen.set(fk, `field "${f.label}"`)
                    }
                })
            })
        })
        if (dupes.length > 0) {
            setDraftSaveError(
                `Duplicate keys must be unique across the form: ${dupes.slice(0, 3).join("; ")}${dupes.length > 3 ? `; +${dupes.length - 3} more` : ""}.`,
            )
            return
        }

        try {
            setDraftSaving(true)
            const result = await putProtected(
                `api/v2/form-templates/${template._id}/draft`,
                { schema: draftSchema },
                user?.role,
            )
            if (result?.status === "OK") {
                setDraftSaveSuccess(
                    `Draft saved (v${result.data?.draft?.versionNumber ?? "?"}). Publish to make it current.`,
                )
                setDraftSchemaDirty(false)
                await fetchAll()
            } else {
                setDraftSaveError(result?.error?.message || "Save failed")
            }
        } catch (error: any) {
            setDraftSaveError(error?.message || "Unexpected error")
        } finally {
            setDraftSaving(false)
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
        const ok = await confirm({
            headerText: "Publish working draft?",
            bodyText:
                "The current draft will become the active version of this template. Existing groups bound to this template will start using it for new invites. Submissions already in progress aren't affected.",
            confirmText: "Publish",
        })
        if (!ok) return
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
            {confirmDialog}
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

            {/* Schema editor — JSON paste for now; drag-and-drop UI is a follow-up. */}
            <section className={detailStyles.section}>
                <div className={detailStyles.sectionHeader}>
                    <h3 className={detailStyles.sectionTitle}>Form schema</h3>
                    <span className={styles.dim}>
                        Edits go to the working draft. Publish to make them current.
                    </span>
                </div>
                {!draftSchema ? (
                    <div className={detailStyles.placeholder}>
                        <p>Loading draft schema…</p>
                    </div>
                ) : (
                    <div className={detailStyles.builderWrap}>
                        <FormBuilder
                            value={draftSchema}
                            onChange={(next) => {
                                setDraftSchema(next)
                                setDraftSchemaDirty(true)
                                setDraftSaveSuccess("")
                            }}
                            disabled={!canEdit || draftSaving}
                        />
                        <div className={detailStyles.builderSaveBar}>
                            <div className={detailStyles.builderSaveMessages}>
                                {draftSchemaDirty && (
                                    <span className={detailStyles.dirtyDot}>● Unsaved changes</span>
                                )}
                                {draftSaveError && <ErrorText text={draftSaveError} />}
                                {draftSaveSuccess && <SuccessMessage message={draftSaveSuccess} />}
                            </div>
                            {canEdit && (
                                <button
                                    className={styles.btnPrimary}
                                    onClick={saveDraftSchema}
                                    disabled={draftSaving || !draftSchemaDirty}
                                >
                                    Save draft
                                    {draftSaving && <ButtonLoadingIcon />}
                                </button>
                            )}
                        </div>
                    </div>
                )}
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
