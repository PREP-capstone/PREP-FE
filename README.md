# PREP — 아이디어 검진 프론트엔드

기존 정적 HTML 4개(메인 / 입력 / 리포트 / GATE FAIL 리포트)를 React + Vite + React Router 기반의
멀티페이지 웹앱으로 변환한 프로젝트입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

배포용 빌드:

```bash
npm run build
npm run preview
```

## 화면 흐름

1. **메인 (`/`)** — "검진 시작하기" 클릭 시 입력 페이지로 이동
2. **아이디어 검진 입력 (`/input`)** — 3단계 폼(서비스 설명 → 타겟/데이터 → 수집방법/목적)
   - 원본 HTML에 있던 **민감 정보(생리주기·복용 약물·과거 병력·유전자 정보·심리 상담 기록) 선택 항목은 제외**했습니다.
   - 제출 시 간단한 규칙 기반 GATE 판정을 수행합니다: 서비스 설명에 진단·의료 관련 표현이 있거나
     "데이터로 무엇을 하나요?"에서 **수치 예측·진단**을 선택하면 GATE FAIL로 판정됩니다.
3. **리포트 — GATE PASS (`/report`)** — 규제 위험도 / 데이터 확보 가능성 / 시장 현실성 / 수익 구조를 모두 확인 가능
4. **리포트 — GATE FAIL (`/report/gate-fail`)** — 규제 위험도 탭만 확인 가능하고 나머지 지표·탭은 비활성 처리됩니다.

## 그 외 변경 사항

- 각 페이지에 있던 **PNG 저장 버튼(html2canvas 기반)은 제거**했습니다.
- 리포트 내용은 원본 HTML의 목(mock) 데이터를 그대로 `src/data/reportMock.js`로 옮겨 사용합니다.
  실제 서비스에서는 이 부분을 백엔드 AI 분석 API 응답으로 교체하면 됩니다.

## 폴더 구조

```
src/
  components/   Sidebar 등 공통 컴포넌트
  pages/        MainPage, InputPage, ReportPage(+Pass/Fail 래퍼)
  data/         리포트 목 데이터 + GATE 판정 로직
  utils/        cx() 클래스네임 헬퍼
```
