'use client'
import { useState } from 'react'
import styles from "./styles/styles.module.css"

interface Tab {
  name: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  updateActiveTab: (name: string, index: number) => void
}

const Tabs = ({ tabs, activeTab, updateActiveTab }: TabsProps) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabs} role="tablist">
        {tabs.map((tab, index) => {
          const isActive = tab.name === activeTab
          const isHovered = tab.name === hoveredTab

          return (
            <button
              key={tab.name}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.name}`}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => updateActiveTab(tab.name, index)}
              onMouseEnter={() => setHoveredTab(tab.name)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <span className={styles.tabLabel}>{tab.label}</span>
              {isActive && <div className={styles.activeIndicator} />}
            </button>
          )
        })}
        <div className={styles.tabsUnderline} />
      </div>
    </div>
  )
}

export default Tabs