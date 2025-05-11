import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';

export async function sendProofToChain(ws_url: string, hexData: string) {
  const wsProvider = new WsProvider(ws_url);
  const api = await ApiPromise.create({ provider: wsProvider });

  const keyring = new Keyring({ type: 'sr25519' });
  const sender = keyring.addFromUri('//Alice'); // or use real account

  // const tx = api.tx.cowboy.verifyAndCommit(`0x${hexData}`);
  const tx = api.tx.cowboy.verifyAndCommit(hexData);

  const unsub = await tx.signAndSend(sender, ({ status }) => {
    if (status.isInBlock) {
      console.log(`✅ Included at block hash ${status.asInBlock.toHex()}`);
      unsub();
    }
  });
}
