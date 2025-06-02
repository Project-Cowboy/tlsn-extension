import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring';

export function sendProofToChain(
  ws_url: string,
  guestId: number[],
  hexData: string,
  signerPair: KeyringPair,
  onStatus?: (status: SubmittableResult) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const api = await ApiPromise.create({ provider: new WsProvider(ws_url) });
    api.setSigner({
      signPayload: async ({ data, address }) => {
        const { signature } = signerPair.sign(data);
        return { signature };
      },
    });

    const tx = api.tx.cowboy.verifyAndCommit(guestId, hexData);
    let unsub: () => void;

    try {
      unsub = await tx.signAndSend(signerPair, (result) => {
        onStatus && onStatus(result);

        if (result.dispatchError) {
          // module or other dispatch failure
          let err = result.dispatchError;
          let msg = err.isModule
            ? api.registry.findMetaError(err.asModule).docs.join(' ')
            : err.toString();
          unsub();
          reject(new Error(`⛔ DispatchError: ${msg}`));
        } else if (result.status.isInBlock) {
          // you can toast “included” here
        } else if (result.status.isFinalized) {
          const hash = result.status.asFinalized.toHex();
          unsub();
          resolve(hash);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}