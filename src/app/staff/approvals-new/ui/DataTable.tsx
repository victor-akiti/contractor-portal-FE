import React from 'react'
import styles from '../styles/styles.module.css'

interface Props{
  headers:string[]
  onHeaderClick:(index:number)=>void
  showSortIcons:(index:number)=>boolean
  getIcon:(index:number)=>any
  ImageComponent:any
  children:any
}
export default function DataTable({headers, onHeaderClick, showSortIcons, getIcon, ImageComponent, children}:Props){
  return (
    <table>
      <thead>
        {headers.map((item, index)=>(
          <td key={index}>
            <div className={styles.tableHeading} onClick={()=> onHeaderClick(index)}>
              {showSortIcons(index) && <ImageComponent src={getIcon(index)} alt="sort icon" width={15} height={15} />}
              <p>{item}</p>
            </div>
          </td>
        ))}
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}
