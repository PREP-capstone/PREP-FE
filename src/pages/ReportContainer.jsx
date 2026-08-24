import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReportPage from './ReportPage';
import { loadReport } from '../utils/sessionStore';
import styles from './ReportPage.module.css';

// /report/:sessionId
// 지금은 백엔드와 통신하지 않고, InputPage에서 로컬로 판정해 sessionStorage에 저장해둔 리포트를 읽어온다.
// 실제 백엔드 연동 시에는 loadReport(sessionId) 대신 src/api/analysisApi.js의 evaluateSession(sessionId)를
// 호출하도록 이 부분만 바꾸면 된다 (ReportPage가 받는 데이터 형태는 이미 실제 API 응답과 동일하게 맞춰둠).
export default function ReportContainer() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const report = loadReport(sessionId);
    if (report) {
      setData(report);
      setError(null);
    } else {
      setError('리포트를 찾을 수 없어요. 새로고침했거나 만료된 세션일 수 있어요.');
    }
  }, [sessionId]);

  if (error) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ marginBottom: 16, color: '#c0392b', fontSize: 14 }}>{error}</p>
        <button className={styles['nav-btn']} onClick={() => navigate('/input')}>
          검진 다시 하기
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: '#666', fontSize: 14 }}>
        리포트를 불러오는 중이에요...
      </div>
    );
  }

  return <ReportPage data={data} />;
}
