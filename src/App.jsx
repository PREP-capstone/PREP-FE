import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import InputPage from './pages/InputPage';
import ReportPassPage from './pages/ReportPassPage';
import ReportFailPage from './pages/ReportFailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/input" element={<InputPage />} />
        <Route path="/report" element={<ReportPassPage />} />
        <Route path="/report/gate-fail" element={<ReportFailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
