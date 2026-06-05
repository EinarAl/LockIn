import { create } from 'zustand'

interface SettingsState {
  language: string
  setLanguage: (lang: string) => void
}

export const useSettings = create<SettingsState>((set) => ({
  language: localStorage.getItem('language') || 'Python',
  setLanguage: (language) => {
    localStorage.setItem('language', language)
    set({ language })
  },
}))
