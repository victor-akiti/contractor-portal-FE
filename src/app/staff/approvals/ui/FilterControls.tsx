import styles from '../styles/styles.module.css'
import StageLegend from './StageLegend'

interface Props {
  userIsCnPStaff: boolean
  activeTab: string
  inviteFilters: string[]
  activeFilter: string
  onInviteFilter: (filter: string) => void
  onNameOrEmailFilter: (query: string) => void
  approvalStages: string[]
  l3Filters: string[]
  activeL3Filter: string
  setActiveFilter: (filter: string) => void
  setActiveL3Filter: (filter: string) => void
  filterL2Companies: (stage: string) => void
  filterL3Companies: (stage: string) => void
  approvals: any
}

export default function FilterControls({
  userIsCnPStaff,
  activeTab,
  inviteFilters,
  activeFilter,
  onInviteFilter,
  onNameOrEmailFilter,
  approvalStages,
  l3Filters,
  activeL3Filter,
  setActiveFilter,
  setActiveL3Filter,
  filterL2Companies,
  approvals
}: Props) {
  const renderFilterButton = (
    filter: string,
    isActive: boolean,
    onClick: () => void,
    label?: string
  ) => (
    <p
      key={filter}
      className={isActive ? styles.active : ""}
      onClick={onClick}
    >
      {label || filter}
    </p>
  )

  const getFilterCount = (filter: string) => {
    return filter === activeFilter ? ` (${approvals.pendingL2?.length || 0})` : ""
  }

  const getL3FilterCount = (filter: string) => {
    return filter === activeL3Filter ? ` (${approvals.l3?.length || 0})` : ""
  }

  const renderInviteFilters = () => (
    <div>
      {inviteFilters.map((filter) =>
        renderFilterButton(
          filter,
          filter === activeFilter,
          () => {
            setActiveFilter(filter)
            onInviteFilter(filter)
          }
        )
      )}
      <input
        placeholder="Filter by company name or email address"
        onChange={(e) => onNameOrEmailFilter(e.target.value)}
      />
    </div>
  )

  const renderPendingL2Filters = () => (
    <div>
      {renderFilterButton(
        "All",
        activeFilter === "All",
        () => {
          setActiveFilter("All")
          filterL2Companies("All")
        },
        `All${getFilterCount("All")}`
      )}
      {approvalStages.map((stage) =>
        renderFilterButton(
          stage,
          stage === activeFilter,
          () => {
            setActiveFilter(stage)
            filterL2Companies(stage)
          },
          `Completed Stage ${stage}${getFilterCount(stage)}`
        )
      )}
    </div>
  )

  const renderL3Filters = () => (
    <div>
      {l3Filters.map((filter) =>
        renderFilterButton(
          filter,
          filter === activeL3Filter,
          () => {
            setActiveL3Filter(filter)
            // Note: filterL3Companies is not used in the original, keeping for compatibility
          },
          `${filter}${getL3FilterCount(filter)}`
        )
      )}
    </div>
  )

  if (!userIsCnPStaff && activeTab !== "l3") {
    return null
  }

  return (
    <>
      {activeTab === "pending-l2" && userIsCnPStaff && <StageLegend />}
      <div className={styles.inviteFilters}>
        {userIsCnPStaff && <label>Filter: </label>}

        {activeTab === "invited" && renderInviteFilters()}
        {activeTab === "pending-l2" && userIsCnPStaff && renderPendingL2Filters()}
        {activeTab === "l3" && renderL3Filters()}
      </div>
    </>
  )
}