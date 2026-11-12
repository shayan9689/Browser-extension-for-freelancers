import React from 'react';
import ReactDOM from 'react-dom/client';
import PanelApp from '../../src/sidepanel/PanelApp';
import '../sidepanel/style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PanelApp mode="popup" />
  </React.StrictMode>,
);
