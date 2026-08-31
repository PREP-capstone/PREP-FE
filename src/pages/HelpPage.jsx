import Sidebar from '../components/Sidebar';
import styles from './HelpPage.module.css';

const FLOW_STEPS = [
  ['서비스 설명 입력', '아이디어 이름과 핵심 기능을 적으면 검진 세션이 만들어집니다.'],
  ['카테고리 확인', 'AI 추천 카테고리를 확인하고 필요하면 직접 바꿔 확정합니다.'],
  ['타깃·데이터 입력', '주요 고객과 수집할 건강 데이터를 선택해 분석 근거를 채웁니다.'],
  ['수집·활용 방식 선택', '직접 입력, 기기 연동, OS 건강앱 연동 등 수집 방식을 고릅니다.'],
  ['검진 결과 확인', 'GATE 판정, 규제 위험, 데이터 확보 가능성, 시장성, BM 추천을 리포트로 봅니다.'],
];

const REPORT_ITEMS = [
  ['GATE 판정', '의료기기 가능성이 있는지 먼저 확인합니다. FAIL이면 이후 사업화 방향을 조정해야 합니다.'],
  ['규제 위험도', '의료행위 표현, 개인정보 민감도, 광고 표현 위험을 나눠 보여줍니다.'],
  ['데이터 확보 가능성', '선택한 데이터가 MVP에서 확보 가능한지, 민감정보 동의가 필요한지 확인합니다.'],
  ['시장 현실성', '유사 서비스와 진입 가능성을 바탕으로 시장성을 점검합니다.'],
  ['수익 구조', '현재 아이디어와 맞는 BM 패턴과 선례 수준을 추천합니다.'],
];

export default function HelpPage() {
  return (
    <div className={styles.page}>
      <Sidebar active="help" />

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.eyebrow}>서비스 도움말</div>
            <h1>PREP 아이디어 검진 안내</h1>
          </div>
        </div>

        <div className={styles.content}>
          <section className={styles.hero}>
            <div>
              <span className={styles.badge}>웰니스·헬스케어 창업 검진</span>
              <h2>아이디어가 규제와 시장을 통과할 수 있는지 빠르게 점검합니다.</h2>
              <p>
                PREP은 웰니스·헬스케어 서비스 아이디어를 입력하면 의료기기 가능성,
                개인정보·광고 표현 위험, 데이터 확보 난이도, 시장 현실성, 수익 구조를
                한 번에 정리해주는 창업 준비 플랫폼입니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h3>아이디어 검진 흐름</h3>
            <div className={styles.steps}>
              {FLOW_STEPS.map(([title, desc], index) => (
                <div key={title} className={styles.step}>
                  <div className={styles.stepNo}>{index + 1}</div>
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3>리포트에서 확인할 수 있는 것</h3>
            <div className={styles.cards}>
              {REPORT_ITEMS.map(([title, desc]) => (
                <article key={title} className={styles.card}>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3>PDF 저장과 리포트 보관</h3>
            <div className={styles.notice}>
              <p>
                리포트 화면의 <b>PDF 저장</b> 버튼을 누르면 브라우저 인쇄 창이 열립니다.
                Chrome이나 Safari에서는 대상 또는 프린터 항목에서 <b>PDF로 저장</b>을 선택하면
                파일로 내려받을 수 있습니다.
              </p>
              <p>
                현재 리포트는 브라우저에 10분 동안 임시 저장됩니다. 이 저장은 화면 복원용 캐시이므로,
                제출이나 공유가 필요하면 PDF로 저장해두는 것이 안전합니다.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
