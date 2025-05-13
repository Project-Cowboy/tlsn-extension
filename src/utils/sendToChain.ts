import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring';

export async function sendProofToChain(ws_url: string, hexData: string, signerPair: KeyringPair) {
  const wsProvider = new WsProvider(ws_url);
  const api = await ApiPromise.create({ provider: wsProvider });

  // api.setSigner()
  api.setSigner({
    signPayload: async ({ data, address }) => {
      // address should match signerPair.address
      const { signature } = signerPair.sign(data);
      return { signature };
    }
  });
  // const keyring = new Keyring({ type: 'sr25519' });

  // const tx = api.tx.cowboy.verifyAndCommit(`0x${hexData}`);
  const tx = api.tx.cowboy.verifyAndCommit(hexData);

  const unsub = await tx.signAndSend(signerPair, ({ status }) => {
    if (status.isInBlock) {
      console.log(`✅ Included at block hash ${status.asInBlock.toHex()}`);
      unsub();
    }
  });
}
