import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Web-only auth surface.
 *
 * The native `auth.native.ts` module pulls in expo-apple-authentication,
 * expo-web-browser, expo-crypto and expo-auth-session at the top level.
 * None of those work in a browser, and importing them would bloat the
 * web bundle by ~500 KB even if they were never called. This web variant
 * deliberately depends on `@supabase/supabase-js` only.
 *
 * Feature parity with native:
 *   * Email sign-in / sign-up / sign-out            — identical, Supabase only.
 *   * `useSession` hook                              — identical.
 *   * Google OAuth                                   — Supabase OAuth with a
 *     full-page browser redirect (no expo-web-browser popup).
 *   * Apple OAuth                                    — NOT supported on web
 *     preview; throws a friendly error so callers can surface it in the UI.
 */

// --- Hooks ---

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!isMounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isMounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}

// --- Email Auth ---

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
  return data;
}

// --- OAuth: Google (browser redirect, no popup) ---

export async function signInWithGoogle() {
  // On web we let Supabase drive a full-page redirect back to the current
  // origin. Supabase returns after the OAuth round-trip and the session
  // lands via `onAuthStateChange`.
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error) throw error;
  return data;
}

// --- OAuth: Apple (unsupported on web preview) ---

export async function signInWithApple(): Promise<never> {
  throw new Error(
    'Apple Sign-In is not supported on the web preview. ' +
      'Use email or Google sign-in, or run the native iOS/Android app.',
  );
}

// --- Sign Out ---

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
