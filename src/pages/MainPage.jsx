import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './MainPage.module.css';

export default function MainPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <Sidebar active="main" />

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles['topbar-greeting']}>안녕하세요, <b>김지연</b>님</div>
          <div className={styles['topbar-right']}>
            <div className={styles['icon-btn']}><i className="ti ti-bell"></i></div>
            <div className={styles.avatar}>김</div>
          </div>
        </div>

        <div className={styles.content}>
          {/* 히어로 */}
          <div className={styles.hero}>
            <div className={styles['hero-chip']}>
              <i className="ti ti-sparkles"></i>웰니스·헬스케어 창업 특화 플랫폼
            </div>
            <div className={styles['hero-title']}>
              아이디어의 가능성을 진단하고,<br />성공의 준비를 시작하세요.
            </div>
            <div className={styles['hero-desc']}>
              아이디어 검진부터 지원금 매칭, 창업 제안서까지<br />
              PREP이 창업의 모든 단계를 함께합니다.
            </div>
          </div>

          {/* 핵심 서비스 — 아이디어 검진 */}
          <div className={styles['main-card']} onClick={() => navigate('/input')}>
            <div className={styles['mc-left']}>
              <div className={styles['mc-icon-row']}>
                <div className={styles['mc-icon']}><i className="ti ti-shield-check"></i></div>
                <span className={styles['mc-badge']}>핵심 서비스</span>
              </div>
              <div className={styles['mc-title']}>아이디어 검진</div>
              <div className={styles['mc-desc']}>
                웰니스 창업 아이디어를 입력하면 GATE 판정 · 규제 위험도 ·<br />
                데이터 확보 가능성 · 시장 현실성 · 수익 구조를 한 번에 분석해드립니다.
              </div>
            </div>
            <div className={styles['mc-right']}>
              <button
                className={styles['mc-btn']}
                onClick={(e) => { e.stopPropagation(); navigate('/input'); }}
              >
                <i className="ti ti-arrow-right"></i>검진 시작하기
              </button>
              <div className={styles['mc-steps']}>
                <span className={styles['mc-step']}>입력</span>
                <span className={styles['mc-step']}>AI 분석</span>
                <span className={styles['mc-step']}>리포트</span>
                <span className={styles['mc-step']}>PDF 저장</span>
              </div>
            </div>
          </div>

          {/* 부가 서비스 */}
          <div className={styles['sub-divider']}>검진 후 이용 가능한 서비스</div>

          <div className={styles['sub-grid']}>
            <div className={styles['sub-card']}>
              <div className={styles['sc-top']}>
                <div className={styles['sc-icon']}><i className="ti ti-wallet"></i></div>
                <span className={styles['sc-tag']}>부가 서비스</span>
              </div>
              <div className={styles['sc-name']}>지원금 매칭</div>
              <div className={styles['sc-desc']}>검진 결과를 바탕으로 내 사업에 맞는 창업 지원사업을 자동으로 추천해드립니다.</div>
              <div className={styles['sc-arr']}>검진 후 이용 가능 <i className="ti ti-lock"></i></div>
            </div>

            <div className={styles['sub-card']}>
              <div className={styles['sc-top']}>
                <div className={styles['sc-icon']}><i className="ti ti-file-description"></i></div>
                <span className={styles['sc-tag']}>부가 서비스</span>
              </div>
              <div className={styles['sc-name']}>창업 제안서</div>
              <div className={styles['sc-desc']}>검진 결과를 기반으로 투자자·기관에 제출 가능한 창업 제안서를 자동으로 생성해드립니다.</div>
              <div className={styles['sc-arr']}>검진 후 이용 가능 <i className="ti ti-lock"></i></div>
            </div>
          </div>

          {/* 개인정보 배너 */}
          <div className={styles['priv-banner']}>
            <div className={styles['priv-left']}>
              <i className="ti ti-lock"></i>
              <span><b>개인정보 보호 정책</b> — 검진 완료 후 입력 데이터는 즉시 삭제됩니다. PDF 리포트를 미리 저장해 두세요.</span>
            </div>
            <button className={styles['priv-btn']}>자세히 보기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
