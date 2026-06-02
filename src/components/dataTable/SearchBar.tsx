"use client"

import styles from "./SearchBar.module.css"

export interface SearchByOption {
    key: string
    label: string
}

interface Props {
    value: string
    onChange: (v: string) => void
    searchBy?: string
    onSearchByChange?: (v: string) => void
    options?: SearchByOption[]
    placeholder?: string
    label?: string
}

// Two-part search: a "Search by" dropdown to scope the query and the
// query text itself. Scoping happens in the caller's filter function -
// this component is just the input. The "All" option is implicit;
// callers should treat searchBy === "all" as a multi-column search.
const SearchBar = ({
    value,
    onChange,
    searchBy,
    onSearchByChange,
    options,
    placeholder,
    label,
}: Props) => {
    return (
        <div className={styles.bar}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.inputRow}>
                {options && options.length > 0 && onSearchByChange && (
                    <select
                        className={styles.scope}
                        value={searchBy || "all"}
                        onChange={(e) => onSearchByChange(e.target.value)}
                        aria-label="Search by column"
                    >
                        <option value="all">All columns</option>
                        {options.map((o) => (
                            <option key={o.key} value={o.key}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                )}
                <input
                    type="search"
                    className={styles.input}
                    placeholder={placeholder || "Search..."}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    )
}

export default SearchBar
