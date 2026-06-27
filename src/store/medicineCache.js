/**
 * medicineCache.js
 *
 * Module-level singleton that caches raw DB medicine rows (output of mapFromDb)
 * so Dashboard, Medicines, and Reports display data instantly on navigation
 * instead of waiting for a fresh Supabase round-trip each time.
 *
 * Cache stores raw rows (pre-normalization) so each page applies its own
 * normalizeMedicine pipeline independently.
 */

let _rows = null        // null = not yet populated
let _isFetching = false // prevents duplicate in-flight requests across pages

export const medicineCache = {
  /** Returns cached raw DB rows, or null if cache is empty. */
  get() {
    return _rows
  },

  /** Replace the entire cache with a new set of raw DB rows. */
  set(rows) {
    _rows = Array.isArray(rows) ? rows : null
  },

  /**
   * Apply a transformation function to the cached rows.
   * Used by mutation handlers to keep cache in sync without a network call.
   * @param {(rows: object[]) => object[]} fn
   */
  update(fn) {
    if (_rows === null) return
    _rows = fn(_rows)
  },

  /** True while a background fetch is in-flight. Prevents duplicate requests. */
  isFetching() {
    return _isFetching
  },

  /** Set or clear the in-flight lock. */
  setFetching(value) {
    _isFetching = Boolean(value)
  },

  /** Clear cache entirely (e.g., on logout so the next user starts fresh). */
  clear() {
    _rows = null
    _isFetching = false
  },
}
