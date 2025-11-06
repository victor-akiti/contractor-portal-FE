import React from 'react'
import styles from '../styles/styles.module.css'

interface Props {
  headers: string[]
  onHeaderClick: (index: number) => void
  showSortIcons: (index: number) => boolean
  getIcon: (index: number) => any
  ImageComponent: React.ComponentType<any>
  children: React.ReactNode
}

export default function DataTable({
  headers,
  onHeaderClick,
  showSortIcons,
  getIcon,
  ImageComponent,
  children
}: Props) {
  const renderHeader = (header: string, index: number) => {
    const hasSortIcon = showSortIcons(index)

    return (
      <td key={index}>
        <div
          className={styles.tableHeading}
          onClick={() => onHeaderClick(index)}
          style={{ cursor: hasSortIcon ? 'pointer' : 'default' }}
        >
          {hasSortIcon && (
            <ImageComponent
              src={getIcon(index)}
              alt="sort icon"
              width={15}
              height={15}
            />
          )}
          <p>{header}</p>
        </div>
      </td>
    )
  }

  return (
    <table>
      <thead>
        <tr>
          {headers.map(renderHeader)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}