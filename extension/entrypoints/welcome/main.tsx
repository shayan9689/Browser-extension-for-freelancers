import React from 'react';
import ReactDOM from 'react-dom/client';
import WelcomeApp from './WelcomeApp';
import '../sidepanel/style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WelcomeApp />
  </React.StrictMode>,
);
