import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { cx } from '../utils/cx';
import {
  createAnalysisSession,
  getAnalysisSession,
  predictCategory,
  saveHealthData,
  updateSessionCategory,
  updateSessionTarget,
} from '../api/analysisApi';
import { API_ERROR_CODES, getApiErrorCode, isHealthDataAlreadyExistsError } from '../api/errors';
import {
  CATEGORY_1_OPTIONS,
  CATEGORY_2_OPTIONS,
  HEALTH_DATA_CATALOG_BY_NAME,
  SERVICE_ACTION_OPTIONS,
  UNKNOWN_HEALTH_DATA_ITEM_NOTICE,
} from '../constants/analysisOptions';
import { buildTargetFromUsers, isValidCategory1, isValidCategory2 } from '../utils/analysisValidation';
import styles from './InputPage.module.css';

const TITLES = [
  '서비스를 설명해주세요',
  '카테고리를 확인해주세요',
  '주요 타겟과 수집할 데이터를 선택해주세요',
  '수집 방법 및 활용 목적을 설정해주세요',
];
const DESCS = [
  '어떤 웰니스 서비스를 만들고 싶으신가요?',
  'AI가 추천한 카테고리를 확인하고, 필요하면 수정해주세요',
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

const LIFE_TAGS = [
  { label: '걸음수', icon: 'ti-shoe' },
  { label: '수면 시간', icon: 'ti-moon' },
  { label: '식단 기록', icon: 'ti-salad' },
  { label: '운동 기록', icon: 'ti-run' },
  { label: '스트레스 기록', icon: 'ti-mood-smile' },
];
const BIO_TAGS = [
  { label: '심박수', icon: 'ti-heart-rate-monitor' },
  { label: '혈압', icon: 'ti-activity' },
  { label: '체중·BMI', icon: 'ti-scale' },
  { label: '체온', icon: 'ti-thermometer' },
  { label: '산소포화도', icon: 'ti-lungs' },
];
const SENS_TAGS = [
  { label: '혈당', icon: 'ti-droplet' },
  { label: '유전자 정보', icon: 'ti-dna' },
  { label: '생리주기·임신', icon: 'ti-gender-female' },
  { label: '복용 약물', icon: 'ti-pill' },
  { label: '과거 병력·진단 이력', icon: 'ti-file-report' },
];
const BEHAVIOR_TAGS = [
  { label: '앱 체류시간', icon: 'ti-clock' },
  { label: '구매 이력', icon: 'ti-shopping-cart' },
  { label: '위치 정보', icon: 'ti-map-pin' },
];

const METHOD_OPTS = [
  { name: '사용자 자가 입력', sub: '앱에서 직접 기록', value: 'user_input' },
  { name: '기기 직접연동', sub: '제조사 앱·기기 API (예: CGM)', value: 'device_sync' },
  { name: 'OS 건강앱 연동', sub: 'HealthKit · Google Fit', value: 'os_sync' },
  { name: '병원 · 임상 데이터', sub: 'EMR · 병원 DB', value: 'institution_sync' },
];
const FORM_OPTS = [
  { name: '모바일 앱', sub: 'iOS · Android' },
  { name: '웹 서비스', sub: '브라우저 기반' },
  { name: '웨어러블 기기', sub: '하드웨어 기반' },
];
// 활용 목적 = service_actions. 라벨/경고 여부는 공통 상수(SERVICE_ACTION_OPTIONS)를 따르고,
// 서버에는 라벨이 아니라 value(record/visualize_trend/alert/predict)를 보낸다.
const PURPOSE_SUBS = {
  record: '기록만 보여주기',
  visualize_trend: '평균 비교, 추이 시각화',
  alert: '정상 범위 이탈 시 경고',
  predict: '미래 예측 또는 상태 진단',
};
const PURPOSE_OPTS = SERVICE_ACTION_OPTIONS.map((opt) => ({
  name: opt.label,
  value: opt.value,
  sub: PURPOSE_SUBS[opt.value] ?? '',
  warn: opt.hasGateWarning,
}));

// 공통 카탈로그의 group명 → InputPage 데이터 태그 코드 (복원용 역매핑)
const GROUP_TO_CODE = { lifestyle: 'L', biometric: 'B', sensitive: 'S', behavior: 'D' };

// 카테고리 옵션은 공통 상수(constants/analysisOptions)를 사용한다. 추천값(reco)은
// predict API 응답으로 채우므로 하드코딩하지 않는다.
const CAT1_OPTS = CATEGORY_1_OPTIONS;
const CAT2_OPTS = CATEGORY_2_OPTIONS;

const EXAMPLES = [
  '수면 패턴을 분석해서 맞춤형 수면 루틴을 추천하는 모바일 앱을 만들고 싶어요. 직장인의 수면 부족 문제를 해결하는 게 목표예요.',
  '사용자의 걸음 수와 식단을 기록하면 주간 리포트로 정리해주는 건강관리 앱입니다. 헬스 초보자가 타겟이에요.',
  '스트레스 지수와 명상 기록을 바탕으로 정신건강 콘텐츠를 추천해주는 웰니스 플랫폼을 구상 중입니다.',
];

// 다중 선택 토글. 'none'은 "선택 안 함"을 뜻하며 고르면 나머지가 해제됩니다.
function toggleMultiSet(setObj, key) {
  const next = new Set(setObj);
  if (key === 'none') {
    next.clear();
    next.add('none');
    return next;
  }
  next.delete('none');
  if (next.has(key)) next.delete(key);
  else next.add(key);
  if (next.size === 0) next.add('none');
  return next;
}

export default function InputPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // /input?session=... 로 들어오면 기존 세션을 이어서 편집(뒤로가기/새로고침/재검진 대응)
  const existingSessionId = searchParams.get('session');

  const [step, setStep] = useState(1);

  // 진행 중인 세션 id — POST 성공 후 채워지거나, 편집 진입 시 URL에서 복원
  const [sessionId, setSessionId] = useState(existingSessionId || null);
  // 이 세션에 health-data가 이미 등록돼 있는지 → POST/PATCH 분기 판별
  const [healthDataExists, setHealthDataExists] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(existingSessionId));

  // STEP 1
  const [svcName, setSvcName] = useState('');
  const [desc, setDesc] = useState('');
  const [warnName, setWarnName] = useState(false);

  // STEP 2 — 카테고리 (초기값 없음: predict 추천 또는 사용자 선택으로 채운다)
  const [cat1, setCat1] = useState('');
  const [cat2, setCat2] = useState('');
  const [cat1Manual, setCat1Manual] = useState('');
  const [cat2Manual, setCat2Manual] = useState('');

  // predict 추천값(신뢰도 포함) — reco 하이라이트/신뢰도 표시에 사용
  const [reco, setReco] = useState({ category_1: null, category_2: null, c1conf: null, c2conf: null });
  const [predicting, setPredicting] = useState(false);
  const [predictWarn, setPredictWarn] = useState(null);
  const [lastPredictedDesc, setLastPredictedDesc] = useState('');
  const latestPredictTextRef = useRef('');

  // STEP 3 — 타겟 & 데이터
  const [tags, setTags] = useState({}); // { label: group }
  const [etc, setEtc] = useState([]);
  const [etcInput, setEtcInput] = useState('');
  const [targetField, setTargetField] = useState('');
  const [targetEdited, setTargetEdited] = useState(false);

  // STEP 4 — 수집방법 / 형태 / 목적
  const [method, setMethod] = useState(new Set());
  const [form, setForm] = useState(new Set(['none']));
  const [purpose, setPurpose] = useState(0);

  // 백엔드 통신 상태
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── 편집 진입 시 GET으로 기존 값 복원 (뒤로가기/새로고침/재검진 대응) ──
  useEffect(() => {
    if (!existingSessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await getAnalysisSession(existingSessionId);
        if (cancelled || !detail) return;

        setSvcName(detail.service_name || '');
        setDesc(detail.service_description || '');
        if (detail.category_1) setCat1(detail.category_1);
        if (detail.category_2) setCat2(detail.category_2);

        // target 복원 (직접 수정된 값으로 취급)
        if (detail.target) {
          setTargetField(detail.target);
          setTargetEdited(true);
        }

        // target_users → 타겟 태그(AGE/PERSONA) 복원
        const restoredTags = {};
        (detail.target_users || []).forEach((label) => {
          restoredTags[label] = AGE_TAGS.includes(label) ? 'AGE' : 'PERSONA';
        });

        // health_data_items → 데이터 태그(L/B/S/D) + 기타 복원
        const restoredEtc = [];
        (detail.health_data_items || []).forEach((item) => {
          const catalog = HEALTH_DATA_CATALOG_BY_NAME[item.name];
          if (catalog) {
            restoredTags[item.name] = GROUP_TO_CODE[catalog.group] ?? 'L';
          } else {
            restoredEtc.push(item.name);
          }
        });
        setTags(restoredTags);
        setEtc(restoredEtc);

        const items = detail.health_data_items || [];
        if (items.length) {
          setHealthDataExists(true); // 이미 등록됨 → 이후 저장은 PATCH
          const restoredSource = items[0]?.source;
          if (restoredSource) setMethod(new Set([restoredSource]));
        }

        // service_actions(value) → purpose 인덱스 역매핑
        const actionValue = detail.service_actions?.[0];
        if (actionValue) {
          const idx = PURPOSE_OPTS.findIndex((o) => o.value === actionValue);
          if (idx >= 0) setPurpose(idx);
        }
      } catch (err) {
        if (!cancelled) setSubmitError(err.message || '기존 세션을 불러오지 못했어요.');
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSessionId]);

  const warnShort = desc.trim().length > 0 && desc.trim().length < 10;
  const cat1OutOfList = cat1Manual.length > 0 && !isValidCategory1(cat1Manual);
  const cat2OutOfList = cat2Manual.length > 0 && !isValidCategory2(cat2Manual);
  const hasSensitive = Object.values(tags).includes('S');
  const purposeWarn = PURPOSE_OPTS[purpose].warn;

  const targetAuto = useMemo(() => {
    const ages = Object.entries(tags).filter(([, g]) => g === 'AGE').map(([l]) => l);
    const personas = Object.entries(tags).filter(([, g]) => g === 'PERSONA').map(([l]) => l);
    // 선택 태그를 콤마로 이어붙여 target(단일 문자열, 매칭용) 구성 — 공통 유틸 사용
    return buildTargetFromUsers([...personas, ...ages]);
  }, [tags]);

  const effectiveTarget = targetEdited ? targetField : targetAuto;

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
    if (!v || etc.includes(v)) return;
    setEtc((prev) => [...prev, v]);
    setEtcInput('');
  }

  function removeEtc(label) {
    setEtc((prev) => prev.filter((l) => l !== label));
  }

  function onCat1Pill(opt) {
    setCat1(opt);
    setCat1Manual('');
  }
  function onCat2Pill(opt) {
    setCat2(opt);
    setCat2Manual('');
  }
  function onCat1ManualInput(val) {
    setCat1Manual(val);
    setCat1(val);
  }
  function onCat2ManualInput(val) {
    setCat2Manual(val);
    setCat2(val);
  }

  // 카테고리 추천 자동 호출 — service_description만 전달(POST /category-classifier/predict).
  // 응답은 세션에 자동 반영되지 않으므로, 화면 추천값(reco)과 선택값(cat1/cat2)에만 반영하고
  // 실제 저장은 submit()의 PATCH /category에서 이뤄진다.
  async function runPredict(descText) {
    const text = descText.trim();
    if (!text) return;
    latestPredictTextRef.current = text;
    setPredicting(true);
    setPredictWarn(null);
    try {
      const p = await predictCategory(text);
      if (latestPredictTextRef.current !== text) return;
      setReco({
        category_1: p?.category_1 ?? null,
        category_2: p?.category_2 ?? null,
        c1conf: p?.category_1_confidence ?? null,
        c2conf: p?.category_2_confidence ?? null,
      });
      setLastPredictedDesc(text);
      // 사용자가 아직 안 골랐을 때만 추천값으로 프리셀렉트(선택/복원값은 덮어쓰지 않음)
      if (p?.category_1) setCat1((prev) => prev || p.category_1);
      if (p?.category_2) setCat2((prev) => prev || p.category_2);
    } catch (err) {
      if (latestPredictTextRef.current !== text) return;
      // 모델 미가용(CATEGORY_MODEL_UNAVAILABLE) 등 — 화면은 계속 쓸 수 있게 안내만
      const code = getApiErrorCode(err);
      setPredictWarn(
        code === API_ERROR_CODES.CATEGORY_MODEL_UNAVAILABLE
          ? '카테고리 추천 모델을 지금 쓸 수 없어요. 아래에서 직접 선택해주세요.'
          : '카테고리 자동 추천을 불러오지 못했어요. 아래에서 직접 선택해주세요.',
      );
    } finally {
      if (latestPredictTextRef.current === text) setPredicting(false);
    }
  }

  function goNextFromStep1() {
    if (!svcName.trim()) {
      setWarnName(true);
      return;
    }
    const v = desc.trim();
    if (v.length > 0 && v.length < 10) return;
    goStep(2);
    // 카테고리 화면 진입 시 추천 자동 호출. 같은 설명으로 이미 성공한 추천만 재사용한다.
    if (lastPredictedDesc !== v && v.length >= 10) runPredict(v);
  }

  function buildAnalysisPayload(trimmedDesc) {
    const targetUsers = [
      ...Object.entries(tags).filter(([, g]) => g === 'PERSONA').map(([l]) => l),
      ...Object.entries(tags).filter(([, g]) => g === 'AGE').map(([l]) => l),
    ];

    const source = method.size > 0 ? [...method][0] : 'user_input';

    // 데이터 태그(L/B/S/D)만 검진 데이터로 — 공통 카탈로그에서 item_code·data_type·is_sensitive를 가져온다.
    // (이름으로 역조회하므로 백엔드가 요구하는 item_code가 항상 실린다 = privacy_score 정상 계산의 핵심)
    const DATA_GROUPS = new Set(['L', 'B', 'S', 'D']);
    const catalogItems = Object.entries(tags)
      .filter(([, g]) => DATA_GROUPS.has(g))
      .map(([label]) => {
        const catalog = HEALTH_DATA_CATALOG_BY_NAME[label];
        // 카탈로그에 없는 라벨(복원/오타/구버전 태그 등)은 크래시 대신 기타 항목처럼 처리한다.
        // item_code가 없으면 백엔드 점수 계산에서 제외될 뿐 에러는 아니다.
        if (!catalog) {
          return { name: label, data_type: 'text', source, is_sensitive: false, item_code: null };
        }
        return {
          name: label,
          data_type: catalog.data_type,
          source,
          is_sensitive: catalog.is_sensitive,
          item_code: catalog.item_code,
        };
      });

    // "기타 - 직접 입력" 항목: item_code 없음 → 백엔드 점수 계산에서 제외됨(에러 아님)
    const etcItems = etc.map((label) => ({
      name: label,
      data_type: 'text',
      source,
      is_sensitive: false,
      item_code: null,
    }));

    const healthDataItems = [...catalogItems, ...etcItems];

    const serviceTypeValue = form.has('none') ? null : [...form].map((i) => FORM_OPTS[i].name).join('·') || null;

    const sessionPayload = {
      service_name: svcName.trim(),
      service_description: trimmedDesc,
      target_users: targetUsers,
      service_type: serviceTypeValue,
      category_1: cat1 || null,
      category_2: cat2 || null,
      target: effectiveTarget || null,
    };

    // 활용 목적 → service_actions (라벨 아님, value로 전송)
    const purposeOpt = PURPOSE_OPTS[purpose];
    const healthDataPayload = healthDataItems.length
      ? {
          health_data_items: healthDataItems,
          processing_purpose: [purposeOpt.name],
          service_actions: [purposeOpt.value],
        }
      : null;

    return { sessionPayload, healthDataPayload };
  }

  async function submit() {
    if (!svcName.trim()) {
      setWarnName(true);
      goStep(1);
      return;
    }
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

    setSubmitError(null);
    setSubmitting(true);
    try {
      const { sessionPayload, healthDataPayload } = buildAnalysisPayload(trimmed);
      const sid = await submitToBackend(sessionPayload, healthDataPayload);
      navigate(`/report/${sid}`);
    } catch (err) {
      setSubmitError(err.message || '분석 처리 중 알 수 없는 오류가 발생했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * 백엔드 실연동 흐름 (역할분담 v2, B 담당):
   *   1) 세션 확보 — 신규면 POST /analysis-sessions, 편집이면 기존 session_id 재사용
   *   2) target 저장 — PATCH /category 에 target만 (category_1/2는 A가 STEP2에서 저장)
   *   3) 검진 데이터 저장 — 최초 POST / 이후 PATCH 자동 분기(409 방어 포함)
   * evaluate 호출은 하지 않는다. /report/:sessionId 로 이동하면 ReportContainer가
   * evaluate의 단일 책임을 갖고 실행·표시한다(리뷰 반영: 책임 위치를 리포트 화면으로 일원화).
   * @returns {Promise<string>} sessionId
   */
  async function submitToBackend(sessionPayload, healthDataPayload) {
    let sid = sessionId;

    // 1) 세션 확보
    if (!sid) {
      const session = await createAnalysisSession(sessionPayload);
      sid = session?.session_id;
      if (!sid) throw new Error('서버 응답에 session_id가 없어요.');
      setSessionId(sid);
    } else {
      // 편집 중이면 카테고리도 갱신될 수 있어 반영 (category_1/2만)
      if (sessionPayload.category_1 || sessionPayload.category_2) {
        await updateSessionCategory(sid, {
          category_1: sessionPayload.category_1,
          category_2: sessionPayload.category_2,
        });
      }
    }

    // 2) target 저장 (PATCH /category, target만)
    //    편집 중(sessionId 존재)에는 값을 비우는 수정도 서버에 반영해야 하므로 항상 호출한다.
    //    신규 생성 때는 target이 이미 createAnalysisSession에 포함됐으니 값이 있을 때만 보낸다.
    if (existingSessionId || sessionPayload.target) {
      await updateSessionTarget(sid, sessionPayload.target ?? null);
    }

    // 3) 검진 데이터 저장 (POST/PATCH 분기 + 409 방어)
    if (healthDataPayload?.health_data_items?.length) {
      try {
        await saveHealthData(sid, healthDataPayload, { exists: healthDataExists });
      } catch (err) {
        // exists 판별이 어긋나 이미 등록돼 있으면(409) PATCH로 재시도
        if (isHealthDataAlreadyExistsError(err)) {
          await saveHealthData(sid, healthDataPayload, { exists: true });
        } else {
          throw err;
        }
      }
      setHealthDataExists(true);
    }

    return sid;
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

            {restoring && (
              <div className={styles.notice} style={{ marginBottom: 16 }}>
                <i className="ti ti-loader"></i>
                <span>기존 입력 내용을 불러오는 중이에요...</span>
              </div>
            )}

            {/* 스텝 헤더 */}
            <div className={styles['step-header']}>
              <h1>{TITLES[step - 1]}</h1>
              <p>{DESCS[step - 1]}</p>
              <div className={styles.progress}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cx(styles, 'prog-bar', i === step && 'active', i < step && 'done')}
                  />
                ))}
              </div>
            </div>

            {/* ══ STEP 1 — 서비스명 · 서비스 설명 ══ */}
            {step === 1 && (
              <div>
                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>1</div>
                    <h2>서비스명 <span className={styles['req-badge']}>필수</span></h2>
                  </div>
                  <div className={styles.card}>
                    <input
                      type="text"
                      placeholder="예: 슬립케어 (SleepCare)"
                      value={svcName}
                      onChange={(e) => {
                        setSvcName(e.target.value);
                        if (e.target.value.trim().length > 0) setWarnName(false);
                      }}
                    />
                    {warnName && (
                      <div className={cx(styles, 'warn-box', 'show')}>
                        <i className="ti ti-alert-circle"></i>
                        <span>서비스명을 입력해주세요.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>2</div>
                    <h2>서비스 설명 <span className={styles['req-badge']}>필수</span></h2>
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
                          <button key={i} className={styles['example-item']} onClick={() => setDesc(ex)}>
                            예시 {i + 1}. {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles['nav-btns']}>
                  <div></div>
                  <button className={styles['btn-next']} onClick={goNextFromStep1}>
                    다음 단계 <i className="ti ti-arrow-right"></i>
                  </button>
                </div>
                <div className={styles['skip-row']}>
                  <button className={styles['skip-btn']} onClick={() => submit()} disabled={submitting}>
                    {submitting ? '검진 요청 중...' : '선택 항목 건너뛰고 바로 검진 시작하기'}
                  </button>
                </div>
                {submitError && (
                  <div className={cx(styles, 'notice', 'warn')} style={{ marginTop: 14 }}>
                    <i className="ti ti-alert-triangle"></i>
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            )}

            {/* ══ STEP 2 — 카테고리 확인 ══ */}
            {step === 2 && (
              <div>
                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>3</div>
                    <h2>카테고리 확인 <span className={styles['req-badge']}>필수</span></h2>
                  </div>
                  <div className={styles.card}>
                    <div className={styles['cat-reco']}>
                      <i className="ti ti-sparkles"></i>
                      <span>
                        {predicting
                          ? '서비스 설명을 분석해 카테고리를 추천하고 있어요...'
                          : '서비스 설명을 분석해서 아래 카테고리를 추천드렸어요. 그대로 사용하거나 다른 값으로 바꿀 수 있어요.'}
                      </span>
                    </div>

                    {predictWarn && (
                      <div className={cx(styles, 'notice', 'warn')}>
                        <i className="ti ti-alert-triangle"></i>
                        <span>{predictWarn}</span>
                      </div>
                    )}

                    <div className={styles['cat-group']}>
                      <div className={styles['cat-label']}>
                        웰니스 분야 <span className={styles['req-badge']}>필수</span>
                        {reco.category_1 && (
                          <span className={styles.opt} style={{ marginLeft: 6 }}>
                            추천: {reco.category_1}
                            {typeof reco.c1conf === 'number' ? ` (${Math.round(reco.c1conf * 100)}%)` : ''}
                          </span>
                        )}
                      </div>
                      <div className={styles['pill-grid']}>
                        {CAT1_OPTS.map((opt) => (
                          <button
                            key={opt}
                            className={cx(styles, 'pill', opt === reco.category_1 && 'reco', opt === cat1 && 'on')}
                            onClick={() => onCat1Pill(opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <div className={styles['manual-row']}>
                        <input
                          type="text"
                          placeholder="목록에 없다면 직접 입력"
                          value={cat1Manual}
                          onChange={(e) => onCat1ManualInput(e.target.value)}
                        />
                      </div>
                      {cat1OutOfList && (
                        <div className={cx(styles, 'cat-off-warn', 'show')}>
                          <i className="ti ti-alert-triangle"></i>목록에 없는 값을 입력하면 시장성·수익 구조 매칭이 되지 않을 수 있어요.
                        </div>
                      )}
                    </div>

                    <div className={styles['cat-group']}>
                      <div className={styles['cat-label']}>
                        기능 유형 <span className={styles['opt-badge']}>선택</span>
                        {reco.category_2 && (
                          <span className={styles.opt} style={{ marginLeft: 6 }}>
                            추천: {reco.category_2}
                            {typeof reco.c2conf === 'number' ? ` (${Math.round(reco.c2conf * 100)}%)` : ''}
                          </span>
                        )}
                      </div>
                      <div className={styles['pill-grid']}>
                        {CAT2_OPTS.map((opt) => (
                          <button
                            key={opt}
                            className={cx(styles, 'pill', opt === reco.category_2 && 'reco', opt === cat2 && 'on')}
                            onClick={() => onCat2Pill(opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <div className={styles['manual-row']}>
                        <input
                          type="text"
                          placeholder="목록에 없다면 직접 입력"
                          value={cat2Manual}
                          onChange={(e) => onCat2ManualInput(e.target.value)}
                        />
                      </div>
                      {cat2OutOfList && (
                        <div className={cx(styles, 'cat-off-warn', 'show')}>
                          <i className="ti ti-alert-triangle"></i>목록에 없는 값을 입력하면 시장성·수익 구조 매칭이 되지 않을 수 있어요.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles['nav-btns']}>
                  <button className={styles['btn-prev']} onClick={() => goStep(1)}><i className="ti ti-arrow-left"></i>이전</button>
                  <button className={styles['btn-next']} onClick={() => goStep(3)}>다음 단계 <i className="ti ti-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* ══ STEP 3 — 주요 타겟 & 수집할 데이터 ══ */}
            {step === 3 && (
              <div>
                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>4</div>
                    <h2>주요 타겟 <span className={styles['opt-badge']}>선택</span> <span className={styles.opt}>복수 선택 가능</span></h2>
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
                    <div className={styles.group} style={{ marginBottom: 14 }}>
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
                    <div className={styles.group} style={{ marginBottom: 0 }}>
                      <div className={styles['group-name']}><div className={cx(styles, 'dot', 'dot-m')}></div>타겟 요약</div>
                      <input
                        type="text"
                        placeholder="예: 다이어터, 20~40대"
                        value={effectiveTarget}
                        onChange={(e) => { setTargetEdited(true); setTargetField(e.target.value); }}
                      />
                      <div className={styles['target-preview']}>
                        <b>자동 채움:</b>
                        <span>
                          {targetAuto
                            ? `선택하신 태그로 "${targetAuto}"가 채워졌어요. 직접 수정도 가능해요.`
                            : '선택한 태그를 이어붙여 자동으로 채워드려요. 직접 수정도 가능해요.'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.notice}>
                      <i className="ti ti-info-circle"></i>
                      <span>이 값은 경쟁사 DB와 정밀 매칭하는 데 사용돼요. 비워두면 카테고리만으로 완화된 매칭이 진행됩니다.</span>
                    </div>
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>5</div>
                    <h2>수집할 데이터 <span className={styles['req-badge']}>필수</span> <span className={styles.opt}>복수 선택 가능</span></h2>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.group}>
                      <div className={styles['group-name']}><div className={cx(styles, 'dot', 'dot-l')}></div>라이프스타일</div>
                      <div className={styles.tags}>
                        {LIFE_TAGS.map(({ label, icon }) => (
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
                    <div className={styles.group}>
                      <div className={styles['group-name']}>
                        <div className={cx(styles, 'dot', 'dot-h')}></div>민감 정보 <span className={styles['sens-tag']}>별도 동의 필요</span>
                      </div>
                      <div className={styles.tags}>
                        {SENS_TAGS.map(({ label, icon }) => (
                          <button
                            key={label}
                            className={cx(styles, 'tag', 'sensitive', tags[label] === 'S' && 'on')}
                            onClick={() => toggleTag('S', label)}
                          >
                            <i className={`ti ${icon}`}></i>{label}
                          </button>
                        ))}
                      </div>
                      {hasSensitive && (
                        <div className={cx(styles, 'cat-off-warn', 'show')}>
                          <i className="ti ti-alert-triangle"></i>민감 정보 항목은 개인정보보호법 제23조에 따라 별도 동의가 필요해요.
                        </div>
                      )}
                    </div>
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
                        {etc.map((label) => (
                          <button key={label} className={cx(styles, 'tag', 'on')} onClick={() => removeEtc(label)}>
                            {label} <i className="ti ti-x" style={{ fontSize: 10 }}></i>
                          </button>
                        ))}
                      </div>
                      <div className={styles.notice}>
                        <i className="ti ti-info-circle"></i>
                        <span>{UNKNOWN_HEALTH_DATA_ITEM_NOTICE}</span>
                      </div>
                    </div>
                    <div className={styles.notice}>
                      <i className="ti ti-info-circle"></i>
                      <span>수집 데이터를 선택하지 않으면 "추가 정보 입력 시 더 정확한 진단이 가능합니다"라고 표시되며, 서비스 설명만으로 진단이 진행됩니다.</span>
                    </div>
                  </div>
                </div>

                <div className={styles['nav-btns']}>
                  <button className={styles['btn-prev']} onClick={() => goStep(2)}><i className="ti ti-arrow-left"></i>이전</button>
                  <button className={styles['btn-next']} onClick={() => goStep(4)}>다음 단계 <i className="ti ti-arrow-right"></i></button>
                </div>
              </div>
            )}

            {/* ══ STEP 4 — 수집 방법 / 서비스 형태 / 활용 목적 ══ */}
            {step === 4 && (
              <div>
                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>6</div>
                    <h2>데이터 수집 방법 <span className={styles['req-badge']}>필수</span> <span className={styles.opt}>복수 선택 가능</span></h2>
                  </div>
                  <div className={styles.card}>
                    <div className={styles['radio-grid']}>
                      {METHOD_OPTS.map((opt) => (
                        <div
                          key={opt.value}
                          className={cx(styles, 'rc', method.has(opt.value) && 'on')}
                          onClick={() => setMethod((s) => toggleMultiSet(s, opt.value))}
                        >
                          <div className={styles['rc-dot']}></div>
                          <div><div className={styles['rc-name']}>{opt.name}</div><div className={styles['rc-sub']}>{opt.sub}</div></div>
                        </div>
                      ))}
                    </div>
                    <div className={cx(styles, 'notice', 'warn')}>
                      <i className="ti ti-alert-triangle"></i>
                      <span>"기기 직접연동"과 "OS 건강앱 연동"이 분리되었습니다. CGM 등 침습적 기기를 제조사 앱으로 직접 연동하는 경우 반드시 "기기 직접연동"을 선택해주세요 — 규제 위험도 판정에 직접 영향을 줍니다.</span>
                    </div>
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles['sec-head']}>
                    <div className={styles['sec-num']}>7</div>
                    <h2>서비스 형태 <span className={styles['opt-badge']}>선택</span> <span className={styles.opt}>복수 선택 가능</span></h2>
                  </div>
                  <div className={styles.card}>
                    <div className={styles['radio-grid']}>
                      <div
                        className={cx(styles, 'rc', form.has('none') && 'on')}
                        onClick={() => setForm((s) => toggleMultiSet(s, 'none'))}
                      >
                        <div className={styles['rc-dot']}></div>
                        <div><div className={styles['rc-name']}>선택 안 함</div><div className={styles['rc-sub']}>서비스 설명 기반으로 진단</div></div>
                      </div>
                      {FORM_OPTS.map((opt, i) => (
                        <div
                          key={opt.name}
                          className={cx(styles, 'rc', form.has(i) && 'on')}
                          onClick={() => setForm((s) => toggleMultiSet(s, i))}
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
                    <div className={styles['sec-num']}>8</div>
                    <h2>데이터로 무엇을 하나요? <span className={styles['opt-badge']}>선택</span></h2>
                  </div>
                  <div className={styles.card}>
                    <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                      선택하신 데이터를 어떤 목적으로 활용할 계획인지 선택해주세요. 규제 위험도 판별에 활용됩니다.
                    </p>
                    <div className={styles['radio-grid']}>
                      {PURPOSE_OPTS.map((opt, i) => (
                        <div
                          key={opt.name}
                          className={cx(styles, 'rc', purpose === i && 'on')}
                          onClick={() => setPurpose(i)}
                        >
                          <div className={styles['rc-dot']}></div>
                          <div><div className={styles['rc-name']}>{opt.name}</div><div className={styles['rc-sub']}>{opt.sub}</div></div>
                        </div>
                      ))}
                    </div>
                    {purposeWarn && (
                      <div className={cx(styles, 'notice', 'warn')}>
                        <i className="ti ti-alert-triangle"></i>
                        <span>의료기기 해당 가능성이 높아져 GATE 판정 및 규제 위험도가 엄격하게 산출됩니다.</span>
                      </div>
                    )}
                  </div>
                </div>

                {submitError && (
                  <div className={cx(styles, 'notice', 'warn')} style={{ marginTop: 4, marginBottom: 4 }}>
                    <i className="ti ti-alert-triangle"></i>
                    <span>{submitError}</span>
                  </div>
                )}
                <div className={styles['nav-btns']}>
                  <button className={styles['btn-prev']} onClick={() => goStep(3)} disabled={submitting}><i className="ti ti-arrow-left"></i>이전</button>
                  <button className={styles['btn-next']} onClick={() => submit()} disabled={submitting}>
                    <i className="ti ti-shield-check"></i>{submitting ? '분석 중...' : '검진 시작하기'}
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
