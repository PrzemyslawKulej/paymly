import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RequestFunds from './components/RequestFunds/RequestFunds';
import PayFunds from './components/payFunds/PayFunds';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RequestFunds />
    <PayFunds />
  </StrictMode>,
);
