import Link from 'next/link'
import React from 'react'
import styles from '../styles/styles.module.css'

interface Props{
  onQuery:(q:string)=>void
  onFilterChange:(v:any)=>void
  results:any[]
  resultRef:any
  vendorIsPending:(v:any)=>boolean
  getNextStage:(v:any)=>string
  capitalizeWord:(w:string)=>string
}
export default function SearchBar({onQuery, onFilterChange, results, resultRef, vendorIsPending, getNextStage, capitalizeWord}:Props){
  return (
    <>
      <label>Quick Search</label>
      <div className={styles.searchFilterDiv}>
        <input placeholder="Type company name..." onChange={(e)=> onQuery(e.target.value)} />
        <select onChange={(e)=> onFilterChange(e.target.value)}>
          <option value={"all"}>All Registered Vendors</option>
          <option value={"in progress"}>In Progress</option>
          <option value={"pending"}>Pending L2</option>
          <option value={"parked"}>Completed L2</option>
          <option value={"l3"}>L3</option>
          <option value={"returned"}>Returned</option>
          <option value={"park requested"}>Park Requested</option>
        </select>
        {results?.length>0 && (
          <div className={styles.searchResultsDiv} ref={resultRef}>
            {results.map((item:any, idx:number)=>(
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
            ))}
          </div>
        )}
      </div>
    </>
  )
}
