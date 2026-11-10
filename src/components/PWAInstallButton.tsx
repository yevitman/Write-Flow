import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, Smartphone, Check, X } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<Props> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running in standalone mode (installed as PWA), we can either hide or show "설치됨" badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/20 text-white text-[11px] font-semibold backdrop-blur-xs">
        <Check className="w-3.5 h-3.5 text-emerald-300" />
        <span>앱 설치됨</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        title="홈 화면에 앱 설치하기"
        className={`flex items-center gap-1.5 font-bold transition-all transform active:scale-95 shadow-sm cursor-pointer ${
          compact
            ? 'px-2 py-1 text-[11px] rounded-md bg-amber-500 hover:bg-amber-600 text-white border border-amber-300/40 shadow-orange-950/20'
            : 'px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-extrabold shadow-md'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>앱 설치</span>
      </button>

      {/* 모바일 홈 화면 추가 안내 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-orange-200 text-slate-800 flex flex-col relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="/pwa-192x192.png"
                alt="Writing Helper Icon"
                className="w-12 h-12 rounded-xl shadow-md border border-orange-200 object-cover"
              />
              <div>
                <h3 className="text-base font-extrabold text-orange-900 leading-tight">
                  Writing Helper 홈 화면 설치
                </h3>
                <p className="text-xs text-orange-600 font-medium">
                  스마트폰 홈 화면에 바로가기 아이콘을 추가하세요
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 text-xs space-y-2.5 text-slate-700">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>iPhone / iPad (Safari) 설치 방법</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                    1
                  </div>
                  <div>
                    Safari 하단 바의 <strong className="inline-flex items-center gap-1 text-blue-600"><Share2 className="w-3 h-3" /> 공유</strong> 버튼을 터치합니다.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                    2
                  </div>
                  <div>
                    메뉴를 아래로 스크롤하여 <strong className="inline-flex items-center gap-1 text-slate-900"><PlusSquare className="w-3 h-3" /> 홈 화면에 추가</strong>를 선택합니다.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                    3
                  </div>
                  <div>
                    우측 상단 <strong>추가</strong>를 누르면 홈 화면에 지정된 펜 & 노트 아이콘으로 설치됩니다.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 mb-4 text-xs space-y-2.5 text-slate-700">
                <div className="font-bold text-orange-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <span>Android (Chrome) / 브라우저 설치 방법</span>
                </div>
                {isInstallable ? (
                  <p className="text-slate-600">
                    아래 버튼을 누르면 즉시 홈 화면에 앱으로 설치됩니다.
                  </p>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-200 text-orange-900 font-bold flex items-center justify-center text-[10px]">
                        1
                      </div>
                      <div>
                        브라우저 우측 상단 메뉴(<strong>⋮</strong>)를 터치합니다.
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-200 text-orange-900 font-bold flex items-center justify-center text-[10px]">
                        2
                      </div>
                      <div>
                        <strong>[앱 설치]</strong> 또는 <strong>[홈 화면에 추가]</strong>를 선택합니다.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  await install();
                  setShowModal(false);
                }}
                className="w-full py-2.5 mb-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-md hover:from-orange-600 hover:to-amber-600 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>지금 즉시 설치하기</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              확인 및 닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
};
