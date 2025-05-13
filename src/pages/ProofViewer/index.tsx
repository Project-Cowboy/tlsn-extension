import React, {
  ReactNode,
  ReactElement,
  useState,
  useEffect,
  MouseEventHandler,
  useCallback,
} from 'react';
import { useParams, useNavigate } from 'react-router';
import c from 'classnames';
import {
  deleteRequestHistory,
  useRequestHistory,
} from '../../reducers/history';
import Icon from '../../components/Icon';
import {
  convertNotaryWsToHttp,
  download,
  isPopupWindow,
} from '../../utils/misc';

import classNames from 'classnames';
import { useDispatch } from 'react-redux';
import { RemoveHistory } from '../History/request-menu';
import { PresentationJSON } from 'tlsn-js/build/types';
import { RequestHistory } from '../../entries/Background/rpc';

// Cowboy
import { sendTlsNProofToProver } from '../../utils/sendToProver';
import {
  sendProofToChain
} from '../../utils/sendToChain';
import { WalletManager, WalletHeader } from "./WalletManager"
import { useInExtensionWallet } from "../../utils/wallet"

export default function ProofViewer(props?: {
  className?: string;
  recv?: string;
  sent?: string;
  verifierKey?: string;
  notaryKey?: string;
  proof?: any;
  info?: {
    meta: { notaryUrl: string; websocketProxyUrl: string };
    version: string;
  };
}): ReactElement {
  const dispatch = useDispatch();
  const { requestId } = useParams<{ requestId: string }>();
  const request = useRequestHistory(requestId);
  const navigate = useNavigate();
  const [tab, setTab] = useState('sent');
  const [isPopup, setIsPopup] = useState(isPopupWindow());
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [typedWs, setTypedWs] = useState('');
  const [wsUrl, setWsUrl] = useState('');

  const { keyring, active, ready } = useInExtensionWallet();

  const proof = props?.proof || request?.proof;

  const onDelete = useCallback(async () => {
    if (requestId) {
      dispatch(deleteRequestHistory(requestId));
      if (isPopup) window.close();
      navigate(-1);
    }
  }, [requestId]);

  const notaryUrl = extractFromProps('notaryUrl', props, request);
  const websocketProxyUrl = extractFromProps(
    'websocketProxyUrl',
    props,
    request,
  );

  return (
    <div
      className={classNames(
        'flex flex-col w-full py-2 gap-2 flex-grow',
        props?.className,
      )}
    >
      <RemoveHistory
        onRemove={onDelete}
        showRemovalModal={showRemoveModal}
        setShowRemoveModal={setShowRemoveModal}
        onCancel={() => setShowRemoveModal(false)}
      />
      <div className="flex flex-col px-2">
        <div className="flex flex-row gap-2 items-center">
          {!isPopup && (
            <Icon
              className={c(
                'px-1 select-none cursor-pointer',
                'text-slate-400 border-b-2 border-transparent hover:text-slate-500 active:text-slate-800',
              )}
              onClick={() => navigate(-1)}
              fa="fa-solid fa-xmark"
            />
          )}
          <TabLabel onClick={() => setTab('sent')} active={tab === 'sent'}>
            Sent
          </TabLabel>
          <TabLabel onClick={() => setTab('recv')} active={tab === 'recv'}>
            Recv
          </TabLabel>
          <TabLabel
            onClick={() => setTab('metadata')}
            active={tab === 'metadata'}
          >
            Metadata
          </TabLabel>

          <TabLabel onClick={() => setTab('onchain')} active={tab === 'onchain'}>
            On-chain
          </TabLabel>

          <div className="flex flex-row flex-grow items-center justify-end">
            {!props?.recv && (
              <button
                className="button"
                onClick={() => {
                  if (!request) return;
                  download(request.id, JSON.stringify(request.proof));
                }}
              >
                Download
              </button>
            )}
            <button
              className="button !text-red-500"
              onClick={() => setShowRemoveModal(true)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-grow px-2">
        {tab === 'sent' && (
          <textarea
            className="w-full resize-none bg-slate-100 text-slate-800 border p-2 text-[10px] break-all h-full outline-none font-mono"
            value={props?.sent || request?.verification?.sent}
            readOnly
          ></textarea>
        )}
        {tab === 'recv' && (
          <textarea
            className="w-full resize-none bg-slate-100 text-slate-800 border p-2 text-[10px] break-all h-full outline-none font-mono"
            value={props?.recv || request?.verification?.recv}
            readOnly
          ></textarea>
        )}
        {tab === 'metadata' && (
          <div className="w-full resize-none bg-slate-100 text-slate-800 border p-2 text-[10px] break-all h-full outline-none font-mono">
            <MetadataRow
              label="Version"
              //@ts-ignore
              value={props?.info?.version || request?.proof?.version}
            />
            <MetadataRow label="Notary URL" value={notaryUrl} />
            <MetadataRow
              label="Websocket Proxy URL"
              value={websocketProxyUrl}
            />
            <MetadataRow
              label="Verifying Key"
              value={props?.verifierKey || request?.verification?.verifierKey}
            />
            <MetadataRow
              label="Notary Key"
              value={props?.notaryKey || request?.verification?.notaryKey}
            />
          </div>
        )}


        {tab === 'onchain' && (
          <div className="flex flex-col gap-4 w-full">


          {/* <div className="flex flex-col">
                <label className="font-semibold mb-1">Node URL</label>
                <input
                  type="text"
                  placeholder="ws://localhost:9944 or wss://your-node"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  className="border border-slate-400 rounded px-2 py-1 font-mono w-full"
                />
          </div> */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1">Node URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ws://localhost:9944 or wss://…"
              value={typedWs}
              onChange={(e) => setTypedWs(e.target.value)}
              className="border rounded px-2 py-1 font-mono flex-grow"
            />
            {/* 2) only when they click this do we commit the URL */}
            <button
              className="button"
              onClick={() => setWsUrl(typedWs)}
              disabled={!typedWs.startsWith('ws://') && !typedWs.startsWith('wss://')}
            >
              Connect
            </button>
          </div>
        </div>


            {wsUrl && (
              <WalletHeader wsUrl={wsUrl} />
            )}

            <textarea
              className="w-full resize-none bg-slate-100 text-slate-800 border p-2 font-mono h-56 outline-none"
              value={proof ? JSON.stringify(proof, null, 2) : 'No data found'}
              readOnly
            />

            <button
              className="button is-primary w-full"
              disabled={!wsUrl}
              onClick={async () => {
                if (!wsUrl) {
                  return alert('Please select or enter a node URL first');
                }
                if (!active || !keyring) {
                  return alert('Pick or create an account first');
                }
                if (!proof?.data) {
                  return alert('Nothing to send');
                }

                try {
                  const receipt = await sendTlsNProofToProver(
                    'http://localhost:1881/prove',
                    proof.data
                  );
                  await sendProofToChain(wsUrl, receipt, keyring.getPair(active));
                  alert('✅ Sent!');
                } catch (e) {
                  console.error(e);
                  alert('Failed to send proof');
                }
              }}
            >
              📡 Send to blockchain
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function extractFromProps(
  key: 'notaryUrl' | 'websocketProxyUrl',
  props?: {
    className?: string;
    recv?: string;
    sent?: string;
    verifierKey?: string;
    notaryKey?: string;
    info?: {
      meta: { notaryUrl: string; websocketProxyUrl: string };
      version: string;
    };
  },
  request?: RequestHistory,
) {
  let value;

  if (props?.info?.meta) {
    value = props.info.meta[key];
  } else if (request && (request?.proof as PresentationJSON)?.meta) {
    value = (request.proof as PresentationJSON).meta[key];
  } else {
    value = '';
  }

  return value;
}

function TabLabel(props: {
  children: ReactNode;
  onClick: MouseEventHandler;
  active?: boolean;
}): ReactElement {
  return (
    <button
      className={c('px-1 select-none cursor-pointer font-bold', {
        'text-slate-800 border-b-2 border-green-500': props.active,
        'text-slate-400 border-b-2 border-transparent hover:text-slate-500':
          !props.active,
      })}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div>
      <div>{label}:</div>
      <div className="text-sm font-semibold whitespace-pre-wrap">
        {value || 'N/A'}
      </div>
    </div>
  );
}
