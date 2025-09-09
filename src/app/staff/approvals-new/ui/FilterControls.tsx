import React from 'react'
import styles from '../styles/styles.module.css'

interface Props{
  userIsCnPStaff:boolean
  activeTab:string
  inviteFilters:string[]
  activeFilter:string
  onInviteFilter:(f:string)=>void
  onNameOrEmailFilter:(q:string)=>void
  approvalStages:string[]
  l3Filters:string[]
  activeL3Filter:string
  setActiveFilter:(f:string)=>void
  setActiveL3Filter:(f:string)=>void
  filterL2Companies:(s:string)=>void
  filterL3Companies:(s:string)=>void
  approvals:any
}
export default function FilterControls(props:Props){
  const { userIsCnPStaff, activeTab, inviteFilters, activeFilter, onInviteFilter, onNameOrEmailFilter, approvalStages, l3Filters, activeL3Filter, setActiveFilter, setActiveL3Filter, filterL2Companies, filterL3Companies, approvals} = props
  return (
    <div className={styles.inviteFilters}>
      {userIsCnPStaff && <label>Filter: </label>}
      {activeTab==="invited" && (
        <div>
          {inviteFilters.map((item,idx)=>(
            <p className={item===activeFilter ? styles.active : ""} key={idx} onClick={()=>{ setActiveFilter(item); onInviteFilter(item) }}>{item}</p>
          ))}
          <input placeholder="Filter by company name or email address" onChange={(e)=> onNameOrEmailFilter(e.target.value)} />
        </div>
      )}

      {activeTab==="pending-l2" && userIsCnPStaff && (
        <div>
          <p className={activeFilter==="All" ? styles.active : ""} onClick={()=>{ setActiveFilter("All"); filterL2Companies("All") }}>{`All ${"All"===activeFilter?`(${approvals.pendingL2?.length})`:``}`}</p>
          {approvalStages.map((item,idx)=>(
            <p className={item===activeFilter ? styles.active : ""} key={idx} onClick={()=>{ setActiveFilter(item); filterL2Companies(item) }}>{`Stage ${item} ${item===activeFilter?`(${approvals.pendingL2?.length})`:``}`}</p>
          ))}
        </div>
      )}

      {activeTab==="l3" && (
        <div>
          {l3Filters.map((item,idx)=>(
            <p className={item===activeL3Filter ? styles.active : ""} key={idx} onClick={()=>{ setActiveL3Filter(item); filterL3Companies(item) }}>{`${item} ${item===activeL3Filter?`(${approvals.l3?.length})`:``}`}</p>
          ))}
        </div>
      )}
    </div>
  )
}
