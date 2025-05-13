import { web3Enable, web3AccountsSubscribe } from '@polkadot/extension-dapp';

// …
useEffect(() => {
  web3Enable('My DApp')
    .then(exts => setExtensions(exts))
    .catch(console.error);
}, []);
