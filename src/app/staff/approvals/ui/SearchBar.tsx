import useDebounce from '@/hooks/useDebounce'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from '../styles/styles.module.css'

interface Props {
  onQuery: (q: string) => void
  onFilterChange: (v: any) => void
  results: any[]
  resultRef: any
  searchOpen?: boolean
  filterParam?: string
  setSearchOpen?: () => void
  vendorIsPending: (v: any) => boolean
  getNextStage: (v: any) => string
  capitalizeWord: (w: string) => string
  isLoading?: boolean
}

export default function SearchBar({ isLoading, onQuery, onFilterChange, filterParam, results, resultRef, setSearchOpen, searchOpen: externalSearchOpen, vendorIsPending, getNextStage, capitalizeWord }: Props) {

  const [query, setQuery] = useState("");
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const debounceSearch = useDebounce(query, 300);

  // Use internal state if external searchOpen is not provided
  const searchOpen = externalSearchOpen !== undefined ? externalSearchOpen : internalSearchOpen;

  const handleFocus = () => {
    if (setSearchOpen) {
      setSearchOpen();
    } else {
      setInternalSearchOpen(true);
    }
  };

  useEffect(() => {
    if (debounceSearch?.length > 0) {
      debounceSearch?.length > 1 && debounceSearch === query && onQuery(debounceSearch);
    }
  }, [debounceSearch, searchOpen, filterParam])

  return (
    <>
      <label>Quick Search</label>
      <div className={styles.searchFilterDiv} ref={resultRef}>
        <input
          placeholder="Type company name..."
          value={query}
          onFocus={handleFocus}
          onChange={(e) => { setQuery(e.target.value); }}
        />
        <select onChange={(e) => onFilterChange(e.target.value)}>
          <option value={"all"}>All Registered Vendors</option>
          <option value={"in progress"}>In Progress</option>
          <option value={"pending"}>Pending L2</option>
          <option value={"parked"}>Completed L2</option>
          <option value={"l3"}>L3</option>
          <option value={"returned"}>Returned</option>
          <option value={"park requested"}>Park Requested</option>
        </select>
        {query?.length > 0 && results && searchOpen && (
          <div className={styles.searchResultsDiv}>
            {query?.length < 2 ? <p className={styles.noSearchResults}>{query?.length < 2 ? "Enter a longer query..." : "No results found"}</p> :
              isLoading ? <div className={styles.loadingSpinnerSmall}></div> :
                results?.length > 0 ? results.map((item: any, idx: number) => (
                  <div key={idx} className={styles.searchResultItem}>
                    <div className={styles.searchResultMetaData}>
                      <p>{String(item.companyName).toUpperCase()}</p>
                      <p>{capitalizeWord(String(item?.flags?.status))}</p>
                    </div>
                    <div className={styles.searchResultsActionButtons}>
                      <Link href={`/staff/vendor/${item?._id}`}><button>VIEW</button></Link>
                      {vendorIsPending(item) && <Link href={`/staff/approvals/${item?._id}`}><button>{`Process to ${getNextStage(item)}`}</button></Link>}
                    </div>
                  </div>
                )) : <div className={styles.noSearchResults}>No results found</div>}
          </div>
        )}
      </div>
    </>
  )
}