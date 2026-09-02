import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import InputPage from './pages/InputPage';
import ReportContainer from './pages/ReportContainer';
import ReportPassPage from './pages/ReportPassPage';
import ReportFailPage from './pages/ReportFailPage';
import HelpPage from './pages/HelpPage';
import PrivacyPage from './pages/PrivacyPage';
import FundingMatchPage from './pages/FundingMatchPage';
import ProposalWriterPage from './pages/ProposalWriterPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/input" element={<InputPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/funding-match" element={<FundingMatchPage />} />
        <Route path="/proposal-writer" element={<ProposalWriterPage />} />
        {/* 실제 백엔드 연동 리포트 — 검진 제출 후 이 경로로 이동 */}
        <Route path="/report/:sessionId" element={<ReportContainer />} />
        {/* 목업 데이터 미리보기 (디자인 확인용, 백엔드 없이도 접속 가능) */}
        <Route path="/report/preview/pass" element={<ReportPassPage />} />
        <Route path="/report/preview/fail" element={<ReportFailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
