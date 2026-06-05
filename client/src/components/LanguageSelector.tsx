import { useSettings } from '../store/settings'

const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin']

export default function LanguageSelector({ onChange }: { onChange?: (lang: string) => void }) {
  const language = useSettings((s) => s.language)
  const setLanguage = useSettings((s) => s.setLanguage)

  return (
    <select
      value={language}
      onChange={(e) => { setLanguage(e.target.value); onChange?.(e.target.value) }}
      style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
    >
      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
    </select>
  )
}
