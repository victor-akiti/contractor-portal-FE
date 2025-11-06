import React from 'react'

interface Tab {
  label: string
  name: string
}

interface Props {
  TabsComponent: React.ComponentType<{
    tabs: Tab[]
    activeTab: string
    updateActiveTab: (tab: string) => void
  }>
  tabs: Tab[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function ApprovalsTabs({
  TabsComponent,
  tabs,
  activeTab,
  onTabChange
}: Props) {
  return (
    <TabsComponent
      tabs={tabs}
      activeTab={activeTab}
      updateActiveTab={onTabChange}
    />
  )
}