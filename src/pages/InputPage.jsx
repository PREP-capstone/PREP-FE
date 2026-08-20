import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { cx } from '../utils/cx';
import { evaluateGate } from '../data/reportMock';
import styles from './InputPage.module.css';

const TITLES = ['서비스를 설명해주세요', '주요 타겟과 수집할 데이터를 선택해주세요', '수집 방법 및 활용 목적을 설정해주세요'];
const DESCS = [
  '어떤 웰니스 서비스를 만들고 싶으신가요?',
  '복수 선택 가능 — 타겟은 시장 규모, 데이터는 규제 리스크 계산에 활용됩니다',
  'GATE 판정과 규제 위험도 산출에 활용됩니다',
];

const AGE_TAGS = ['10대', '20대', '30대', '40대', '50대', '60대 이상'];
const PERSONA_TAGS = [
  { label: '직장인', icon: 'ti-briefcase' },
  { label: '프리랜서·자영업자', icon: 'ti-device-laptop' },
  { label: '수험생', icon: 'ti-pencil' },
  { label: '대학생', icon: 'ti-school' },
  { label: '1인 가구', icon: 'ti-home' },
  { label: '주부 및 육아', icon: 'ti-home-heart' },
  { label: '임산부', icon: 'ti-baby-carriage' },
  { label: '갱년기', icon: 'ti-thermometer' },
  { label: '만성질환자', icon: 'ti-heartbeat' },
  { label: '재활·회복기 환자', icon: 'ti-wheelchair' },
  { label: '다이어트·체중관리', icon: 'ti-scale' },
  { label: '영양 불균형·식습관 개선', icon: 'ti-salad' },
  { label: '운동 관심층', icon: 'ti-barbell' },
  { label: '수면 관심층', icon: 'ti-moon' },
  { label: '정신건강·에너지관리', icon: 'ti-brain' },
  { label: '여성건강 관심층', icon: 'ti-gender-female' },
];
const LIFESTYLE_TAGS = [
  { label: '걸음 수', icon: 'ti-shoe' },
  { label: '수면 시간', icon: 'ti-moon' },
  { label: '식단 사진', icon: 'ti-salad' },
  { label: '활동량', icon: 'ti-run' },
  { label: '기분 기록', icon: 'ti-mood-smile' },
];
const BIO_TAGS = [
  { label: '심박수', icon: 'ti-heart-rate-monitor' },
  { label: '혈압', icon: 'ti-activity' },
  { label: '혈당', icon: 'ti-droplet' },
  { label: '체중', icon: 'ti-scale' },
  { label: '체성분', icon: 'ti-body-scan' },
];
const BEHAVIOR_TAGS = [
  { label: '앱 체류 시간', icon: 'ti-clock' },
  { label: '구매 이력', icon: 'ti-shopping-cart' },
  { label: '위치 정보', icon: 'ti-map-pin' },
];

const METHOD_OPTS = [
  { name: '사용자 자가 입력', sub: '앱에서 직접 기록' },
  { name: '웨어러블 연동', sub: 'HealthKit · Google Fit' },
  { name: '병원 · 임상 데이터', sub: 'EMR · 보험사 DB' },
];
const FORM_OPTS = [
  { name: '모바일 앱', sub: 'iOS · Android' },
  { name: '웹 서비스', sub: '브라우저 기반' },
  { name: '웨어러블 기기', sub: '하드웨어 기반' },
];
const PURPOSE_OPTS = [
  { name: '단순 기록·저장', sub: '기록만 보여주기' },
  { name: '비교·추이 분석', sub: '평균 비교, 추이 시각화' },
  { name: '위험 알림', sub: '정상 범위 이탈 시 경고' },
  { name: '수치 예측·진단', sub: '미래 예측 또는 상태 진단' },
];

const EXAMPLES = [
  '수면 패턴을 분석해서 맞춤형 수면 루틴을 추천하는 모바일 앱을 만들고 싶어요. 직장인의 수면 부족 문제를 해결하는 게 목표예요.',
  '사용자의 걸음 수와 식단을 기록하면 주간 리포트로 정리해주는 건강관리 앱입니다. 헬스 초보자가 타겟이에요.',
  '스트레스 지수와 명상 기록을 바탕으로 정신건강 콘텐츠를 추천해주는 웰니스 플랫폼을 구상 중입니다.',
];

// -1: '선택 안 함'을 포함한 다중 선택 토글 (선택 안 함을 고르면 나머지 해제)
function toggleRadioSet(sel, idx) {
  const next = new Set(sel);
  if (idx === -1) {
    next.clear();
    next.add(-1);
  } else {
    next.delete(-1);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    if (next.size === 0) next.add(-1);
  }
  return next;
}

export default function InputPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState({}); // { label: group }
  const [etcInput, setEtcInput] = useState('');
  const [mSel, setMSel] = useState(new Set([-1]));
  const [fSel, setFSel] = useState(new Set([-1]));
  const [purposeSel, setPurposeSel] = useState(0);

  const warnShort = desc.trim().length > 0 && desc.trim().length < 10;

  const etcTags = useMemo(
    () => Object.entries(tags).filter(([, g]) => g === 'E').map(([label]) => label),
    [tags]
  );

  function goStep(n) {
    setStep(n);
    window.scrollTo(0, 0);
  }

  function toggleTag(group, label) {
    setTags((prev) => {
      const next = { ...prev };
      if (next[label]) delete next[label];
      else next[label] = group;
      return next;
    });
  }

  function addEtc() {
    const v = etcInput.trim();
    if (!v || tags[v]) return;
    setTags((prev) => ({ ...prev, [v]: 'E' }));
    setEtcInput('');
  }

  function removeEtc(label) {
    setTags((prev) => {
      const next = { ...prev };
      delete next[label];
      return next;
    });
  }

  function submit(skip) {
    const trimmed = desc.trim();
    if (!trimmed) {
      alert('서비스 설명을 입력해주세요.');
      goStep(1);
      return;
    }
    if (trimmed.length < 10) {
      goStep(1);
      return;
    }

    const gate = evaluateGate({ description: trimmed, purposeIndex: purposeSel });
    navigate(gate === 'fail' ? '/report/gate-fail' : '/report', {
      state: { description: trimmed, tags, mSel: [...mSel], fSel: [...fSel], purposeSel, skip: !!skip },
    });
  }

  return (
    <div className={styles.page}>
      <Sidebar active="input" />

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles['topbar-left']}>
            <button className={styles['back-btn']} onClick={() => navigate('/')}>
              <i className="ti ti-arrow-left"></i>메인으로
            </button>
            <span className={styles['topbar-title']}>아이디어 검진</span>
          </div>
          <div className={styles['topbar-right']}>
            <div className={styles['icon-btn']}><i className="ti ti-bell"></i></div>
            <div className={styles.avatar}>김</div>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles['form-inner']}>

            {/* 스텝 헤더 */}
            <div className={styles['step-header']}>
              <h1>{TITLES[step - 1]}</h1>
              <p>{DESCS[step - 1]}</p>
              <div className={styles.progress}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cx(
                      styles,
                      'prog-bar',
                      i === step && 'active',
                      i < step && 'done'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* ══ STEP 1 ══ */}
            {step === 1 && (
              <div>
                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>1</div>
                    <h2>서비스 설명 <span className={styles.opt}>필수</span></h2>
                  </div>
                  <div className={styles.card}>
                    <textarea
                      placeholder="어떤 웰니스 서비스를 만들고 싶으신지 자유롭게 적어주세요."
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                    />

                    {warnShort && (
                      <div className={cx(styles, 'warn-box', 'show')}>
                        <i className="ti ti-alert-circle"></i>
                        <span>조금 더 자세히 설명해주세요. 최소 10자 이상 입력하시면 더 정확한 진단이 가능합니다.</span>
                      </div>
                    )}

                    <div className={styles['example-box']}>
                      <div className={styles['example-label']}>
                        <i className="ti ti-bulb"></i>이런 식으로 작성해보세요 (클릭 시 자동 입력)
                      </div>
                      <div className={styles['example-list']}>
                        {EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            className={styles['example-item']}
                            onClick={() => setDesc(ex)}
                          >
                            예시 {i + 1}. {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles['nav-btns']}>
                  <div></div>
                  <button className={styles['btn-next']} onClick={() => goStep(2)}>
                    다음 단계 <i className="ti ti-arrow-right"></i>
                  </button>
                </div>
                <div className={styles['skip-row']}>
                  <button className={styles['skip-btn']} onClick={() => submit(true)}>
                    선택 항목 건너뛰고 바로 검진 시작하기
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 2 ══ */}
            {step === 2 && (
              <div>
                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>2</div>
                    <h2>주요 타겟 <span className={styles.opt}>복수 선택 가능</span></h2>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.group}>
                      <div className={styles['group-name']}><div className={cx(styles, 'dot', 'dot-l')}></div>연령대</div>
                      <div className={styles.tags}>
                        {AGE_TAGS.map((label) => (
                          <button
                            key={label}
                            className={cx(styles, 'tag', tags[label] === 'AGE' && 'on')}
                            onClick={() => toggleTag('AGE', label)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.group} style={{ marginBottom: 0 }}>
                      <div className={styles['group-name']}><div className={cx(styles, 'dot', 'dot-m')}></div>특성 · 생활군</div>
                      <div className={styles.tags}>
                        {PERSONA_TAGS.map(({ label, icon }) => (
                          <button
                            key={label}
                            className={cx(styles, 'tag', tags[label] === 'PERSONA' && 'on')}
                            onClick={() => toggleTag('PERSONA', label)}
                          >
                            <i className={`ti ${icon}`}></i>{label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.notice}>
                      <i className="ti ti-info-circle"></i>
                      <span>주요 타겟을 선택하지 않으면 "추가 정보 입력 시 더 정확한 진단이 가능합니다"로 표시되며, 시장 규모 판단의 정확도가 낮아질 수 있습니다.</span>
                    </div>
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>3</div>
                    <h2>수집할 데이터 <span className={styles.opt}>복수 선택 가능</span></h2>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.group}>
                      <div className={styles['group-name']}><div className={cx(styles, 'dot', 'dot-l')}></div>라이프스타일</div>
                      <div className={styles.tags}>
                        {LIFESTYLE_TAGS.map(({ label, icon }) => (
                          <button
                            key={label}
                            className={cx(styles, 'tag', tags[label] === 'L' && 'on')}
                            onClick={() => toggleTag('L', label)}
                          >
                            <i className={`ti ${icon}`}></i>{label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.group}>
                      <div className={styles['group-name']}><div className={cx(styles, 'dot', 'dot-m')}></div>생체 지표</div>
                      <div className={styles.tags}>
                        {BIO_TAGS.map(({ label, icon }) => (
                          <button
                            key={label}
                            className={cx(styles, 'tag', tags[label] === 'B' && 'on')}
                            onClick={() => toggleTag('B', label)}
                          >
                            <i className={`ti ${icon}`}></i>{label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* 민감 정보 그룹은 제외되었습니다 */}
                    <div className={styles.group}>
                      <div className={styles['group-name']}><div className={cx(styles, 'dot', 'dot-m')}></div>행동 데이터</div>
                      <div className={styles.tags}>
                        {BEHAVIOR_TAGS.map(({ label, icon }) => (
                          <button
                            key={label}
                            className={cx(styles, 'tag', tags[label] === 'D' && 'on')}
                            onClick={() => toggleTag('D', label)}
                          >
                            <i className={`ti ${icon}`}></i>{label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.group} style={{ marginBottom: 0 }}>
                      <div className={styles['group-name']}><div className={cx(styles, 'dot', 'dot-l')}></div>기타</div>
                      <div className={styles['etc-row']}>
                        <input
                          className={styles['etc-inp']}
                          type="text"
                          placeholder="직접 입력 후 추가"
                          value={etcInput}
                          onChange={(e) => setEtcInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') addEtc(); }}
                        />
                        <button className={styles['add-btn']} onClick={addEtc}>
                          <i className="ti ti-plus"></i>추가
                        </button>
                      </div>
                      <div className={styles.tags} style={{ marginTop: 6 }}>
                        {etcTags.map((label) => (
                          <button key={label} className={cx(styles, 'tag', 'on')} onClick={() => removeEtc(label)}>
                            {label} <i className="ti ti-x" style={{ fontSize: 10 }}></i>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.notice}>
                      <i className="ti ti-info-circle"></i>
                      <span>수집 데이터를 선택하지 않으면 "추가 정보 입력 시 더 정확한 진단이 가능합니다"라고 표시되며, 서비스 설명만으로 진단이 진행됩니다.</span>
                    </div>
                  </div>
                </div>
                <div className={styles['nav-btns']}>
                  <button className={styles['btn-prev']} onClick={() => goStep(1)}><i className="ti ti-arrow-left"></i>이전</button>
                  <button className={styles['btn-next']} onClick={() => goStep(3)}>다음 단계 <i className="ti ti-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* ══ STEP 3 ══ */}
            {step === 3 && (
              <div>
                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>4</div>
                    <h2>데이터 수집 방법</h2>
                  </div>
                  <div className={styles.card}>
                    <div className={styles['radio-grid']}>
                      <div
                        className={cx(styles, 'rc', mSel.has(-1) && 'on')}
                        onClick={() => setMSel((s) => toggleRadioSet(s, -1))}
                      >
                        <div className={styles['rc-dot']}></div>
                        <div><div className={styles['rc-name']}>선택 안 함</div><div className={styles['rc-sub']}>서비스 설명 기반으로 진단</div></div>
                      </div>
                      {METHOD_OPTS.map((opt, i) => (
                        <div
                          key={opt.name}
                          className={cx(styles, 'rc', mSel.has(i) && 'on')}
                          onClick={() => setMSel((s) => toggleRadioSet(s, i))}
                        >
                          <div className={styles['rc-dot']}></div>
                          <div><div className={styles['rc-name']}>{opt.name}</div><div className={styles['rc-sub']}>{opt.sub}</div></div>
                        </div>
                      ))}
                    </div>
                    <div className={styles.notice}>
                      <i className="ti ti-info-circle"></i>
                      <span>선택하지 않으면 "추가 정보 입력 시 더 정확한 진단이 가능합니다"로 표시됩니다.</span>
                    </div>
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>5</div>
                    <h2>서비스 형태</h2>
                  </div>
                  <div className={styles.card}>
                    <div className={styles['radio-grid']}>
                      <div
                        className={cx(styles, 'rc', fSel.has(-1) && 'on')}
                        onClick={() => setFSel((s) => toggleRadioSet(s, -1))}
                      >
                        <div className={styles['rc-dot']}></div>
                        <div><div className={styles['rc-name']}>선택 안 함</div><div className={styles['rc-sub']}>서비스 설명 기반으로 진단</div></div>
                      </div>
                      {FORM_OPTS.map((opt, i) => (
                        <div
                          key={opt.name}
                          className={cx(styles, 'rc', fSel.has(i) && 'on')}
                          onClick={() => setFSel((s) => toggleRadioSet(s, i))}
                        >
                          <div className={styles['rc-dot']}></div>
                          <div><div className={styles['rc-name']}>{opt.name}</div><div className={styles['rc-sub']}>{opt.sub}</div></div>
                        </div>
                      ))}
                    </div>
                    <div className={styles.notice}>
                      <i className="ti ti-info-circle"></i>
                      <span>선택하지 않으면 "추가 정보 입력 시 더 정확한 진단이 가능합니다"로 표시됩니다.</span>
                    </div>
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>5</div>
                    <h2>데이터로 무엇을 하나요?</h2>
                  </div>
                  <div className={styles.card}>
                    <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                      선택하신 데이터를 어떤 목적으로 활용할 계획인지 선택해주세요. 규제 위험도 판별에 활용됩니다.
                    </p>
                    <div className={styles['radio-grid']}>
                      {PURPOSE_OPTS.map((opt, i) => (
                        <div
                          key={opt.name}
                          className={cx(styles, 'rc', purposeSel === i && 'on')}
                          onClick={() => setPurposeSel(i)}
                        >
                          <div className={styles['rc-dot']}></div>
                          <div><div className={styles['rc-name']}>{opt.name}</div><div className={styles['rc-sub']}>{opt.sub}</div></div>
                        </div>
                      ))}
                    </div>
                    <div className={styles.notice}>
                      <i className="ti ti-info-circle"></i>
                      <span>"수치 예측·진단"을 선택하면 의료기기 해당 가능성이 높아져 GATE 판정 및 규제 위험도가 더 엄격하게 산출됩니다.</span>
                    </div>
                  </div>
                </div>

                <div className={styles['nav-btns']}>
                  <button className={styles['btn-prev']} onClick={() => goStep(2)}><i className="ti ti-arrow-left"></i>이전</button>
                  <button className={styles['btn-next']} onClick={() => submit(false)}>
                    <i className="ti ti-shield-check"></i>검진 시작하기
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
