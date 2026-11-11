import React, { useState, useRef, useEffect } from 'react';
import {
  FormattedParagraph,
  DocxExportConfig,
  generateDocxBlob,
} from '../utils/docxExporter';
import { parseManuscriptToParagraphs } from '../utils/paragraphParser';
import { OptionSelectModal, OptionItem } from './OptionSelectModal';
import {
  Upload,
  Trash2,
  Download,
  Eye,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Sparkles,
  Bold,
  Edit3,
  ChevronDown,
} from 'lucide-react';

interface Props {
  initialText?: string;
  onShowToast: (msg: string) => void;
}

const STORAGE_KEY_FORMAT_CONFIG = 'writing_helper_docx_config_v1';

const DEFAULT_CONFIG: DocxExportConfig = {
  fontFamily: '맑은 고딕',
  bodyFontSizePt: 10,
  lineHeightRatio: 1.35,
  alignment: 'both',
  scriptureColor: 'EA580C',
  scriptureHeaderFontSizePt: 10,
  scriptureFontSizePt: 9,
  outlineNumberFormat: '1.',
  outlineSpaceAfterPt: 2,
  headingSizes: {
    doc_title: 18,
    heading_1: 16,
    heading_2: 14,
    heading_3: 13,
    heading_4: 12,
    heading_5: 11,
  },
  emphasisWords: [],
  autoBoldMarkdown: true,
};

const STORAGE_KEY_MANUSCRIPT_DRAFT = 'writing_helper_manuscript_draft_v1';

// 단일 음절 및 불완전 어근/조사 강조 원천 방지 목록
const FORBIDDEN_EMPHASIS_WORDS = new Set([
  '하', '않', '있', '없', '되', '보', '한', '된', '이', '가', '은', '는', '을', '를',
  '의', '에', '와', '과', '도', '로', '고', '며', '서', '라', '즉', '또', '이것', '저것',
  '그것', '사람', '인간', '경우', '때문', '사실', '대한', '위해', '것', '수', '때'
]);

// 서식 옵션 리스트
const FONT_FAMILY_OPTIONS: OptionItem[] = [
  { value: '맑은 고딕', label: '맑은 고딕 (표준 권장)', badge: '권장' },
  { value: 'KoPub바탕', label: 'KoPub바탕 (출판용)' },
  { value: '본고딕', label: '본고딕 (Noto Sans KR)' },
  { value: '나눔명조', label: '나눔명조' },
  { value: '나눔고딕', label: '나눔고딕' },
  { value: '바탕체', label: '바탕체' },
];

const FONT_SIZE_OPTIONS: OptionItem[] = [
  { value: '10', label: '10pt (표준 규격)', badge: '표준' },
  { value: '10.5', label: '10.5pt' },
  { value: '11', label: '11pt (가독성 우수)' },
  { value: '9.5', label: '9.5pt' },
  { value: '12', label: '12pt' },
];

// *본문 줄간격 선택옵션: 1.15, 1.25, 1.35, 1.4, 1.45 (사용자 요청: 나머지는 삭제)
const LINE_HEIGHT_OPTIONS: OptionItem[] = [
  { value: '1.15', label: '1.15' },
  { value: '1.25', label: '1.25' },
  { value: '1.35', label: '1.35 (표준 집필)', badge: '표준' },
  { value: '1.4', label: '1.4' },
  { value: '1.45', label: '1.45' },
];

const ALIGNMENT_OPTIONS: OptionItem[] = [
  { value: 'both', label: '양쪽 정렬 (표준 권장)', badge: '권장' },
  { value: 'left', label: '왼쪽 정렬' },
  { value: 'center', label: '가운데 정렬' },
];

const OUTLINE_FORMAT_OPTIONS: OptionItem[] = [
  { value: '1.', label: '1. 2. 3. (표준 아라비아 숫자)', badge: '표준' },
  { value: '1)', label: '1) 2) 3)' },
  { value: '1-', label: '1- 2- 3-' },
];

const SCRIPTURE_COLOR_OPTIONS: OptionItem[] = [
  { value: 'EA580C', label: '주황색 (#EA580C, 표준 권장)', badge: '표준' },
  { value: '1E3A8A', label: '감청색 (#1E3A8A)' },
  { value: '334155', label: '짙은 회색 (#334155)' },
];

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

// 원고 내용 사전 분석을 통해 강조할 핵심 단어 및 어구를 자동으로 추출하는 지능형 분석기
// 규칙: 1글자 단어 원천 배제, 2글자 이상 의미 명사 및 핵심 어구만 등록
export function autoDetectEmphasisKeywords(text: string): string[] {
  if (!text || !text.trim()) return [];
  const parsed = parseManuscriptToParagraphs(text);
  const found = new Set<string>();
  parsed.forEach((p) => {
    if (p.emphasisPhrases) {
      p.emphasisPhrases.forEach((w) => {
        const clean = w.trim().replace(/^[*_~`]+|[*_~`]+$/g, '');
        if (clean.length >= 2 && !FORBIDDEN_EMPHASIS_WORDS.has(clean)) {
          found.add(clean);
        }
      });
    }
  });
  return Array.from(found);
}



export const FormatConversionPanel: React.FC<Props> = ({ initialText = '', onShowToast }) => {
  const [inputText, setInputText] = useState(initialText);
  const [paragraphs, setParagraphs] = useState<FormattedParagraph[]>([]);
  const [config, setConfig] = useState<DocxExportConfig>(DEFAULT_CONFIG);
  const [emphasisInput, setEmphasisInput] = useState(DEFAULT_CONFIG.emphasisWords.join(', '));
  const [activeStep, setActiveStep] = useState<'input' | 'preview'>('input');
  const [isExporting, setIsExporting] = useState(false);
  const [showConfigSettings, setShowConfigSettings] = useState(false);
  const [activeModal, setActiveModal] = useState<{
    title: string;
    options: OptionItem[];
    selectedValue: string;
    onSelect: (val: string) => void;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved config and manuscript draft
  useEffect(() => {
    try {
      // 1. 설정 복원
      const savedConfig = localStorage.getItem(STORAGE_KEY_FORMAT_CONFIG);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig((prev) => ({ ...prev, ...parsed }));
        if (parsed.emphasisWords) {
          const sanitized = (parsed.emphasisWords as string[])
            .map((w) => w.trim().replace(/^[*_~`]+|[*_~`]+$/g, ''))
            .filter((w) => w.length >= 2 && !FORBIDDEN_EMPHASIS_WORDS.has(w));
          setEmphasisInput(sanitized.join(', '));
        }
      }

      // 2. 모바일 당겨서 새로고침(Pull-to-refresh) 등으로 인한 원고 유실 방지: 임시 저장본 자동 복원
      if (!initialText) {
        const savedDraft = localStorage.getItem(STORAGE_KEY_MANUSCRIPT_DRAFT);
        if (savedDraft && savedDraft.trim()) {
          setInputText(savedDraft);
        }
      }
    } catch {
      // Ignore
    }
  }, [initialText]);

  // 원고 입력 시 실시간 로컬스토리지 보존 (새로고침 시에도 지워지지 않음)
  const handleInputTextChange = (val: string) => {
    setInputText(val);
    try {
      if (val.trim()) {
        localStorage.setItem(STORAGE_KEY_MANUSCRIPT_DRAFT, val);
      } else {
        localStorage.removeItem(STORAGE_KEY_MANUSCRIPT_DRAFT);
      }
    } catch {
      // Ignore
    }
  };

  // 모든 단계에서 언제든 깨끗하게 비우고 새로 시작할 수 있는 완전 비우기 핸들러 (iframe 친화적 직접 초기화)
  const handleClearAllManuscript = () => {
    setInputText('');
    setParagraphs([]);
    setShowConfigSettings(false);
    try {
      localStorage.removeItem(STORAGE_KEY_MANUSCRIPT_DRAFT);
    } catch {
      // Ignore
    }
    setActiveStep('input');
    onShowToast('🧹 원고 내용과 서식 분석 결과가 모두 깨끗하게 비워졌습니다.');
  };

  // Update emphasis words array when string changes
  // 단일 음절(1글자: 하, 않, 있 등) 및 조사/어근 분리어는 원천 차단
  const handleEmphasisWordsChange = (val: string) => {
    setEmphasisInput(val);
    const words = val
      .split(',')
      .map((w) => w.trim().replace(/^[*_~`]+|[*_~`]+$/g, ''))
      .filter((w) => w.length >= 2 && !FORBIDDEN_EMPHASIS_WORDS.has(w));
    setConfig((prev) => ({ ...prev, emphasisWords: words }));
  };

  // Save Config
  const handleSaveConfig = () => {
    try {
      localStorage.setItem(STORAGE_KEY_FORMAT_CONFIG, JSON.stringify(config));
      onShowToast('✅ 서식 설정 규정이 저장되었습니다.');
    } catch {
      onShowToast('서식 설정 저장 중 오류가 발생했습니다.');
    }
  };

  // Reset Config
  const handleResetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    setEmphasisInput(DEFAULT_CONFIG.emphasisWords.join(', '));
    try {
      localStorage.removeItem(STORAGE_KEY_FORMAT_CONFIG);
    } catch {
      // Ignore
    }
    onShowToast('🔄 기본 서식 규정으로 복원되었습니다.');
  };

  // File upload (.txt, .md)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleInputTextChange(text);
        onShowToast(`📁 "${file.name}" 문서를 불러왔습니다.`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Step 1 -> Step 2: Analyze manuscript into paragraphs and go straight to preview
  const handleAnalyzeManuscript = (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) {
      onShowToast('⚠️ 서식을 지정할 원고 내용을 먼저 입력하거나 불러와주세요.');
      return;
    }

    const parsed = parseManuscriptToParagraphs(text);
    setParagraphs(parsed);

    // 단락별로 사전분석된 핵심 어구/정의 단어를 종합 수집하여 설정 패널에 동기화
    const allDetected = new Set<string>();
    parsed.forEach((p) => {
      if (p.emphasisPhrases) {
        p.emphasisPhrases.forEach((phrase) => {
          const clean = phrase.trim().replace(/^[*_~`]+|[*_~`]+$/g, '');
          if (clean.length >= 2 && !FORBIDDEN_EMPHASIS_WORDS.has(clean)) {
            allDetected.add(clean);
          }
        });
      }
    });

    const detectedWords = Array.from(allDetected);
    if (detectedWords.length > 0) {
      setConfig((prev) => ({
        ...prev,
        emphasisWords: detectedWords,
      }));
      setEmphasisInput(detectedWords.join(', '));
    }

    setActiveStep('preview');
    onShowToast(`✨ ${parsed.length}개 문단 서식 변환 및 단락별 핵심 강조 분석 완료!`);
  };

  // 수동으로 원고 사전 분석을 다시 실행하는 핸들러
  const handleTriggerAutoKeywordAnalysis = () => {
    const text = inputText.trim();
    if (!text) {
      onShowToast('⚠️ 분석할 원고 내용이 없습니다.');
      return;
    }
    const parsed = parseManuscriptToParagraphs(text);
    setParagraphs(parsed);

    const allDetected = new Set<string>();
    parsed.forEach((p) => {
      if (p.emphasisPhrases) {
        p.emphasisPhrases.forEach((phrase) => {
          const clean = phrase.trim().replace(/^[*_~`]+|[*_~`]+$/g, '');
          if (clean.length >= 2 && !FORBIDDEN_EMPHASIS_WORDS.has(clean)) {
            allDetected.add(clean);
          }
        });
      }
    });

    const detectedWords = Array.from(allDetected);
    if (detectedWords.length > 0) {
      setConfig((prev) => ({
        ...prev,
        emphasisWords: detectedWords,
      }));
      setEmphasisInput(detectedWords.join(', '));
      onShowToast(`🔍 ${detectedWords.length}개 단락별 핵심 어구가 자동 추출되었습니다.`);
    } else {
      onShowToast('추출된 추가 핵심어가 없습니다.');
    }
  };



  // Step 3: Export to actual DOCX file
  const handleDownloadDocx = async () => {
    if (paragraphs.length === 0) {
      onShowToast('⚠️ 다운로드할 문단 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await generateDocxBlob(paragraphs, config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Get title from doc_title paragraph or default
      const titleP = paragraphs.find((p) => p.type === 'doc_title');
      const filename = titleP
        ? titleP.originalText.slice(0, 25).replace(/[\\/:*?"<>|]/g, '_')
        : 'Writing_Helper_서식완료문서';
      a.download = `${filename}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast(`🎉 "${filename}.docx" 파일이 다운로드되었습니다!`);
    } catch {
      onShowToast('DOCX 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper to render text with bold and emphasis in live preview
  const renderFormattedPreviewText = (
    text: string,
    isEligibleForEmphasis = true,
    paragraphEmphasis?: string[]
  ) => {
    // 제목 번호 및 마크다운 이스케이프 백슬래시(\) 제거
    const cleanText = text
      .replace(/([0-9]+)\\\./g, '$1.')
      .replace(/\\([.\-_)\]])/g, '$1');

    // 성경본문 및 제목에는 강조어구가 적용되지 않아야 함 (사용자 지시사항 엄격 준수)
    if (!isEligibleForEmphasis) {
      if (config.autoBoldMarkdown && cleanText.includes('**')) {
        const parts = cleanText.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
              <strong key={idx} className="font-extrabold text-inherit">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });
      }
      return cleanText;
    }

    // 단락별 고유 분석 어구 우선 적용, 없으면 전역 설정 강조어 사용
    const targetKeywords = (paragraphEmphasis && paragraphEmphasis.length > 0)
      ? paragraphEmphasis
      : config.emphasisWords;
    const validKeywords = targetKeywords.filter((k) => k && k.trim().length > 0);

    // Markdown bold handling
    if (config.autoBoldMarkdown && cleanText.includes('**')) {
      const parts = cleanText.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return (
            <strong key={idx} className="font-extrabold text-inherit">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return renderKeywordsOnly(part, validKeywords, idx);
      });
    }

    return renderKeywordsOnly(cleanText, validKeywords, 0);
  };

  const renderKeywordsOnly = (text: string, keywords: string[], baseKey: number) => {
    if (!text || keywords.length === 0) return text;
    // 긴 복합 어구 우선 매칭 (1~2글자 짧은 단어는 '선택', '선언' 등의 단어 내부 오동작 방지)
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    const patternParts = sortedKeywords.map((k) => {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (k.length <= 2) {
        return `(?:(?<=[\\s"'“‘(\\[{.,]|^)${escaped}(?=[\\s"'”’)\\]!?,.:;~]|$|[은는이가을를의에과와도란]))`;
      }
      return escaped;
    });
    const regexPattern = new RegExp(`(${patternParts.join('|')})`, 'g');
    const tokens = text.split(regexPattern);
    const seenInParagraph = new Set<string>();

    return tokens.map((token, i) => {
      if (sortedKeywords.includes(token)) {
        // 문단당 최초 1회만 일반 본문과 동일한 색상의 볼드체(Bold) 적용 (사용자 요청: 일반 본문과 같은 색으로 지정하고 볼드체 처리)
        if (!seenInParagraph.has(token)) {
          seenInParagraph.add(token);
          return (
            <strong
              key={`${baseKey}-${i}`}
              className="font-extrabold text-inherit"
            >
              {token}
            </strong>
          );
        }
        return token;
      }
      return token;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.md,.text"
        className="hidden"
      />

      {/* 상단 2단계 스텝 내비게이션 (문단 구조 편집 버튼 삭제, 미리보기 버튼으로 수정) */}
      <div className="grid grid-cols-2 gap-1.5 mb-1">
        <button
          type="button"
          onClick={() => setActiveStep('input')}
          className={`w-full text-center py-2 px-1 cursor-pointer rounded-[8px] text-xs font-bold transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
            activeStep === 'input'
              ? 'bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white border border-[#9a3412] shadow-[0_3px_8px_rgba(234,88,12,0.4)]'
              : 'bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400'
          }`}
        >
          1. 원고 입력
        </button>
        <button
          type="button"
          onClick={() => {
            if (paragraphs.length === 0 && inputText.trim()) {
              handleAnalyzeManuscript();
            } else {
              setActiveStep('preview');
            }
          }}
          className={`w-full text-center py-2 px-1 cursor-pointer rounded-[8px] text-xs font-bold transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
            activeStep === 'preview'
              ? 'bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white border border-[#9a3412] shadow-[0_3px_8px_rgba(234,88,12,0.4)]'
              : 'bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400'
          }`}
        >
          2. 미리보기
        </button>
      </div>

      {/* ========================================================
          단계 1: 원고 입력 화면 (원고 입력 헤더 텍스트 및 클립보드 버튼 삭제 반영)
         ======================================================== */}
      {activeStep === 'input' && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150">
          {/* 빠른 불러오기 툴바 (결과물 형식 버튼과 동일한 크기와 디자인) */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-gradient-to-br from-white to-[#ffedd5] hover:border-orange-400 text-[#c2410c] border border-[#fdba74] rounded-[8px] text-[12px] font-bold shadow-[0_2px_5px_rgba(249,115,22,0.1)] cursor-pointer active:scale-98 transition"
            >
              <Upload className="w-3.5 h-3.5 text-orange-600" />
              <span>파일 열기</span>
            </button>
            <button
              type="button"
              onClick={() => setShowConfigSettings(!showConfigSettings)}
              className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-gradient-to-br from-white to-[#ffedd5] hover:border-orange-400 text-[#c2410c] border border-[#fdba74] rounded-[8px] text-[12px] font-bold shadow-[0_2px_5px_rgba(249,115,22,0.1)] cursor-pointer active:scale-98 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
              <span>서식 규정</span>
            </button>
            <button
              type="button"
              onClick={handleClearAllManuscript}
              className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-gradient-to-br from-white to-[#ffedd5] hover:border-orange-400 text-[#c2410c] border border-[#fdba74] rounded-[8px] text-[12px] font-bold shadow-[0_2px_5px_rgba(249,115,22,0.1)] cursor-pointer active:scale-98 transition"
              title="원고 내용과 분석 결과를 모두 비웁니다"
            >
              <Trash2 className="w-3.5 h-3.5 text-orange-600" />
              <span>비우기</span>
            </button>
          </div>

          {/* 원고 입력 에어리어 (하단 여백 없이 세로로 시원하게 확대) */}
          <textarea
            value={inputText}
            onChange={(e) => handleInputTextChange(e.target.value)}
            placeholder="서식을 지정할 설교문 또는 강의 원고를 입력하거나 위의 [파일 열기] 버튼으로 불러오세요."
            className="w-full h-[calc(100dvh-270px)] min-h-[380px] sm:min-h-[460px] p-3 border border-[#fdba74] rounded-xl text-xs bg-white text-[#1e293b] outline-none shadow-inner resize-none leading-relaxed focus:ring-1 focus:ring-orange-400 font-mono overscroll-contain mb-1"
          />

          {/* 원고 서식 적용 및 미리보기 메인 버튼 */}
          <button
            type="button"
            onClick={() => handleAnalyzeManuscript()}
            className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>원고 서식 적용 및 미리보기</span>
          </button>
        </div>
      )}

      {/* ========================================================
          단계 2: 미리보기 & DOCX 다운로드 화면
         ======================================================== */}
      {activeStep === 'preview' && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="text-xs font-extrabold text-[#c2410c] flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>미리보기</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearAllManuscript}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 rounded-[8px] text-[11px] font-bold px-2 py-1 cursor-pointer transition flex items-center gap-1 whitespace-nowrap active:scale-95 shadow-2xs"
                title="입력된 원고와 분석 결과를 모두 비우고 처음부터 새로 입력합니다"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>새 원고 / 비우기</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('input')}
                className="bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400 rounded-[8px] text-[11px] font-bold px-2.5 py-1 cursor-pointer transition flex items-center gap-1 whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>원고 수정</span>
              </button>
            </div>
          </div>

          {/* 실제 문서 형태의 미리보기 창 (하단 여백 없이 세로로 시원하게 확대) */}
          <div className="h-[calc(100dvh-280px)] min-h-[380px] sm:min-h-[460px] overflow-y-auto overscroll-contain bg-white p-4 sm:p-6 rounded-xl border border-orange-200 shadow-inner font-['Malgun_Gothic'] text-slate-800 space-y-2 mb-1">
            {paragraphs.map((p) => {
              if (p.isOutline) {
                const cleanOutlineText = p.originalText
                  .replace(/^([0-9]+|[①-⑳]|[I|V|X]+)[\.\)\-\s\:]*/, '')
                  .trim();
                return (
                  <div
                    key={p.id}
                    className="pl-3 text-[10pt] leading-[1.35] text-slate-800 flex items-start"
                  >
                    <span className="font-extrabold text-amber-900 mr-2 flex-shrink-0">
                      {p.outlineNumber}.
                    </span>
                    <span className="flex-1">{renderFormattedPreviewText(cleanOutlineText, false)}</span>
                  </div>
                );
              }

              switch (p.type) {
                case 'doc_title':
                  return (
                    <h1
                      key={p.id}
                      className="text-[18pt] font-black text-[#c2410c] text-justify my-3 leading-snug"
                    >
                      {renderFormattedPreviewText(p.originalText, false)}
                    </h1>
                  );
                case 'doc_subtitle':
                  return (
                    <h2 key={p.id} className="text-[14pt] font-bold text-slate-700 text-justify mb-3 leading-snug">
                      {renderFormattedPreviewText(p.originalText, false)}
                    </h2>
                  );
                case 'heading_1':
                  return (
                    <h2
                      key={p.id}
                      className="text-[16pt] font-extrabold text-[#c2410c] text-justify mt-4 mb-2 border-b border-orange-200 pb-1"
                    >
                      {renderFormattedPreviewText(p.originalText, false)}
                    </h2>
                  );
                case 'heading_2':
                  return (
                    <h3 key={p.id} className="text-[14pt] font-extrabold text-slate-800 mt-3 mb-1.5 leading-snug">
                      {renderFormattedPreviewText(p.originalText, false)}
                    </h3>
                  );
                case 'heading_3':
                  return (
                    <h4 key={p.id} className="text-[13pt] font-bold text-slate-700 mt-2.5 mb-1">
                      {renderFormattedPreviewText(p.originalText, false)}
                    </h4>
                  );
                case 'heading_4':
                case 'heading_5':
                  return (
                    <h5 key={p.id} className="text-[12pt] font-bold text-slate-700 mt-2 mb-1">
                      {renderFormattedPreviewText(p.originalText, false)}
                    </h5>
                  );
                case 'scripture_header':
                  return (
                    <div
                      key={p.id}
                      className="text-[10pt] font-extrabold text-[#ea580c] mx-4 sm:mx-6 mt-3.5 mb-0 leading-tight"
                    >
                      {renderFormattedPreviewText(p.originalText, false)}
                    </div>
                  );
                case 'scripture':
                  return (
                    <div
                      key={p.id}
                      className="text-[9pt] font-bold text-[#ea580c] mx-4 sm:mx-6 mt-0.5 mb-3 leading-relaxed text-justify"
                    >
                      {renderFormattedPreviewText(p.originalText, false)}
                    </div>
                  );
                case 'quote':
                  return (
                    <blockquote
                      key={p.id}
                      className="text-[9.5pt] italic text-slate-600 pl-3 border-l-2 border-slate-400 my-2 leading-relaxed"
                    >
                      {renderFormattedPreviewText(p.originalText, true, p.emphasisPhrases)}
                    </blockquote>
                  );
                case 'body':
                default:
                  return (
                    <p
                      key={p.id}
                      className="text-[10pt] leading-[1.35] text-justify text-slate-800 mb-4"
                    >
                      {renderFormattedPreviewText(p.originalText, true, p.emphasisPhrases)}
                    </p>
                  );
              }
            })}
          </div>

          {/* 최종 DOCX 다운로드 버튼 */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadDocx}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs shadow-lg transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            <span>
              {isExporting
                ? 'DOCX 문서 생성 중...'
                : '📄 구글 독스 / MS 워드용 DOCX 파일 다운로드 (실제 파일 생성)'}
            </span>
          </button>
        </div>
      )}

      {/* ========================================================
          서식 규정 및 강조단어 설정 서브 패널
         ======================================================== */}
      {showConfigSettings && (
        <div className="p-3 bg-white/95 rounded-xl border border-orange-200 text-xs shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-extrabold text-[#c2410c] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>문서 서식 상세 규정 & 강조 볼드체 설정</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowConfigSettings(false)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕ 닫기
            </button>
          </div>

          {/* 강조 단어/어구 볼드체 규정 (사용자 특별 요청 반영) */}
          <div className="mb-2 p-2 rounded-lg bg-orange-50/70 border border-orange-200">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-[10.5px] font-extrabold text-orange-950 flex items-center gap-1 whitespace-nowrap">
                <Bold className="w-3.5 h-3.5 text-orange-600" />
                <span>강조 단어·어구 볼드(Bold) 지정</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerAutoKeywordAnalysis}
                  title="원고 본문의 신학/주제 핵심어를 사전 분석하여 자동으로 지정합니다"
                  className="text-[10px] px-2 py-0.5 rounded bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold cursor-pointer flex items-center gap-1 shadow-2xs transition active:scale-95"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>원고 내용 자동 분석</span>
                </button>
                <label className="text-[10px] text-slate-600 flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={config.autoBoldMarkdown}
                    onChange={(e) => setConfig({ ...config, autoBoldMarkdown: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-400"
                  />
                  <span>**단어** 볼드 자동 적용</span>
                </label>
              </div>
            </div>
            <textarea
              value={emphasisInput}
              onChange={(e) => handleEmphasisWordsChange(e.target.value)}
              placeholder="원고 입력 시 핵심어가 자동 감지되며, 쉼표(,)로 직접 추가/수정할 수 있습니다."
              className="w-full h-[38px] p-1.5 border border-[#fdba74] rounded-md text-[11px] bg-white text-slate-800 outline-none resize-none"
            />
            <p className="text-[9.5px] text-orange-700 mt-0.5">
              * 원고 내용 분석 기반으로 자동 지정되며, 은은한 오렌지색(#EA580C) 볼드로 적용됩니다.
            </p>
          </div>

          {/* 서식 상세 그리드 */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">본문 글꼴</label>
              <CustomSelectTrigger
                label={
                  FONT_FAMILY_OPTIONS.find((o) => o.value === config.fontFamily)?.label ||
                  config.fontFamily
                }
                onClick={() =>
                  setActiveModal({
                    title: '본문 글꼴 선택',
                    options: FONT_FAMILY_OPTIONS,
                    selectedValue: config.fontFamily,
                    onSelect: (val) => setConfig({ ...config, fontFamily: val }),
                  })
                }
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">본문 글자 크기</label>
              <CustomSelectTrigger
                label={
                  FONT_SIZE_OPTIONS.find((o) => o.value === String(config.bodyFontSizePt))?.label ||
                  `${config.bodyFontSizePt}pt`
                }
                onClick={() =>
                  setActiveModal({
                    title: '본문 글자 크기 선택',
                    options: FONT_SIZE_OPTIONS,
                    selectedValue: String(config.bodyFontSizePt),
                    onSelect: (val) => setConfig({ ...config, bodyFontSizePt: Number(val) }),
                  })
                }
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">본문 줄 간격</label>
              <CustomSelectTrigger
                label={
                  LINE_HEIGHT_OPTIONS.find((o) => o.value === String(config.lineHeightRatio))?.label ||
                  `${config.lineHeightRatio}`
                }
                onClick={() =>
                  setActiveModal({
                    title: '본문 줄 간격 선택',
                    options: LINE_HEIGHT_OPTIONS,
                    selectedValue: String(config.lineHeightRatio),
                    onSelect: (val) => setConfig({ ...config, lineHeightRatio: Number(val) }),
                  })
                }
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">문단 정렬</label>
              <CustomSelectTrigger
                label={
                  ALIGNMENT_OPTIONS.find((o) => o.value === config.alignment)?.label ||
                  (config.alignment === 'both' ? '양쪽 정렬 (표준 권장)' : config.alignment)
                }
                onClick={() =>
                  setActiveModal({
                    title: '문단 정렬 선택',
                    options: ALIGNMENT_OPTIONS,
                    selectedValue: config.alignment,
                    onSelect: (val) =>
                      setConfig({ ...config, alignment: val as 'both' | 'left' | 'center' }),
                  })
                }
              />
            </div>
          </div>

          {/* 개요 서식 & 성경 인용 서식 */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">개요 번호 형식</label>
              <CustomSelectTrigger
                label={
                  OUTLINE_FORMAT_OPTIONS.find((o) => o.value === config.outlineNumberFormat)?.label ||
                  config.outlineNumberFormat
                }
                onClick={() =>
                  setActiveModal({
                    title: '개요 번호 형식 선택',
                    options: OUTLINE_FORMAT_OPTIONS,
                    selectedValue: config.outlineNumberFormat,
                    onSelect: (val) =>
                      setConfig({ ...config, outlineNumberFormat: val as '1.' | '1)' | '1-' }),
                  })
                }
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                성경 인용 색상 (9pt 전용)
              </label>
              <CustomSelectTrigger
                label={
                  SCRIPTURE_COLOR_OPTIONS.find(
                    (o) => o.value === config.scriptureColor.replace('#', '')
                  )?.label || config.scriptureColor
                }
                onClick={() =>
                  setActiveModal({
                    title: '성경 인용 색상 선택',
                    options: SCRIPTURE_COLOR_OPTIONS,
                    selectedValue: config.scriptureColor.replace('#', ''),
                    onSelect: (val) => setConfig({ ...config, scriptureColor: val }),
                  })
                }
              />
            </div>
          </div>

          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="flex-1 py-2 rounded-[8px] bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white border border-[#9a3412] shadow-[0_3px_8px_rgba(234,88,12,0.4)] font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>서식 규정 저장</span>
            </button>
            <button
              type="button"
              onClick={handleResetConfig}
              className="flex-1 py-2 rounded-[8px] bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400 font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>기본 규정 복원</span>
            </button>
          </div>
        </div>
      )}

      {/* 웜 오렌지 테마 서식 선택 모달 (Android 기본 브라우저 select 모달 대체) */}
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
    </div>
  );
};
