import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getUiPathAuthSetup } from './config/uipath';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

const authSetup = getUiPathAuthSetup();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider config={authSetup.config} missingFields={authSetup.missingFields}>
      <App />
    </AuthProvider>
  </StrictMode>,
);
