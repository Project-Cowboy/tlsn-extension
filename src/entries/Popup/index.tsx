import React from 'react';

// Cowboy import
import { Toaster } from 'react-hot-toast';

import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import Popup from './Popup';
import './index.scss';
import { Provider } from 'react-redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
import store from '../../utils/store';

const container = document.getElementById('app-container');
const root = createRoot(container!); // createRoot(container!) if you use TypeScript

root.render(
  <Provider store={store}>
    <HashRouter>
      <Toaster position="top-right" />
      <Popup />
    </HashRouter>
  </Provider>,
);
