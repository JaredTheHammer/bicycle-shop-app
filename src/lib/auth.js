import { supabase } from "./supabase.js";
import { PERMISSIONS } from "./constants.js";

// ── Permission lookup (unchanged) ────────────────────────────────
export function getPermissions(role) {
  return PERMISSIONS[role] || PERMISSIONS.client;
}

// ── Cache key for offline session fallback ───────────────────────
const SESSION_CACHE_KEY = "bicycle_shop_auth";

// ── Load cached auth from localStorage (sync, for offline-first) ─
export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_CACHE_KEY)) || null;
  } catch {
    return null;
  }
}

// ── Cache auth to localStorage (for offline-first startup) ───────
export function saveAuth(session) {
  if (session) {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_CACHE_KEY);
  }
}

// ── Sign in with email + password via Supabase Auth ──────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  const meta = data.user.user_metadata;
  const session = {
    userId: meta.app_user_id,
    role: meta.role,
    loginAt: new Date().toISOString(),
  };
  saveAuth(session);
  return session;
}

// ── Sign out via Supabase Auth ───────────────────────────────────
export async function signOut() {
  saveAuth(null);
  try {
    await supabase.auth.signOut();
  } catch {
    // Offline — local session already cleared
  }
}

// ── Subscribe to auth state changes ──────────────────────────────
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        saveAuth(null);
        callback(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const meta = session.user.user_metadata;
        const authState = {
          userId: meta.app_user_id,
          role: meta.role,
          loginAt: new Date().toISOString(),
        };
        saveAuth(authState);
        callback(authState);
      }
    }
  );
  return subscription;
}

// ── Check for existing Supabase session (async) ──────────────────
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const meta = session.user.user_metadata;
  return {
    userId: meta.app_user_id,
    role: meta.role,
    loginAt: new Date().toISOString(),
  };
}
