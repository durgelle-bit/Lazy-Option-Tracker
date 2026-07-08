import { AppData, Trade } from '../types'

const STORAGE_KEY = 'option-vault:data:v1'
const CURRENT_VERSION = 1

export const DEFAULT_DATA: AppData = {
  version: CURRENT_VERSION,
  trades: [],
  settings: {
    startingCash: 10000,
    displayCurrency: 'USD',
  },
}

/** Basic structural validation to guard against corrupted / malicious JSON. */
function isValidTrade(t: any): t is Trade {
  return (
    t &&
    typeof t === 'object' &&
    typeof t.id === 'string' &&
    typeof t.ticker === 'string' &&
    typeof t.strategy === 'string' &&
    typeof t.strike === 'number' &&
    typeof t.contracts === 'number' &&
    typeof t.premium === 'number' &&
    typeof t.fees === 'number' &&
    typeof t.openDate === 'string' &&
    typeof t.expiry === 'string' &&
    typeof t.status === 'string'
  )
}

function isValidAppData(data: any): data is AppData {
  if (!data || typeof data !== 'object') return false
  if (!Array.isArray(data.trades)) return false
  if (!data.settings || typeof data.settings !== 'object') return false
  if (typeof data.settings.startingCash !== 'number') return false
  return data.trades.every(isValidTrade)
}

/** Safely load app data from localStorage. Never throws; falls back to defaults. */
export function loadData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredCloneSafe(DEFAULT_DATA)

    const parsed = JSON.parse(raw)

    if (!isValidAppData(parsed)) {
      console.warn('[OptionVault] Stored data failed validation. Falling back to defaults.')
      return structuredCloneSafe(DEFAULT_DATA)
    }

    // Fill any missing settings fields defensively (forward-compat)
    return {
      version: parsed.version ?? CURRENT_VERSION,
      trades: parsed.trades,
      settings: {
        startingCash: parsed.settings.startingCash ?? DEFAULT_DATA.settings.startingCash,
        displayCurrency: parsed.settings.displayCurrency ?? DEFAULT_DATA.settings.displayCurrency,
      },
    }
  } catch (err) {
    console.error('[OptionVault] Failed to load/parse localStorage data:', err)
    return structuredCloneSafe(DEFAULT_DATA)
  }
}

/** Safely persist app data to localStorage. Returns true on success. */
export function saveData(data: AppData): boolean {
  try {
    const serialized = JSON.stringify(data)
    window.localStorage.setItem(STORAGE_KEY, serialized)
    return true
  } catch (err) {
    console.error('[OptionVault] Failed to save data to localStorage:', err)
    return false
  }
}

export function exportToFile(data: AppData) {
  try {
    const serialized = JSON.stringify(data, null, 2)
    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `option-vault-backup-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (err) {
    console.error('[OptionVault] Export failed:', err)
    return false
  }
}

export function importFromFile(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isValidAppData(parsed)) {
          reject(new Error('The selected file does not match the expected Option Vault format.'))
          return
        }
        resolve({
          version: parsed.version ?? CURRENT_VERSION,
          trades: parsed.trades,
          settings: {
            startingCash: parsed.settings.startingCash ?? DEFAULT_DATA.settings.startingCash,
            displayCurrency: parsed.settings.displayCurrency ?? DEFAULT_DATA.settings.displayCurrency,
          },
        })
      } catch (err) {
        reject(new Error('Could not parse the file as valid JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsText(file)
  })
}

function structuredCloneSafe<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return obj
  }
}
