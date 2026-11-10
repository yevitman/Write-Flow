# Writing Helper 서식 정밀화 및 사용자 경험 개선 계획서

사용자가 지적한 5가지 핵심 수정사항(**1. 개요 항목 일반 본문 적용**, **2. 성경본문/제목 내 강조어구 제외**, **3. 모바일 새로고침 시 원고 자동 저장 및 복원**, **4. 전 단계 상시 비우기/새 원고 버튼 제공**, **5. 문맥 흐름 중심 어구 추출 및 단어 과다 반복 방지**)을 완벽히 해결하기 위한 상세 실행 계획서입니다.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **5대 핵심 수정 요구사항 및 기술적 해결 방안 점검**

1. **개요 항목이 제목(Heading)으로 적용되던 문제 수정 (사진 첨부 확인)**
   - **현상**: Google Docs 캡처 화면에서 'II. 개요' 아래의 `1. 태초부터 계신 말씀...`, `2. 빛을 증언하는...` 등이 Heading 2(14pt 볼드 제목)로 거대하게 서식 적용됨.
   - **원인**: 개요 제목 표기(`## II. 개요`, `**개요**`, `개요:`)의 다양한 변형으로 인해 파서의 `inOutlineSection` 플래그가 조기 종료되어 아라비아 숫자 제목(`heading_2`)으로 잘못 분류됨.
   - **해결 방안**:
     - `paragraphParser.ts`: 개요 식별 정규식을 대폭 강화하여 `II. 개요`, `## 개요`, `개요:`, `[개요]` 등 모든 패턴을 완벽 포착하고, 다음 로마 숫자(예: `III. 본문 연구`)나 대제목이 나오기 전까지의 모든 아라비아 숫자 항목(1. 2. 3.)을 **철저하게 `isOutline: true, type: 'body'`로 고정**.
     - `docxExporter.ts`: 개요 항목은 워드 목차/제목 레벨(`heading`)을 일절 부여하지 않고, **순수 본문(10pt, `body`) 규격**과 4mm 들여쓰기, 2pt 간격으로 출력.

2. **성경본문과 제목에는 강조어구가 적용되지 않도록 격리**
   - **현상**: 제목과 성경 구절 내에도 본문 강조 키워드가 매칭되어 주황색 볼드가 뒤섞여 가독성 저하.
   - **해결 방안**:
     - `docxExporter.ts`: `doc_title`, `doc_subtitle`, `heading_1`~`heading_5`, `scripture_header`, `scripture` 단락에서는 `emphasisWords`에 빈 배열(`[]`)을 전달하여 **강조어구 매칭을 원천 차단**.
     - **오직 일반 해설 본문(`body`), 개요 본문(`outline`), 일반 인용문(`quote`)에만** 강조 어구가 적용되도록 명확히 한정.
     - `FormatConversionPanel.tsx` 미리보기 렌더링 함수에서도 제목과 성경 인용구에는 키워드 하이라이트 함수를 우회하여 원본 스타일을 유지.

3. **화면 당겨서 새로고침(Pull-to-Refresh) 시 원고 소실 방지**
   - **현상**: 모바일 브라우저(Chrome 등)에서 화면을 아래로 스와이프했을 때 페이지가 새로고침되며 입력창의 원고가 증발함.
   - **해결 방안**:
     - `FormatConversionPanel.tsx`: `inputText` 변경 시 실시간으로 `localStorage`(`writing_helper_manuscript_draft`)에 자동 저장.
     - 앱 로딩 시 `localStorage`에 저장된 임시 원고가 있으면 즉시 자동 복원.
     - 본문 컨테이너에 `overscroll-behavior-y: contain` 스타일을 적용하여 의도치 않은 브라우저 당겨서 새로고침 제스처 억제.

4. **서식 적용 후에도 언제든 입력창을 비울 수 있는 상시 액션 제공**
   - **현상**: '서식 적용하기'를 눌러 문단 구조 편집(2단계)이나 미리보기(3단계)로 이동하면 1단계의 '비우기' 버튼이 화면에서 사라져 초기화 불가.
   - **해결 방안**:
     - 2단계(문단 편집) 및 3단계(미리보기) 상단 바에 **[🗑️ 새 원고 / 비우기]** 버튼을 상시 배치.
     - 클릭 시 저장된 임시 원고와 문단 목록을 깨끗이 비우고 1단계(원고 입력) 화면으로 즉시 전환.

5. **내용의 흐름 중심 문맥 어구 추출 및 동일 단어 과다 반복 방지**
   - **현상**: "하나님", "말씀", "은혜" 등 기초 명사가 본문에 수십 번 등장하면 매 문장마다 오렌지색으로 도배되어 조잡해짐.
   - **해결 방안**:
     - **문맥적 복합 어구(Compound Phrases) 우선 추출**: 단순 명사 대신 본문의 흐름을 관통하는 2~4어절의 핵심 구(예: `하나님의 어린양`, `육신이 되어 오신 말씀`, `은혜와 진리의 충만함`, `창조의 근원`, `세례 요한의 증언`, `구속사적 선언`)를 본문에서 탐색하여 추출.
     - **단어 반복 강조 빈도 제한 (Density Cap)**:
       - 한 단락 내에서는 동일 키워드가 중복 매칭되더라도 **최초 1회만 강조**하고 이후 출현은 일반 텍스트로 유지.
       - 너무 흔한 초고빈도 일반 단어("하나님", "말씀", "사람")는 단독 강조에서 제외하고, 의미 있는 맥락을 가진 구절 중심으로 강조.

---

### 1. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      FormatConversionPanel.tsx                         │
│  - localStorage 실시간 자동 임시 저장 ('writing_helper_manuscript_draft') │
│  - 단계 2, 3 상단에 [🗑️ 새 원고 / 비우기] 상시 액션 추가              │
│  - Smart Contextual Phrase Extractor (복합 어구 추출 & 과다 반복 억제) │
│  - 제목/성경본문 렌더링 시 강조 하이라이트 완전 배제                    │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌───────────────────────────────────┐ ┌──────────────────────────────────┐
│        paragraphParser.ts         │ │         docxExporter.ts          │
│ - 개요 섹션 판별식 전면 강화        │ │ - isOutline: Heading 완전 배제,  │
│   (II. 개요, ## 개요, 개요: 등)   │ │   10pt 순수 본문(body) 규격 강제  │
│ - 개요 하위 1. 2. 3.을 철저히     │ │ - 제목/성경 인용 단락은          │
│   isOutline: true, type: 'body'화 │ │   emphasisWords: []로 원천 격리   │
└───────────────────────────────────┘ └──────────────────────────────────┘
```

#### 모듈별 세부 구현 명세

1. **`src/utils/paragraphParser.ts`**:
   - `isOutlineHeaderLine(line)` 헬퍼 함수 추가:
     - `^[I|V|X]+\.\s*(.*개요|.*outline)`
     - `^#{1,3}\s*(.*개요|.*outline)`
     - `^(\[|【|■)?\s*(개요|전체\s*개요|설교\s*개요)\s*[:\]】]?`
   - 개요 구역 진입 시 다음 로마자 숫자 헤딩이나 메인 대제목(#)이 나오기 전까지 모든 숫자 항목은 `isOutline: true`, `type: 'body'`로 지정.

2. **`src/utils/docxExporter.ts`**:
   - `p.isOutline`: `heading` 옵션을 절대 넣지 않고, `size: config.bodyFontSizePt * 2` (10pt), `color: '1E293B'` 본문 텍스트 런 생성.
   - 단락별 `emphasisWords` 전달 제어:
     ```typescript
     const shouldApplyEmphasis = p.type === 'body' || p.isOutline || p.type === 'quote';
     const targetEmphasisWords = shouldApplyEmphasis ? config.emphasisWords : [];
     ```
   - 단락 내 동일 키워드 1회 제한: `parseEmphasisWordsOnly`에 `seenKeywordsInParagraph` Set을 적용하여 한 단락 내에서 같은 단어가 여러 번 반복 강조되는 것 방지.

3. **`src/components/FormatConversionPanel.tsx`**:
   - `useEffect`로 `inputText` 변경 시 `localStorage.setItem('writing_helper_manuscript_draft', inputText)` 저장 (300ms 디바운스).
   - 초기 마운트 시 `localStorage.getItem('writing_helper_manuscript_draft')`로 자동 복구.
   - `autoDetectEmphasisKeywords` 알고리즘 개선:
     - 2~4어절의 복합 어구 및 마크다운 볼드 어구 우선 탐색.
     - 단순 기초 단어("하나님", "말씀")의 단독 매칭 배제.
   - 2단계/3단계 상단 바에 `새 원고 / 비우기` 버튼 추가:
     - 클릭 시 "현재 작업 중인 원고를 비우고 새로 입력하시겠습니까?" 컨펌 후 초기화 및 1단계로 이동.

---
위 수정사항 점검 내용을 확인하신 후 **Proceed** 버튼을 눌러주시면 즉시 구현에 착수하겠습니다.
