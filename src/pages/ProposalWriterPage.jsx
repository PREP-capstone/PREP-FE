import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './FeaturePages.module.css';

const progressRows = [
  ['사업 개요', '자동 입력'],
  ['문제 정의', '자동 입력'],
  ['시장 분석', '자동 입력'],
  ['수익 모델', '입력 필요'],
  ['예산 계획', '입력 필요'],
];

function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function createInitialDraft() {
  return {
  title: 'AI 기반 지역 관광 콘텐츠 서비스 사업계획서',
  grantName: '',
  createdAt: formatDate(),
  companyName: '',
  representative: '',
  overview: '본 사업은 지역 역사문화 자원을 모바일 기반 AR 콘텐츠와 오디오 가이드로 재해석하여, 방문객이 현장에서 몰입형 관광 경험을 할 수 있도록 돕는 서비스입니다.',
  problem: '지역 문화유산 관광은 정보 전달 방식이 정적이고, 젊은 방문객이 지속적으로 흥미를 느끼기 어렵다는 문제가 있습니다. 또한 방문 이후에도 관광 경험이 기록되거나 공유되는 구조가 부족합니다.',
  features: 'AR 오버레이, 다국어 오디오 가이드, 역사 인물 도감, 인물 셀카 촬영, 앨범 및 콜라주 저장 기능',
  customers: '지역 관광객, 역사문화 체험 방문객, 가족 단위 여행객, 외국인 관광객',
  differentiation: '현장 위치 기반 콘텐츠와 사용자의 사진 기록을 연결해 관광 경험을 개인화합니다.',
  market: '지역 관광 콘텐츠 시장은 체험형, 기록형, 공유형 서비스 중심으로 확장되고 있습니다. 모바일 기반 관광 안내와 AR 콘텐츠는 방문객의 체류 시간과 재방문 가능성을 높일 수 있습니다.',
  businessModel: '',
  budget: '',
  };
}

const exportOptions = [
  { value: 'pdf', label: 'PDF로 저장' },
  { value: 'word', label: 'Word(.doc)로 저장' },
  { value: 'hangul', label: '한글 호환 HTML로 저장' },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function ProposalWriterPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => {
    try {
      const saved = localStorage.getItem('prep-proposal-draft');
      return saved ? { ...createInitialDraft(), ...JSON.parse(saved) } : createInitialDraft();
    } catch {
      return createInitialDraft();
    }
  });
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [exportType, setExportType] = useState('pdf');
  const [statusMessage, setStatusMessage] = useState('');

  const htmlDocument = useMemo(() => `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(draft.title || '창업 제안서')}</title>
        <style>
          body { font-family: "Noto Sans KR", Arial, sans-serif; color: #111; line-height: 1.7; padding: 36px; }
          h1 { text-align: center; font-size: 24px; border-bottom: 2px solid #111; padding-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; margin: 24px 0; }
          th, td { border: 1px solid #d8d8d8; padding: 10px 12px; font-size: 13px; }
          th { width: 120px; background: #f5f5f5; }
          h2 { margin-top: 28px; font-size: 18px; }
          p { white-space: pre-wrap; }
          .blank { color: #8a5a00; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(draft.title || '창업 제안서')}</h1>
        <table>
          <tr><th>지원사업</th><td>${escapeHtml(draft.grantName || '입력 필요')}</td><th>작성일</th><td>${escapeHtml(draft.createdAt)}</td></tr>
          <tr><th>기업명</th><td>${escapeHtml(draft.companyName || '입력 필요')}</td><th>대표자</th><td>${escapeHtml(draft.representative || '입력 필요')}</td></tr>
        </table>
        <h2>1. 사업 개요</h2><p>${escapeHtml(draft.overview)}</p>
        <h2>2. 문제 정의</h2><p>${escapeHtml(draft.problem)}</p>
        <h2>3. 서비스 내용</h2>
        <table>
          <tr><th>핵심 기능</th><td>${escapeHtml(draft.features)}</td></tr>
          <tr><th>대상 고객</th><td>${escapeHtml(draft.customers)}</td></tr>
          <tr><th>차별점</th><td>${escapeHtml(draft.differentiation)}</td></tr>
        </table>
        <h2>4. 시장 및 고객 분석</h2><p>${escapeHtml(draft.market)}</p>
        <h2>5. 수익 모델</h2><p class="${draft.businessModel ? '' : 'blank'}">${escapeHtml(draft.businessModel || '입력 필요')}</p>
        <h2>6. 예산 계획</h2><p class="${draft.budget ? '' : 'blank'}">${escapeHtml(draft.budget || '입력 필요')}</p>
      </body>
    </html>
  `, [draft]);

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetDraft = () => {
    setDraft(createInitialDraft());
    localStorage.removeItem('prep-proposal-draft');
    setStatusMessage('제안서 초안을 초기 상태로 되돌렸습니다.');
  };

  const saveDraft = () => {
    localStorage.setItem('prep-proposal-draft', JSON.stringify(draft));
    setStatusMessage('현재 브라우저에 제안서 초안을 저장했습니다.');
  };

  const downloadBlob = (content, mimeType, filename) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportDraft = () => {
    if (exportType === 'pdf') {
      const printWindow = window.open('', '_blank', 'width=960,height=720');
      if (!printWindow) {
        setStatusMessage('팝업이 차단되어 PDF 저장 창을 열 수 없습니다.');
        return;
      }
      printWindow.document.write(htmlDocument);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setStatusMessage('인쇄 창에서 PDF로 저장을 선택해주세요.');
      return;
    }

    if (exportType === 'word') {
      downloadBlob(`\ufeff${htmlDocument}`, 'application/msword;charset=utf-8', 'prep-proposal.doc');
      setStatusMessage('Word 파일을 다운로드했습니다.');
      return;
    }

    downloadBlob(`\ufeff${htmlDocument}`, 'text/html;charset=utf-8', 'prep-proposal-hangul-compatible.html');
    setStatusMessage('한글에서 열 수 있는 HTML 문서를 다운로드했습니다.');
  };

  return (
    <div className={styles.page}>
      <Sidebar active="proposal" />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles['topbar-left']}>
            <button className={styles['back-btn']} onClick={() => navigate('/')}>
              <i className="ti ti-arrow-left"></i>메인으로 가기
            </button>
            <span className={styles['topbar-title']}>창업 제안서 자동 작성</span>
          </div>
          <div className={styles['top-actions']}>
            <button className={styles.btn} onClick={() => setShowPreview(true)}>미리보기</button>
            <select className={styles['export-select']} value={exportType} onChange={(e) => setExportType(e.target.value)}>
              {exportOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
            <button className={`${styles.btn} ${styles.primary}`} onClick={exportDraft}>내보내기</button>
          </div>
        </header>

        <section className={`${styles.workspace} ${styles.wide}`}>
          <div className={styles['page-head']}>
            <div>
              <div className={styles.label}>제안서 작성</div>
              <h1>제안서 자동 작성</h1>
              <p className={styles['head-desc']}>
                리포트 PDF를 업로드하면 아이디어검진 결과에서 채울 수 있는 항목을 사업계획서 형식으로 정리하고, 부족한 항목은 입력 필요 상태로 남깁니다.
              </p>
            </div>
            <div className={styles['summary-grid']}>
              <div className={styles['summary-cell']}><span>자동 작성률</span><b>72%</b></div>
              <div className={styles['summary-cell']}><span>입력 필요</span><b>4개</b></div>
            </div>
          </div>

          <div className={`${styles.layout} ${styles.proposal}`}>
            <aside className={`${styles.panel} ${styles.side}`}>
              <h2 className={styles['section-title']}>작성 설정</h2>
              <label className={styles.upload}>
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => setUploadedFileName(e.target.files?.[0]?.name ?? '')}
                />
                <div className={styles['upload-icon']}>PDF</div>
                <div className={styles['upload-title']}>리포트 PDF 업로드</div>
                <div className={styles['upload-text']}>{uploadedFileName || '검진 리포트를 기준으로 제안서 초안을 작성합니다.'}</div>
              </label>
              <div className={styles.field}><label>문서 유형</label><select defaultValue="창업 지원사업 사업계획서"><option>창업 지원사업 사업계획서</option><option>정부지원금 제안서</option><option>투자 검토용 제안서</option></select></div>
              <div className={styles.field}><label>지원사업명</label><input value={draft.grantName} placeholder="입력 필요" onChange={(e) => updateDraft('grantName', e.target.value)} /></div>
              <div className={styles.field}><label>기업명</label><input value={draft.companyName} placeholder="입력 필요" onChange={(e) => updateDraft('companyName', e.target.value)} /></div>
              <div className={styles['progress-list']}>
                {progressRows.map(([label, state]) => (
                  <div className={styles['progress-row']} key={label}>
                    {label}
                    <span className={`${styles.state} ${state === '입력 필요' ? styles.need : ''}`}>{state}</span>
                  </div>
                ))}
              </div>
              <button className={`${styles.btn} ${styles.primary}`} onClick={resetDraft}>초안 다시 작성</button>
            </aside>

            <section className={`${styles.panel} ${styles.editor}`}>
              <div className={styles['content-head']}>
                <div><h2>제안서 편집</h2><p>자동 작성된 문구를 바로 수정하고 빈칸을 채울 수 있습니다.</p></div>
                <button className={styles.btn} onClick={() => setShowPreview(true)}>입력 필요 확인</button>
              </div>
              <div className={styles['paper-area']}>
                <article className={styles.paper}>
                  {statusMessage && <div className={styles['status-message']}>{statusMessage}</div>}
                  <div className={styles['doc-title']}><input value={draft.title} onChange={(e) => updateDraft('title', e.target.value)} /></div>
                  <div className={styles['meta-table']}>
                    <div className={styles.th}>지원사업</div><div className={`${styles.td} ${!draft.grantName ? styles.blank : ''}`}><input value={draft.grantName} placeholder="입력 필요" onChange={(e) => updateDraft('grantName', e.target.value)} /></div>
                    <div className={styles.th}>작성일</div><div className={styles.td}><input value={draft.createdAt} onChange={(e) => updateDraft('createdAt', e.target.value)} /></div>
                    <div className={styles.th}>기업명</div><div className={`${styles.td} ${!draft.companyName ? styles.blank : ''}`}><input value={draft.companyName} placeholder="입력 필요" onChange={(e) => updateDraft('companyName', e.target.value)} /></div>
                    <div className={styles.th}>대표자</div><div className={`${styles.td} ${!draft.representative ? styles.blank : ''}`}><input value={draft.representative} placeholder="입력 필요" onChange={(e) => updateDraft('representative', e.target.value)} /></div>
                  </div>

                  <section className={styles['doc-section']}><h3><span className={styles.num}>1</span>사업 개요</h3><textarea value={draft.overview} onChange={(e) => updateDraft('overview', e.target.value)} /></section>
                  <section className={styles['doc-section']}><h3><span className={styles.num}>2</span>문제 정의</h3><textarea value={draft.problem} onChange={(e) => updateDraft('problem', e.target.value)} /></section>
                  <section className={styles['doc-section']}>
                    <h3><span className={styles.num}>3</span>서비스 내용</h3>
                    <div className={styles['doc-table']}>
                      <div className={styles['doc-row']}><div className={styles['cell-head']}>핵심 기능</div><div className={styles.cell}><textarea value={draft.features} onChange={(e) => updateDraft('features', e.target.value)} /></div></div>
                      <div className={styles['doc-row']}><div className={styles['cell-head']}>대상 고객</div><div className={styles.cell}><textarea value={draft.customers} onChange={(e) => updateDraft('customers', e.target.value)} /></div></div>
                      <div className={styles['doc-row']}><div className={styles['cell-head']}>차별점</div><div className={styles.cell}><textarea value={draft.differentiation} onChange={(e) => updateDraft('differentiation', e.target.value)} /></div></div>
                    </div>
                  </section>
                  <section className={styles['doc-section']}><h3><span className={styles.num}>4</span>시장 및 고객 분석</h3><textarea value={draft.market} onChange={(e) => updateDraft('market', e.target.value)} /></section>
                  <section className={styles['doc-section']}><h3><span className={styles.num}>5</span>수익 모델</h3><textarea className={!draft.businessModel ? styles.blank : ''} value={draft.businessModel} placeholder="리포트 내용만으로 판단하기 어려워 추가 입력이 필요합니다." onChange={(e) => updateDraft('businessModel', e.target.value)} /><p className={styles.hint}>리포트에 가격 정책과 매출 가정이 없어 입력 필요 상태로 남겼습니다.</p></section>
                  <section className={styles['doc-section']}><h3><span className={styles.num}>6</span>예산 계획</h3><textarea className={!draft.budget ? styles.blank : ''} value={draft.budget} placeholder="인건비, 외주용역비, 홍보비, 서버 운영비 등을 입력하세요." onChange={(e) => updateDraft('budget', e.target.value)} /><p className={styles.hint}>지원사업 양식에 맞는 세부 금액 입력이 필요합니다.</p></section>
                  <div className={styles.bottom}>
                    <button className={styles.btn} onClick={resetDraft}>초기화</button>
                    <button className={styles.btn} onClick={saveDraft}>저장</button>
                    <select className={styles['export-select']} value={exportType} onChange={(e) => setExportType(e.target.value)}>
                      {exportOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                    </select>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={exportDraft}>내보내기</button>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </section>
      </main>
      {showPreview && (
        <div className={styles.overlay} role="presentation" onClick={() => setShowPreview(false)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-label="제안서 미리보기" onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-head']}>
              <div>
                <div className={styles.label}>미리보기</div>
                <h2>제안서 미리보기</h2>
              </div>
              <button className={styles.btn} onClick={() => setShowPreview(false)}>닫기</button>
            </div>
            <iframe className={styles.preview} title="제안서 미리보기" srcDoc={htmlDocument} />
          </section>
        </div>
      )}
    </div>
  );
}
