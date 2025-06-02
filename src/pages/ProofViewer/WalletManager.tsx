import React, {
  ReactNode,
  ReactElement,
  useState,
  useEffect,
  MouseEventHandler,
  useCallback,
} from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { useInExtensionWallet } from '../../utils/wallet';
import { u8aConcat, u8aToHex, stringToU8a } from '@polkadot/util';
const {
  naclEncrypt,
  sr25519PairFromSeed,
  sr25519Sign,
  sr25519Verify,
  randomAsU8a
} = require('@polkadot/util-crypto');
import { useNotifier } from '../../utils/notifications';
import Icon from '../../components/Icon';


export function WalletManager() {
  const { ready, accounts, active, create, setActive, keyring } = useInExtensionWallet();

  if (!ready) {
    return <div>Loading wallet…</div>;
  }

  return (
    <div className="flex flex-col gap-2 p-4 border rounded">
      <h2 className="text-lg font-semibold">In-Extension Wallet</h2>
      <button className="button is-primary" onClick={create}>
        + New Account
      </button>
      <ul className="mt-2 space-y-1">
        {accounts.map((acc) => (
          <li key={acc.address}>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="activeAccount"
                checked={acc.address === active}
                onChange={() => setActive(acc.address)}
              />
              <span className="font-mono text-sm">{acc.address}</span>
            </label>
          </li>
        ))}
      </ul>
      {!accounts.length && <div className="text-sm text-slate-500">No accounts yet</div>}
    </div>
  );
}

export function WalletHeader({ wsUrl }: { wsUrl: string }) {
  const { ready, accounts, active, create, setActive, keyring } = useInExtensionWallet();
  const { success, error, info } = useNotifier();
  const [isClaiming, setIsClaiming] = useState(false);
  const balance = useBalance(active, wsUrl);

  if (!ready) {
    return <div className="p-4 text-center">Loading wallet…</div>;
  }

  // No accounts yet: big button
  if (accounts.length === 0) {
    return (
      <div className="p-4 border rounded text-center">
        <button
          className="button is-primary"
          onClick={create}
        >
          + Create New Account
        </button>
      </div>
    );
  }

  const current = accounts.find((a) => a.address === active)!;

  const claimFunds = async () => {
    if (!active || !keyring) {
      return info('No account selected');
    }
    setIsClaiming(true);
  
    try {
      const pair = keyring.getPair(active);
      const api = await ApiPromise.create({ provider: new WsProvider(wsUrl) });
  
      const aliceFaucetOwner = keyring.addFromUri('//Alice');

      
      // 1) sign payload
      info('🔐 Signing claim payload…');
      const payload = stringToU8a('CLAIM');
      // payload.join(aliceFaucetOwner.address)

      console.log("Claim payload: ", payload)
      const signature = await pair.sign(payload);
      console.log("signature ", signature)
  
      // 2) build and send tx
      info('🚀 Submitting transaction…');
      const unsub = await api.tx
        .faucet
        // Order is sender, signature, faucet owner
        .claim(pair.addressRaw, signature, aliceFaucetOwner.address)
        .send(({ status, events, dispatchError }) => {
          if (status.isInBlock) {
            success(`✅ Included in block ${status.asInBlock.toHex()}`);
            unsub();
            setIsClaiming(false);
          } else if (status.isBroadcast) {
            info('📡 Broadcast to network…');
          } else if (dispatchError) {
            // module error
            const errorInfo = dispatchError.isModule
              ? api.registry.findMetaError(dispatchError.asModule)
              : dispatchError.toString();
            error(`❌ Tx failed: ${errorInfo}`);
            unsub();
            setIsClaiming(false);
          }
        });
    } catch (err) {
      console.error(err);
      error('❌ Error during claim flow');
      setIsClaiming(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded bg-gray-50">
      <div className="flex items-center gap-3">
        <select
          className="border rounded px-2 py-1 bg-white"
          value={active}
          onChange={(e) => setActive(e.target.value)}
        >
          {accounts.map((a) => (
            <option key={a.address} value={a.address}>
              {a.name || formatAddress(a.address)}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-600 font-mono">
          {formatAddress(current.address)}
        </span>
      </div>

      <div className="flex items-center gap-4">


        {/* <button className="button is-small" onClick={claimFunds}>
          🎁 Claim
        </button> */}
        <button
          className="button is-small flex items-center gap-1"
          onClick={claimFunds}
          disabled={isClaiming}
        >
            {isClaiming && <Icon fa="fa-solid fa-spinner fa-spin" />}
              🎁 Claim
        </button>


        <div className="text-right">
          <div className="text-xs text-gray-500">Balance</div>
          <div className="font-semibold">
            {balance !== null ? formatBalance(Number(balance)) : '—'}
          </div>
        </div>
      </div>
    </div>
  );

}

export function useBalance(address: string | null, wsUrl: string): string | null {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !wsUrl) {
      setBalance(null);
      return;
    }

    let api: ApiPromise;
    let unsubscribe: () => void;

    (async () => {
      // 1) initialize the API (you may want to cache this in a higher‐level hook)
      api = await ApiPromise.create({
        provider: new WsProvider(wsUrl)
      });

      // 2) subscribe to the account data
      unsubscribe = await api.query.system.account(address, ({ data: { free } }) => {
        // free is a BN; convert to string
        setBalance(free.toString());
      });
    })().catch((err) => {
      console.error('useBalance error', err);
      setBalance(null);
    });

    // cleanup on unmount or deps change
    return () => {
      unsubscribe && unsubscribe();
      api && api.disconnect();
    };
  }, [address, wsUrl]);

  return balance;
}

function formatAddress(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-6);
}
function formatBalance(bal: number) {
  return bal.toFixed(4);
}

