import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupServiceWorker } from './lib/pwa';
import './index.css';

setupServiceWorker();

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
