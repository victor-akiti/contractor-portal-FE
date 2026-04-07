"use client";

import useDebounce from "@/hooks/useDebounce";
import { useFuzzySearch } from "@/hooks/useFuzzySearch";
import type { FuseResult } from "fuse.js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SearchableVendor } from "@/hooks/useFuzzySearch";
import styles from "./vendorSearch.module.css";

interface Props {
  fixedApprovals: {
    inProgress: any[];
    pendingL2: any[];
    completedL2: any[];
    l3: any[];
    returned: any[];
    parkRequested: any[];
    invites: any[];
  };
}

function getMatchedFieldLabel(result: FuseResult<SearchableVendor>): string | null {
  const matches = result.matches || [];
  for (const m of matches) {
    if (m.key === "categories" && result.item.categories) {
      return `Category: ${result.item.categories}`;
    }
    if (m.key === "stageLabel") {
      return `Stage: ${result.item.stageLabel}`;
    }
  }
  return null;
}

export default function VendorFuzzySearch({ fixedApprovals }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 280);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { search, totalIndexed } = useFuzzySearch(fixedApprovals);

  const results = debouncedQuery.trim().length >= 2 ? search(debouncedQuery) : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const handleClear = () => {
    setQuery("");
    setOpen(false);
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <label className={styles.label}>
        Search All Vendors
        {totalIndexed > 0 && (
          <span style={{ fontWeight: 400, marginLeft: 6 }}>({totalIndexed} loaded)</span>
        )}
      </label>

      <div className={styles.inputWrapper}>
        <span className={styles.icon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          className={styles.input}
          placeholder="Search by company name, job category, or approval stage..."
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          autoComplete="off"
        />

        {query && (
          <button className={styles.clearBtn} onClick={handleClear} aria-label="Clear search">
            &#x2715;
          </button>
        )}

        {showDropdown && (
          <div className={styles.dropdown}>
            {results.length === 0 ? (
              <div className={styles.emptyState}>No vendors found for &ldquo;{query}&rdquo;</div>
            ) : (
              results.map((result) => {
                const vendor = result.item;
                const matchedField = getMatchedFieldLabel(result);
                return (
                  <div key={vendor._id} className={styles.resultItem}>
                    <div className={styles.resultMeta}>
                      <p className={styles.companyName}>{vendor.companyName.toUpperCase()}</p>
                      <span className={styles.stageBadge}>{vendor.stageLabel}</span>
                      {matchedField && (
                        <p className={styles.matchedField}>{matchedField}</p>
                      )}
                    </div>
                    <Link href={`/staff/vendor/${vendor._id}`} onClick={handleClear}>
                      <span className={styles.viewBtn}>VIEW</span>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
