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
import {
  RotateCcw,
  Eye,
  Check,
  ExternalLink,
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
  numberingStyle: 'I. II. III. → 1. 2. 3. → 1) 2) 3) → (1) (2) (3) → ① ② ③',
  scriptureCitationRule: '본문 9pt, 주황색 (#E65100), 굵게 (Bold), 연속 문단으로 작성',
  customFormatNotes: '',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'write' | 'settings' | 'format'>('write');

  // Tab 1: Write state
  const [topic, setTopic] = useState('');
  const [request, setRequest] = useState('');
  const [domain, setDomain] = useState('자동 판별');
  const [work, setWork] = useState('자동 판별');
  const [audience, setAudience] = useState('주제에 맞게 판단');
  const [length, setLength] = useState('주제에 맞게 판단');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['완성 원고']);

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

  // Toggle format chips
  const toggleFormat = (formatName: string) => {
    setSelectedFormats((prev) => {
      if (prev.includes(formatName)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((f) => f !== formatName);
      } else {
        return [...prev, formatName];
      }
    });
  };

  // Compile final prompt
  const generatePrompt = () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return null;

    const formatsStr = selectedFormats.join(', ') || '완성 원고';

    return `${basePrompt.trim()}

# 이번 작업의 구체적 요청
[주제·질문·작성할 내용]
${trimmedTopic}

[추가 요구사항]
${request.trim() || '별도 요구사항 없음'}

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
        setSelectedFormats(['완성 원고']);
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
        {/* 상단 모달/헤더 영역 */}
        <header className="relative px-3 pt-3.5 pb-2.5 text-center bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] rounded-t-[14px] text-white shadow-[0_6px_16px_rgba(234,88,12,0.45)] flex-shrink-0 border-b-[3px] border-[#7c2d12]">
          {/* 우측 상단 설치 버튼 */}
          <div className="absolute right-2.5 top-2.5 flex items-center z-10">
            <PWAInstallButton compact />
          </div>

          {/* 중앙 정렬된 타이틀 */}
          <div className="flex items-center justify-center mb-2.5 pt-0.5">
            <h1 className="text-2xl sm:text-[28px] font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] leading-tight text-white">
              Writing Helper
            </h1>
          </div>

          {/* 3개의 탭 영역: 기본 프롬프트 탭 제거 및 서식 지정 탭 추가 */}
          <nav className="flex gap-1 flex-shrink-0" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'write'}
              onClick={() => setActiveTab('write')}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-[7px] transition-all cursor-pointer shadow-xs ${
                activeTab === 'write'
                  ? 'bg-gradient-to-br from-white to-[#ffedd5] text-[#9a3412] border border-white shadow-[0_2px_6px_rgba(234,88,12,0.25)] font-extrabold'
                  : 'bg-gradient-to-b from-white to-[#fff7ed] text-[#c2410c] border border-[rgba(251,146,60,0.6)] hover:bg-orange-50'
              }`}
            >
              글쓰기
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-[7px] transition-all cursor-pointer shadow-xs ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-br from-white to-[#ffedd5] text-[#9a3412] border border-white shadow-[0_2px_6px_rgba(234,88,12,0.25)] font-extrabold'
                  : 'bg-gradient-to-b from-white to-[#fff7ed] text-[#c2410c] border border-[rgba(251,146,60,0.6)] hover:bg-orange-50'
              }`}
            >
              작성 세부 설정
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'format'}
              onClick={() => setActiveTab('format')}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-[7px] transition-all cursor-pointer shadow-xs ${
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
              <div className="flex justify-between items-center mb-1.5 flex-shrink-0">
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

              {/* 주제 입력 */}
              <div className="mb-1.5 flex-shrink-0">
                <textarea
                  ref={topicInputRef}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="주제·질문·작성할 내용을 입력한다."
                  className="w-full px-2 py-1.5 border border-[#fdba74] rounded-[6px] text-[11.5px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] resize-none h-[42px] sm:h-[48px] min-h-[38px] leading-snug focus:border-orange-500 focus:ring-1 focus:ring-orange-300 transition"
                />
              </div>

              {/* 추가 요구사항 입력 */}
              <div className="mb-1.5 flex-shrink-0">
                <textarea
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="추가 요구사항 (특별히 반영할 내용이나 조건)"
                  className="w-full px-2 py-1.5 border border-[#fdba74] rounded-[6px] text-[11.5px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] resize-none h-[40px] sm:h-[44px] min-h-[36px] leading-snug focus:border-orange-500 focus:ring-1 focus:ring-orange-300 transition"
                />
              </div>

              {/* 4단 선택 옵션 그리드 */}
              <div className="grid grid-cols-2 gap-1.5 mb-2 flex-shrink-0">
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-1.5 h-[28px] border border-[#fdba74] rounded-[6px] text-[11px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer truncate"
                >
                  <option value="자동 판별">전문 분야: 자동 판별</option>
                  <option value="학술·전문 연구">학술·전문 연구</option>
                  <option value="역사·인물 연구">역사·인물 연구</option>
                  <option value="의학·건강 연구">의학·건강 연구</option>
                  <option value="과학·기술 연구">과학·기술 연구</option>
                  <option value="경제·금융·주식 연구">경제·금융·주식 연구</option>
                  <option value="사회·시사·정책 분석">사회·시사·정책 분석</option>
                  <option value="일반 정보·지식 블로그">일반 정보·지식 블로그</option>
                  <option value="창작·에세이·스토리텔링">창작·에세이·스토리텔링</option>
                  <option value="업무·실무 문서">업무·실무 문서</option>
                  <option value="유튜브·쇼츠·온라인 콘텐츠">유튜브·쇼츠·온라인 콘텐츠</option>
                  <option value="법률·제도 및 행정 연구">법률·제도 및 행정 연구</option>
                </select>

                <select
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                  className="w-full px-1.5 h-[28px] border border-[#fdba74] rounded-[6px] text-[11px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer truncate"
                >
                  <option value="자동 판별">작업 유형: 자동 판별</option>
                  <option value="심층 연구형">심층 연구형</option>
                  <option value="정보 설명형">정보 설명형</option>
                  <option value="창작형">창작형</option>
                  <option value="실무 문서형">실무 문서형</option>
                  <option value="온라인 콘텐츠형">온라인 콘텐츠형</option>
                </select>

                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-1.5 h-[28px] border border-[#fdba74] rounded-[6px] text-[11px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer truncate"
                >
                  <option value="주제에 맞게 판단">대상 독자: 주제에 맞게 판단</option>
                  <option value="일반 독자">일반 독자</option>
                  <option value="초급 학습자">초급 학습자</option>
                  <option value="전문가·전공자">전문가·전공자</option>
                  <option value="학생·교육 대상">학생·교육 대상</option>
                  <option value="온라인 시청자">온라인 시청자</option>
                </select>

                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full px-1.5 h-[28px] border border-[#fdba74] rounded-[6px] text-[11px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer truncate"
                >
                  <option value="주제에 맞게 판단">작성 분량: 주제에 맞게 판단</option>
                  <option value="짧고 핵심적으로">짧고 핵심적으로</option>
                  <option value="보통 분량">보통 분량</option>
                  <option value="상세하고 충분하게">상세하고 충분하게</option>
                  <option value="A4 3~5장">A4 3~5장</option>
                  <option value="A4 5~7장">A4 5~7장</option>
                  <option value="사용자 지정 요구 우선">사용자 지정 요구 우선</option>
                </select>
              </div>

              {/* 결과물 형식 영역: 4개 선택창 바로 아래로 당겨 올림 */}
              <div className="pt-2 border-t-2 border-[#f97316] flex-shrink-0">
                <div className="text-[13px] font-extrabold text-[#c2410c] drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] mb-1.5">
                  결과물 형식 (복수 선택 가능)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {AVAILABLE_FORMATS.map((fmt) => {
                    const isActive = selectedFormats.includes(fmt);
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => toggleFormat(fmt)}
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
            패널 2: 작성 세부 설정 패널
           ======================================================== */}
        {activeTab === 'settings' && (
          <section className="flex flex-col flex-1">
            <div className="bg-gradient-to-br from-[rgba(255,255,255,0.98)] to-[rgba(255,243,224,0.95)] border border-[rgba(249,115,22,0.6)] border-t-0 rounded-b-[14px] p-2.5 sm:p-3 flex flex-col justify-start shadow-[0_4px_15px_rgba(249,115,22,0.15)]">
              <div className="flex flex-col">
                <h2 className="text-xs font-extrabold text-[#c2410c] mb-1.5 flex items-center gap-1.5">
                  작성 세부 설정
                </h2>

                <div className="mb-2">
                  <label className="text-[10.5px] font-bold text-[#475569] block mb-0.5">
                    문체
                  </label>
                  <select
                    value={settings.style}
                    onChange={(e) => setSettings({ ...settings, style: e.target.value })}
                    className="w-full px-2 h-[28px] border border-[#fdba74] rounded-[6px] text-[11px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <option value="주제와 독자에 맞게 판단">주제와 독자에 맞게 판단</option>
                    <option value="문어체 평서문">문어체 평서문</option>
                    <option value="쉽고 간결한 설명체">쉽고 간결한 설명체</option>
                    <option value="학술적·전문적 문체">학술적·전문적 문체</option>
                    <option value="친근한 블로그 문체">친근한 블로그 문체</option>
                    <option value="설득력 있는 콘텐츠 문체">설득력 있는 콘텐츠 문체</option>
                  </select>
                </div>

                <div className="mb-2">
                  <label className="text-[10.5px] font-bold text-[#475569] block mb-0.5">
                    자료 조사 수준
                  </label>
                  <select
                    value={settings.research}
                    onChange={(e) => setSettings({ ...settings, research: e.target.value })}
                    className="w-full px-2 h-[28px] border border-[#fdba74] rounded-[6px] text-[11px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <option value="작업 목적에 맞게 판단">작업 목적에 맞게 판단</option>
                    <option value="기초 지식 중심">기초 지식 중심</option>
                    <option value="근거 확인 및 교차 검증">근거 확인 및 교차 검증</option>
                    <option value="최신 자료와 학술 연구까지 심층 조사">
                      최신 자료와 학술 연구까지 심층 조사
                    </option>
                    <option value="사용자가 제공한 자료만 활용">사용자가 제공한 자료만 활용</option>
                  </select>
                </div>

                <div className="mb-2">
                  <label className="text-[10.5px] font-bold text-[#475569] block mb-0.5">
                    출처·인용 방식
                  </label>
                  <select
                    value={settings.citation}
                    onChange={(e) => setSettings({ ...settings, citation: e.target.value })}
                    className="w-full px-2 h-[28px] border border-[#fdba74] rounded-[6px] text-[11px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <option value="필요한 경우 출처 제시">필요한 경우 출처 제시</option>
                    <option value="핵심 주장마다 근거와 출처 표시">
                      핵심 주장마다 근거와 출처 표시
                    </option>
                    <option value="학술 인용 형식">학술 인용 형식</option>
                    <option value="본문 내 출처와 참고문헌 구분">본문 내 출처와 참고문헌 구분</option>
                    <option value="외부 자료 조사 없이 작성">외부 자료 조사 없이 작성</option>
                  </select>
                </div>

                <div className="flex flex-col mb-3">
                  <label className="text-[10.5px] font-bold text-[#475569] block mb-0.5">
                    추가 고정 지침
                  </label>
                  <textarea
                    value={settings.fixed}
                    onChange={(e) => setSettings({ ...settings, fixed: e.target.value })}
                    placeholder="모든 작업에 공통으로 적용할 지침을 입력한다."
                    className="w-full h-[80px] p-2 border border-[#fdba74] rounded-[6px] text-[11px] bg-gradient-to-b from-white to-[#fffbeb] text-[#1e293b] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] resize-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-full py-2.5 rounded-[8px] bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#059669] text-white font-extrabold text-xs shadow-[0_3px_8px_rgba(16,185,129,0.4)] hover:brightness-105 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>작성 설정 저장</span>
              </button>
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
                initialText={[topic.trim(), request.trim()].filter(Boolean).join('\n\n')}
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
    </div>
  );
}
