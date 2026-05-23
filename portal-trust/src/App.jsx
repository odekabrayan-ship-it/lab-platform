import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TrustHome from './pages/TrustHome';
import SealVerification from './pages/SealVerification';
import ReportVerification from './pages/ReportVerification';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TrustHome />} />
        <Route path="/verify/:code" element={<SealVerification />} />
        <Route path="/report" element={<ReportVerification />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
