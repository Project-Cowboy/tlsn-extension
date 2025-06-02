// src/components/AppInfoDisplay.tsx
import React, { useState, useMemo } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { useNotifier } from '../../utils/notifications';

// function linkify(text: string) {
//   var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
//   return text.replace(urlRegex, (url) => {
//       return new URL(url)
//   });
// }

export function extractURLs(text: string): URL[] {
  // const urlRegex = /\bhttps?:\/\/[^\s/$.?#].[^\s]*/gi;
  var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  const matches = text.match(urlRegex) || [];
  return matches.map((raw) => new URL(raw));
}

type AppInfoDisplayProps = {
  /** The raw “sent” string (DATA GET https://… HTTP/1.1 …) */
  sent: string | undefined;

  /** Which tab is currently active; we only run lookup when tab === "onchain" */
  tab: 'sent' | 'recv' | 'metadata' | 'onchain';

  /** The node URL string (user types this) */
  wsUrl: string;

  /**
   * Called whenever the lookup result truly changes:
   *   - onChange(programIdArray) if we found an on-chain ID
   *   - onChange(null)             if no app is registered
   */
  onChange: (appId: number[] | null) => void;
};

export default function AppInfoDisplay({
  sent,
  tab,
  wsUrl,
  onChange,
}: AppInfoDisplayProps) {
  const { error, info } = useNotifier();
  // ─────────────────────────────────────────────────────────────────────────
  // 1) Extract [host, path] via useMemo (always returns a 2‐element tuple)
  // ─────────────────────────────────────────────────────────────────────────
  const [host, path] = useMemo<[string, string]>(() => {
    if (!sent) {
      return ['', ''];
    }

    const trimmed = sent.trim();
    const firstLine = trimmed.split('\n')[0];

    const match = firstLine.match(/GET\s+(\S+)\s+HTTP\/1\.1/);
    if (!match) {
      console.warn('AppInfoDisplay: could not find a GET-URL in sent data');
      return ['', ''];
    }
    try {
      const fullUrl = match[1];          // e.g. "https://www.tiktok.com/api/share/settings/?…"
      const u = new URL(fullUrl);
      return [u.hostname, u.pathname];
    } catch (e) {
      console.warn('AppInfoDisplay: invalid URL in sent data:', match[1]);
      return ['', ''];
    }
  }, [sent, wsUrl]);

  console.log("Host is ", host, " path is ", path);

  // const testing = new URL(sent);

  // ─────────────────────────────────────────────────────────────────────────
  // 2) Local state for:
  //    • programId: the found [u32;8] as JS number[] or null
  //    • loading: show “Looking up…” while in progress
  //    • connected: whether we successfully created the ApiPromise
  // ─────────────────────────────────────────────────────────────────────────
  const [programId, setProgramId] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // 3) Handler to connect + lookup exactly once when user clicks “Connect”
  // ─────────────────────────────────────────────────────────────────────────
  const onConnectAndLookup = async () => {
    // Only proceed if user is on the “onchain” tab, and host+path are valid
    if (tab !== 'onchain') {
      return info('Switch to the “On‐chain” tab first');
    }
    if (!host || !path) {
      return error('No valid GET URL found in “sent” data');
    }
    if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      return error('Please enter a valid ws:// or wss:// node URL');
    }

    setLoading(true);
    try {
      // 1) Create exactly one ApiPromise instance
      const api = await ApiPromise.create({ provider: new WsProvider(wsUrl) });
      setConnected(true);
      info('✅ Connected to node');

      // 2) Encode host & path and query the double‐map
      const enc = new TextEncoder();
      const hostBytes = enc.encode(host);
      const pathBytes = enc.encode(path);

      const maybeId = await api.query.cowboy.appSelectors(host, path);

      console.log("Id from onchain may be ", maybeId);

      if (maybeId) {
        setProgramId(maybeId.toPrimitive());
        onChange(maybeId.toPrimitive());
        info(`✅ Found App: ...`);
      } else {
        setProgramId(null);
        onChange(null);
        info('🔎 No on‐chain app registered for that host/path');
      }

      // 3) We can disconnect now if we don’t need a persistent subscription.
      //    If you need to keep the API alive for future use, remove this line.
      await api.disconnect();
      setConnected(false);
    } catch (e: any) {
      console.error('AppInfoDisplay: connection or lookup failed', e);
      error(e.message || 'Failed to connect or lookup');
      setProgramId(null);
      onChange(null);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 4) Render logic:
  //    • If host or path is empty, render nothing (no valid URL)
  //    • Otherwise:
  //       – Show a single “Connect & Lookup” button
  //       – Show loading state if in progress
  //       – Show result if programId != null
  //       – Otherwise show “No app registered …”
  // ─────────────────────────────────────────────────────────────────────────
  if (!host || !path) {
    return null;
  }

  return (
    <div className="p-4 space-y-2">
      {/* 4a) Connect & Lookup button */}
      <button
        className="button is-primary w-full"
        onClick={onConnectAndLookup}
        disabled={loading}
      >
        {loading ? '🔄 Looking up…' : '🔗 Connect & Lookup On‐chain App'}
      </button>

      {/* 4b) If we found a programId, show it */}
      {programId && (
        <div className="p-3 rounded border border-green-300 bg-green-50 text-green-800">
          <div className="font-semibold">✅ Found App for</div>
          <div className="mt-1">
            <code>{host + path}</code> →{' '}
            <code className="ml-1 text-emerald-800">
              [{programId.join(', ')}]
            </code>
          </div>
        </div>
      )}

      {/* 4c) If not loading, connected or programId, show “No app registered” */}
      {!loading && programId === null && (
        <div className="p-3 rounded border border-gray-200 bg-gray-50 text-gray-600">
          No app registered for <code>{host + path}</code>
        </div>
      )}
    </div>
  );
}


