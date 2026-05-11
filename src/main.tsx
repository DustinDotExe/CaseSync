import { StrictMode, Suspense, lazy } from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
const App = lazy(() => import('./App.tsx'));
const LandingPage = lazy(() => import('./components/LandingPage.tsx'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy.tsx'));
const TermsOfService = lazy(() => import('./components/TermsOfService.tsx'));
const ParticipantPortal = lazy(() => import('./components/ParticipantPortal.tsx'));
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/p/:token" element={<ParticipantPortal />} />
          <Route path="*" element={<App />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
