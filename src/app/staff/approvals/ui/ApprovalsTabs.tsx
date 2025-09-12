import React from 'react'

interface Props{
  TabsComponent: any
  tabs: any[]
  activeTab: string
  onTabChange: (tab:string)=>void
}
export default function ApprovalsTabs({TabsComponent, tabs, activeTab, onTabChange}:Props){
  return <TabsComponent tabs={tabs} activeTab={activeTab} updateActiveTab={onTabChange} />
}
