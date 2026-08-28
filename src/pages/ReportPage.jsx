import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cx } from '../utils/cx';
import styles from './ReportPage.module.css';

// 이 페이지는 백엔드 POST /api/v1/analysis/evaluate 의 응답(EvaluateResult)을 그대로 받는다.
// 형태: { session, gate, regulatory_risk, correction_candidates,
//         data_feasibility, market_feasibility, business_model,
//         section_links, next_actions }
// GATE FAIL이면 data_feasibility/market_feasibility/business_model이 null로 온다.

const TABS = [
  { id: 'r', label: '규제 위험도' },
  { id: 'd', label: '데이터 확보' },
  { id: 'm', label: '시장 현실성' },
  { id: 'b', label: '수익 구조' },
];

// 백엔드가 내려주는 등급 문자열(낮음/중간/높음, LOW/MEDIUM/HIGH 등)을 화면용 level 코드로 정규화
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
// 셋 중 가장 위험한(높은) 등급 채택 — db_구축_설계서.md "최고값 채택" 원칙
function maxLevel(...levels) {
  const order = { low: 0, mid: 1, high: 2 };
  return levels.filter(Boolean).reduce((acc, cur) => (order[cur] > order[acc] ? cur : acc), 'low');
}

export default function ReportPage({ data }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('r');

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
  const marketLevel = toLevel(marketFeas?.market_realism_grade);
  const bmExists = !!bm && bm.match_level !== 'insufficient_data' && (bm.recommendations?.length ?? 0) > 0;

  function handleTabClick(id) {
    if (isFail && id !== 'r') return;
    setTab(id);
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
          <button className={styles['nav-btn']} onClick={() => navigate('/input')}>
            <i className="ti ti-arrow-left"></i>검진 다시 하기
          </button>
        </div>
      </div>

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
            <div className={styles.ground} style={{ marginTop: 14 }}>
              {overallSignal && <b>종합 신호등: {overallSignal}</b>}
              {overallSignal && overallSummary ? ' · ' : ''}
              {overallSummary}
            </div>
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
          <div className={cx(styles, 'ind', isFail && 'inactive')}>
            <div className={styles['ind-name']}>데이터 확보 가능성</div>
            <div className={cx(styles, 'ind-val', dataLevel || 'mid')}>{dataFeas ? levelLabel(dataLevel) : '—'}</div>
            {dataFeas && <IndBar level={dataLevel} />}
          </div>
          <div className={cx(styles, 'ind', isFail && 'inactive')}>
            <div className={styles['ind-name']}>시장 현실성</div>
            <div className={cx(styles, 'ind-val', marketLevel || 'mid')}>{marketFeas ? levelLabel(marketLevel) : '—'}</div>
            {marketFeas && <IndBar level={marketLevel} />}
          </div>
          <div className={cx(styles, 'ind', isFail && 'inactive')}>
            <div className={styles['ind-name']}>수익 구조 추천</div>
            <div className={styles['ind-val']} style={{ color: bmExists ? '#2a7a2a' : '#999' }}>
              {bm ? (bmExists ? '추천 있음' : '정보 부족') : '—'}
            </div>
          </div>
        </div>

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
            <div>
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
                <div className={styles.ground} style={{ marginBottom: 14 }}>
                  {reg.service_law_description}
                </div>
              )}

              {(reg.matched_rules?.length ?? 0) > 0 && (
                <div className={styles.grounds}>
                  {reg.matched_rules.map((r, i) => (
                    <div key={i} className={styles.ground}>
                      <div className={cx(styles, 'g-dot', 'high')}></div>
                      {r.legal_basis?.document_id} {r.legal_basis?.article}
                      {r.legal_basis?.quote ? ` — "${r.legal_basis.quote}"` : ''}
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
            <div>
              {dataFeas ? (
                <>
                  <div className={styles.ground} style={{ marginBottom: 14 }}>
                    데이터 확보 난이도 점수: <b>{dataFeas.data_feasibility_score}</b> ({dataFeas.risk_level})
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
                      <div className={styles['sub-title']} style={{ marginTop: 18 }}>개인정보 리스크</div>
                      <div className={styles.grounds}>
                        {dataFeas.privacy_risks.map((r, i) => (
                          <div key={i} className={styles.ground}>
                            <div className={cx(styles, 'g-dot', 'high')}></div>
                            <b>{r.data_name}</b> — {r.reason}
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
            <div>
              {marketFeas ? (
                <>
                  <div className={styles['mkt-overview']}>
                    <div className={cx(styles, 'mkt-card', toLevel(marketFeas.market_realism_grade))}>
                      <div className={styles['mkt-name']}>시장 현실성</div>
                      <div className={styles['mkt-level']}>{marketFeas.market_realism_grade ?? '—'}</div>
                      <div className={styles['mkt-desc']}>{marketFeas.saturation ?? '-'}</div>
                    </div>
                    <div className={styles['mkt-card']}>
                      <div className={styles['mkt-name']}>경쟁사 수</div>
                      <div className={styles['mkt-level']}>{marketFeas.competitor_count}</div>
                      <div className={styles['mkt-desc']}>{marketFeas.platform_competitor_exists ? '플랫폼급 존재' : '플랫폼급 없음'}</div>
                    </div>
                    <div className={styles['mkt-card']}>
                      <div className={styles['mkt-name']}>매칭 범위</div>
                      <div className={styles['mkt-level']} style={{ fontSize: 13 }}>{marketFeas.match_level}</div>
                      <div className={styles['mkt-desc']}>{marketFeas.payment_precedent ?? '-'}</div>
                    </div>
                  </div>

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
            <div>
              {bm && bm.recommendations?.length ? (
                <>
                  <div className={styles.ground} style={{ marginBottom: 14 }}>매칭 범위: {bm.match_level}</div>
                  <div className={styles['bm-grid']}>
                    {bm.recommendations.map((r, i) => (
                      <div key={i} className={styles['bm-card']}>
                        <div className={styles['bm-type']}>BM 패턴</div>
                        <div className={styles['bm-name']}>{r.bm_pattern ?? '—'}</div>
                        <div className={styles['bm-rows']}>
                          <div className={styles['bm-row']}><span className={styles['bm-key']}>국내 빈도</span><span className={styles['bm-val']}>{r.frequency_score ?? '-'}</span></div>
                          <div className={styles['bm-row']}><span className={styles['bm-key']}>전체 빈도</span><span className={styles['bm-val']}>{r.frequency_score_global ?? '-'}</span></div>
                          <div className={styles['bm-row']}><span className={styles['bm-key']}>선례 수준</span><span className={styles['bm-val']}>{r.precedent_level ?? '-'}</span></div>
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
