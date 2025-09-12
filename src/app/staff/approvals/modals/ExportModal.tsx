import Modal from '@/components/modal'
import styles from '../styles/styles.module.css'

interface Props{
  exportOptions:any
  updateExportOptions:(k:string,v:any)=>void
  toggleExportOptions:(k:string,v:any)=>void
  exportVendorSearchResults:any[]
  addVendorToSelectedList:(v:any)=>void
  selectedVendorsToExport:any[]
  removeVendorFromSelectedVendorsToExport:(id:string)=>void
  exportContractors:()=>void
  closeExportModal:()=>void
  findVendorsByName:(q:string)=>void
}
export default function ExportModal(props:Props){
  const { exportOptions, updateExportOptions, toggleExportOptions, exportVendorSearchResults, addVendorToSelectedList, selectedVendorsToExport, removeVendorFromSelectedVendorsToExport, exportContractors, closeExportModal, findVendorsByName} = props
  return (
    <Modal>
      <div className={styles.exportModal}>
        <h2>Export Vendors</h2>
        <hr />
        <h4>Export options</h4>

        <div className={styles.exportOptionsDiv}>
          <div onClick={()=> updateExportOptions("root","invited")}>
            <input type="radio" name="root" checked={exportOptions.root==="invited"} readOnly/>
            <label>Export invited vendors</label>
          </div>
          <div onClick={()=> updateExportOptions("root","registered")}>
            <input type="radio" name="root" checked={exportOptions.root==="registered"} readOnly/>
            <label>Export registered vendors</label>
          </div>
        </div>

        {exportOptions.root==="invited" && (
          <div className={styles.exportOptionsDiv}>
            {["all","active","used","expired","archived"].map(key=>(
              <div key={key} onClick={()=> updateExportOptions("selectedInviteType", key)}>
                <input type="radio" name="invite" checked={exportOptions.selectedInviteType===key} readOnly/>
                <label>{key[0].toUpperCase()+key.slice(1)}</label>
              </div>
            ))}
          </div>
        )}

        {exportOptions.root!=="invited" && (<>
          <h5>Stage</h5>
          <div className={styles.exportOptionsDiv}>
            <div onChange={()=> toggleExportOptions("selectedStages","inProgress")}>
              <input type="checkbox" name="stage" checked={exportOptions.selectedStages.includes("inProgress")} readOnly/>
              <label>In Progress</label>
            </div>
            <div onChange={()=> toggleExportOptions("selectedStages","l2")}>
              <input type="checkbox" name="stage" checked={exportOptions.selectedStages.includes("l2")} readOnly/>
              <label>L2</label>
            </div>
            <div onChange={()=> toggleExportOptions("selectedStages","l3")}>
              <input type="checkbox" name="stage" checked={exportOptions.selectedStages.includes("l3")} readOnly/>
              <label>L3</label>
            </div>
          </div>

          {exportOptions.selectedStages.includes("l2") && (<>
            <h5>L2 Status</h5>
            <div className={styles.exportOptionsDiv}>
              {["pending","completed","returned","returnRequested"].map(key=>(
                <div key={key} onChange={()=> toggleExportOptions("l2Stages", key)}>
                  <input type="checkbox" checked={exportOptions.l2Stages.includes(key)} readOnly/>
                  <label>{key=="returnRequested"?"Return requested": key[0].toUpperCase()+key.slice(1)}</label>
                </div>
              ))}
            </div>

            {exportOptions.l2Stages.includes("pending") && (<>
              <h5>L2 Stage</h5>
              <div className={styles.exportOptionsDiv}>
                {["All","A","B","C","D","E","F","G","H"].map(key=>(
                  <div key={key} onChange={()=> toggleExportOptions("pendingL2Stages", key)}>
                    <input type="checkbox" checked={exportOptions.pendingL2Stages.includes(key)} disabled={key!=="All" && exportOptions.pendingL2Stages.includes("All")} readOnly/>
                    <label>{key==="All"?"All Stages":`Stage ${key}`}</label>
                  </div>
                ))}
              </div>
            </>)}
          </>)}

          {exportOptions.selectedStages?.length>0 && (<>
            <h5>Selection type</h5>
            <div className={styles.exportOptionsDiv}>
              <div onClick={()=> updateExportOptions("exportType","all")}>
                <input type="radio" name="specific" checked={exportOptions.exportType==="all"} readOnly/>
                <label>All</label>
              </div>
              <div onClick={()=> updateExportOptions("exportType","select")}>
                <input type="radio" name="specific" checked={exportOptions.exportType==="select"} readOnly/>
                <label>Select contractors</label>
              </div>
            </div>
          </>)}

          {exportOptions.exportType==="select" && (
            <div className={styles.searchVendorsDiv}>
              <input placeholder="Search vendors" onChange={(e)=> findVendorsByName(e.target.value)} />
              <div className={styles.vendorSearchResultList}>
                {exportVendorSearchResults.map((item:any, idx:number)=>(
                  <p key={idx} className={styles.vendorSearchResultItem} onClick={()=> addVendorToSelectedList(item)}>{item.companyName}</p>
                ))}
              </div>
            </div>
          )}

          {exportOptions.exportType==="select" && (
            <div className={styles.selectedVendorsToExportDiv}>
              <h5>Selected vendors</h5>
              <div>
                {selectedVendorsToExport.map((item:any, idx:number)=>(
                  <div key={idx} className={styles.selectedVendorsToExportItem}>
                    <p>{item.companyName}</p>
                    <a onClick={()=> removeVendorFromSelectedVendorsToExport(item._id)}>Remove</a>
                  </div>
                ))}
              </div>
              {selectedVendorsToExport?.length===0 && <p className={styles.noSelectedVendorsText}>No selected vendors</p>}
            </div>
          )}
        </>)}

        <div className={styles.exportActionButtons}>
          <button onClick={exportContractors}>Export</button>
          <button onClick={closeExportModal}>Close</button>
        </div>
      </div>
    </Modal>
  )
}
