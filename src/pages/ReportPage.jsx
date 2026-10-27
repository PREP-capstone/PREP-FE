import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cx } from '../utils/cx';
import { downloadAnalysisReportPdf } from '../api/analysisApi';
import { getApiErrorCode, API_ERROR_CODES } from '../api/errors';
import styles from './ReportPage.module.css';

// 이 페이지는 백엔드 POST /api/v1/analysis/evaluate 의 응답(EvaluateResult)을 그대로 받는다.
// 형태: { session, gate, regulatory_risk, correction_candidates,
//         data_feasibility, market_feasibility, business_model,
//         section_links, next_actions }
// GATE FAIL이면 data_feasibility/market_feasibility/business_model이 null로 온다.

// 화면 맨 아래 주의 문구. 한 줄 요약은 항상 보이고, 누르면 요약에 없는 나머지 안내(DETAIL)만 이어서 펼쳐진다.
const AI_NOTICE_SUMMARY = '이 리포트는 AI와 자체 데이터를 바탕으로 만든 참고 자료입니다. 검증 후 활용하세요.';
const AI_NOTICE_DETAIL =
  '틀린 내용이 있을 수 있으니, 중요한 결정을 내리실 때는 꼭 한 번 더 직접 확인하세요. 저희 DB에 비슷한 서비스가 보이지 않더라도 지식재산권 문제가 없다는 뜻은 아니니, 출시 전에는 전문가와 함께 살펴보세요.';

const TABS = [
  { id: 'r', label: '규제 위험도' },
  { id: 'd', label: '데이터 확보' },
  { id: 'm', label: '시장 현실성' },
  { id: 'b', label: '수익 구조' },
];

const DATA_SCORE_ROWS = [
  ['라이프스타일 × 수동입력', 1, '쉬움'],
  ['라이프스타일 × OS연동', 2, '쉬움'],
  ['라이프스타일 × 기기연동', 4, '보통'],
  ['라이프스타일 × 기관연동', 10, '보통'],
  ['생체지표 × 수동입력', 3, '쉬움'],
  ['생체지표 × OS연동', 6, '보통'],
  ['생체지표 × 기기연동', 12, '어려움'],
  ['생체지표 × 기관연동', 30, '어려움'],
];

const MATCH_SCOPE_DESCRIPTIONS = {
  exact_match: '카테고리, 세부 기능, 타깃, 서비스 형태가 모두 같은 선례를 기준으로 비교했습니다.',
  relaxed_service_type: '서비스 형태는 제외하고 카테고리, 세부 기능, 타깃이 같은 선례를 기준으로 비교했습니다.',
  relaxed_category_only: '타깃과 서비스 형태는 제외하고 카테고리와 세부 기능이 같은 선례를 기준으로 비교했습니다.',
  insufficient_data: '비교 기준에 맞는 선례가 없어 매칭 범위를 정하지 못했습니다.',
  target_only: '타깃이 같은 선례를 기준으로 참고했습니다.',
  category_only: '카테고리가 같은 선례를 기준으로 참고했습니다.',
  service_type_only: '서비스 형태가 같은 선례를 기준으로 참고했습니다.',
};

const MATCH_SCOPE_FALLBACKS = [
  ['exact', MATCH_SCOPE_DESCRIPTIONS.exact_match],
  ['정확', MATCH_SCOPE_DESCRIPTIONS.exact_match],
  ['서비스유형', MATCH_SCOPE_DESCRIPTIONS.relaxed_service_type],
  ['service_type', MATCH_SCOPE_DESCRIPTIONS.relaxed_service_type],
  ['category', MATCH_SCOPE_DESCRIPTIONS.relaxed_category_only],
  ['카테고리', MATCH_SCOPE_DESCRIPTIONS.relaxed_category_only],
  ['target', MATCH_SCOPE_DESCRIPTIONS.target_only],
  ['타깃', MATCH_SCOPE_DESCRIPTIONS.target_only],
  ['타겟', MATCH_SCOPE_DESCRIPTIONS.target_only],
  ['insufficient', MATCH_SCOPE_DESCRIPTIONS.insufficient_data],
  ['데이터 부족', MATCH_SCOPE_DESCRIPTIONS.insufficient_data],
];

// 경쟁사 매칭이 insufficient_data일 때만 시장 현실성 탭에 추가로 보여주는 안내 문구.
const MARKET_NO_MATCH_NOTICE =
  '현재 DB에서는 유사한 서비스를 찾지 못했습니다. 경쟁자가 없다는 뜻이 아니라 아직 수집되지 않았을 수 있으니, 직접 시장 조사를 함께 진행하세요.';
// 같은 상태(매칭 결과 없음)를 화면 여러 곳에서 같은 말로 보여주기 위한 문구.
const MARKET_UNDETERMINED_LABEL = '판정 불가';
const PLATFORM_UNDETERMINED_SUMMARY = '유사 서비스를 찾지 못해 플랫폼 경쟁 여부는 확인할 수 없습니다.';

// 백엔드가 내려주는 등급 문자열(낮음/중간/높음, LOW/MEDIUM/HIGH 등)을 화면용 level 코드로 정규화
function formatExpiry(value) {
  // 만료 시각(ms 또는 파싱 가능한 값)을 "0000-00-00 00:00" 형식으로 표시.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toLevel(grade) {
  if (!grade) return null;
  const v = String(grade).toUpperCase();
  if (['낮음', 'LOW', '쉬움'].includes(grade) || v === 'LOW') return 'low';
  if (['중간', 'MEDIUM', '보통'].includes(grade) || v === 'MEDIUM') return 'mid';
  if (['높음', 'HIGH', '어려움'].includes(grade) || v === 'HIGH') return 'high';
  return 'mid';
}
function levelLabel(level) {
  return level === 'high' ? '높음' : level === 'low' ? '낮음' : '중간';
}
// 종합 신호등(빨강/노랑/초록) → 배지 색상 세트. 배경은 연하게, 글씨/점은 진하게.
function signalStyle(signal) {
  switch (signal) {
    case '초록':
      return { key: 'green', bg: '#eafbea', fg: '#1e6b1e', dot: '#2a7a2a' };
    case '노랑':
      return { key: 'yellow', bg: '#fef9e7', fg: '#8a5a00', dot: '#e0a400' };
    case '빨강':
      return { key: 'red', bg: '#fdecea', fg: '#a5281b', dot: '#c0392b' };
    default:
      return { key: 'none', bg: '#f2f2f2', fg: '#555', dot: '#999' };
  }
}
function dataDifficultyLabel(level) {
  return level === 'high' ? '어려움' : level === 'low' ? '쉬움' : '보통';
}
function dataAvailabilityLevel(riskLevel) {
  if (riskLevel === 'low') return 'high';
  if (riskLevel === 'high') return 'low';
  return riskLevel;
}
function dataAvailabilityLabel(level) {
  return level === 'high' ? '높음' : level === 'low' ? '낮음' : '중간';
}
function platformCompetitorStatus(value) {
  if (value === true) return { label: '존재함', level: 'risky' };
  if (value === false) return { label: '없음', level: 'safe' };
  return { label: '확인 필요', level: 'unknown' };
}
function matchScopeDescription(...values) {
  const raw = values.find(Boolean);
  if (!raw) return '카테고리, 세부 기능, 타깃이 유사한 서비스 선례를 기준으로 비교했습니다.';

  const text = String(raw).trim();
  if (!text) return '카테고리, 세부 기능, 타깃이 유사한 서비스 선례를 기준으로 비교했습니다.';
  if (MATCH_SCOPE_DESCRIPTIONS[text]) return MATCH_SCOPE_DESCRIPTIONS[text];
  if (/[.?!요다습니다]$/.test(text) && text.length > 18) return text;

  const normalized = text.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  const fallback = MATCH_SCOPE_FALLBACKS.find(([key]) => normalized.includes(key.toLowerCase()));
  return fallback?.[1] || `${text} 기준으로 확인된 선례를 참고했습니다.`;
}
// 셋 중 가장 위험한(높은) 등급 채택 — db_구축_설계서.md "최고값 채택" 원칙
function maxLevel(...levels) {
  const order = { low: 0, mid: 1, high: 2 };
  return levels.filter(Boolean).reduce((acc, cur) => (order[cur] > order[acc] ? cur : acc), 'low');
}

function ExpandableText({ children, className, contentTag: ContentTag = 'div', contentProps }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${className} ${styles['expandable-text']} ${expanded ? styles.expanded : ''}`}>
      <ContentTag className={styles['expandable-content']} {...contentProps}>{children}</ContentTag>
      <button
        type="button"
        className={styles['expandable-toggle']}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? '접기' : '더보기'}
        <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true"></i>
      </button>
    </div>
  );
}

export default function ReportPage({ data, expiresAt = null }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('r');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [pdfErrorCode, setPdfErrorCode] = useState(null);

  const {
    session = {},
    gate = {},
    regulatory_risk: reg = {},
    correction_candidates: correctionData = {},
    data_feasibility: dataFeas,
    market_feasibility: marketFeas,
    business_model: bm,
    overall_signal: overallSignal,
    overall_summary: overallSummary,
    one_liner: oneLiner,
    next_actions: nextActions = [],
  } = data || {};

  const isFail = gate.verdict === 'FAIL';
  const isConditional = gate.verdict === 'CONDITIONAL';

  const regLevel = maxLevel(toLevel(reg.regulatory_grade), toLevel(reg.privacy_grade), toLevel(reg.advertising_grade));
  const dataLevel = toLevel(dataFeas?.risk_level);
  const dataAvailability = dataAvailabilityLevel(dataLevel);
  const marketLevel = toLevel(marketFeas?.market_realism_grade);
  const bmExists = !!bm && (bm.recommendations?.length ?? 0) > 0;
  // 경쟁사 매칭 결과가 없는 상태(insufficient_data). 서버 응답에는 match_level이 포함되지 않고(내부용),
  // 이 경우에만 market_realism_grade가 null로 내려온다. 로컬 판정 mock은 match_level을 직접 준다.
  const marketInsufficient =
    !!marketFeas && (marketFeas.match_level === 'insufficient_data' || marketFeas.market_realism_grade == null);
  // 매칭 결과가 없으면 서버의 platform_competitor_exists(false)는 "없음"이 아니라 "확인하지 못함"이다.
  const platformStatus = marketInsufficient
    ? { label: MARKET_UNDETERMINED_LABEL, level: 'undetermined' }
    : platformCompetitorStatus(marketFeas?.platform_competitor_exists);
  const platformSummary = marketInsufficient ? PLATFORM_UNDETERMINED_SUMMARY : marketFeas?.platform_competitor_summary;
  // 매칭 결과가 없을 때는 서버가 보내는 설명 대신 고정 문구를 쓴다 (아래 안내 박스와 내용이 겹치지 않도록).
  const marketMatchDescription =
    marketInsufficient
      ? MATCH_SCOPE_DESCRIPTIONS.insufficient_data
      : matchScopeDescription(
          marketFeas?.match_scope_description,
          marketFeas?.match_level,
          marketFeas?.payment_precedent,
        );
  const bmMatchDescription = matchScopeDescription(bm?.match_scope_description, bm?.match_level);
  const retryInputPath = session.session_id ? `/input?session=${encodeURIComponent(session.session_id)}` : '/input';

  function handleTabClick(id) {
    if (isFail && id !== 'r') return;
    setTab(id);
  }

  async function handleSavePdf() {
    if (!session.session_id || pdfDownloading) return;
    setPdfDownloading(true);
    setPdfError(null);
    setPdfErrorCode(null);
    try {
      const { blob, filename } = await downloadAnalysisReportPdf(session.session_id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      const code = getApiErrorCode(error);
      if (code === API_ERROR_CODES.ANALYSIS_SESSION_NOT_FOUND) {
        navigate('/input');
        return;
      }
      if (code === API_ERROR_CODES.HEALTH_DATA_REQUIRED) {
        setPdfError('검진 데이터가 없어 PDF를 만들 수 없습니다. 검진 데이터를 등록한 뒤 다시 검사해주세요.');
        setPdfErrorCode(code);
        return;
      }
      if (code === API_ERROR_CODES.ANALYSIS_RESULT_REQUIRED) {
        setPdfError('검진 결과 보관 시간이 만료되었습니다. 다시 검진해주세요.');
        setPdfErrorCode(code);
        return;
      }
      setPdfError(error.message || 'PDF를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      setPdfErrorCode(code);
    } finally {
      setPdfDownloading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* 상단 네비 */}
      <div className={styles.topnav}>
        <div className={styles['nav-left']}>
          <button className={styles['logo-row']} onClick={() => navigate('/')}>
            <div className={styles['logo-mark']}>P</div>
            <span className={styles['logo-name']}>PREP</span>
          </button>
          <div className={styles['nav-sep']}></div>
          <span className={styles['page-title']}>검진 결과 리포트</span>
        </div>
        <div className={styles['nav-right']}>
          <button className={styles['nav-btn']} onClick={handleSavePdf} disabled={pdfDownloading}>
            <i className="ti ti-download"></i>{pdfDownloading ? 'PDF 준비 중...' : 'PDF 저장'}
          </button>
          <button className={styles['nav-btn']} onClick={() => navigate('/input')}>
            <i className="ti ti-arrow-left"></i>검진 다시 하기
          </button>
        </div>
      </div>

      {/* 임시 보관 안내 — 리포트는 이 브라우저에만 10분간 임시 보관되며 만료 후 사라진다.
          BE는 별도 TTL/deleted_at을 두지 않고, FE 캐시(reportCache)의 expiresAt을 그대로 표시한다.
          "서버에서 삭제"가 아니라 "저장 안 함 + 브라우저 임시 보관"임을 강조한다. */}
      {expiresAt && (
        <div className={styles['ttl-banner']}>
          <i className="ti ti-clock-hour-4"></i>
          <span>
            입력한 아이디어는 저장하지 않으며, 리포트는 이 브라우저에서 {formatExpiry(expiresAt)}까지 임시로만 보관됩니다.
          </span>
        </div>
      )}
      {pdfError && (
        <div className={styles['pdf-error']} role="alert">
          <i className="ti ti-alert-triangle"></i>
          <span>{pdfError}</span>
          <button
            type="button"
            className={styles['pdf-error-retry']}
            onClick={pdfErrorCode === API_ERROR_CODES.ANALYSIS_RESULT_REQUIRED || pdfErrorCode === API_ERROR_CODES.HEALTH_DATA_REQUIRED
              ? () => navigate(retryInputPath)
              : handleSavePdf}
            disabled={pdfDownloading}
          >
            {pdfErrorCode === API_ERROR_CODES.ANALYSIS_RESULT_REQUIRED || pdfErrorCode === API_ERROR_CODES.HEALTH_DATA_REQUIRED
              ? '다시 검사하기'
              : '다시 시도'}
          </button>
        </div>
      )}

      <div className={styles.container}>

        {/* 아이디어 헤더 */}
        <div className={styles['idea-header']}>
          <div className={styles['ih-top']}>
            <div>
              <div className={styles['app-name']}>{session.service_name}</div>
              <div className={styles['app-sub']}>{session.service_description}</div>
              {oneLiner && <div className={styles['app-sub']} style={{ marginTop: 8, color: '#111', fontWeight: 700 }}>{oneLiner}</div>}
            </div>
            {isFail ? (
              <div className={cx(styles, 'gate-badge', 'fail')}><i className="ti ti-shield-x"></i>GATE FAIL · 의료기기 가능성</div>
            ) : isConditional ? (
              <div className={cx(styles, 'gate-badge', 'fail')} style={{ background: '#fefce8', color: '#7a4a00', borderColor: '#fde68a' }}>
                <i className="ti ti-alert-triangle"></i>GATE CONDITIONAL · 조건부 통과
              </div>
            ) : (
              <div className={cx(styles, 'gate-badge', 'pass')}><i className="ti ti-shield-check"></i>GATE PASS · 비의료기기</div>
            )}
          </div>
          {(overallSignal || overallSummary) && (
            (() => {
              const s = signalStyle(overallSignal);
              return (
                <div
                  style={{
                    marginTop: 14,
                    borderRadius: 8,
                    padding: '15px 17px',
                    background: overallSignal ? s.bg : '#f8f8f8',
                    color: '#444',
                    fontSize: 15,
                    lineHeight: 1.7,
                  }}
                >
                  {overallSignal && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                        color: s.fg,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: s.dot,
                          flexShrink: 0,
                        }}
                      />
                      종합 신호등: {overallSignal}
                    </div>
                  )}
                  {overallSummary && <div>{overallSummary}</div>}
                </div>
              );
            })()
          )}
          {(session.category_1 || session.category_2 || session.target) && (
            <div className={styles['ih-tags']}>
              {session.category_1 && <span className={styles['ih-tag']}># {session.category_1}</span>}
              {session.category_2 && <span className={styles['ih-tag']}># {session.category_2}</span>}
              {session.target && <span className={styles['ih-tag']}># {session.target}</span>}
              {session.service_type && <span className={styles['ih-tag']}># {session.service_type}</span>}
            </div>
          )}
        </div>

        {/* 종합 지표 */}
        <div className={styles.indicators}>
          <div className={styles.ind}>
            <div className={styles['ind-name']}>규제 위험도</div>
            <div className={cx(styles, 'ind-val', regLevel)}>{levelLabel(regLevel)}</div>
            <IndBar level={regLevel} />
          </div>
          <div className={cx(styles, 'ind', 'availability', isFail && 'inactive')}>
            <div className={styles['ind-name']}>데이터 확보 가능성</div>
            <div className={cx(styles, 'ind-val', dataAvailability || 'mid')}>{dataFeas ? dataAvailabilityLabel(dataAvailability) : '—'}</div>
            {dataFeas && <IndBar level={dataAvailability} />}
          </div>
          <div className={cx(styles, 'ind', 'availability', isFail && 'inactive')}>
            <div className={styles['ind-name']}>시장 현실성</div>
            {marketFeas && marketInsufficient ? (
              <div className={styles['ind-val']} style={{ color: '#999' }}>{MARKET_UNDETERMINED_LABEL}</div>
            ) : (
              <div className={cx(styles, 'ind-val', marketLevel || 'mid')}>{marketFeas ? levelLabel(marketLevel) : '—'}</div>
            )}
            {marketFeas && <IndBar level={marketLevel} />}
          </div>
          <div className={cx(styles, 'ind', isFail && 'inactive')}>
            <div className={styles['ind-name']}>수익 구조 추천</div>
            <div className={styles['ind-val']} style={{ color: bmExists ? '#2a7a2a' : '#999' }}>
              {bm ? (bmExists ? '추천 있음' : '정보 부족') : '—'}
            </div>
          </div>
        </div>

        {isFail && (
          <div className={styles['fail-guidance']}>
            <div className={styles['fail-guidance-icon']}>
              <i className="ti ti-shield-x"></i>
            </div>
            <div className={styles['fail-guidance-body']}>
              <div className={styles['fail-guidance-title']}>의료기기 해당 가능성이 높아 후속 분석이 중단되었습니다.</div>
              <p>
                현재 리포트에서는 규제 위험도만 우선 확인할 수 있습니다. 데이터 확보 가능성, 시장 현실성,
                수익 구조 분석은 의료기기 리스크를 낮추는 방향으로 아이디어를 수정한 뒤 다시 검진하면 확인할 수 있습니다.
              </p>
              <div className={styles['fail-guidance-list']}>
                <span>데이터 확보 가능성 분석 제외</span>
                <span>시장 현실성 분석 제외</span>
                <span>수익 구조 분석 제외</span>
              </div>
              <button className={styles['fail-guidance-btn']} onClick={() => navigate(retryInputPath)}>
                <i className="ti ti-edit"></i>아이디어 다시 작성하기
              </button>
            </div>
          </div>
        )}

        {/* 서비스 분류 & GATE 근거 */}
        <div className={styles.section}>
          <div className={styles['sec-title']}>서비스 분류 · GATE 판정</div>
          <div className={styles['classify-grid']}>
            <div className={styles.ci}><div className={styles['ci-k']}>데이터 유형</div><div className={styles['ci-v']}>{gate.data_type || '—'}</div></div>
            <div className={styles.ci}><div className={styles['ci-k']}>기능 유형</div><div className={styles['ci-v']}>{gate.function_type || '—'}</div></div>
            <div className={styles.ci}><div className={styles['ci-k']}>수집 방법</div><div className={styles['ci-v']}>{gate.acquire_method || '해당 없음'}</div></div>
            <div className={styles.ci}><div className={styles['ci-k']}>침습적 신호</div><div className={styles['ci-v']}>{gate.invasive_signal ? '감지됨' : '없음'}</div></div>
          </div>

          <div className={styles['gate-box']} style={{ marginTop: 10 }}>
            <div className={styles['gate-box-head']}>
              {isFail ? (
                <div className={cx(styles, 'gate-badge', 'fail')} style={{ fontSize: 11, padding: '4px 10px' }}><i className="ti ti-shield-x"></i>FAIL</div>
              ) : isConditional ? (
                <div className={cx(styles, 'gate-badge', 'fail')} style={{ fontSize: 11, padding: '4px 10px', background: '#fefce8', color: '#7a4a00', borderColor: '#fde68a' }}>CONDITIONAL</div>
              ) : (
                <div className={cx(styles, 'gate-badge', 'pass')} style={{ fontSize: 11, padding: '4px 10px' }}><i className="ti ti-shield-check"></i>PASS</div>
              )}
              <div className={styles['gate-box-title']}>의료기기 해당 여부 판정 결과</div>
            </div>
            <div className={styles['gate-grounds']}>
              {(gate.reasoning?.length ?? 0) > 0 ? (
                gate.reasoning.map((reason, index) => (
                  <div key={index} className={styles['gate-ground']}>
                    <div className={cx(styles, 'g-dot', isFail ? 'high' : undefined)}></div>
                    {reason}
                  </div>
                ))
              ) : (
                <div className={styles['gate-ground']}>
                  <div className={cx(styles, 'g-dot', isFail ? 'high' : undefined)}></div>
                  데이터 유형 <b>{gate.data_type}</b> × 기능 유형 <b>{gate.function_type}</b> 조합으로 판정
                </div>
              )}
              {gate.hardcheck_fired && (
                <div className={styles['gate-ground']}>
                  <div className={cx(styles, 'g-dot', 'high')}></div>
                  침습적 하드체크가 발동되어 기능 유형과 무관하게 FAIL로 오버라이드되었습니다.
                </div>
              )}
            </div>
            {/* GATE FAIL 근거 조문 — legal_basis가 없으면(백엔드 PR #140 배포 전 응답 포함) 렌더링하지 않는다 */}
            {isFail && gate.legal_basis && <GateLegalBasis basis={gate.legal_basis} />}
            {isFail && (gate.avoidance_redesign || gate.avoidance_certification) && (
              <div className={styles.grounds} style={{ marginTop: 12 }}>
                {gate.avoidance_redesign && (
                  <div className={styles.ground}>
                    <div className={cx(styles, 'g-dot', 'high')}></div>
                    {gate.avoidance_redesign}
                  </div>
                )}
                {gate.avoidance_certification && (
                  <div className={styles.ground}>
                    <div className={cx(styles, 'g-dot', 'high')}></div>
                    {gate.avoidance_certification}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className={styles.section}>
          <div className={styles.tabs}>
            {TABS.map((t) => (
              <div
                key={t.id}
                className={cx(styles, 'tab', tab === t.id && 'active', isFail && t.id !== 'r' && 'disabled')}
                onClick={() => handleTabClick(t.id)}
              >
                {t.label}
              </div>
            ))}
          </div>

          {/* §01 규제 위험도 */}
          {tab === 'r' && (
            <div className={styles['tab-panel']}>
              <div className={styles['acq-overview']} style={{ marginBottom: 16 }}>
                <div className={cx(styles, 'acq-card', toLevel(reg.regulatory_grade))}>
                  <div className={styles['acq-name']}>의료행위표현</div>
                  <div className={styles['acq-level']}>{reg.regulatory_grade ?? '—'}</div>
                  <div className={styles['acq-desc']}>점수 {reg.regulatory_score ?? '-'}</div>
                </div>
                <div className={cx(styles, 'acq-card', toLevel(reg.privacy_grade))}>
                  <div className={styles['acq-name']}>개인정보민감도</div>
                  <div className={styles['acq-level']}>{reg.privacy_grade ?? '—'}</div>
                  <div className={styles['acq-desc']}>점수 {reg.privacy_score ?? '-'}</div>
                </div>
                <div className={cx(styles, 'acq-card', toLevel(reg.advertising_grade))}>
                  <div className={styles['acq-name']}>광고표현위험</div>
                  <div className={styles['acq-level']}>{reg.advertising_grade ?? '—'}</div>
                  <div className={styles['acq-desc']}>점수 {reg.advertising_score ?? '-'}</div>
                </div>
              </div>

              {reg.service_law_description && (
                <ExpandableText className={styles.ground}>
                  {reg.service_law_description}
                </ExpandableText>
              )}

              {(reg.matched_rules?.length ?? 0) > 0 && (
                <div className={styles['law-list']}>
                  {reg.matched_rules.map((r, i) => (
                    <div key={i} className={styles['law-card']}>
                      <div className={styles['law-meta']}>
                        <span>{r.legal_basis?.title ?? r.legal_basis?.document_id ?? '근거 문서'}</span>
                        {r.legal_basis?.article && <b>{r.legal_basis.article}</b>}
                        {r.exact_phrase_match && <em>직접 문구 매칭</em>}
                      </div>
                      {r.legal_basis?.quote && (
                        <ExpandableText className={styles['law-quote']}>
                          {r.legal_basis.quote}
                        </ExpandableText>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(reg.applicable_laws?.length ?? 0) > 0 && (
                <div className={styles['ih-tags']} style={{ marginBottom: 14 }}>
                  {reg.applicable_laws.map((law) => (
                    <span key={law} className={styles['ih-tag']}>{law}</span>
                  ))}
                </div>
              )}

              {(correctionData.candidates?.length ?? 0) > 0 && (
                <>
                  <div className={styles['ba-section-title']}>수정이 필요한 표현</div>
                  <div className={styles['ba-list']}>
                    {correctionData.candidates.map((c, i) => (
                      <div key={i} className={styles['ba-item']}>
                        <span className={styles['ba-before']}>{c.risky_text}</span>
                        <span className={styles['ba-arr']}>→</span>
                        <span className={styles['ba-after']}>{c.safe_text}</span>
                        {c.match_source === 'llm' && <span className={styles['ih-tag']}>AI 추정</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!reg.matched_rules?.length && !correctionData.candidates?.length && (
                <div className={styles.ground}>특별히 감지된 위험 표현이 없습니다.</div>
              )}
            </div>
          )}

          {/* §02 데이터 확보 가능성 */}
          {tab === 'd' && !isFail && (
            <div className={styles['tab-panel']}>
              {dataFeas ? (
                <>
                  <div className={styles.ground} style={{ marginBottom: 14 }}>
                    데이터 확보 난이도 점수: <b>{dataFeas.data_feasibility_score ?? '-'}</b> / 30점
                    {dataLevel && <> · {dataDifficultyLabel(dataLevel)}</>}
                  </div>
                  <div className={styles.ground} style={{ marginBottom: 14 }}>
                    데이터 확보 난이도: <b>{dataLevel ? dataDifficultyLabel(dataLevel) : '확인 필요'}</b>
                    <span> / 개인정보 민감도: <b>{({ LOW: '낮음', MEDIUM: '중간', HIGH: '높음' })[dataFeas.privacy_level] ?? '확인 필요'}</b></span>
                  </div>

                  <div className={styles['score-guide']}>
                    <div className={styles['score-head']}>
                      <div>
                        <div className={styles['sub-title']}>데이터 확보 난이도 점수표</div>
                        <p>개별점수 = 데이터 유형 난이도 × 수집 방법 난이도, 복수 선택 시 가장 어려운 조합을 기준으로 봅니다.</p>
                      </div>
                      <span>30점 만점</span>
                    </div>
                    <div className={styles['score-table']}>
                      {DATA_SCORE_ROWS.map(([label, score, grade]) => (
                        <div key={label} className={styles['score-row']}>
                          <span>{label}</span>
                          <b>{score}점</b>
                          <em>{grade}</em>
                        </div>
                      ))}
                    </div>
                    <div className={styles['score-legend']}>
                      <span><b>LOW</b> 1~3점 · 쉬움</span>
                      <span><b>MEDIUM</b> 4~10점 · 보통</span>
                      <span><b>HIGH</b> 12~30점 · 어려움</span>
                    </div>
                  </div>

                  {(dataFeas.available_sources?.length ?? 0) > 0 && (
                    <>
                      <div className={styles['sub-title']}>지금 당장 활용 가능한 데이터 소스</div>
                      <div className={styles['ds-list']}>
                        {dataFeas.available_sources.map((s, i) => (
                          <div key={i} className={styles['ds-item']}>
                            <span className={styles['ds-name']}>{s.data_name}</span>
                            <div className={styles['ds-right']}>
                              <span className={cx(styles, 'diff', s.source_type === 'public_api' ? 'easy' : 'mid')}>
                                {s.source_type === 'public_api' ? '공개 API' : '외부 API'}
                              </span>
                              <span className={styles['ds-url']}>{s.source_name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {(dataFeas.privacy_risks?.length ?? 0) > 0 && (
                    <>
                      <div className={styles['sub-title']} style={{ marginTop: 18 }}>개인정보 처리 주의사항</div>
                      <div className={styles.grounds}>
                        {dataFeas.privacy_risks.map((r, i) => (
                          <div key={i} className={styles.ground}>
                            <b>{r.data_name}</b> — {r.reason || '개인정보 처리 기준 확인 필요'}
                            {r.sensitivity_level == null && r.reason && <span> (개인정보 처리 기준 확인 필요)</span>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {(dataFeas.standard_scale_candidates?.length ?? 0) > 0 && (
                    <>
                      <div className={styles['sub-title']} style={{ marginTop: 18 }}>표준 척도 후보</div>
                      <div className={styles['ds-list']}>
                        {dataFeas.standard_scale_candidates.map((scale) => (
                          <div key={scale.scale_id ?? scale.name} className={styles['scale-card']}>
                            <div className={styles['scale-head']}>
                              <span className={styles['ds-name']}>{scale.name} · {scale.full_name}</span>
                              <div className={styles['ds-right']}>
                                <span className={cx(styles, 'diff', 'mid')}>{scale.item_count ?? '-'}문항</span>
                                <span className={styles['ds-url']}>{scale.license_type ?? scale.scoring_range}</span>
                              </div>
                            </div>
                            {scale.note && <div className={styles['scale-note']}>{scale.note}</div>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {(dataFeas.mvp_roadmap?.length ?? 0) > 0 && (
                    <>
                      <div className={styles['sub-title']} style={{ marginTop: 18 }}>MVP 로드맵</div>
                      <div className={styles.actions}>
                        {[...dataFeas.mvp_roadmap].sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0)).map((stage) => (
                          <div key={stage.stage ?? stage.title} className={styles.action}>
                            <div className={styles['act-n']}>{stage.stage}</div>
                            <div className={styles['act-body']}>
                              <div className={styles['act-text']}>{stage.title}</div>
                              {stage.description && <div className={styles['act-ref']}>{stage.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className={styles.ground}>데이터 확보 가능성 정보가 없습니다.</div>
              )}
            </div>
          )}

          {/* §03 시장 현실성 */}
          {tab === 'm' && !isFail && (
            <div className={styles['tab-panel']}>
              {marketFeas ? (
                <>
                  <div className={styles['mkt-overview']}>
                    <div className={cx(styles, 'mkt-card', marketInsufficient ? 'undetermined' : toLevel(marketFeas.market_realism_grade))}>
                      <div className={styles['mkt-name']}>시장 현실성</div>
                      <div className={styles['mkt-level']}>{marketInsufficient ? MARKET_UNDETERMINED_LABEL : (marketFeas.market_realism_grade ?? '—')}</div>
                      <div className={styles['mkt-desc']}>{marketFeas.saturation ?? '-'}</div>
                    </div>
                    <div className={cx(styles, 'mkt-card', 'platform', platformStatus.level)}>
                      <div className={styles['mkt-name']}>플랫폼 경쟁 여부</div>
                      <div className={styles['mkt-level']}>{platformStatus.label}</div>
                      <div className={styles['mkt-desc']}>플랫폼급 경쟁사 기준</div>
                    </div>
                    <div className={styles['mkt-card']}>
                      <div className={styles['mkt-name']}>매칭 범위</div>
                      <div className={styles['mkt-scope']}>{marketMatchDescription}</div>
                    </div>
                  </div>

                  <div className={styles.grounds}>
                    <div className={styles.ground}>
                      <div className={styles['g-dot']}></div>
                      <b>매칭 범위</b> — {marketMatchDescription}
                    </div>
                      {platformSummary && (
                        <div className={styles.ground}>
                          <div className={cx(styles, 'g-dot', !marketInsufficient && marketFeas.platform_competitor_exists ? 'high' : undefined)}></div>
                          <b>플랫폼 경쟁</b> — {platformSummary}
                        </div>
                      )}
                  </div>

                  {marketInsufficient && (
                    <div className={styles['no-match-notice']} role="note">
                      <i className="ti ti-info-circle"></i>
                      <span>{MARKET_NO_MATCH_NOTICE}</span>
                    </div>
                  )}

                  {(marketFeas.competitor_cards?.length ?? 0) > 0 && (
                    <div className={styles['comp-grid']}>
                      {marketFeas.competitor_cards.map((c, i) => (
                        <div key={i} className={styles['comp-card']}>
                          <div className={styles['comp-name']}>{c.name}</div>
                          {c.feature && <div className={styles['comp-feat']}>✦ {c.feature}</div>}
                          {c.limitation && <div className={styles['comp-limit']}>△ {c.limitation}</div>}
                          <span className={cx(styles, 'comp-badge', c.badge === '진입 가능' ? 'enter' : 'caution')}>{c.badge}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.ground}>시장 현실성 정보가 없습니다.</div>
              )}
            </div>
          )}

          {/* §04 수익 구조 */}
          {tab === 'b' && !isFail && (
            <div className={styles['tab-panel']}>
              {bm && bm.recommendations?.length ? (
                <>
                  <div className={styles.ground} style={{ marginBottom: 14 }}>
                    <b>매칭 범위</b> — {bmMatchDescription}
                  </div>
                  <div className={styles['bm-grid']}>
                    {bm.recommendations.map((r, i) => (
                      <div key={i} className={styles['bm-card']}>
                        <div className={styles['bm-type']}>BM 패턴</div>
                        <div className={styles['bm-name']}>{r.bm_pattern ?? '—'}</div>
                        <div className={styles['bm-desc']}>{r.bm_description ?? 'BM 설명을 준비 중입니다.'}</div>
                        <div className={styles['bm-rows']}>
                          <div className={styles['bm-row']}><span className={styles['bm-key']}>선례 수준</span><span className={styles['bm-val']}>{r.precedent_level ?? '확인 필요'}</span></div>
                          <div className={styles['bm-row']}>
                            <span className={styles['bm-key']}>선례 서비스</span>
                            <span className={styles['bm-services']}>
                              {(r.precedent_services?.length ?? 0) > 0
                                ? r.precedent_services.map((name) => <em key={name}>{name}</em>)
                                : <span className={styles['bm-val']}>확인 필요</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.ground}>추천할 만한 비즈니스 모델 데이터가 부족합니다 (insufficient_data).</div>
              )}
            </div>
          )}
        </div>

        {/* 다음 액션 */}
        {nextActions.length > 0 && (
          <div className={styles.section}>
            <div className={styles['sec-title']}>다음 액션</div>
            <div className={styles.actions}>
              {[...nextActions].sort((a, b) => b.priority - a.priority).map((a, i) => (
                <div key={i} className={styles.action}>
                  <div className={styles['act-n']}>{i + 1}</div>
                  <div className={styles['act-body']}>
                    <div className={styles['act-text']}>{a.action_text}</div>
                    {a.ref_doc && <div className={styles['act-ref']}>{a.ref_doc}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 하단 안내 — 지원사업 매칭 유도 (긍정 프레임). 인쇄 시 제외. */}
        {(
          <div className={styles['report-footer-cta']}>
            {isFail ? (
              <>
                <div className={styles['footer-cta-text']}>
                  <i className="ti ti-refresh"></i>
                  <span>아이디어를 수정해 의료기기 리스크를 낮추면 전체 검진 결과를 다시 확인할 수 있어요.</span>
                </div>
                <div className={styles['footer-cta-btns']}>
                  <button className={styles['nav-btn']} onClick={handleSavePdf} disabled={pdfDownloading}>
                    <i className="ti ti-download"></i>{pdfDownloading ? 'PDF 준비 중...' : 'PDF 저장'}
                  </button>
                  <button className={cx(styles, 'nav-btn', 'cta-primary')} onClick={() => navigate(retryInputPath)}>
                    다시 검사하기 <i className="ti ti-arrow-right"></i>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles['footer-cta-text']}>
                  <i className="ti ti-wallet"></i>
                  <span>PDF를 저장하시면 지원사업 매칭 서비스도 같이 사용 가능해요!</span>
                </div>
                <div className={styles['footer-cta-btns']}>
                  <button className={styles['nav-btn']} onClick={handleSavePdf} disabled={pdfDownloading}>
                    <i className="ti ti-download"></i>{pdfDownloading ? 'PDF 준비 중...' : 'PDF 저장'}
                  </button>
                  <button
                    className={cx(styles, 'nav-btn', 'cta-primary')}
                    onClick={() => navigate(session.session_id ? `/funding-match?session=${encodeURIComponent(session.session_id)}` : '/funding-match')}
                  >
                    지원사업 매칭 바로가기 <i className="ti ti-arrow-right"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 화면 맨 아래 주의 문구 — 한 줄 요약, 누르면 전체 안내가 펼쳐진다. 인쇄(PDF) 시에는 전체를 펼친 채로 포함. */}
        <div className={styles['ai-notice']}>
          <button
            type="button"
            className={styles['ai-notice-toggle']}
            onClick={() => setNoticeOpen((open) => !open)}
            aria-expanded={noticeOpen}
            aria-controls="ai-notice-detail"
          >
            <i className="ti ti-alert-triangle"></i>
            <span className={styles['ai-notice-summary']}>{AI_NOTICE_SUMMARY}</span>
            <span className={styles['ai-notice-more']}>
              {noticeOpen ? '접기' : '자세히 보기'}
              <i className={`ti ${noticeOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`}></i>
            </span>
          </button>
          {noticeOpen && (
            <div id="ai-notice-detail" className={styles['ai-notice-detail']}>
              {AI_NOTICE_DETAIL}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function IndBar({ level }) {
  return (
    <div className={styles['ind-bar']}>
      {[0, 1, 2].map((i) => {
        const filled = level === 'high' ? true : level === 'mid' ? i < 2 : i < 1;
        return <div key={i} className={cx(styles, 'bar', filled && level)} />;
      })}
    </div>
  );
}

// ── 근거 원문 정리 ──
// PDF 추출 원문은 줄이 글자 수 기준으로 끊겨 있고(\r\n), 목록 기호(○ ￭ ∙ 등)로 항목이 나뉜다.
// 줄바꿈을 전부 합치면 목록 구조가 사라지고, 그대로 두면 문장 중간에서 꺾이므로
// "목록 기호로 시작하는 줄"과 "앞 줄이 문장 끝(다.)으로 끝난 줄"에서만 새 줄을 시작하고 나머지는 이어 붙인다.
const QUOTE_MARKER_LEVEL = [
  [/^[◎○]/, 0], // 큰 항목
  [/^[￭■□▪]/, 1], // 중간 항목
  [/^[∙•·‧]/, 2], // 세부 예시
];

function quoteLineLevel(line) {
  const hit = QUOTE_MARKER_LEVEL.find(([re]) => re.test(line));
  return hit ? hit[1] : null;
}

function splitQuoteLines(text) {
  const rawLines = String(text)
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    // "‧‧∙ 웨어러블" 같은 추출 잡음 → "∙ 웨어러블"
    .map((line) => line.replace(/^[‧·∙•]+\s*/, (m) => (m.trim() ? '∙ ' : m)))
    .filter(Boolean);

  const lines = [];
  for (const line of rawLines) {
    const level = quoteLineLevel(line);
    const prev = lines[lines.length - 1];
    // 새 줄 시작: 목록 기호 / 앞 줄이 문장 끝(다.) / 앞 줄이 "3. 제목" 같은 번호 제목
    const startsNew = !prev || level !== null || /다\.$/.test(prev.text) || /^\d+\.\s/.test(prev.text);
    if (startsNew) {
      lines.push({ text: line, level });
    } else {
      prev.text = `${prev.text} ${line}`;
    }
  }
  return lines.map((l) => {
    // "침습적인 , 경우"처럼 줄바꿈 때문에 생긴 문장부호 앞 공백 제거
    const text = l.text.replace(/ ([,.])/g, '$1');
    // 짧은 항목("￭ 침습 여부")은 소제목으로 굵게, 긴 항목은 본문처럼 둔다
    return { ...l, text, isTitle: l.level !== null && l.level <= 1 && text.length <= 30 };
  });
}

// GATE 판정 근거 조문 1건 (gate.legal_basis)
// - 제목 줄: {title} {article}  (document_id는 화면에 쓰지 않음)
// - quote_status === 'FOUND'  → 원문 전체를 목록 구조대로 나눠 고정 높이 스크롤 박스에 표시
// - 그 외 상태              → quote_message를 안내 문구로 표시
function GateLegalBasis({ basis }) {
  const heading = [basis.title, basis.article].filter(Boolean).join(' ') || '근거 문서';
  const lines = basis.quote_status === 'FOUND' && basis.quote ? splitQuoteLines(basis.quote) : [];
  const message = basis.quote_message || '근거 원문을 불러오지 못했습니다.';

  return (
    <div className={styles['gate-basis']}>
      <div className={styles['gate-basis-label']}>
        <i className="ti ti-file-text"></i>판정 근거 조문
      </div>
      <div className={styles['gate-basis-title']}>{heading}</div>
      {lines.length > 0 ? (
        <ExpandableText
          className={styles['gate-basis-quote']}
          contentTag="blockquote"
          contentProps={{ tabIndex: 0, 'aria-label': `${heading} 원문` }}
        >
          {lines.map((line, i) => (
            <p key={i} className={cx(styles, 'gate-basis-line', line.level !== null && `lv${line.level}`, line.isTitle && 'title')}>
              {line.text}
            </p>
          ))}
        </ExpandableText>
      ) : (
        <div className={styles['gate-basis-message']}>
          <i className="ti ti-info-circle"></i>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
