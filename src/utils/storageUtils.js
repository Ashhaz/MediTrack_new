export const safeParseJson = (value, fallback, context = "stored JSON") => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    console.error(`[MediTrack Storage] Failed to parse ${context}`, error)
    return fallback
  }
}

export const readJsonFromStorage = (key, fallback) => {
  try {
    return safeParseJson(localStorage.getItem(key), fallback, key)
  } catch (error) {
    console.error(`[MediTrack Storage] Failed to read ${key}`, error)
    return fallback
  }
}
