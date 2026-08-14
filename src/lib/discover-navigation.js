import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const DISCOVER_RETURN_KEY = 'mm_open_discover';
export const DISCOVER_STATE_KEY = 'mm_discover_state';

export function setDiscoverReturn() {
  try {
    sessionStorage.setItem(DISCOVER_RETURN_KEY, '1');
  } catch {
    // ignore
  }
}

export function consumeDiscoverReturn() {
  try {
    if (sessionStorage.getItem(DISCOVER_RETURN_KEY) === '1') {
      sessionStorage.removeItem(DISCOVER_RETURN_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function saveDiscoverState(state) {
  try {
    sessionStorage.setItem(DISCOVER_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadDiscoverState() {
  try {
    const raw = sessionStorage.getItem(DISCOVER_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDiscoverState() {
  try {
    sessionStorage.removeItem(DISCOVER_STATE_KEY);
  } catch {
    // ignore
  }
}

export const MY_TOURNAMENTS_PATH = '/app/my-tournaments';

/**
 * Back from a tournament detail screen to the My Tournaments tab list.
 */
export function navigateBackFromTournament(navigate) {
  navigate(MY_TOURNAMENTS_PATH);
}

/** Current path + search — where the user was when Discover was open. */
export function getCurrentReturnPath() {
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Navigate from Discover to a detail page while preserving the ability to return
 * to Discover on the screen the user came from.
 */
export function navigateFromDiscover(navigate, path, extraState = {}) {
  const returnTo = getCurrentReturnPath();
  setDiscoverReturn();
  navigate(path, {
    state: {
      fromDiscover: true,
      returnTo,
      ...extraState,
    },
  });
}

/**
 * Back from a detail page opened via Discover (or any page with returnTo in state).
 */
export function navigateBackFromDetail(navigate, location, defaultPath = '/app') {
  const returnTo = location.state?.returnTo || defaultPath;

  if (location.state?.fromDiscover) {
    setDiscoverReturn();
    navigate(returnTo, { state: { openDiscover: true } });
    return;
  }

  if (window.history.length > 1) {
    navigate(-1);
    return;
  }

  navigate(returnTo, { replace: true });
}

/**
 * Re-open Discover when returning from a detail page (via location state or session flag).
 * Use in Home and AppLayout — both can host the Discover overlay.
 */
export function useDiscoverReopen(setShowDiscover) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let shouldOpen = location.state?.openDiscover === true;

    if (!shouldOpen) {
      shouldOpen = consumeDiscoverReturn();
    }

    if (!shouldOpen) return;

    setShowDiscover(true);

    if (location.state?.openDiscover) {
      const { openDiscover: _omit, ...rest } = location.state || {};
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: Object.keys(rest).length ? rest : null },
      );
    }
  }, [location.pathname, location.search, location.state?.openDiscover, navigate, setShowDiscover]);
}
