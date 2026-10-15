import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/pwa';

// Register service worker for PWA capabilities & offline support
registerServiceWorker();

// Guard against recursive mounting inside note preview iframes
const isNestedApp = (() => {
  try {
    return (
      typeof window !== 'undefined' &&
      window.parent !== window &&
      Boolean((window.parent as any)?.__PERSONAL_NOTES_ROOT__)
    );
  } catch (e) {
    return false;
  }
})();

if (!isNestedApp && typeof window !== 'undefined') {
  (window as any).__PERSONAL_NOTES_ROOT__ = true;
}

if (!isNestedApp) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

