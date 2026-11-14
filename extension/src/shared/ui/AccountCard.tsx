import { useCallback, useEffect, useState } from 'react';
import {
  currentUser,
  readCloudMeta,
  signInWithGoogle,
  signOut,
  syncNow,
  type CloudUser,
} from '../cloud';
import { Card } from './form';
import { IconCheck, IconRefresh } from './icons';

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function syncedText(iso: string | null): string {
  if (!iso) return 'Not synced yet';
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'Synced just now';
  if (s < 3600) return `Synced ${Math.round(s / 60)} min ago`;
  if (s < 86400) return `Synced ${Math.round(s / 3600)} h ago`;
  return `Synced ${new Date(iso).toLocaleDateString()}`;
}

/** Readable sync error; technical auth errors mean the session is no longer valid. */
function friendly(message: string): string {
  if (/jwt|token|session|refresh|401|403/i.test(message)) {
    return 'Your sign-in has expired. Sign out and sign in again to keep syncing.';
  }
  if (/fetch|network|failed to/i.test(message)) {
    return 'Could not reach the sync server. Check your connection and try Sync now.';
  }
  return `Sync failed: ${message}`;
}

export function GoogleButton(props: {
  onClick: () => void;
  busy?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="pp-btn pp-btn-secondary pp-btn-lg"
      onClick={props.onClick}
      disabled={props.busy}
    >
      <GoogleMark />
      {props.busy ? 'Signing in...' : (props.label ?? 'Sign in with Google')}
    </button>
  );
}

/** Sign in, then sync and report; returns the error message, if any. */
export async function signInAndSync(): Promise<string | null> {
  try {
    await signInWithGoogle();
  } catch (err) {
    return err instanceof Error ? err.message : 'Sign-in failed.';
  }
  const result = await syncNow();
  return result.error ?? null;
}

/** Account and cloud sync status, for the settings page. */
export function AccountCard() {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<'signin' | 'sync' | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const [u, meta] = await Promise.all([currentUser(), readCloudMeta()]);
    setUser(u);
    setLastSync(meta.lastSyncAt);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      // Pull changes from other devices whenever settings open.
      if (await currentUser()) {
        const r = await syncNow();
        setError(r.error ? friendly(r.error) : '');
        await refresh();
      }
    })();
  }, [refresh]);

  const signIn = async () => {
    setBusy('signin');
    setError('');
    const message = await signInAndSync();
    if (message) setError(message);
    setBusy(null);
    await refresh();
  };

  const sync = async () => {
    setBusy('sync');
    const r = await syncNow();
    setError(r.error ? friendly(r.error) : '');
    setBusy(null);
    await refresh();
  };

  if (!loaded) return null;

  return (
    <Card
      icon={<IconRefresh />}
      title="Account & cloud sync"
      subtitle={
        user
          ? 'Your profiles and history are backed up to your account and synced across your browsers.'
          : 'Sign in to back up your profiles and history and use them on any computer. Optional.'
      }
    >
      {user ? (
        <div className="flex flex-wrap items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div className="min-w-[12rem] flex-1 basis-48 overflow-hidden">
            <p className="truncate font-semibold">{user.name ?? user.email}</p>
            <p className="pp-faint truncate text-[11px]">{user.email}</p>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--pp-brand-strong)]">
              {error ? null : <IconCheck size={11} />}
              {syncedText(lastSync)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="pp-btn pp-btn-secondary pp-btn-sm"
              onClick={() => void sync()}
              disabled={busy !== null}
            >
              <IconRefresh
                size={13}
                className={busy === 'sync' ? 'pp-spin' : undefined}
              />
              {busy === 'sync' ? 'Syncing' : 'Sync now'}
            </button>
            <button
              type="button"
              className="pp-btn pp-btn-ghost pp-btn-sm"
              onClick={() => void signOut().then(refresh)}
              disabled={busy !== null}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <GoogleButton onClick={() => void signIn()} busy={busy === 'signin'} />
          <span className="pp-faint text-[11px]">No password needed. Free.</span>
        </div>
      )}
      {error ? (
        <p className="pp-notice pp-notice-danger text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
