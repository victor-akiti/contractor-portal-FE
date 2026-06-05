"use client"

import { useMemo, useState } from "react"
import styles from "./DataTable.module.css"

export interface DataTableColumn<T> {
    key: string
    label: string
    // Cell content. Receives the row and the index (for legacy parity row
    // numbers / striping if a column wants it).
    render: (row: T, idx: number) => React.ReactNode
    // When set, the column header becomes clickable to sort asc/desc.
    // `sortValue` returns the primitive used for comparison (string,
    // number, date) - the table sorts using natural ordering for strings,
    // numeric for numbers, and millis for Date instances.
    sortValue?: (row: T) => string | number | Date | null | undefined
    // When set, this column participates in scoped "Search by <column>".
    // Returns the string the global search query should match against.
    searchValue?: (row: T) => string | null | undefined
    align?: "left" | "right" | "center"
    className?: string
    headerClassName?: string
    // Some columns are auxiliary (e.g. row badges) and shouldn't be
    // selectable in the "Search by" dropdown even though they may have a
    // searchValue for the "All" search path. Default true.
    inSearchByMenu?: boolean
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[]
    rows: T[]
    rowKey: (row: T) => string
    rowClassName?: (row: T, idx: number) => string
    emptyMessage?: React.ReactNode
    // Optional default sort - { key: column.key, dir: 'asc' | 'desc' }.
    initialSort?: { key: string; dir: "asc" | "desc" }
    // Wrapper class for the .tableWrap so the page can supply its own
    // outer panel styling.
    tableClassName?: string
}

// Reusable table with header sort, alternating row shade, and an empty
// state. Sorting is internal state - clicking a sortable header toggles
// asc -> desc -> off. Search / per-tab filtering happens at the page
// level (the page passes already-filtered rows in). This keeps the
// component small and focused.
export function DataTable<T>({
    columns,
    rows,
    rowKey,
    rowClassName,
    emptyMessage,
    initialSort,
    tableClassName,
}: DataTableProps<T>) {
    const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
        initialSort || null,
    )

    const sortedRows = useMemo(() => {
        if (!sort) return rows
        const col = columns.find((c) => c.key === sort.key)
        if (!col || !col.sortValue) return rows
        const mul = sort.dir === "asc" ? 1 : -1
        const valFor = (r: T): string | number => {
            const v = col.sortValue!(r)
            if (v == null) return "" // nulls sort to the bottom of asc
            if (v instanceof Date) return v.getTime()
            if (typeof v === "number") return v
            return String(v).toLowerCase()
        }
        return [...rows].sort((a, b) => {
            const av = valFor(a)
            const bv = valFor(b)
            if (av === "" && bv !== "") return 1 // nulls last regardless of dir
            if (av !== "" && bv === "") return -1
            if (av < bv) return -1 * mul
            if (av > bv) return 1 * mul
            return 0
        })
    }, [rows, sort, columns])

    const toggleSort = (key: string) => {
        setSort((prev) => {
            if (!prev || prev.key !== key) return { key, dir: "asc" }
            if (prev.dir === "asc") return { key, dir: "desc" }
            return null
        })
    }

    if (rows.length === 0) {
        return <div className={styles.empty}>{emptyMessage}</div>
    }

    return (
        <div className={`${styles.tableWrap} ${tableClassName || ""}`}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((c) => {
                            const isSorted = sort?.key === c.key
                            const arrow = isSorted ? (sort.dir === "asc" ? "▲" : "▼") : "↕"
                            const sortable = !!c.sortValue
                            return (
                                <th
                                    key={c.key}
                                    className={`${c.headerClassName || ""} ${
                                        sortable ? styles.sortable : ""
                                    } ${c.align ? styles[`align_${c.align}`] : ""}`}
                                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                                    role={sortable ? "button" : undefined}
                                    tabIndex={sortable ? 0 : undefined}
                                    onKeyDown={(e) => {
                                        if (sortable && (e.key === "Enter" || e.key === " ")) {
                                            e.preventDefault()
                                            toggleSort(c.key)
                                        }
                                    }}
                                    aria-sort={
                                        isSorted
                                            ? sort.dir === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : sortable
                                              ? "none"
                                              : undefined
                                    }
                                >
                                    <span>{c.label}</span>
                                    {sortable && (
                                        <span className={styles.sortArrow}>{arrow}</span>
                                    )}
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sortedRows.map((r, idx) => {
                        const cls = [
                            idx % 2 === 1 ? styles.rowShade : "",
                            rowClassName ? rowClassName(r, idx) : "",
                        ]
                            .filter(Boolean)
                            .join(" ")
                        return (
                            <tr key={rowKey(r)} className={cls}>
                                {columns.map((c) => (
                                    <td
                                        key={c.key}
                                        className={`${c.className || ""} ${
                                            c.align ? styles[`align_${c.align}`] : ""
                                        }`}
                                    >
                                        {c.render(r, idx)}
                                    </td>
                                ))}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default DataTable
