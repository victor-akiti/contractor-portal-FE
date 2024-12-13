'use client'
import styles from "./styles/styles.module.css"

const Tabs = ({tabs, activeTab, updateActiveTab}) => {
    console.log({tabs, activeTab});

    return (
        <div className={styles.tabs}>
            {
                tabs.map((item, index) => <div onClick={() => updateActiveTab(item.name, index)} className={item.name === activeTab && styles.active} key={index}>{item.label}</div>)
            }
        </div>
    )
}

export default Tabs