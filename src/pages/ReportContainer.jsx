import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReportPage from './ReportPage';
import { evaluateSession } from '../api/analysisApi';
import { loadReportCache, saveReportCache } from '../utils/reportCache';
import styles from './ReportPage.module.css';

// /report/:sessionId
// 리포트 화면이 evaluate 호출의 단일 책임을 가진다.
// InputPage는 세션/검진 데이터 저장 후 /report/:sessionId 로 이동만 하면 된다.
const pendingReports = new Map();

function loadEvaluateReport(sessionId) {
  const pending = pendingReports.get(sessionId);
  if (pending) return pending;

  const cached = loadReportCache(sessionId);
  if (cached) return Promise.resolve(cached);

  const promise = evaluateSession(sessionId)
    .then((report) => {
      saveReportCache(sessionId, report);
      return report;
    })
    .finally(() => {
      if (pendingReports.get(sessionId) === promise) {
        pendingReports.delete(sessionId);
      }
    });

  pendingReports.set(sessionId, promise);
  return promise;
}

export default function ReportContainer() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setError('분석 세션 정보가 없어요. 검진을 다시 시작해주세요.');
      setData(null);
      return;
    }

    let cancelled = false;
    setData(null);
    setError(null);

    loadEvaluateReport(sessionId)
      .then((report) => {
        if (cancelled) return;
        setData(report);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || '리포트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, retryKey]);

  function retryLoad() {
    if (sessionId) pendingReports.delete(sessionId);
    setRetryKey((key) => key + 1);
  }

  if (error) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ marginBottom: 16, color: '#c0392b', fontSize: 14 }}>{error}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button className={styles['nav-btn']} onClick={retryLoad}>
            다시 불러오기
          </button>
          <button className={styles['nav-btn']} onClick={() => navigate('/input')}>
            검진 다시 하기
          </button>
        </div>
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
