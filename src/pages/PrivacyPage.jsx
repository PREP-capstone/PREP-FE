import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './HelpPage.module.css';

const POLICY_ITEMS = [
  ['입력 정보', '서비스 이름, 서비스 설명, 주요 타깃, 선택한 건강 데이터, 수집 방법, 활용 목적을 검진에 사용합니다.'],
  ['리포트 임시 저장', '리포트 결과는 새로고침 복원을 위해 브라우저 sessionStorage에 10분 동안 임시 저장됩니다.'],
  ['PDF 저장', '제출이나 공유가 필요한 경우 리포트 화면에서 PDF로 저장해 직접 보관해야 합니다.'],
  ['인증 정보', 'MVP 기준으로 로그인과 인증 토큰을 사용하지 않습니다.'],
  ['검진 데이터 조건', '정확한 검진을 위해 건강 데이터는 1개 이상 선택해야 하며, 데이터 없이 검진은 실행되지 않습니다.'],
];

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <Sidebar />

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.eyebrow}>개인정보 보호 정책</div>
            <h1>PREP 입력 데이터 처리 안내</h1>
          </div>
        </div>

        <div className={styles.content}>
          <section className={styles.hero}>
            <div>
              <span className={styles.badge}>MVP 데이터 처리 기준</span>
              <h2>검진에 필요한 정보만 사용하고, 리포트는 짧게 임시 보관합니다.</h2>
              <p>
                PREP은 웰니스·헬스케어 창업 아이디어의 가능성을 분석하기 위해 사용자가 입력한
                서비스 설명과 선택 데이터를 사용합니다. 현재 프론트에서는 리포트 복원 UX를 위해
                결과를 10분 동안 브라우저에 임시 저장합니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h3>데이터 처리 방식</h3>
            <div className={styles.cards}>
              {POLICY_ITEMS.map(([title, desc]) => (
                <article key={title} className={styles.card}>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3>리포트 보관과 삭제</h3>
            <div className={styles.notice}>
              <p>
                10분 TTL은 현재 브라우저 임시 저장 기준입니다. 이 저장은 같은 브라우저 탭에서
                새로고침했을 때 리포트를 다시 보여주기 위한 UX 캐시이며, 서버 차원의 보관/삭제
                정책을 의미하지는 않습니다.
              </p>
              <p>
                리포트를 장기 보관하거나 팀에 공유해야 한다면 리포트 화면의 <b>PDF 저장</b> 버튼을
                사용해 파일로 저장해주세요.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h3>민감정보 입력 시 유의사항</h3>
            <div className={styles.notice}>
              <p>
                혈당 등 일부 건강 데이터는 민감정보로 분류될 수 있습니다. PREP은 창업 아이디어
                검진 목적의 가능성 분석을 제공하며, 실제 서비스 출시 전에는 개인정보 수집 동의,
                보관 기간, 제3자 제공 여부, 의료기기 해당성 검토를 별도로 확인해야 합니다.
              </p>
            </div>
          </section>

          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={() => navigate('/input')}>
              아이디어 검진 시작하기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
