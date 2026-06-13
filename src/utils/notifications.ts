// Browser Notification API wrapper.
// Notifications are only shown when:
//   1. The user has the push_notifications setting ON (cd_push_notifications !== 'false')
//   2. The browser has granted Notification permission
//   3. The tab is currently hidden (no point showing if user is already looking)

function notifEnabled(): boolean {
  return localStorage.getItem('cd_push_notifications') !== 'false';
}

/** Ask the browser for notification permission. Returns true if granted. */
export async function requestNotifPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Returns the current browser permission state, or 'unsupported'. */
export function getNotifPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Show a browser notification.
 * Silently no-ops if: setting is off, permission not granted, or tab is visible.
 */
export function showNotif(
  title: string,
  body: string,
  onClick?: () => void
): void {
  if (!notifEnabled()) return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      silent: true, // we handle sound ourselves
    });
    if (onClick) {
      notif.onclick = () => {
        window.focus();
        notif.close();
        onClick();
      };
    }
    // Auto-close after 5 s
    setTimeout(() => notif.close(), 5000);
  } catch {
    // Notification constructor may throw in some environments
  }
}
