import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './FeaturePages.module.css';
import { getFundingRecommendations } from '../api/fundingApi';

// BE(app/domain/funding_match.py)가 인식하는 사업 단계 값. 자유 텍스트라도 동작은 하지만,
// 이 값들과 겹쳐야 "사업 단계 매칭" 가점(+16)을 받는다.
const STARTUP_STAGES = ['예비창업', '초기창업', '창업도약', '재창업', '창업기업', '스타트업'];

function formatDeadline(deadline) {
  if (!deadline) return '상시모집';
  return deadline.replaceAll('-', '.');
}

function ddayLabel(deadline, daysLeft) {
  if (!deadline) return '상시모집';
  if (daysLeft === null || daysLeft === undefined) return '마감일 확인 필요';
  if (daysLeft < 0) return '마감';
  if (daysLeft === 0) return '오늘 마감';
  return `${daysLeft}일 남음`;
}

function amountLabel(item) {
  if (item.support_amount_text) return item.support_amount_text;
  if (item.max_amount) return `최대 ${item.max_amount.toLocaleString('ko-KR')}원`;
  return '금액 미정';
}

function targetLabel(item) {
  return [item.stage, item.region].filter(Boolean).join(' · ') || '지원대상 정보 없음';
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function summarizeDescription(grant) {
  const text = cleanText([grant.title, grant.description, ...(grant.keywords ?? [])].filter(Boolean).join(' '));
  if (!text) return '지원사업 핵심 내용은 상세보기에서 확인해주세요.';

  const focusRules = [
    { words: ['마케팅', '홍보', '판로', '브랜드'], label: '마케팅·판로 지원 프로그램' },
    { words: ['사업화', '시제품', '제품 개발', '제품개발', '시장진출'], label: '사업화 지원 프로그램' },
    { words: ['기술개발', 'R&D', '연구개발', '실증', 'PoC'], label: '기술개발·실증 지원 프로그램' },
    { words: ['관광', '콘텐츠', '문화'], label: '관광·콘텐츠 분야 창업 지원 프로그램' },
    { words: ['멘토링', '컨설팅', '교육', '액셀러레이팅'], label: '교육·멘토링 지원 프로그램' },
    { words: ['입주', '공간', '센터'], label: '입주공간·보육 지원 프로그램' },
    { words: ['청년'], label: '청년 창업 지원 프로그램' },
    { words: ['재창업'], label: '재창업 지원 프로그램' },
  ];

  const focus = focusRules.find((rule) => includesAny(text, rule.words))?.label || '창업기업 성장 지원 프로그램';
  const target = summarizeTarget(grant);
  const region = grant.region ? `${grant.region} 기준 ` : '';

  if (target === '지원대상 확인 필요') return `${region}${focus}`;
  return `${region}${target} 대상 ${focus}`;
}

function summarizeTarget(item) {
  const text = cleanText(targetLabel(item));
  if (!text || text === '지원대상 정보 없음') return '지원대상 확인 필요';

  const labels = [];
  if (text.includes('예비창업')) labels.push('예비창업자');
  if (text.includes('초기창업')) labels.push('초기 창업기업');
  if (text.includes('창업도약')) labels.push('도약기 창업기업');
  if (text.includes('재창업')) labels.push('재창업자');
  if (text.includes('청년')) labels.push('청년');
  if (text.includes('중소기업')) labels.push('중소기업');
  if (text.includes('소상공인')) labels.push('소상공인');
  if (text.includes('스타트업')) labels.push('스타트업');

  if (labels.length > 0) return [...new Set(labels)].slice(0, 3).join('·');
  if (item.stage) return cleanText(item.stage).split(/[,.·/]/)[0];
  if (item.region) return cleanText(item.region);
  return '지원대상 확인 필요';
}

/** recommended_at(ISO8601) → "2026.09.07 16:32" 형태로 변환. 파싱 실패 시 null. */
function formatRecommendedAt(recommendedAt) {
  if (!recommendedAt) return null;
  const date = new Date(recommendedAt);
  if (Number.isNaN(date.getTime())) return null;

  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FundingMatchPage() {
  const navigate = useNavigate();

  const [reportFile, setReportFile] = useState(null);
  const [region, setRegion] = useState('');
  const [startupStage, setStartupStage] = useState('');
  const [keywordsText, setKeywordsText] = useState('');

  const [showCriteria, setShowCriteria] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState(null);

  const [recommendations, setRecommendations] = useState([]);
  const [recommendedAt, setRecommendedAt] = useState(null);
  const [extractedProfile, setExtractedProfile] = useState(null);
  const [sourceWarnings, setSourceWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!selectedGrant) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedGrant]);

  const findFunding = async () => {
    if (!reportFile) {
      setLoadError('먼저 리포트 PDF를 업로드해주세요.');
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    // 새 요청을 시작하면 이전 결과부터 비운다 — 실패해도 지난 추천이 최신 결과처럼 남아있지 않도록.
    setRecommendations([]);
    setRecommendedAt(null);
    setExtractedProfile(null);
    setSourceWarnings([]);
    setHasSearched(false);
    try {
      const result = await getFundingRecommendations({
        file: reportFile,
        region,
        startupStage,
        keywords: keywordsText,
        topK: 12,
      });
      setRecommendations(result?.recommendations ?? []);
      setRecommendedAt(result?.recommended_at ?? null);
      setExtractedProfile(result?.extracted_profile ?? null);
      setSourceWarnings(result?.source_warnings ?? []);
      setHasSearched(true);
    } catch (err) {
      setLoadError(err.message || '지원사업 추천 정보를 불러오지 못했어요.');
    } finally {
      setIsLoading(false);
    }
  };

  const recommendedAtLabel = formatRecommendedAt(recommendedAt);
  const matchScores = recommendations.map((g) => g.match_score).filter((n) => typeof n === 'number');
  const maxMatch = matchScores.length ? Math.max(...matchScores) : null;
  const avgMatch = matchScores.length ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) : null;
  const maxAmount = recommendations.map((g) => g.max_amount).filter((n) => typeof n === 'number');
  const maxAmountLabel = maxAmount.length ? `${Math.round(Math.max(...maxAmount) / 10000).toLocaleString('ko-KR')}만원` : '-';
  const closingSoonCount = recommendations.filter((g) => g.days_left !== null && g.days_left !== undefined && g.days_left <= 7).length;

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
            <button className={styles.btn} onClick={findFunding} disabled={isLoading}>
              {isLoading ? '불러오는 중...' : '매칭 새로고침'}
            </button>
          </div>
        </header>

        <section className={`${styles.workspace} ${styles['funding-workspace']}`}>
          <div className={styles['page-head']}>
            <div>
              <div className={styles.label}>지원금 매칭</div>
              <h1>지원금 자동매칭</h1>
              <p className={styles['head-desc']}>
                업로드한 아이디어검진 리포트 PDF 내용을 기준으로 지원사업 적합도, 마감일, 지원금액, 지원대상을 비교합니다.
              </p>
            </div>
            <div className={styles['summary-grid']}>
              <div className={styles['summary-cell']}><span>추천 사업</span><b>{recommendations.length}건</b></div>
              <div className={styles['summary-cell']}><span>최고 매칭률</span><b>{maxMatch !== null ? `${maxMatch}%` : '-'}</b></div>
            </div>
          </div>

          <div className={`${styles.layout} ${styles['funding-layout']}`}>
            <aside className={`${styles.panel} ${styles.side}`}>
              <h2 className={styles['section-title']}>분석 입력</h2>
              <div className={styles['report-chip']}>
                <div className={styles['chip-kicker']}>업로드한 리포트에서 인식된 정보</div>
                <div className={styles['chip-title']}>{extractedProfile?.service_name || '아직 업로드된 리포트가 없어요'}</div>
                <div className={styles['chip-text']}>
                  {extractedProfile
                    ? [extractedProfile.category_1, extractedProfile.category_2, extractedProfile.service_type].filter(Boolean).join(' · ') || '카테고리/서비스 형태를 인식하지 못했어요.'
                    : 'PDF를 업로드하고 지원사업을 찾으면 리포트에서 추출한 카테고리, 타깃, 서비스 형태가 여기 표시됩니다.'}
                </div>
              </div>
              <label className={styles.upload}>
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
                />
                <div className={styles['upload-icon']}>PDF</div>
                <div className={styles['upload-title']}>리포트 PDF 업로드</div>
                <div className={styles['upload-text']}>{reportFile?.name || '리포트 페이지에서 저장한 PDF를 올리면 추천을 시작합니다.'}</div>
              </label>
              <div className={styles.field}>
                <label>사업 단계</label>
                <select value={startupStage} onChange={(e) => setStartupStage(e.target.value)}>
                  <option value="">선택 안 함</option>
                  {STARTUP_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>지역</label>
                <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: 충남 부여군 (입력 안 하면 PDF에서 자동 인식)" />
              </div>
              <div className={styles.field}>
                <label>주요 키워드</label>
                <input value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} placeholder="쉼표로 구분해서 입력" />
              </div>
              <button className={`${styles.btn} ${styles.primary}`} onClick={findFunding} disabled={isLoading}>
                {isLoading ? '지원사업 찾는 중...' : '지원사업 다시 찾기'}
              </button>
              {loadError && <div className={`${styles['status-message']} ${styles.error}`}>{loadError}</div>}
              {sourceWarnings.length > 0 && (
                <div className={styles['status-message']}>일부 공고 출처를 불러오지 못했어요: {sourceWarnings.join(', ')}</div>
              )}
            </aside>

            <section className={`${styles.panel} ${styles.content} ${styles['funding-results']}`}>
              <div className={styles['content-head']}>
                <div>
                  <h2>추천 지원사업 리스트</h2>
                  <p>매칭률이 높은 순서로 정렬되어 있습니다.</p>
                </div>
                <button className={styles.btn} onClick={() => setShowCriteria((value) => !value)}>
                  {showCriteria ? '매칭 기준 닫기' : '매칭 기준 보기'}
                </button>
              </div>
              {recommendedAtLabel && (
                <div className={`${styles['status-message']} ${styles.basis}`}>
                  {recommendedAtLabel} 기준으로 모집 중인 지원사업을 찾아드립니다.
                </div>
              )}
              {showCriteria && (
                <div className={styles['criteria-box']}>
                  <b>매칭 기준</b>
                  <span>업로드한 리포트에서 추출한 카테고리, 타깃, 서비스 형태, 키워드와 지원사업의 지원대상/분야/마감일을 비교해 매칭률을 표시합니다. 지원사업 다시 찾기를 누른 시점 기준으로 마감되지 않은 공고만 추천합니다.</span>
                </div>
              )}
              <div className={styles.metrics}>
                <div className={styles.metric}><span>추천 사업</span><b>{recommendations.length}</b></div>
                <div className={styles.metric}><span>평균 매칭률</span><b>{avgMatch !== null ? `${avgMatch}%` : '-'}</b></div>
                <div className={styles.metric}><span>최대 지원금</span><b>{maxAmountLabel}</b></div>
                <div className={styles.metric}><span>마감 임박</span><b>{closingSoonCount}건</b></div>
              </div>
              <div className={styles['table-head']}><div>지원사업</div><div>매칭률</div><div>마감일</div><div>지원금액</div><div>다음 단계</div></div>
              <div className={styles.list}>
                {recommendations.map((grant) => (
                  <article className={styles.grant} key={grant.program_id}>
                    <div>
                      <div className={styles['grant-title']}>{grant.title}</div>
                      <div className={styles['grant-desc']}>{summarizeDescription(grant)}</div>
                      <div className={styles.badges}>
                        {[...grant.keywords.slice(0, 3), ddayLabel(grant.deadline, grant.days_left)].map((tag) => (
                          <span className={`${styles.badge} ${tag.includes('남음') || tag.includes('마감') ? styles.warn : ''}`} key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.match}>{grant.match_score}%</div>
                    <div className={styles['cell-main']}>{formatDeadline(grant.deadline)}<span className={styles['cell-sub']}>{ddayLabel(grant.deadline, grant.days_left)}</span></div>
                    <div className={styles['cell-main']}>{amountLabel(grant)}<span className={styles['cell-sub']}>{summarizeTarget(grant)}</span></div>
                    <div className={styles['row-actions']}>
                      <button className={styles.btn} onClick={() => setSelectedGrant(grant)}>상세보기</button>
                    </div>
                  </article>
                ))}
                {!isLoading && hasSearched && recommendations.length === 0 && (
                  <div className={styles['status-message']}>지금 기준으로 추천할 수 있는 지원사업이 없어요. 조건을 바꿔서 다시 찾아보세요.</div>
                )}
              </div>
            </section>
          </div>
          <div className={styles.note}>리포트 페이지에서 저장한 PDF를 업로드하면, 그 시점 기준으로 마감되지 않은 지원사업을 찾아드립니다.</div>
        </section>
      </main>
      {selectedGrant && (
        <div className={styles.overlay} role="presentation" onClick={() => setSelectedGrant(null)}>
          <section className={`${styles.modal} ${styles.wideModal} ${styles.scrollable}`} role="dialog" aria-modal="true" aria-label="지원사업 상세보기" onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-head']}>
              <div>
                <div className={styles.label}>지원사업 상세</div>
                <h2>{selectedGrant.title}</h2>
              </div>
              <button className={styles.btn} onClick={() => setSelectedGrant(null)}>닫기</button>
            </div>
            <div className={styles['detail-grid']}>
              <div><span>매칭률</span><b>{selectedGrant.match_score}%</b></div>
              <div><span>마감일</span><b>{formatDeadline(selectedGrant.deadline)}<br />{ddayLabel(selectedGrant.deadline, selectedGrant.days_left)}</b></div>
              <div><span>지원금액</span><b>{amountLabel(selectedGrant)}</b></div>
              <div><span>지원대상</span><b>{targetLabel(selectedGrant)}</b></div>
            </div>
            <p className={styles['detail-desc']}>{selectedGrant.description}</p>
            {selectedGrant.matched_reasons?.length > 0 && (
              <div className={styles['criteria-box']}>
                <b>추천 이유</b>
                <span>{selectedGrant.matched_reasons.join(' ')}</span>
              </div>
            )}
            {selectedGrant.source_url && (
              <a className={`${styles.btn} ${styles['source-link']}`} href={selectedGrant.source_url} target="_blank" rel="noreferrer">
                공고 원문 보기
              </a>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
