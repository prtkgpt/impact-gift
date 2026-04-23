// Force rebuild: 2026-01-08T15:00:00Z
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Hide initial loader once React starts rendering
document.body.classList.add('loaded');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
