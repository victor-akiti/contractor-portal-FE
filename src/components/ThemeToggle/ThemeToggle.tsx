'use client'
import { useTheme } from '@/context/ThemeContext'
import { faMoon, faSun, faClock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from './styles.module.css'

/**
 * ThemeToggle Component
 * Allows users to toggle between light, dark, and auto (time-based) themes
 */
export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  const handleThemeChange = () => {
    // Cycle through: auto -> light -> dark -> auto
    if (theme === 'auto') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('auto')
    }
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return faSun
      case 'dark':
        return faMoon
      case 'auto':
        return faClock
      default:
        return faClock
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'auto':
        return 'Auto'
      default:
        return 'Auto'
    }
  }

  return (
    <button
      onClick={handleThemeChange}
      className={styles.themeToggle}
      aria-label={`Switch theme (current: ${theme})`}
      title={`Current: ${getLabel()} mode. Click to change.`}
    >
      <FontAwesomeIcon icon={getIcon()} className={styles.icon} />
      <span className={styles.label}>{getLabel()}</span>
    </button>
  )
}
