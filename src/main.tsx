import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';
import './index.css';

const isPrivacyPage = window.location.pathname === '/privacy' || window.location.pathname === '/privacy/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPrivacyPage ? <PrivacyPolicy /> : <App />}
  </StrictMode>,
);
