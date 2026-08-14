/**
 * Realtime subscriptions are not wired yet.
 * Returns a no-op unsubscribe so call sites can keep the subscribe pattern.
 */
export function subscribe(_handler) {
  return () => {};
}

/** Entity-shaped helper: subscribeEntity()() for drop-in replacement. */
export function createEntityRealtime() {
  return { subscribe };
}

export default { subscribe, createEntityRealtime };
