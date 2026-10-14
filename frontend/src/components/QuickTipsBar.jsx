import React, { useState, useEffect, useRef } from 'react';

const TIPS_DATA = [
  {
    id: 'voice',
    icon: '🎙️',
    tagId: 'Pencarian Suara',
    tagEn: 'Voice Search',
    textId: 'Tekan ikon mikrofon untuk mencari toko atau fasilitas menggunakan suara Anda.',
    textEn: 'Tap the microphone icon to search stores or facilities with your voice.',
    actionType: 'voice',
    actionLabelId: 'Coba Suara',
    actionLabelEn: 'Try Voice',
  },
  {
    id: 'qr',
    icon: '📱',
    tagId: 'Bawa ke HP',
    tagEn: 'Mobile QR',
    textId: 'Pindai QR Code di layar untuk membawa rute peta interaktif langsung di smartphone Anda.',
    textEn: 'Scan the QR code to take the interactive navigation route on your smartphone.',
    actionType: 'qr',
    actionLabelId: 'Buka QR',
    actionLabelEn: 'Open QR',
  },
  {
    id: 'bridge',
    icon: '🌉',
    tagId: 'Antar Gedung',
    tagEn: 'Bridge Route',
    textId: 'Ingin ke Galaxy Mall 2? Navigasi akan memandu Anda melewati jembatan penghubung.',
    textEn: 'Heading to Galaxy Mall 2? Navigation will guide you across the connecting skybridge.',
    actionType: 'bridge',
    actionLabelId: 'Lihat GM 2',
    actionLabelEn: 'View GM 2',
  },
  {
    id: '3d',
    icon: '📐',
    tagId: 'Peta 3D',
    tagEn: '3D View',
    textId: 'Ganti mode ke 3D di pojok kanan atas untuk melihat gedung dan avatar secara realistis.',
    textEn: 'Switch to 3D mode in the top-right corner to view realistic building & avatar.',
    actionType: 'toggle3d',
    actionLabelId: 'Ubah ke 3D',
    actionLabelEn: 'Switch to 3D',
  },
  {
    id: 'touch',
    icon: '👆',
    tagId: 'Pilih di Peta',
    tagEn: 'Tap Map',
    textId: 'Sentuh atau klik langsung ruangan/toko mana pun di peta untuk melihat rute tercepat.',
    textEn: 'Tap or click directly on any store on the map to find the quickest route.',
    actionType: 'none',
  },
  {
    id: 'quick',
    icon: '⚡',
    tagId: 'Fasilitas Cepat',
    tagEn: 'Quick Access',
    textId: 'Tekan tombol Toilet, Musholla, atau Lift di Pencarian Cepat untuk menemukan lokasi terdekat.',
    textEn: 'Tap Restroom, Prayer Room, or Elevator in Quick Searches for the nearest facility.',
    actionType: 'toilet',
    actionLabelId: 'Cari Toilet',
    actionLabelEn: 'Find Restroom',
  },
];

export default function QuickTipsBar({
  language = 'id',
  isDarkMode = false,
  onAction = null,
  is3DMode = false,
  hasActiveRoute = false,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef(null);

  // Otomatis berpindah tip setiap 6 detik jika tidak di-hover
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % TIPS_DATA.length);
        setIsFading(false);
      }, 250);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const handleNext = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % TIPS_DATA.length);
      setIsFading(false);
    }, 200);
  };

  const handlePrev = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + TIPS_DATA.length) % TIPS_DATA.length);
      setIsFading(false);
    }, 200);
  };

  const currentTip = TIPS_DATA[currentIndex];
  const tag = language === 'en' ? currentTip.tagEn : currentTip.tagId;

  // Sesuaikan teks petunjuk QR: jika belum ada rute, jelaskan bahwa QR muncul setelah memilih rute
  let text = language === 'en' ? currentTip.textEn : currentTip.textId;
  if (currentTip.id === 'qr') {
    if (!hasActiveRoute) {
      text = language === 'en'
        ? 'After selecting a destination route, you can scan the QR code to take it on your smartphone.'
        : 'Setelah memilih rute tujuan, Anda dapat memindai QR Code untuk membawanya di smartphone.';
    } else {
      text = language === 'en'
        ? 'Scan the QR code to take this interactive navigation route on your smartphone.'
        : 'Pindai QR Code di layar untuk membawa rute aktif ini langsung di smartphone Anda.';
    }
  }

  const actionLabel = language === 'en' ? currentTip.actionLabelEn : currentTip.actionLabelId;

  // Tombol aksi QR hanya boleh muncul jika rute sudah dipilih
  const isQrWithoutRoute = currentTip.id === 'qr' && !hasActiveRoute;
  const showAction = Boolean(currentTip.actionType && currentTip.actionType !== 'none' && !isQrWithoutRoute);

  // Jika tip 3D sedang aktif tapi aplikasi sudah dalam mode 3D, sesuaikan teks tombol
  let dynamicActionLabel = actionLabel;
  if (currentTip.actionType === 'toggle3d') {
    dynamicActionLabel = is3DMode
      ? (language === 'en' ? 'Switch to 2D' : 'Ubah ke 2D')
      : (language === 'en' ? 'Switch to 3D' : 'Ubah ke 3D');
  }

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (isQrWithoutRoute) return;
    if (onAction && currentTip.actionType && currentTip.actionType !== 'none') {
      onAction(currentTip.actionType);
    }
  };

  return (
    <div
      className="quick-tips-bar"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      title={language === 'en' ? 'Kiosk Usage Tip (Hover to pause)' : 'Tips Penggunaan Kiosk (Arahkan mouse untuk jeda)'}
    >
      <div className="quick-tips-inner">
        {/* Ikon Glowing Kiri */}
        <div className="quick-tips-icon-badge">
          <span className="quick-tips-icon">{currentTip.icon}</span>
        </div>

        {/* Konten Teks Panduan */}
        <div className="quick-tips-content">
          <div className="quick-tips-header">
            <span className="quick-tips-tag">
              <span className="quick-tips-pulse-dot"></span>
              {tag}
            </span>
            <span className="quick-tips-counter">
              {currentIndex + 1}/{TIPS_DATA.length}
            </span>
          </div>

          <p
            className={`quick-tips-text ${isFading ? 'fade-out' : 'fade-in'}`}
          >
            {text}
          </p>
        </div>
      </div>

      {/* Bagian Bawah: Tombol Aksi Cepat & Navigasi Panah / Dot */}
      <div className="quick-tips-footer">
        {showAction ? (
          <button
            type="button"
            className="quick-tips-action-btn"
            onClick={handleActionClick}
          >
            <span>{dynamicActionLabel}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Indikator Dot & Tombol Panah Kecil */}
        <div className="quick-tips-nav">
          <button
            type="button"
            className="quick-tips-arrow"
            onClick={handlePrev}
            title={language === 'en' ? 'Previous tip' : 'Tips sebelumnya'}
          >
            ‹
          </button>
          <div className="quick-tips-dots">
            {TIPS_DATA.map((_, i) => (
              <span
                key={i}
                className={`quick-tips-dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setIsFading(true);
                  setTimeout(() => {
                    setCurrentIndex(i);
                    setIsFading(false);
                  }, 150);
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="quick-tips-arrow"
            onClick={handleNext}
            title={language === 'en' ? 'Next tip' : 'Tips selanjutnya'}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
