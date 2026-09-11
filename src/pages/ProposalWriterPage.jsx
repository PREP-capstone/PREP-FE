import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './FeaturePages.module.css';
import {
  getProposalFieldDefinitions,
  generateProposal,
  completeProposal,
  downloadProposalPdf,
} from '../api/proposalApi';
import {
  TEMPLATE_TYPE_OPTIONS,
  PROPOSAL_CATEGORY_ORDER,
  PROPOSAL_FIELD_TYPES,
  PROPOSAL_REQUIREMENT,
  PROPOSAL_REPORT_MAX_BYTES,
} from '../constants/proposalOptions';

// TABLE 필드의 컬럼 정의는 PREP-BE의 app/domain/proposal_llm.py TABLE_ITEM_SCHEMAS와
// field_key 단위로 정확히 일치해야 한다 (2026-09-10 백엔드 확인 기준). 각 행 객체의
// key가 그대로 이 컬럼 key와 매칭되므로, 라벨만 화면 표시용으로 붙인다.
// field-definitions 응답에 아직 TABLE 스키마 자체가 내려오지 않아, 알려진 4개
// field_key에 한해 로컬에 유지한다 (스키마가 API에 추가되면 이 맵은 걷어낼 수 있음).
const TABLE_COLUMNS_BY_KEY = {
  growth_targets: [
    { key: 'year', label: '연차' },
    { key: 'revenue_krw', label: '매출 목표(원)' },
    { key: 'headcount', label: '고용 목표(명)' },
    { key: 'basis', label: '추정 근거' },
  ],
  annual_budget_exec: [
    { key: 'year', label: '연차' },
    { key: 'government_fund_krw', label: '정부출연금(원)' },
    { key: 'self_fund_cash_krw', label: '자기부담금 현금(원)' },
    { key: 'self_fund_in_kind_krw', label: '자기부담금 현물(원)' },
  ],
  financial_projection: [
    { key: 'year', label: '연차' },
    { key: 'revenue_krw', label: '매출(원)' },
    { key: 'cost_krw', label: '비용(원)' },
    { key: 'operating_profit_krw', label: '영업이익(원)' },
  ],
  cap_table: [
    { key: 'shareholder', label: '주주 구분' },
    { key: 'equity_percent', label: '지분율(%)' },
  ],
};

function emptyTableRow(fieldKey) {
  const columns = TABLE_COLUMNS_BY_KEY[fieldKey] ?? [];
  return Object.fromEntries(columns.map((col) => [col.key, '']));
}

// IR추가 카테고리 칩은 "투자자료용"으로, 그 외 선택 항목은 "사업 내용 보완"으로 묶어 표시한다.
const INVEST_ONLY_CATEGORY = 'IR추가';

function defaultValueForFieldType(fieldType) {
  if (fieldType === PROPOSAL_FIELD_TYPES.CHECKLIST) return [];
  if (fieldType === PROPOSAL_FIELD_TYPES.TABLE) return [];
  return '';
}

// ReportPage.jsx의 formatExpiry()와 동일한 포맷(정적 "YYYY-MM-DD HH:MM" 텍스트).
// 이번 제안서 기능은 BE가 계산한 expires_at을 그대로 표시하는 것이라 프론트가 만료시각을
// 직접 계산하지 않는다 — 리포트 쪽 reportCache.js의 자체 계산 로직과는 다르다 (팀 확인 완료).
function formatExpiry(value) {
  // [리뷰 P2 반영] new Date(null)은 예외 없이 1970-01-01(epoch)로 계산돼버려서,
  // expiresAt이 null/undefined로 온 경우에도 그럴듯하지만 틀린 날짜를 보여줄 위험이 있었다.
  // null/undefined와 파싱 불가능한 값은 모두 null을 반환해, 호출부에서 fallback 문구로 대체한다.
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildSections(fieldDefs, fieldValues) {
  // value 타입은 field_type을 그대로 따른다 — TEXT=문자열, CHECKLIST=문자열 배열,
  // TABLE=객체 배열. 서버가 label/field_type을 자체 조회해서 채우므로 여기서는
  // field_key + value만 보낸다 (2026-09-10 백엔드 확인: final_text/JSON 직렬화는 오답).
  return fieldDefs.map((field) => ({ field_key: field.field_key, value: fieldValues[field.field_key] }));
}

export default function ProposalWriterPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState('upload'); // 'upload' | 'edit' | 'complete'
  const [reportFile, setReportFile] = useState(null);
  const [templateType, setTemplateType] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const [fieldDefs, setFieldDefs] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [activeOptionalKeys, setActiveOptionalKeys] = useState(() => new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const [proposalId, setProposalId] = useState(null);
  const [llmStatus, setLlmStatus] = useState(null);
  // attachment_checklist 같은 CHECKLIST 필드는 백엔드가 유형별 고정 목록을 generate
  // 응답으로 채워서 준다(하드코딩 아님). 이 "전체 항목 목록"은 최초 1회만 저장해두고,
  // fieldValues[key]는 사용자가 체크 해제해서 "남긴" 하위집합을 담는다.
  const [checklistItemsByKey, setChecklistItemsByKey] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const expiryLabel = useMemo(() => formatExpiry(expiresAt), [expiresAt]);
  const [downloadError, setDownloadError] = useState('');

  const requiredFields = useMemo(
    () => fieldDefs.filter((f) => f.requirement === PROPOSAL_REQUIREMENT.REQUIRED),
    [fieldDefs]
  );
  const optionalFields = useMemo(
    () => fieldDefs.filter((f) => f.requirement === PROPOSAL_REQUIREMENT.OPTIONAL),
    [fieldDefs]
  );

  const requiredByCategory = useMemo(() => {
    const grouped = {};
    requiredFields.forEach((f) => {
      (grouped[f.category] ||= []).push(f);
    });
    return grouped;
  }, [requiredFields]);

  const categoriesInOrder = useMemo(() => {
    const known = PROPOSAL_CATEGORY_ORDER.filter((c) => requiredByCategory[c]?.length);
    // API가 내려준 category 중 로컬 순서 목록에 없는 값이 있으면 뒤에 그대로 붙인다 (누락 방지).
    const extra = Object.keys(requiredByCategory).filter((c) => !PROPOSAL_CATEGORY_ORDER.includes(c));
    return [...known, ...extra];
  }, [requiredByCategory]);

  const optionalByGroup = useMemo(() => {
    const general = optionalFields.filter((f) => f.category !== INVEST_ONLY_CATEGORY);
    const invest = optionalFields.filter((f) => f.category === INVEST_ONLY_CATEGORY);
    return { general, invest };
  }, [optionalFields]);

  function handleFileChange(e) {
    const file = e.target.files?.[0] ?? null;
    setUploadError('');
    if (!file) {
      setReportFile(null);
      return;
    }
    if (file.type !== 'application/pdf') {
      setUploadError('PDF 파일만 업로드할 수 있어요.');
      setReportFile(null);
      return;
    }
    if (file.size > PROPOSAL_REPORT_MAX_BYTES) {
      setUploadError('파일이 너무 커요. 10MB 이하 PDF로 업로드해주세요.');
      setReportFile(null);
      return;
    }
    setReportFile(file);
  }

  async function handleGoToEdit() {
    if (!reportFile || !templateType) return;
    setIsGenerating(true);
    setGenerateError('');

    try {
      const defsRes = await getProposalFieldDefinitions(templateType);
      const fields = defsRes?.fields ?? [];

      const initialValues = {};
      fields.forEach((f) => {
        initialValues[f.field_key] = defaultValueForFieldType(f.field_type);
      });

      const generated = await generateProposal({ reportFile, templateType, fieldValues: initialValues });
      setProposalId(generated?.proposal_id ?? null);
      setLlmStatus(generated?.llm_status ?? 'ok');

      // [2026-09-10 백엔드 확인] section.generated_text가 아니라 section.value로 온다.
      // 또한 CHECKLIST/TABLE도 이 값을 그대로 받아야 해서(예: attachment_checklist는
      // 서버가 유형별 고정 목록을 채워서 줌, growth_targets는 3개년 표 전체), 타입을
      // 가리지 않고 전부 덮어쓴다 — 기존 typeof==='string' 가드가 이걸 막고 있었음.
      (generated?.sections ?? []).forEach((section) => {
        initialValues[section.field_key] = section.value;
      });

      const checklistMaster = {};
      fields.forEach((f) => {
        if (f.field_type === PROPOSAL_FIELD_TYPES.CHECKLIST) {
          checklistMaster[f.field_key] = Array.isArray(initialValues[f.field_key]) ? initialValues[f.field_key] : [];
          // 서버가 제공한 항목 목록은 표시용으로만 사용하고, 준비 완료 상태는 사용자가 직접 선택한다.
          initialValues[f.field_key] = [];
        }
      });
      setChecklistItemsByKey(checklistMaster);

      setFieldDefs(fields);
      setFieldValues(initialValues);
      setActiveOptionalKeys(new Set());
      setStep('edit');
    } catch (err) {
      setGenerateError(err.message || '초안 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  }

  function updateFieldValue(fieldKey, value) {
    setFieldValues((current) => ({ ...current, [fieldKey]: value }));
  }

  function toggleChecklistItem(fieldKey, item) {
    setFieldValues((current) => {
      const list = current[fieldKey] ?? [];
      const next = list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
      return { ...current, [fieldKey]: next };
    });
  }

  function updateTableCell(fieldKey, rowIndex, colKey, value) {
    setFieldValues((current) => {
      const rows = (current[fieldKey] ?? []).map((row) => ({ ...row }));
      rows[rowIndex][colKey] = value;
      return { ...current, [fieldKey]: rows };
    });
  }

  function addTableRow(fieldKey) {
    setFieldValues((current) => {
      const rows = current[fieldKey] ?? [];
      return { ...current, [fieldKey]: [...rows, emptyTableRow(fieldKey)] };
    });
  }

  function removeTableRow(fieldKey, rowIndex) {
    setFieldValues((current) => {
      const rows = current[fieldKey] ?? [];
      return { ...current, [fieldKey]: rows.filter((_, i) => i !== rowIndex) };
    });
  }

  function toggleOptionalChip(fieldKey, fieldType) {
    setActiveOptionalKeys((current) => {
      const next = new Set(current);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
        setFieldValues((values) => ({ ...values, [fieldKey]: values[fieldKey] ?? defaultValueForFieldType(fieldType) }));
      }
      return next;
    });
  }

  async function handleConfirmComplete() {
    setShowConfirmModal(false);
    setIsCompleting(true);
    setCompleteError('');
    // [리뷰 P1 반영] setStep('complete')를 API 호출 전에 먼저 부르면, complete가 4xx로
    // 실패해도 사용자가 이미 완료 화면으로 넘어가버려 편집 화면으로 돌아갈 수 없었다.
    // 이제 성공했을 때만 'complete' 스텝으로 이동하고, 실패하면 edit 스텝에 머물러
    // completeError를 보여주면서 내용을 고쳐 다시 완료를 시도할 수 있게 한다.

    try {
      const activeFieldDefs = fieldDefs.filter(
        (f) => f.requirement === PROPOSAL_REQUIREMENT.REQUIRED || activeOptionalKeys.has(f.field_key)
      );
      const sections = buildSections(activeFieldDefs, fieldValues);
      // [2026-09-10 백엔드 확인] template_type을 안 보내는 게 422의 직접 원인이었음.
      const result = await completeProposal(proposalId, templateType, sections);
      setExpiresAt(result?.expires_at ?? null);
      setStep('complete');
    } catch (err) {
      setCompleteError(err.message || '제안서 완료 처리에 실패했어요. 내용을 확인하고 다시 시도해주세요.');
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleDownload() {
    setDownloadError('');
    try {
      const blob = await downloadProposalPdf(proposalId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'prep-proposal.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // PROPOSAL_NOT_FOUND(404) 등 — "만료되었습니다"류 메시지만 보여주고 별도 화면 이동은 하지 않는다 (팀 결정).
      setDownloadError(err.message || '제안서를 찾을 수 없거나 만료되었어요.');
    }
  }

  function goBackToUpload() {
    setStep('upload');
  }

  function renderTextField(field) {
    const value = fieldValues[field.field_key] ?? '';
    return (
      <textarea
        className={!value ? styles.blank : ''}
        value={value}
        placeholder="아직 작성되지 않았어요. 직접 입력해주세요."
        onChange={(e) => updateFieldValue(field.field_key, e.target.value)}
      />
    );
  }

  function renderChecklistField(field) {
    const items = checklistItemsByKey[field.field_key] ?? [];
    const checked = fieldValues[field.field_key] ?? [];
    return (
      <div className={styles.checklist}>
        {items.map((item) => (
          <label className={styles['check-row']} key={item}>
            <input
              type="checkbox"
              checked={checked.includes(item)}
              onChange={() => toggleChecklistItem(field.field_key, item)}
            />
            {item}
          </label>
        ))}
      </div>
    );
  }

  function renderTableField(field) {
    const columns = TABLE_COLUMNS_BY_KEY[field.field_key] ?? [];
    const rows = fieldValues[field.field_key] ?? [];
    return (
      <div className={styles['table-field']}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => <th key={col.key}>{col.label}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={rowIndex}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <input
                      value={row[col.key] ?? ''}
                      onChange={(e) => updateTableCell(field.field_key, rowIndex, col.key, e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <button className={styles['table-add-row']} onClick={() => removeTableRow(field.field_key, rowIndex)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className={styles['table-add-row']} onClick={() => addTableRow(field.field_key)}>
          + 행 추가
        </button>
      </div>
    );
  }

  function renderField(field) {
    if (field.field_type === PROPOSAL_FIELD_TYPES.CHECKLIST) return renderChecklistField(field);
    if (field.field_type === PROPOSAL_FIELD_TYPES.TABLE) return renderTableField(field);
    return renderTextField(field);
  }

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
        </header>

        <section className={`${styles.workspace} ${styles.wide}`}>
          <div className={styles.steps}>
            <div className={`${styles['step-item']} ${step === 'upload' ? styles.active : ''} ${step !== 'upload' ? styles.done : ''}`}>
              <span className={styles['step-num']}>1</span>업로드·유형선택
            </div>
            <div className={styles['step-sep']} />
            <div className={`${styles['step-item']} ${step === 'edit' ? styles.active : ''} ${step === 'complete' ? styles.done : ''}`}>
              <span className={styles['step-num']}>2</span>초안 편집
            </div>
            <div className={styles['step-sep']} />
            <div className={`${styles['step-item']} ${step === 'complete' ? styles.active : ''}`}>
              <span className={styles['step-num']}>3</span>완료·다운로드
            </div>
          </div>

          {step === 'upload' && (
            <div className={`${styles.panel} ${styles['page-head']}`} style={{ display: 'block' }}>
              <h1>검진 결과 업로드 및 지원사업 유형 선택</h1>
              <p className={styles['head-desc']}>아이디어 검진 리포트 PDF를 업로드하고, 작성할 제안서 유형을 선택하세요.</p>

              <label className={styles.upload}>
                <input type="file" accept="application/pdf" hidden onChange={handleFileChange} />
                <div className={styles['upload-icon']}>PDF</div>
                <div className={styles['upload-title']}>{reportFile ? reportFile.name : '검진 리포트 PDF를 업로드하세요'}</div>
                <div className={styles['upload-text']}>PDF 파일만 가능 · 최대 10MB</div>
              </label>
              {uploadError && <p className={styles.hint}>{uploadError}</p>}

              <div className={styles['type-grid']}>
                {TEMPLATE_TYPE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={`${styles['type-card']} ${templateType === option.value ? styles.selected : ''}`}
                    onClick={() => setTemplateType(option.value)}
                  >
                    <h3>{option.label}</h3>
                    <div className={styles['type-sub']}>{option.sublabel}</div>
                    <p>{option.description}</p>
                  </div>
                ))}
              </div>

              {generateError && <p className={styles.hint}>{generateError}</p>}

              <div className={styles['step-footer']}>
                <span />
                <button
                  className={`${styles.btn} ${styles.primary}`}
                  disabled={!reportFile || !templateType || isGenerating}
                  onClick={handleGoToEdit}
                >
                  {isGenerating ? '초안 생성 중...' : '다음 · 초안 생성'}
                </button>
              </div>
            </div>
          )}

          {step === 'edit' && (
            <div className={`${styles.layout} ${styles.proposal}`}>
              <aside className={`${styles.panel} ${styles.side}`}>
                <h2 className={styles['section-title']}>문서 구성 (필수)</h2>
                <div className={styles['progress-list']}>
                  {categoriesInOrder.map((category) => (
                    <div className={styles['progress-row']} key={category}>
                      {category}
                    </div>
                  ))}
                </div>

                <h2 className={styles['section-title']} style={{ marginTop: 22 }}>선택 항목 추가하기</h2>
                {optionalByGroup.general.length > 0 && (
                  <div className={styles['chip-cat']}>
                    <div className={styles['chip-cat-label']}>사업 내용 보완</div>
                    <div className={styles['chip-grid']}>
                      {optionalByGroup.general.map((field) => (
                        <span
                          key={field.field_key}
                          className={`${styles.chip} ${activeOptionalKeys.has(field.field_key) ? styles.active : ''}`}
                          onClick={() => toggleOptionalChip(field.field_key, field.field_type)}
                        >
                          {field.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {optionalByGroup.invest.length > 0 && (
                  <div className={styles['chip-cat']}>
                    <div className={styles['chip-cat-label']}>투자자료용</div>
                    <div className={styles['chip-grid']}>
                      {optionalByGroup.invest.map((field) => (
                        <span
                          key={field.field_key}
                          className={`${styles.chip} ${activeOptionalKeys.has(field.field_key) ? styles.active : ''}`}
                          onClick={() => toggleOptionalChip(field.field_key, field.field_type)}
                        >
                          {field.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </aside>

              <section className={`${styles.panel} ${styles.editor}`}>
                <div className={styles['content-head']}>
                  <div>
                    <h2>제안서 편집</h2>
                    <p>빈칸(옅은 주황색)만 직접 채우면 됩니다. 나머지는 AI 초안이 반영되어 있습니다.</p>
                  </div>
                </div>

                {llmStatus && llmStatus !== 'ok' && (
                  <p className={styles.hint}>
                    ⚠️ AI 초안 생성이 일시적으로 실패했어요. &quot;[자동 생성 실패 -- 직접 입력해주세요: ...]&quot;로
                    표시된 항목은 직접 작성해주세요.
                  </p>
                )}

                <div className={styles['paper-area']}>
                  <article className={styles.paper}>
                    {categoriesInOrder.map((category, idx) => (
                      <section className={styles['doc-section']} key={category}>
                        <h3><span className={styles.num}>{idx + 1}</span>{category}</h3>
                        {requiredByCategory[category].map((field) => (
                          <div key={field.field_key} style={{ marginBottom: 16 }}>
                            <p style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{field.label}</p>
                            {renderField(field)}
                          </div>
                        ))}
                      </section>
                    ))}

                    <div className={styles['optional-zone']}>
                      <div className={styles['optional-zone-head']}>
                        <h2>선택 항목</h2>
                        <p>왼쪽에서 추가한 항목이 여기 나타납니다.</p>
                      </div>
                      {activeOptionalKeys.size === 0 && (
                        <div className={styles['optional-empty']}>아직 추가된 선택 항목이 없습니다.</div>
                      )}
                      {optionalFields
                        .filter((field) => activeOptionalKeys.has(field.field_key))
                        .map((field) => (
                          <div className={styles['opt-item']} key={field.field_key}>
                            <div className={styles['opt-item-top']}>
                              <h4>{field.label}</h4>
                              <button
                                className={styles['remove-chip-btn']}
                                onClick={() => toggleOptionalChip(field.field_key, field.field_type)}
                              >
                                ✕
                              </button>
                            </div>
                            {renderField(field)}
                          </div>
                        ))}
                    </div>

                    {completeError && (
                      <p style={{ color: '#b8590a', fontSize: 12.5, marginBottom: 10 }}>{completeError}</p>
                    )}
                    <div className={styles.bottom}>
                      <button className={styles.btn} onClick={goBackToUpload} disabled={isCompleting}>← 이전</button>
                      <button
                        className={`${styles.btn} ${styles.primary}`}
                        onClick={() => setShowConfirmModal(true)}
                        disabled={isCompleting}
                      >
                        {isCompleting ? '처리 중...' : '완료 · PDF 저장하기'}
                      </button>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          )}

          {step === 'complete' && (
            <div className={`${styles.panel} ${styles['step3-card']}`}>
              {/* [리뷰 P1 반영] 이 스텝은 complete API가 성공했을 때만 진입하므로,
                  여기서는 더 이상 '생성 중'/'완료 실패' 상태를 다룰 필요가 없다. */}
              {!downloadError && (
                <>
                  <div className={styles['step3-icon']}>✓</div>
                  <h1>제안서 PDF가 준비되었습니다</h1>
                  <p style={{ color: '#888', fontSize: 13.5 }}>서버에는 임시로만 보관되며, 시간이 지나면 자동으로 삭제됩니다.</p>
                  {expiryLabel ? (
                    <div className={styles['expiry-banner']}>⏱ {expiryLabel}까지 다운로드 가능</div>
                  ) : (
                    // [리뷰 P2 반영] expiresAt이 null/undefined로 오는 경우 형식이 깨진 문구를
                    // 그대로 보여주지 않고, 별도의 안내 문구로 대체한다.
                    <div className={styles['expiry-banner']}>⏱ 완료 시점 기준 일정 시간 동안만 다운로드할 수 있어요</div>
                  )}
                  <div className={styles['step3-actions']}>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={handleDownload}>PDF 다운로드</button>
                  </div>
                </>
              )}

              {downloadError && (
                <>
                  <div className={`${styles['step3-icon']} ${styles.error}`}>!</div>
                  <h1>만료되었습니다</h1>
                  <p style={{ color: '#888', fontSize: 13.5 }}>{downloadError}</p>
                  <div className={styles['step3-actions']}>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={() => navigate('/')}>메인으로 가기</button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </main>

      {showConfirmModal && (
        <div className={styles.overlay} role="presentation" onClick={() => setShowConfirmModal(false)}>
          <section
            className={`${styles.modal} ${styles.small}`}
            role="dialog"
            aria-modal="true"
            aria-label="제안서 완료 확인"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles['modal-head']}>
              <h2>제안서를 완료할까요?</h2>
            </div>
            <p className={styles['modal-body-text']}>
              완료 버튼을 누르면 더 이상 수정할 수 없습니다.<br />내용을 다시 확인하셨나요?
            </p>
            <div className={styles['modal-actions']}>
              <button className={styles.btn} onClick={() => setShowConfirmModal(false)}>취소</button>
              <button className={`${styles.btn} ${styles.primary}`} onClick={handleConfirmComplete}>완료하기</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
