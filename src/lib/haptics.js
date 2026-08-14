/**
 * Haptic feedback utility using the Vibration API.
 * Works on iOS (via WKWebView) and Android.
 */

export const haptics = {
  // Light tap — button presses, selections
  light: () => {
    if (navigator.vibrate) navigator.vibrate(10);
  },

  // Medium — confirmations, RSVP, score submit
  medium: () => {
    if (navigator.vibrate) navigator.vibrate(25);
  },

  // Heavy — success moments, timer alerts
  heavy: () => {
    if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
  },

  // Success pattern — prize wins, tournament complete
  success: () => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 30, 50, 60]);
  },

  // Warning — timer running low
  warning: () => {
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  },

  // Error — invalid input
  error: () => {
    if (navigator.vibrate) navigator.vibrate([50, 20, 50, 20, 50]);
  },
};