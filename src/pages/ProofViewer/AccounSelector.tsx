import React from 'react';
import ReactDOM from 'react-dom';
import {
    ReactNode,
    ReactElement,
    useState,
    useEffect,
    MouseEventHandler,
    useCallback,
  } from 'react';
  import { web3Enable, web3Accounts, web3FromAddress, web3AccountsSubscribe, isWeb3Injected } from '@polkadot/extension-dapp';
import type {
  InjectedAccountWithMeta,
  InjectedExtension,
  Web3AccountsOptions,
} from "@polkadot/extension-inject/types"

function useInjectedAccounts(appName: string) {
    const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
    const [error, setError]       = useState<string | null>(null);
    const [loading, setLoading]   = useState(false);
  
    useEffect(() => {
      let unsub: () => void;
  
      async function init() {
        setLoading(true);
        setError(null);
  
        // DEBUG: verify injection
        console.log('[HOOK] window.injectedWeb3 =', (window as any).injectedWeb3);
  
        // 1. request all wallets to enable
        const exts = await web3Enable(appName);
        console.log('[HOOK] enabled extensions:', exts);
  
        if (exts.length === 0) {
          setError(
            'No wallet detected or permission denied. Make sure you’re on a web page (not extension UI) and have at least one Polkadot-compatible wallet installed.'
          );
          setLoading(false);
          return;
        }
  
        // 2. get current accounts once
        const oneShot = await web3Accounts();
        console.log('[HOOK] web3Accounts (once):', oneShot);
        setAccounts(oneShot);
        setLoading(false);
  
        // 3. subscribe to changes
        unsub = await web3AccountsSubscribe((all) => {
          console.log('[HOOK] web3AccountsSubscribe update:', all);
          setAccounts(all);
        });
      }
  
      init().catch((e) => {
        console.error('[HOOK] init error:', e);
        setError(e.message || String(e));
        setLoading(false);
      });
  
      // cleanup on unmount
      return () => {
        if (unsub) unsub();
      };
    }, [appName]);
  
    return { accounts, loading, error };
  }



export function AccountSelector() {
  const { accounts, loading, error } = useInjectedAccounts('My Cowboy Extension');

  if (loading) return <div>Loading accounts…</div>;
  if (error)   return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <select>
      {accounts.map((acct) => (
        <option key={acct.address} value={acct.address}>
          {acct.meta.name} ({acct.meta.source})
        </option>
      ))}
    </select>
  );
}

// Mount it into the page
const container = document.createElement('div');
container.id = 'cowboy-account-selector';
document.body.appendChild(container);

ReactDOM.render(<AccountSelector />, container);