/**
 * "Sign out when the tab is closed" support.
 *
 * The auth session lives in localStorage (shared, survives closing the browser).
 * We keep a per-tab marker in sessionStorage, which survives reloads but is
 * cleared when the tab is closed. When a page loads with a stored session but no
 * marker, and no other open tab of the app answers a presence ping, the previous
 * tabs were all closed — so the stored session is discarded.
 */
const TAB_KEY = "dsv-tab-alive";
const CHANNEL_NAME = "dsv-tab-presence";
const PING_WAIT_MS = 400;

export function hasTabMarker(): boolean {
  try {
    return window.sessionStorage.getItem(TAB_KEY) === "1";
  } catch {
    return false;
  }
}

export function setTabMarker() {
  try {
    window.sessionStorage.setItem(TAB_KEY, "1");
  } catch {
    /* storage unavailable — nothing to do */
  }
}

/** True when the URL carries a fresh sign-in (OAuth return, email/password-setup link). */
export function hasAuthParams(): boolean {
  const s = `${window.location.search}&${window.location.hash}`;
  return /access_token=|refresh_token=|[?&#]code=|type=(recovery|invite|signup|magiclink)/.test(s);
}

/** Answer presence pings from newly opened tabs. Returns a cleanup function. */
export function listenForPresencePings(): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e) => {
    if (e.data === "ping" && hasTabMarker()) channel.postMessage("pong");
  };
  return () => channel.close();
}

/** Ask whether another open tab of the app is already signed in. */
export function anotherTabIsOpen(): Promise<boolean> {
  if (typeof BroadcastChannel === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const done = (value: boolean) => {
      clearTimeout(timer);
      channel.close();
      resolve(value);
    };
    const timer = setTimeout(() => done(false), PING_WAIT_MS);
    channel.onmessage = (e) => {
      if (e.data === "pong") done(true);
    };
    channel.postMessage("ping");
  });
}
