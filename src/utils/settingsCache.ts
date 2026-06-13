// Thin localStorage mirror for user settings.
// Keyed with the `cd_` prefix so they don't clash with auth tokens.
// Utilities read these keys synchronously — no async API call needed at runtime.

const KEY_MAP: Record<string, string> = {
  push_notifications: 'cd_push_notifications',
  location_services:  'cd_location_services',
  dark_mode:          'cd_dark_mode',
  sound_effects:      'cd_sounds',
  show_online_status: 'cd_show_online',
};

/** Write a single setting to localStorage. */
export function cacheSettingValue(apiKey: string, value: boolean): void {
  const lsKey = KEY_MAP[apiKey];
  if (lsKey) localStorage.setItem(lsKey, String(value));
}

/** Populate the whole cache from the API response object (called at bootstrap). */
export function applyBootstrapSettings(data: Record<string, boolean>): void {
  for (const [apiKey, lsKey] of Object.entries(KEY_MAP)) {
    if (apiKey in data) {
      localStorage.setItem(lsKey, String(data[apiKey]));
    }
  }
}

/** Read a cached boolean setting. Returns `defaultValue` when not yet cached. */
export function readCachedSetting(lsKey: string, defaultValue = true): boolean {
  const v = localStorage.getItem(lsKey);
  if (v === null) return defaultValue;
  return v !== 'false';
}
