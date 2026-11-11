/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_BASE_PROMPT } from './constants/defaultPrompt';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ConfirmModal } from './components/ConfirmModal';
import { PromptPreviewModal } from './components/PromptPreviewModal';
import { FormatConversionPanel } from './components/FormatConversionPanel';
import { OptionSelectModal, OptionItem } from './components/OptionSelectModal';
import {
  RotateCcw,
  Eye,
  Check,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

const STORAGE_KEY_BASE = 'ai_writer_base_v67';
const STORAGE_KEY_SETTINGS = 'ai_writer_settings_v67';

const AVAILABLE_FORMATS = [
  '완성 원고',
  '연구 보고서',
  '블로그 글',
  '강의안',
  '실무 문서',
  '영상 대본',
  '핵심 요약',
];

const DOMAIN_OPTIONS: OptionItem[] = [
  { value: '자동 판별', label: '전문 분야: 자동 판별', badge: '기본' },
  { value: '학술·전문 연구', label: '학술·전문 연구' },
  { value: '역사·인물 연구', label: '역사·인물 연구' },
  { value: '의학·건강 연구', label: '의학·건강 연구' },
  { value: '과학·기술 연구', label: '과학·기술 연구' },
  { value: '경제·금융·주식 연구', label: '경제·금융·주식 연구' },
  { value: '사회·시사·정책 분석', label: '사회·시사·정책 분석' },
  { value: '일반 정보·지식 블로그', label: '일반 정보·지식 블로그' },
  { value: '창작·에세이·스토리텔링', label: '창작·에세이·스토리텔링' },
  { value: '업무·실무 문서', label: '업무·실무 문서' },
  { value: '유튜브·쇼츠·온라인 콘텐츠', label: '유튜브·쇼츠·온라인 콘텐츠' },
  { value: '법률·제도 및 행정 연구', label: '법률·제도 및 행정 연구' },
];

const WORK_OPTIONS: OptionItem[] = [
  { value: '자동 판별', label: '작업 유형: 자동 판별', badge: '기본' },
  { value: '심층 연구형', label: '심층 연구형' },
  { value: '정보 설명형', label: '정보 설명형' },
  { value: '창작형', label: '창작형' },
  { value: '실무 문서형', label: '실무 문서형' },
  { value: '온라인 콘텐츠형', label: '온라인 콘텐츠형' },
];

const AUDIENCE_OPTIONS: OptionItem[] = [
  { value: '주제에 맞게 판단', label: '대상 독자: 주제에 맞게 판단', badge: '기본' },
  { value: '일반 독자', label: '일반 독자' },
  { value: '초급 학습자', label: '초급 학습자' },
  { value: '전문가·전공자', label: '전문가·전공자' },
  { value: '학생·교육 대상', label: '학생·교육 대상' },
  { value: '온라인 시청자', label: '온라인 시청자' },
];

const LENGTH_OPTIONS: OptionItem[] = [
  { value: '주제에 맞게 판단', label: '작성 분량: 주제에 맞게 판단', badge: '기본' },
  { value: '짧고 핵심적으로', label: '짧고 핵심적으로' },
  { value: '보통 분량', label: '보통 분량' },
  { value: '상세하고 충분하게', label: '상세하고 충분하게' },
  { value: 'A4 3~5장', label: 'A4 3~5장' },
  { value: 'A4 5~7장', label: 'A4 5~7장' },
  { value: '사용자 지정 요구 우선', label: '사용자 지정 요구 우선' },
];

const STYLE_OPTIONS: OptionItem[] = [
  { value: '주제와 독자에 맞게 판단', label: '주제와 독자에 맞게 판단', badge: '기본' },
  { value: '문어체 평서문', label: '문어체 평서문' },
  { value: '쉽고 간결한 설명체', label: '쉽고 간결한 설명체' },
  { value: '학술적·전문적 문체', label: '학술적·전문적 문체' },
  { value: '친근한 블로그 문체', label: '친근한 블로그 문체' },
  { value: '설득력 있는 콘텐츠 문체', label: '설득력 있는 콘텐츠 문체' },
];

const RESEARCH_OPTIONS: OptionItem[] = [
  { value: '작업 목적에 맞게 판단', label: '작업 목적에 맞게 판단', badge: '기본' },
  { value: '기초 지식 중심', label: '기초 지식 중심' },
  { value: '근거 확인 및 교차 검증', label: '근거 확인 및 교차 검증' },
  { value: '최신 자료와 학술 연구까지 심층 조사', label: '최신 자료와 학술 연구까지 심층 조사' },
  { value: '사용자가 제공한 자료만 활용', label: '사용자가 제공한 자료만 활용' },
];

const CITATION_OPTIONS: OptionItem[] = [
  { value: '필요한 경우 출처 제시', label: '필요한 경우 출처 제시', badge: '기본' },
  { value: '핵심 주장마다 근거와 출처 표시', label: '핵심 주장마다 근거와 출처 표시' },
  { value: '학술 인용 형식', label: '학술 인용 형식' },
  { value: '본문 내 출처와 참고문헌 구분', label: '본문 내 출처와 참고문헌 구분' },
  { value: '외부 자료 조사 없이 작성', label: '외부 자료 조사 없이 작성' },
];

interface SettingsState {
  style: string;
  research: string;
  citation: string;
  fixed: string;
}

const STORAGE_KEY_FORMAT = 'ai_writer_format_v1';

interface FormatSettingsState {
  fontFamily: string;
  bodyFontSize: string;
  lineHeight: string;
  alignment: string;
  headingHierarchy: string;
  numberingStyle: string;
  scriptureCitationRule: string;
  customFormatNotes: string;
}

const DEFAULT_FORMAT_SETTINGS: FormatSettingsState = {
  fontFamily: '맑은 고딕',
  bodyFontSize: '10pt',
  lineHeight: '1.35',
  alignment: '양쪽 정렬',
  headingHierarchy: '문서 제목 18pt | 제목 1: 16pt | 제목 2: 14pt | 제목 3: 13pt | 하위 제목: 12pt',
  numberingStyle: 'I. II. III. → 1. 2. 3. → 1) 2) 3) (번호 뒤에 백슬래시 \\를 붙이지 말 것)',
  scriptureCitationRule: '성경 장 이름 10pt 주황색 굵게 표기 후 빈 줄 없이 실제 성경 본문 구절(9pt 주황색 굵게) 표기. 연속된 절은 절마다 줄바꿈 없이 한 단락으로 이어 쓰며 절 번호 필수 기재. 본문 해설 중 특정 절 언급 시에도 반드시 실제 성경 원문 표기 의무화 (본문 생략 및 요약문 대체 엄격 금지)',
  customFormatNotes: '',
};

interface CustomSelectTriggerProps {
  label: string;
  onClick: () => void;
}

function CustomSelectTrigger({ label, onClick }: CustomSelectTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2 sm:py-2.5 px-2.5 cursor-pointer rounded-[8px] text-[12px] font-bold whitespace-nowrap overflow-hidden text-ellipsis transition-all bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400 active:bg-orange-50/50 flex items-center justify-between text-left group"
    >
      <span className="truncate pr-1 font-bold">{label}</span>
      <ChevronDown className="w-3.5 h-3.5 text-[#ea580c] group-hover:text-[#c2410c] flex-shrink-0 transition-colors" />
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'write' | 'settings' | 'format'>('write');

  // Tab 1: Write state
  const [topic, setTopic] = useState('');
  const [request, setRequest] = useState('');
  const [domain, setDomain] = useState('자동 판별');
  const [work, setWork] = useState('자동 판별');
  const [audience, setAudience] = useState('주제에 맞게 판단');
  const [length, setLength] = useState('주제에 맞게 판단');
  const [selectedFormat, setSelectedFormat] = useState<string>('완성 원고');
  const [showFixedModal, setShowFixedModal] = useState(false);

  // Custom Select Modal State (사진 1의 안드로이드 기본 select 팝업 대체)
  const [activeModal, setActiveModal] = useState<{
    title: string;
    options: OptionItem[];
    selectedValue: string;
    onSelect: (val: string) => void;
  } | null>(null);

  // Tab 2: Settings state
  const [settings, setSettings] = useState<SettingsState>({
    style: '주제와 독자에 맞게 판단',
    research: '작업 목적에 맞게 판단',
    citation: '필요한 경우 출처 제시',
    fixed: '',
  });

  // Tab 3: Format settings state
  const [formatSettings, setFormatSettings] = useState<FormatSettingsState>(DEFAULT_FORMAT_SETTINGS);

  // Base prompt state (retained in background)
  const [basePrompt, setBasePrompt] = useState<string>(DEFAULT_BASE_PROMPT);

  // Modals & Feedback
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [lastBuiltPrompt, setLastBuiltPrompt] = useState('');

  const topicInputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved settings and format on mount
  useEffect(() => {
    try {
      const savedBase = localStorage.getItem(STORAGE_KEY_BASE);
      if (savedBase) {
        setBasePrompt(savedBase);
      }

      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }));
      }

      const savedFormat = localStorage.getItem(STORAGE_KEY_FORMAT);
      if (savedFormat) {
        const parsedFormat = JSON.parse(savedFormat);
        setFormatSettings((prev) => ({
          ...prev,
          ...parsedFormat,
        }));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  // Select format (단일 선택)
  const handleSelectFormat = (formatName: string) => {
    setSelectedFormat(formatName);
  };

  // Compile final prompt
  const generatePrompt = () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return null;

    const formatsStr = selectedFormat || '완성 원고';

    return `${basePrompt.trim()}

# 이번 작업의 구체적 요청
[주제·질문·작성할 내용]
${trimmedTopic}
${request.trim() ? `\n[추가 요구사항]\n${request.trim()}\n` : ''}

[전문 분야]
${domain}

[작업 유형]
${work}

[대상 독자]
${audience}

[분량]
${length}

[결과물 형식]
${formatsStr}

[작성 설정]
문체: ${settings.style}
자료 조사 수준: ${settings.research}
출처·인용 방식: ${settings.citation}
추가 고정 지침: ${settings.fixed.trim() || '없음'}

[문서 서식 지정 규정]
- 본문 글꼴: ${formatSettings.fontFamily}
- 본문 글자 크기: ${formatSettings.bodyFontSize}
- 본문 줄 간격: ${formatSettings.lineHeight}
- 문단 정렬: ${formatSettings.alignment}
- 제목별 글자 크기 체계: ${formatSettings.headingHierarchy}
- 번호 체계: ${formatSettings.numberingStyle}
- 성경 본문 인용 서식: ${formatSettings.scriptureCitationRule}
${formatSettings.customFormatNotes.trim() ? `- 추가 서식 지침: ${formatSettings.customFormatNotes.trim()}` : ''}

위 지침과 요청을 종합하여 분석·조사·검증한 뒤 결과물을 작성하라. 사용자가 명시하지 않은 조건을 임의로 만들어내지 말고, 확인되지 않은 정보는 불확실성을 밝혀라.`;
  };

  // Handle run GPT
  const handleRunGpt = async () => {
    const prompt = generatePrompt();
    if (!prompt) {
      showToast('⚠️ 먼저 주제나 질문을 입력해야 합니다.');
      setActiveTab('write');
      topicInputRef.current?.focus();
      return;
    }

    setLastBuiltPrompt(prompt);

    try {
      await navigator.clipboard.writeText(prompt);
      showToast('📋 프롬프트가 복사되었습니다! ChatGPT 창으로 연결합니다.');
    } catch {
      showToast('ChatGPT 창으로 연결합니다.');
    }

    const gptUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    window.open(gptUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle preview prompt
  const handlePreviewPrompt = () => {
    const prompt = generatePrompt();
    if (!prompt) {
      showToast('⚠️ 먼저 주제나 질문을 입력해야 합니다.');
      setActiveTab('write');
      topicInputRef.current?.focus();
      return;
    }
    setLastBuiltPrompt(prompt);
    setShowPreviewModal(true);
  };

  // Handle reset write fields
  const handleReset = () => {
    if (!topic.trim() && !request.trim()) return;

    setConfirmModal({
      isOpen: true,
      title: '입력 내용 초기화',
      message: '입력한 주제와 요구사항을 초기화할까요?',
      isDestructive: true,
      onConfirm: () => {
        setTopic('');
        setRequest('');
        setSelectedFormat('완성 원고');
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('입력 내용이 초기화되었습니다.');
      },
    });
  };

  // Save Settings
  const handleSaveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      showToast('✅ 작성 세부 설정이 저장되었습니다.');
    } catch {
      showToast('설정 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="w-full min-h-[100vh] min-h-[100dvh] flex flex-col justify-start overflow-y-auto bg-gradient-to-br from-[#fef3c7] via-[#fed7aa] via-65%-[#ffedd5] to-[#ffc4a3] text-[#1e293b]">
      {/* Container restricted to max 800px */}
      <main className="w-full max-w-[800px] mx-auto p-1 sm:p-2 flex flex-col justify-start">
        {/* 상단 모달/헤더 영역: 모바일 뷰포트 밀림 방지를 위한 정밀 다이어트 */}
        <header className="relative px-3 pt-2.5 pb-2 text-center bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] rounded-t-[14px] text-white shadow-[0_6px_16px_rgba(234,88,12,0.45)] flex-shrink-0 border-b-[3px] border-[#7c2d12]">
          {/* 우측 상단 설치 버튼 */}
          <div className="absolute right-2.5 top-2 flex items-center z-10">
            <PWAInstallButton compact />
          </div>

          {/* 중앙 정렬된 타이틀 */}
          <div className="flex items-center justify-center mb-1.5 pt-0.5">
            <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] leading-tight text-white">
              Writing Helper
            </h1>
          </div>

          {/* 2개의 탭 영역: 글쓰기, 서식 지정 (작성 세부 설정은 글쓰기 창 내부로 통합) */}
          <nav className="flex gap-1.5 flex-shrink-0" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'write'}
              onClick={() => setActiveTab('write')}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-[8px] transition-all cursor-pointer shadow-xs ${
                activeTab === 'write'
                  ? 'bg-gradient-to-br from-white to-[#ffedd5] text-[#9a3412] border border-white shadow-[0_2px_6px_rgba(234,88,12,0.25)] font-extrabold'
                  : 'bg-gradient-to-b from-white to-[#fff7ed] text-[#c2410c] border border-[rgba(251,146,60,0.6)] hover:bg-orange-50'
              }`}
            >
              글쓰기
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'format'}
              onClick={() => setActiveTab('format')}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-[8px] transition-all cursor-pointer shadow-xs ${
                activeTab === 'format'
                  ? 'bg-gradient-to-br from-white to-[#ffedd5] text-[#9a3412] border border-white shadow-[0_2px_6px_rgba(234,88,12,0.25)] font-extrabold'
                  : 'bg-gradient-to-b from-white to-[#fff7ed] text-[#c2410c] border border-[rgba(251,146,60,0.6)] hover:bg-orange-50'
              }`}
            >
              서식 지정
            </button>
          </nav>
        </header>

        {/* ========================================================
            패널 1: 메인 입력 패널 (글쓰기 탭)
           ======================================================== */}
        {activeTab === 'write' && (
          <section className="flex flex-col flex-1">
            <div className="bg-gradient-to-br from-[rgba(255,255,255,0.98)] to-[rgba(255,243,224,0.95)] border border-[rgba(249,115,22,0.6)] border-t-0 rounded-b-[14px] p-2 sm:p-2.5 flex flex-col justify-start shadow-[0_4px_15px_rgba(249,115,22,0.15)]">
              {/* 상단 액션 바 */}
              <div className="flex justify-between items-center mb-1 flex-shrink-0">
                <span className="text-[13px] font-extrabold text-[#c2410c] drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                  작성 내용 입력
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePreviewPrompt}
                    title="프롬프트 미리보기"
                    className="flex items-center gap-1 bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#334155] border border-[#cbd5e1] px-2 py-0.5 text-[11px] font-bold rounded-[6px] cursor-pointer transition shadow-none"
                  >
                    <Eye className="w-3 h-3 text-slate-600" />
                    <span>미리보기</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    title="입력 초기화"
                    className="bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#334155] border border-[#cbd5e1] px-2 py-0.5 text-[12px] font-bold rounded-[6px] cursor-pointer transition shadow-none flex items-center justify-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* 작성 내용 입력: 추가 요구사항 창 통합 확장하여 시원하고 넉넉한 높이 확보 */}
              <div className="mb-1.5 flex-shrink-0">
                <textarea
                  ref={topicInputRef}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="주제·질문·작성할 내용을 입력한다."
                  className="w-full px-2.5 py-2 border border-[#fdba74] rounded-[8px] text-[12px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] resize-none h-[114px] sm:h-[124px] min-h-[96px] leading-relaxed focus:border-orange-500 focus:ring-1 focus:ring-orange-300 transition"
                />
              </div>

              {/* 8단 작성 옵션 & 세부 설정 그리드 (결과물 형식 버튼과 동일한 크기와 디자인으로 글쓰기 창 내부 완전 통합) */}
              <div className="grid grid-cols-2 gap-1 sm:gap-1.5 mb-1.5 flex-shrink-0">
                <CustomSelectTrigger
                  label={`전문 분야: ${domain}`}
                  onClick={() =>
                    setActiveModal({
                      title: '전문 분야 선택',
                      options: DOMAIN_OPTIONS,
                      selectedValue: domain,
                      onSelect: (val) => setDomain(val),
                    })
                  }
                />

                <CustomSelectTrigger
                  label={`작업 유형: ${work}`}
                  onClick={() =>
                    setActiveModal({
                      title: '작업 유형 선택',
                      options: WORK_OPTIONS,
                      selectedValue: work,
                      onSelect: (val) => setWork(val),
                    })
                  }
                />

                <CustomSelectTrigger
                  label={`대상 독자: ${audience}`}
                  onClick={() =>
                    setActiveModal({
                      title: '대상 독자 선택',
                      options: AUDIENCE_OPTIONS,
                      selectedValue: audience,
                      onSelect: (val) => setAudience(val),
                    })
                  }
                />

                <CustomSelectTrigger
                  label={`작성 분량: ${length}`}
                  onClick={() =>
                    setActiveModal({
                      title: '작성 분량 선택',
                      options: LENGTH_OPTIONS,
                      selectedValue: length,
                      onSelect: (val) => setLength(val),
                    })
                  }
                />

                <CustomSelectTrigger
                  label={`문체: ${settings.style}`}
                  onClick={() =>
                    setActiveModal({
                      title: '문체 선택',
                      options: STYLE_OPTIONS,
                      selectedValue: settings.style,
                      onSelect: (val) => {
                        const next = { ...settings, style: val };
                        setSettings(next);
                        try {
                          localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
                        } catch {}
                      },
                    })
                  }
                />

                <CustomSelectTrigger
                  label={`자료 조사: ${settings.research}`}
                  onClick={() =>
                    setActiveModal({
                      title: '자료 조사 수준 선택',
                      options: RESEARCH_OPTIONS,
                      selectedValue: settings.research,
                      onSelect: (val) => {
                        const next = { ...settings, research: val };
                        setSettings(next);
                        try {
                          localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
                        } catch {}
                      },
                    })
                  }
                />

                <CustomSelectTrigger
                  label={`출처 방식: ${settings.citation}`}
                  onClick={() =>
                    setActiveModal({
                      title: '출처·인용 방식 선택',
                      options: CITATION_OPTIONS,
                      selectedValue: settings.citation,
                      onSelect: (val) => {
                        const next = { ...settings, citation: val };
                        setSettings(next);
                        try {
                          localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
                        } catch {}
                      },
                    })
                  }
                />

                <CustomSelectTrigger
                  label={settings.fixed.trim() ? `고정 지침: ${settings.fixed.trim().slice(0, 7)}...` : '추가 고정 지침: 없음'}
                  onClick={() => setShowFixedModal(true)}
                />
              </div>

              {/* 결과물 형식 영역: 단일 선택 및 명칭 변경 */}
              <div className="pt-1.5 border-t-2 border-[#f97316] flex-shrink-0">
                <div className="text-[12.5px] font-extrabold text-[#c2410c] drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] mb-1">
                  결과물 형식
                </div>
                <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                  {AVAILABLE_FORMATS.map((fmt) => {
                    const isActive = selectedFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => handleSelectFormat(fmt)}
                        className={`w-full text-center py-2 sm:py-2.5 px-1 cursor-pointer rounded-[8px] text-[12px] font-bold whitespace-nowrap overflow-hidden text-ellipsis transition-all ${
                          isActive
                            ? 'bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white border border-[#9a3412] shadow-[0_3px_8px_rgba(234,88,12,0.4)]'
                            : 'bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400'
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}

                  {/* GPT로 즉시 실행 버튼 */}
                  <button
                    type="button"
                    onClick={handleRunGpt}
                    className="w-full text-center py-2 sm:py-2.5 px-1 cursor-pointer rounded-[8px] text-[12px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#059669] text-white shadow-[0_3px_8px_rgba(16,185,129,0.4)] hover:brightness-105 active:scale-[0.99] transition flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>GPT로 즉시 실행</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            패널 3: 서식 지정 패널 (원고 내용 분석, 개요/성경/강조볼드 서식 적용 및 DOCX 다운로드)
           ======================================================== */}
        {activeTab === 'format' && (
          <section className="flex flex-col flex-1">
            <div className="bg-gradient-to-br from-[rgba(255,255,255,0.98)] to-[rgba(255,243,224,0.95)] border border-[rgba(249,115,22,0.6)] border-t-0 rounded-b-[14px] p-2 sm:p-2.5 flex flex-col justify-start shadow-[0_4px_15px_rgba(249,115,22,0.15)]">
              <FormatConversionPanel
                onShowToast={showToast}
              />
            </div>
          </section>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xl backdrop-blur-xs border border-white/20 animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-1.5">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Prompt Preview Modal */}
      <PromptPreviewModal
        isOpen={showPreviewModal}
        prompt={lastBuiltPrompt}
        onClose={() => setShowPreviewModal(false)}
        onRunGpt={() => {
          setShowPreviewModal(false);
          handleRunGpt();
        }}
      />

      {/* Custom Option Select Bottom Sheet Modal (모바일 웜 오렌지 테마) */}
      {activeModal && (
        <OptionSelectModal
          isOpen={true}
          title={activeModal.title}
          options={activeModal.options}
          selectedValue={activeModal.selectedValue}
          onSelect={activeModal.onSelect}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 추가 고정 지침 편집 모달 (웜 오렌지 테마) */}
      {showFixedModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
          onClick={() => setShowFixedModal(false)}
        >
          <div
            className="w-full max-w-md bg-gradient-to-b from-[#fffbf5] to-[#fff7ed] rounded-2xl border border-[rgba(249,115,22,0.4)] shadow-[0_-4px_25px_rgba(249,115,22,0.2),0_10px_30px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-white/80 rounded-full inline-block" />
                <h3 className="text-[13px] font-black tracking-wide">추가 고정 지침 설정</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFixedModal(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white cursor-pointer"
                title="닫기"
              >
                ✕
              </button>
            </div>
            <div className="p-3">
              <p className="text-[11px] text-slate-600 mb-1.5 font-medium leading-relaxed">
                모든 글쓰기 작업 프롬프트에 기본으로 적용될 공통 고정 지침을 입력합니다.
              </p>
              <textarea
                value={settings.fixed}
                onChange={(e) => {
                  const next = { ...settings, fixed: e.target.value };
                  setSettings(next);
                  try {
                    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
                  } catch {}
                }}
                placeholder="예: 객관적 사실을 근거로 서술할 것, 특정 신학적 관점을 견지할 것 등"
                className="w-full h-28 p-2.5 border border-[#fdba74] rounded-lg text-xs bg-white text-slate-800 outline-none resize-none focus:ring-1 focus:ring-orange-400 shadow-inner"
              />
              <div className="flex justify-end gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...settings, fixed: '' };
                    setSettings(next);
                    try {
                      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
                    } catch {}
                    showToast('고정 지침이 초기화되었습니다.');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  지침 비우기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
                    } catch {}
                    showToast('✅ 추가 고정 지침이 저장되었습니다.');
                    setShowFixedModal(false);
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg shadow-sm hover:brightness-105 cursor-pointer"
                >
                  저장 후 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
