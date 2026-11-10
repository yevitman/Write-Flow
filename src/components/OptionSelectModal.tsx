import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';

export interface OptionItem {
  value: string;
  label: string;
  badge?: string;
}

interface OptionSelectModalProps {
  isOpen: boolean;
  title: string;
  options: (string | OptionItem)[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export const OptionSelectModal: React.FC<OptionSelectModalProps> = ({
  isOpen,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedOptions: OptionItem[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] transition-all animate-in fade-in duration-150 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-gradient-to-b from-[#fffbf5] to-[#fff7ed] rounded-t-2xl sm:rounded-2xl border border-[rgba(249,115,22,0.4)] shadow-[0_-4px_25px_rgba(249,115,22,0.2),0_10px_30px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[80vh] transition-transform animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 웜 오렌지 헤더 바 (사진 2 헤더 테마 계승) */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-white/80 rounded-full inline-block" />
            <h3 className="text-[13px] font-black tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 콤팩트하고 부드러운 스크롤 옵션 목록 */}
        <div className="p-2 sm:p-2.5 overflow-y-auto space-y-1 overscroll-contain">
          {normalizedOptions.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[9px] text-[12px] font-medium transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ffedd5] to-[#fed7aa]/60 border border-[#f97316] text-[#9a3412] font-bold shadow-[0_1px_4px_rgba(249,115,22,0.15)]'
                    : 'bg-white hover:bg-orange-50/60 border border-[#fed7aa]/60 text-[#1e293b] active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-200/70 text-orange-900 font-semibold">
                      {opt.badge}
                    </span>
                  )}
                </div>

                {/* 선택 인디케이터 (주황색 테마 체크 아이콘) */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white shadow-xs scale-105'
                      : 'border border-slate-300 bg-slate-50'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* 하단 취소/닫기 버튼 (모바일 편의) */}
        <div className="p-2 bg-gradient-to-t from-orange-100/40 to-transparent border-t border-orange-100/80 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 rounded-md bg-white border border-slate-200 shadow-2xs cursor-pointer"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};
