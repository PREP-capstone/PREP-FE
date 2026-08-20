import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cx } from '../utils/cx';
import styles from './ReportPage.module.css';

const TABS = [
  { id: 'r', label: '규제 위험도', c: 'r' },
  { id: 'd', label: '데이터 확보', c: 'd' },
  { id: 'm', label: '시장 현실성', c: 'm' },
  { id: 'b', label: '수익 구조', c: 'b' },
];

export default function ReportPage({ data }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('r');
  const isFail = data.gate === 'fail';

  function handleTabClick(id) {
    if (isFail && id !== 'r') return; // GATE FAIL: 규제 위험도만 확인 가능
    setTab(id);
  }

  return (
    <div className={styles.page}>
      {/* 상단 네비 */}
      <div className={styles.topnav}>
        <div className={styles['nav-left']}>
          <div className={styles['logo-row']}>
            <div className={styles['logo-mark']}>P</div>
            <span className={styles['logo-name']}>PREP</span>
          </div>
          <div className={styles['nav-sep']}></div>
          <span className={styles['page-title']}>검진 결과 리포트</span>
        </div>
        <div className={styles['nav-right']}>
          <button className={styles['nav-btn']} onClick={() => navigate('/input')}>
            <i className="ti ti-arrow-left"></i>검진 다시 하기
          </button>
          <button className={cx(styles, 'nav-btn', 'disabled')} disabled>
            <i className="ti ti-wallet"></i>지원금 매칭
          </button>
        </div>
      </div>

      <div className={styles.container}>

        {/* 데이터 삭제 안내 */}
        <div className={styles['delete-notice']}>
          <i className="ti ti-clock-exclamation"></i>
          <span>해당 아이디어는 <strong>72시간 후</strong>에 삭제 처리됩니다. 결과를 미리 캡처하거나 메모해 보관해주세요.</span>
        </div>

        {/* 아이디어 헤더 */}
        <div className={styles['idea-header']}>
          <div className={styles['ih-top']}>
            <div>
              <div className={styles['app-name']}>{data.appName}</div>
              <div className={styles['app-sub']}>{data.appSub}</div>
            </div>
            {isFail ? (
              <div className={cx(styles, 'gate-badge', 'fail')}><i className="ti ti-shield-x"></i>GATE FAIL · 의료기기 가능성</div>
            ) : (
              <div className={cx(styles, 'gate-badge', 'pass')}><i className="ti ti-shield-check"></i>GATE PASS · 비의료기기</div>
            )}
          </div>
          <div className={styles['ih-tags']}>
            {data.tags.map((t) => (
              <span key={t} className={styles['ih-tag']}># {t}</span>
            ))}
          </div>
        </div>

        {/* 종합 지표 */}
        <div className={styles.indicators}>
          <div className={styles.ind}>
            <div className={styles['ind-name']}>규제 위험도</div>
            <div className={cx(styles, 'ind-val', data.indicators.reg.level)}>{data.indicators.reg.label}</div>
            <IndBar level={data.indicators.reg.level} />
          </div>
          <div className={cx(styles, 'ind', isFail && 'inactive')}>
            <div className={styles['ind-name']}>데이터 확보 가능성</div>
            <div className={cx(styles, 'ind-val', data.indicators.data.level)}>{data.indicators.data.label}</div>
            <IndBar level={data.indicators.data.level} />
          </div>
          <div className={cx(styles, 'ind', isFail && 'inactive')}>
            <div className={styles['ind-name']}>시장 현실성</div>
            <div className={cx(styles, 'ind-val', data.indicators.market.level)}>{data.indicators.market.label}</div>
            <IndBar level={data.indicators.market.level} />
          </div>
          <div className={cx(styles, 'ind', isFail && 'inactive')}>
            <div className={styles['ind-name']}>수익 구조 현실성</div>
            <div className={cx(styles, 'ind-val', data.indicators.biz.level)}>{data.indicators.biz.label}</div>
            <IndBar level={data.indicators.biz.level} />
          </div>
        </div>

        <div className={cx(styles, 'signal', data.signal.tone)}>
          {data.signal.emoji} <strong>{data.signal.title}</strong> — {data.signal.body}
        </div>

        {/* 서비스 분류 */}
        <div className={styles.section}>
          <div className={styles['sec-title']}>서비스 분류</div>
          <div className={styles['classify-grid']}>
            <div className={styles.ci}><div className={styles['ci-k']}>카테고리</div><div className={styles['ci-v']}>{data.classify.category}</div></div>
            <div className={styles.ci}><div className={styles['ci-k']}>서비스 형태</div><div className={styles['ci-v']}>{data.classify.form}</div></div>
            <div className={styles.ci}><div className={styles['ci-k']}>수집 데이터</div><div className={styles['ci-v']}>{data.classify.data}</div></div>
            <div className={styles.ci}><div className={styles['ci-k']}>수집 방법</div><div className={styles['ci-v']}>{data.classify.method}</div></div>
          </div>
          {!isFail && (
            <div className={styles['target-box']}>
              <strong>주 타겟</strong> — {data.classify.target}
            </div>
          )}

          <div className={styles['gate-box']} style={{ marginTop: 10 }}>
            <div className={styles['gate-box-head']}>
              {isFail ? (
                <div className={cx(styles, 'gate-badge', 'fail')} style={{ fontSize: 11, padding: '4px 10px' }}><i className="ti ti-shield-x"></i>GATE FAIL</div>
              ) : (
                <div className={cx(styles, 'gate-badge', 'pass')} style={{ fontSize: 11, padding: '4px 10px' }}><i className="ti ti-shield-check"></i>GATE PASS</div>
              )}
              <div className={styles['gate-box-title']}>의료기기 해당 여부 판정 결과</div>
            </div>
            <div className={styles['gate-grounds']}>
              {data.gateGrounds.map((g, i) => (
                <div key={i} className={styles['gate-ground']}>
                  <div className={cx(styles, 'g-dot', g.level)}></div>{g.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 각 기준 내용 (탭) */}
        <div className={styles.section}>
          <div className={styles.tabs}>
            {TABS.map((t) => (
              <div
                key={t.id}
                data-c={t.c}
                className={cx(styles, 'tab', tab === t.id && 'active', isFail && t.id !== 'r' && 'disabled')}
                onClick={() => handleTabClick(t.id)}
              >
                {t.label}
              </div>
            ))}
          </div>

          {/* 규제 위험도 */}
          {tab === 'r' && (
            <div>
              <div className={styles.grounds}>
                {data.regulation.grounds.map((g, i) => (
                  <div key={i} className={styles.ground}><div className={cx(styles, 'g-dot', g.level)}></div>{g.text}</div>
                ))}
              </div>

              <div className={styles['ba-section-title']}>수정이 필요한 표현</div>
              <div className={styles['ba-list']}>
                {data.regulation.beforeAfter.map((ba, i) => (
                  <div key={i} className={styles['ba-item']}>
                    <span className={styles['ba-before']}>{ba.before}</span>
                    <span className={styles['ba-arr']}>→</span>
                    <span className={styles['ba-after']}>{ba.after}</span>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                {data.regulation.actions.map((a, i) => (
                  <div key={i} className={styles.action}>
                    <div className={styles['act-n']}>{i + 1}</div>
                    <div className={styles['act-body']}>
                      <div className={styles['act-text']}>{a.text}</div>
                      <div className={styles['act-ref']}>{a.ref}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles['data-source']}><b>활용 데이터</b> · {data.regulation.dataSource}</div>
            </div>
          )}

          {/* 데이터 확보 */}
          {tab === 'd' && !isFail && (
            <div>
              <div className={styles['acq-overview']}>
                {data.acquisition.overview.map((a, i) => (
                  <div key={i} className={cx(styles, 'acq-card', a.level)}>
                    <div className={styles['acq-icon']}><i className={a.level === 'easy' ? 'ti ti-circle-check' : 'ti ti-circle-half-2'}></i></div>
                    <div className={styles['acq-name']}>{a.name}</div>
                    <div className={styles['acq-level']}>{a.level === 'easy' ? '쉬움' : a.level === 'mid' ? '중간' : '어려움'}</div>
                    <div className={styles['acq-desc']}>{a.desc}</div>
                  </div>
                ))}
              </div>
              <div className={styles.grounds}>
                {data.acquisition.grounds.map((g, i) => (
                  <div key={i} className={styles.ground}><div className={cx(styles, 'g-dot', g.level)}></div>{g.text}</div>
                ))}
              </div>

              <div className={styles['sub-title']}>🟢 지금 당장 모을 수 있는 것</div>
              <div className={styles['ds-list']}>
                {data.acquisition.now.map((d, i) => (
                  <div key={i} className={styles['ds-item']}>
                    <span className={styles['ds-name']}>{d.name}</span>
                    <div className={styles['ds-right']}>
                      <span className={cx(styles, 'diff', d.diff)}>{d.diff === 'easy' ? '쉬움' : d.diff === 'mid' ? '중간' : '어려움'}</span>
                      <span className={styles['ds-url']}>{d.url}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles['mvp-box']}>
                <div className={styles['mvp-label']}><i className="ti ti-bulb"></i>MVP 전략</div>
                {data.acquisition.mvp}
              </div>

              <div className={styles.roadmap}>
                {data.acquisition.roadmap.map((s, i) => (
                  <div key={i} className={cx(styles, 'stage', s.now && 'now')}>
                    <div className={styles['stage-lbl']}>{s.stage}</div>
                    <div className={styles['stage-name']}>{s.name}</div>
                    <div className={styles['stage-desc']}>{s.desc}</div>
                  </div>
                ))}
              </div>

              <div className={styles['data-source']}><b>활용 데이터</b> · {data.acquisition.dataSource}</div>
            </div>
          )}

          {/* 시장 현실성 */}
          {tab === 'm' && !isFail && (
            <div>
              <div className={styles['mkt-overview']}>
                {data.market.overview.map((m, i) => (
                  <div key={i} className={cx(styles, 'mkt-card', m.level)}>
                    <div className={styles['mkt-name']}>{m.name}</div>
                    <div className={styles['mkt-level']}>{m.value}</div>
                    <div className={styles['mkt-desc']}>{m.desc}</div>
                  </div>
                ))}
              </div>
              <div className={styles.grounds}>
                {data.market.grounds.map((g, i) => (
                  <div key={i} className={styles.ground}><div className={cx(styles, 'g-dot', g.level)}></div>{g.text}</div>
                ))}
              </div>

              <div className={styles['comp-grid']}>
                {data.market.competitors.map((c, i) => (
                  <div key={i} className={styles['comp-card']}>
                    <div className={styles['comp-name']}>{c.name}</div>
                    <div className={styles['comp-feat']}>✦ {c.feat}</div>
                    <div className={styles['comp-limit']}>△ {c.limit}</div>
                    <span className={cx(styles, 'comp-badge', c.badge)}>{c.badge === 'enter' ? '진입 가능' : '차별화 필요'}</span>
                  </div>
                ))}
              </div>

              <div className={styles['diff-box']}>
                <div className={styles['diff-label']}>✦ 차별화 포인트 제안</div>
                {data.market.diff}
              </div>

              <div className={styles['data-source']}><b>활용 데이터</b> · {data.market.dataSource}</div>
            </div>
          )}

          {/* 수익 구조 */}
          {tab === 'b' && !isFail && (
            <div>
              <div className={styles['bm-grid']}>
                {data.business.cards.map((c, i) => (
                  <div key={i} className={styles['bm-card']}>
                    <div className={styles['bm-type']}>{c.type}</div>
                    <div className={styles['bm-name']}>{c.name}</div>
                    <div className={styles['bm-rows']}>
                      {c.rows.map(([k, v]) => (
                        <div key={k} className={styles['bm-row']}><span className={styles['bm-key']}>{k}</span><span className={styles['bm-val']}>{v}</span></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles['data-source']}><b>활용 데이터</b> · {data.business.dataSource}</div>
            </div>
          )}
        </div>

        {/* 종합 요약 */}
        {!isFail && (
          <div className={styles.section}>
            <div className={styles['sec-title']}>종합 요약</div>
            <div className={styles['summary-text']}>{data.summary.text}</div>
            {data.summary.groups.map((g, i) => (
              <div key={i} className={styles['action-group']} style={i > 0 ? { marginTop: 14 } : undefined}>
                <div className={cx(styles, 'ag-tag', g.tag)}>{g.label}</div>
                <div className={styles['ag-steps']}>
                  {g.steps.map((s, j) => (
                    <div key={j} className={styles['ag-step']}><span className={styles['step-n']}>{j + 1}</span>{s}</div>
                  ))}
                </div>
              </div>
            ))}
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
