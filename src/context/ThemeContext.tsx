'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: Theme
  effectiveTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

/**
 * Determines if it's night time based on the current hour
 * Night mode is active between 6 PM (18:00) and 6 AM (06:00)
 */
const isNightTime = (): boolean => {
  const hour = new Date().getHours()
  return hour >= 18 || hour < 6
}

/**
 * Gets the effective theme based on the theme setting
 * - 'light': Always light mode
 * - 'dark': Always dark mode
 * - 'auto': Determined by time of day
 */
const getEffectiveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'auto') {
    return isNightTime() ? 'dark' : 'light'
  }
  return theme
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('auto')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')

  // Initialize theme from localStorage or default to 'auto'
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null
    const initialTheme = storedTheme || 'auto'
    setThemeState(initialTheme)
    setEffectiveTheme(getEffectiveTheme(initialTheme))
  }, [])

  // Update effective theme when theme changes or time changes
  useEffect(() => {
    const updateEffectiveTheme = () => {
      const newEffectiveTheme = getEffectiveTheme(theme)
      setEffectiveTheme(newEffectiveTheme)

      // Apply theme to document
      if (newEffectiveTheme === 'dark') {
        document.documentElement.classList.add('dark-mode')
        document.documentElement.classList.remove('light-mode')
      } else {
        document.documentElement.classList.add('light-mode')
        document.documentElement.classList.remove('dark-mode')
      }
    }

    updateEffectiveTheme()

    // If theme is 'auto', check every minute if time of day changed
    if (theme === 'auto') {
      const interval = setInterval(updateEffectiveTheme, 60000) // Check every minute
      return () => clearInterval(interval)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    setEffectiveTheme(getEffectiveTheme(newTheme))
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
