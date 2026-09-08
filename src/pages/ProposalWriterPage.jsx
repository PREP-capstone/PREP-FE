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

// CHECKLIST/TABLE 필드의 세부 구성(체크리스트 항목명, 표 컬럼명)은 아직 API 명세서
// (field-definitions 응답)에 포함돼 있지 않아, 알려진 field_key에 한해 로컬 기본값으로 채운다.
// TODO: 백엔드와 협의해 이 정보를 field-definitions 응답 자체에 포함하는 방향으로 옮기는 게 맞아 보임.
const CHECKLIST_ITEMS_BY_KEY = {
  attachment_checklist: ['사업자등록증', '최근 3개년 재무제표', '국세·지방세 납세증명서', '특허·상표 등록증(해당 시)'],
};

const TABLE_COLUMNS_BY_KEY = {
  growth_targets: ['연차', '매출(만원)', '고용(명)'],
  annual_budget_exec: ['연차', '정부출연금', '자기부담금(현금)', '자기부담금(현물)'],
};

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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildSections(fieldDefs, fieldValues) {
  return fieldDefs.map((field) => {
    const value = fieldValues[field.field_key];
    // complete API 예시 응답은 final_text를 문자열로만 보여주고 있어(§5.3), CHECKLIST/TABLE처럼
    // 구조화된 값은 일단 JSON 문자열로 직렬화해서 보낸다.
    // TODO: 이 타입 처리(특히 TABLE/CHECKLIST)가 맞는지 API 담당과 확인 필요.
    const finalText = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    return { field_key: field.field_key, final_text: finalText };
  });
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
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

      (generated?.sections ?? []).forEach((section) => {
        if (typeof initialValues[section.field_key] === 'string') {
          initialValues[section.field_key] = section.generated_text ?? '';
        }
      });

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

  function updateTableCell(fieldKey, rowIndex, colIndex, value) {
    setFieldValues((current) => {
      const rows = (current[fieldKey] ?? []).map((row) => [...row]);
      rows[rowIndex][colIndex] = value;
      return { ...current, [fieldKey]: rows };
    });
  }

  function addTableRow(fieldKey, colCount) {
    setFieldValues((current) => {
      const rows = current[fieldKey] ?? [];
      return { ...current, [fieldKey]: [...rows, Array(colCount).fill('')] };
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
    setStep('complete');

    try {
      const activeFieldDefs = fieldDefs.filter(
        (f) => f.requirement === PROPOSAL_REQUIREMENT.REQUIRED || activeOptionalKeys.has(f.field_key)
      );
      const sections = buildSections(activeFieldDefs, fieldValues);
      const result = await completeProposal(proposalId, sections);
      setExpiresAt(result?.expires_at ?? null);
    } catch (err) {
      setCompleteError(err.message || '제안서 완료 처리에 실패했어요.');
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
    const items = CHECKLIST_ITEMS_BY_KEY[field.field_key] ?? [];
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
    const columns = TABLE_COLUMNS_BY_KEY[field.field_key] ?? ['항목', '값'];
    const rows = fieldValues[field.field_key] ?? [];
    return (
      <div className={styles['table-field']}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => <th key={col}>{col}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={rowIndex}>
                {columns.map((_, colIndex) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <td key={colIndex}>
                    <input
                      value={row[colIndex] ?? ''}
                      onChange={(e) => updateTableCell(field.field_key, rowIndex, colIndex, e.target.value)}
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
        <button className={styles['table-add-row']} onClick={() => addTableRow(field.field_key, columns.length)}>
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

                    <div className={styles.bottom}>
                      <button className={styles.btn} onClick={goBackToUpload}>← 이전</button>
                      <button className={`${styles.btn} ${styles.primary}`} onClick={() => setShowConfirmModal(true)}>
                        완료 · PDF 저장하기
                      </button>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          )}

          {step === 'complete' && (
            <div className={`${styles.panel} ${styles['step3-card']}`}>
              {isCompleting && (
                <>
                  <div className={`${styles['step3-icon']} ${styles.pending}`}>⏳</div>
                  <h1>제안서 PDF를 생성하고 있습니다</h1>
                  <p style={{ color: '#888', fontSize: 13.5 }}>잠시만 기다려주세요.</p>
                </>
              )}

              {!isCompleting && completeError && (
                <>
                  <div className={`${styles['step3-icon']} ${styles.error}`}>!</div>
                  <h1>완료 처리에 실패했어요</h1>
                  <p style={{ color: '#888', fontSize: 13.5 }}>{completeError}</p>
                  <div className={styles['step3-actions']}>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={() => setShowConfirmModal(true)}>
                      다시 시도
                    </button>
                  </div>
                </>
              )}

              {!isCompleting && !completeError && !downloadError && (
                <>
                  <div className={styles['step3-icon']}>✓</div>
                  <h1>제안서 PDF가 준비되었습니다</h1>
                  <p style={{ color: '#888', fontSize: 13.5 }}>서버에는 임시로만 보관되며, 시간이 지나면 자동으로 삭제됩니다.</p>
                  <div className={styles['expiry-banner']}>⏱ {formatExpiry(expiresAt)}까지 다운로드 가능</div>
                  <div className={styles['step3-actions']}>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={handleDownload}>PDF 다운로드</button>
                  </div>
                </>
              )}

              {!isCompleting && !completeError && downloadError && (
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
