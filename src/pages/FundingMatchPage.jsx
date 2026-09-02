import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './FeaturePages.module.css';

const grants = [
  {
    title: '지역 관광 콘텐츠 창업 지원사업',
    description: '지역 문화자원을 활용한 관광 서비스 개발과 초기 사업화 비용을 지원합니다.',
    match: '92%',
    deadline: '2026.09.16',
    amount: '최대 5,000만원',
    target: '예비창업 · 충청남도',
    tags: ['예비창업', '충청남도'],
  },
  {
    title: 'AI 활용 서비스 사업화 바우처',
    description: 'AI 기반 서비스 검증, 데이터 분석 기능 고도화에 필요한 비용을 지원합니다.',
    match: '86%',
    deadline: '2026.09.24',
    amount: '최대 3,000만원',
    target: 'AI 서비스 · 전국',
    tags: ['AI 서비스', '전국'],
  },
  {
    title: '로컬크리에이터 성장 지원',
    description: '지역성과 창의성을 기반으로 한 서비스의 시장 진입과 브랜딩을 지원합니다.',
    match: '78%',
    deadline: '2026.10.03',
    amount: '최대 4,000만원',
    target: '로컬 창업 · 지역 연계',
    tags: ['로컬 창업', '관광'],
  },
];

function getDday(deadline) {
  const [year, month, day] = deadline.split('.').map(Number);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadlineDate = new Date(year, month - 1, day);
  const diffDays = Math.ceil((deadlineDate.getTime() - todayStart.getTime()) / 86400000);

  if (Number.isNaN(diffDays)) return '마감일 확인 필요';
  if (diffDays < 0) return '마감';
  if (diffDays === 0) return '오늘 마감';
  return `${diffDays}일 남음`;
}

export default function FundingMatchPage() {
  const navigate = useNavigate();
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [showCriteria, setShowCriteria] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState('');

  const refreshMatches = () => {
    setRefreshedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <div className={styles.page}>
      <Sidebar active="funding" />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles['topbar-left']}>
            <button className={styles['back-btn']} onClick={() => navigate('/')}>
              <i className="ti ti-arrow-left"></i>메인으로 가기
            </button>
            <span className={styles['topbar-title']}>지원금 추천</span>
          </div>
          <div className={styles['top-actions']}>
            <button className={styles.btn} onClick={refreshMatches}>매칭 새로고침</button>
          </div>
        </header>

        <section className={styles.workspace}>
          <div className={styles['page-head']}>
            <div>
              <div className={styles.label}>지원금 매칭</div>
              <h1>지원금 자동매칭</h1>
              <p className={styles['head-desc']}>
                아이디어검진 리포트 또는 업로드한 PDF 내용을 기준으로 지원사업 적합도, 마감일, 지원금액, 지원대상을 비교합니다.
              </p>
            </div>
            <div className={styles['summary-grid']}>
              <div className={styles['summary-cell']}><span>추천 사업</span><b>12건</b></div>
              <div className={styles['summary-cell']}><span>최고 매칭률</span><b>92%</b></div>
            </div>
          </div>

          <div className={styles.layout}>
            <aside className={`${styles.panel} ${styles.side}`}>
              <h2 className={styles['section-title']}>분석 입력</h2>
              <div className={styles['report-chip']}>
                <div className={styles['chip-kicker']}>연결된 리포트</div>
                <div className={styles['chip-title']}>AI 기반 지역 관광 서비스 창업 리포트</div>
                <div className={styles['chip-text']}>리포트에서 추출한 카테고리, 타깃, 서비스 형태를 추천 기준으로 사용합니다.</div>
              </div>
              <label className={styles.upload}>
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => setUploadedFileName(e.target.files?.[0]?.name ?? '')}
                />
                <div className={styles['upload-icon']}>PDF</div>
                <div className={styles['upload-title']}>리포트 PDF 업로드</div>
                <div className={styles['upload-text']}>{uploadedFileName || '메인에서 진입한 경우 PDF를 올리면 추천을 시작합니다.'}</div>
              </label>
              <div className={styles.field}><label>사업 단계</label><select defaultValue="예비창업"><option>예비창업</option><option>초기창업</option><option>창업 3년 이내</option></select></div>
              <div className={styles.field}><label>지역</label><input defaultValue="충남 부여군" /></div>
              <div className={styles.field}><label>주요 키워드</label><input defaultValue="관광, AI, 모바일, AR" /></div>
              <button className={`${styles.btn} ${styles.primary}`} onClick={refreshMatches}>지원사업 다시 찾기</button>
              {refreshedAt && <div className={styles['status-message']}>목업 추천 결과를 {refreshedAt} 기준으로 다시 정렬했습니다.</div>}
            </aside>

            <section className={`${styles.panel} ${styles.content}`}>
              <div className={styles['content-head']}>
                <div><h2>추천 지원사업 리스트</h2><p>매칭률이 높은 순서로 정렬되어 있습니다.</p></div>
                <button className={styles.btn} onClick={() => setShowCriteria((value) => !value)}>
                  {showCriteria ? '매칭 기준 닫기' : '매칭 기준 보기'}
                </button>
              </div>
              {showCriteria && (
                <div className={styles['criteria-box']}>
                  <b>매칭 기준</b>
                  <span>아이디어검진 리포트의 카테고리, 타깃, 서비스 형태, 지역 키워드와 지원사업의 지원대상/분야/마감일을 비교해 목업 매칭률을 표시합니다.</span>
                </div>
              )}
              <div className={styles.metrics}>
                <div className={styles.metric}><span>추천 사업</span><b>12</b></div>
                <div className={styles.metric}><span>평균 매칭률</span><b>81%</b></div>
                <div className={styles.metric}><span>최대 지원금</span><b>5천만</b></div>
                <div className={styles.metric}><span>마감 임박</span><b>3건</b></div>
              </div>
              <div className={styles['table-head']}><div>지원사업</div><div>매칭률</div><div>마감일</div><div>지원금액</div><div>다음 단계</div></div>
              <div className={styles.list}>
                {grants.map((grant) => (
                  <article className={styles.grant} key={grant.title}>
                    <div>
                      <div className={styles['grant-title']}>{grant.title}</div>
                      <div className={styles['grant-desc']}>{grant.description}</div>
                      <div className={styles.badges}>
                        {[...grant.tags, getDday(grant.deadline)].map((tag) => <span className={`${styles.badge} ${tag.includes('남음') || tag.includes('마감') ? styles.warn : ''}`} key={tag}>{tag}</span>)}
                      </div>
                    </div>
                    <div className={styles.match}>{grant.match}</div>
                    <div className={styles['cell-main']}>{grant.deadline}<span className={styles['cell-sub']}>{getDday(grant.deadline)}</span></div>
                    <div className={styles['cell-main']}>{grant.amount}<span className={styles['cell-sub']}>{grant.target}</span></div>
                    <div className={styles['row-actions']}>
                      <button className={styles.btn} onClick={() => setSelectedGrant(grant)}>상세보기</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <div className={styles.note}>리포트 페이지에서 진입한 경우 PDF 업로드 없이 기존 리포트 분석값을 우선 사용합니다. 메인 페이지에서 진입한 경우 PDF 업로드 후 매칭 결과를 생성합니다.</div>
        </section>
      </main>
      {selectedGrant && (
        <div className={styles.overlay} role="presentation" onClick={() => setSelectedGrant(null)}>
          <section className={`${styles.modal} ${styles.small}`} role="dialog" aria-modal="true" aria-label="지원사업 상세보기" onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-head']}>
              <div>
                <div className={styles.label}>지원사업 상세</div>
                <h2>{selectedGrant.title}</h2>
              </div>
              <button className={styles.btn} onClick={() => setSelectedGrant(null)}>닫기</button>
            </div>
            <div className={styles['detail-grid']}>
              <div><span>매칭률</span><b>{selectedGrant.match}</b></div>
              <div><span>마감일</span><b>{selectedGrant.deadline}<br />{getDday(selectedGrant.deadline)}</b></div>
              <div><span>지원금액</span><b>{selectedGrant.amount}</b></div>
              <div><span>지원대상</span><b>{selectedGrant.target}</b></div>
            </div>
            <p className={styles['detail-desc']}>{selectedGrant.description}</p>
          </section>
        </div>
      )}
    </div>
  );
}
