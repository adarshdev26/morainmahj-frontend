/**
 * Injected into the hosted /login WebView on iOS/Android only.
 * Hides OAuth provider buttons; does not modify the email/password form.
 */
export const NATIVE_LOGIN_HIDE_SOCIAL_JS = `(function(){if(window.__morainmahjHideNativeOAuth)return;window.__morainmahjHideNativeOAuth=true;var s=document.createElement("style");s.id="morainmahj-hide-native-oauth";s.textContent='a[href*="/api/apps/auth/login"],a[href*="/api/apps/auth/google/login"],a[href*="/api/apps/auth/microsoft/login"],a[href*="/api/apps/auth/apple/login"]{display:none!important}';(document.head||document.documentElement).appendChild(s);function h(){var r=/^(Continue with|Log in with|Sign in with) (Google|Microsoft|Apple)\\s*$/i;document.querySelectorAll("button,a").forEach(function(e){var t=(e.textContent||"").replace(/\\s+/g," ").trim();if(r.test(t))e.style.setProperty("display","none","important")})}h();try{new MutationObserver(h).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}})();`;
