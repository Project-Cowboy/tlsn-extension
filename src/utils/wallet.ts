// src/hooks/useInExtensionWallet.ts
import { useState, useEffect, useCallback } from 'react';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { useLocalStorage } from 'react-use';

export type StoredAccount = {
  name: string;
  address: string;
  mnemonic: string;
};

export function useInExtensionWallet() {
  const [ready, setReady] = useState(false);
  const [keyring, setKeyring] = useState<Keyring>();
  const [accounts, setAccounts] = useLocalStorage<StoredAccount[]>('extAccounts', []);
  // const [active, setActive] = useState<string | null>(null);
  const [active, setActive] = useLocalStorage<string | null>(
      'extActive',
      null
    );

    useEffect(() => {
        console.log(active)
    }, [active]);

  // initialize crypto & reload saved accounts
  useEffect(() => {
    cryptoWaitReady().then(() => {
      const kr = new Keyring({ type: 'sr25519', ss58Format: 42 });
      accounts?.forEach(({ mnemonic, name }) => {
        kr.addFromUri(mnemonic, { name }, 'sr25519');
      });
      setKeyring(kr);
      setReady(true);

     if (accounts?.length && !active) {
         setActive(accounts[0].address);
       }

      // pick first account if none active
      if (accounts?.[0] && !active) {
        setActive(accounts[0].address);
      }
    });
  }, []);

  // create & persist a new account
  const create = useCallback(() => {
    if (!keyring) return;
    const mnemonic = mnemonicGenerate();
    const pair = keyring.addFromUri(mnemonic, { name: `Account ${accounts?.length ?? 0}` }, 'sr25519');
    const newAcc = { name: pair.meta.name, address: pair.address, mnemonic };
    const updated = [...(accounts || []), newAcc];
    setAccounts(updated);
    setActive(pair.address);
  }, [keyring, accounts, setAccounts]);

  // expose the signer payload to Polkadot API
  const signer = ready && keyring && active
    ? {
        signPayload: async ({ address, data }: { address: string; data: string }) => {
          const pair = keyring.getPair(address);
          const signature = pair.sign(data);
          return { signature };
        }
      }
    : null;

  return {
    ready,
    accounts: accounts || [],
    active,
    create,
    setActive,
    signer,
    keyring
  };
}
