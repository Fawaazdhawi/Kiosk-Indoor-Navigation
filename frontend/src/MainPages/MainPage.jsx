import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import LogoImg from '../assets/Logo.png';
import { useNavigate } from "react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db, auth, isFirebaseConfigured } from "../firebase";
import SharedMap from "../components/SharedMap";
import SharedMap3D from "../components/SharedMap3D";
import { translateName, getDisplayNodeName } from "../utils/translator";
import { SAMPLE_ROOMS, SAMPLE_KIOSKS } from "../utils/mockData";
import { AlertDialog } from "../components/Dialogs";
import { QRCodeCanvas } from "qrcode.react";
import LanguageSelector from "../components/LanguageSelector";
import QuickTipsBar from "../components/QuickTipsBar";
import "./Main.css";


const SearchIcon = () => (
  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MicIcon = ({ isListening }) => (
  <svg className={`mic-icon ${isListening ? "pulsing-mic" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const TargetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="3"></circle>
    <line x1="12" y1="2" x2="12" y2="4"></line>
    <line x1="12" y1="20" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="4" y2="12"></line>
    <line x1="20" y1="12" x2="22" y2="12"></line>
  </svg>
);

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"></path>
  </svg>
);

const LoginIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

export default function App() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [resolutionScale, setResolutionScale] = useState(1);
  const [outputText, setOutputText] = useState("");


  const [location, setLocation] = useState(() => {
    const locked = localStorage.getItem("locked_kiosk_id");
    if (locked && (locked.toLowerCase().includes("entrance") || locked.toLowerCase().includes("pintu"))) {
      return "";
    }
    return locked || "";
  });
  const [isKioskLocked, setIsKioskLocked] = useState(!!localStorage.getItem("locked_kiosk_id"));

  const [isMobileMode, setIsMobileMode] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const [floor, setFloor] = useState("Lantai 1");
  const [floorOrder, setFloorOrder] = useState({});
  const [buildingOrder, setBuildingOrder] = useState([]);
  const [building, setBuilding] = useState("Gedung A");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [kiosks, setKiosks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const buildings = useMemo(() => {
    const bSet = new Set();
    kiosks.forEach(k => { if (k.building) bSet.add(k.building); });
    rooms.forEach(r => { if (r.building) bSet.add(r.building); });
    const arr = Array.from(bSet).sort((a, b) => {
      const idxA = buildingOrder.indexOf(a);
      const idxB = buildingOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return arr.length > 0 ? arr : ["Gedung A"];
  }, [kiosks, rooms, buildingOrder]);

  // Auto-select first building when buildings list changes
  useEffect(() => {
    if (buildings.length > 0 && !buildings.includes(building)) {
      setBuilding(buildings[0]);
    }
  }, [buildings, building]);
  const [pathData, setPathData] = useState([]);
  const [targetRoomName, setTargetRoomName] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [is3DMode, setIs3DMode] = useState(() => {
    return localStorage.getItem('map_view_mode') !== '2d';
  });
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [isUserPanning, setIsUserPanning] = useState(false);

  // Reset auto-follow when a new instruction step begins or new route loads
  useEffect(() => {
    setIsUserPanning(false);
  }, [activeStepIndex, pathData]);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'id');
  const [isNavFinished, setIsNavFinished] = useState(false);
  const [countdownValue, setCountdownValue] = useState(10);
  const [serverIp, setServerIp] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);


  const [roomActionModal, setRoomActionModal] = useState(null); // { room, hasSubmap }
  const [customAlert, setCustomAlert] = useState({ isOpen: false, message: '' });
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const showAlert = (message) => setCustomAlert({ isOpen: true, message });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (transformComponentRef.current) {
      transformComponentRef.current.resetTransform(0);
    }
  }, [floor, building]);


  const startListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch { /* Ignore start errors */ }
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showAlert(language === 'en' ? "Microphone not supported in this browser." : "Mikrofon tidak didukung di browser ini.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = language === 'en' ? 'en-US' : 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSearch("");
      latestTranscriptRef.current = "";
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      latestTranscriptRef.current = transcript;
      lastUpdatedByVoiceRef.current = true;
      setSearch(transcript);

      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

      silenceTimeoutRef.current = setTimeout(() => {
        silenceTimeoutRef.current = null;
        recognition.stop();
        if (latestTranscriptRef.current.trim()) {
          executeSearch(location, latestTranscriptRef.current);
          latestTranscriptRef.current = "";
        }
      }, 3000);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      latestTranscriptRef.current = "";
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
        if (latestTranscriptRef.current.trim()) {
          executeSearch(location, latestTranscriptRef.current);
          latestTranscriptRef.current = "";
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, location]);

  const getText = (key) => {
    const dict = {
      'login': { id: 'Masuk', en: 'Login' },
      'search_placeholder': { id: 'Cari toko, fasilitas, atau tanya AI...', en: 'Search store, facility, or ask AI...' },
      'output_placeholder': { id: 'Keterangan rute akan muncul di sini', en: 'Destination output text will appear here' },
      'select_kiosk': { id: 'Pilih Kios Awal', en: 'Select Start Kiosk' },
      'select_room': { id: 'Pilih Ruangan Tujuan', en: 'Select Destination Room' },
      'select_floor': { id: 'Pilih Lantai', en: 'Select Floor' },
      'you_are_here': { id: '📍 Anda berada di:', en: '📍 You are at:' },
      'fail_kiosk_first': { id: 'Silakan pilih Kios awal terlebih dahulu.', en: 'Please select a starting Kiosk first.' },
      'searching': { id: 'Mencari rute...', en: 'Searching for route...' },
      'failed': { id: 'Gagal:', en: 'Failed:' },
      'route_found': { id: 'Rute ditemukan!', en: 'Route found!' },
      'towards': { id: 'Menuju:', en: 'Towards:' },
      'no_nav_text': { id: 'Teks navigasi tidak tersedia.', en: 'Navigation text is not available.' },
      'admin_login_title': { id: 'Halaman Login', en: 'Login Page' },
      'username': { id: 'Email Pengguna', en: 'Email' },
      'password': { id: 'Kata Sandi', en: 'Password' },
      'login_btn': { id: 'MASUK', en: 'LOGIN' },
      'admin_login_subtitle': { id: 'Silahkan masukkan akun administrator Anda', en: 'Please enter your administrator account' },
      'email_placeholder': { id: 'Contoh: admin@email.com', en: 'Example: admin@email.com' },
      'session_expired_title': { id: 'Sesi Navigasi Berakhir', en: 'Navigation Session Expired' },
      'session_expired_desc': { id: 'Tautan rute ini sudah kedaluwarsa. Silakan pindai ulang QR Code dari Kiosk terdekat jika Anda membutuhkan panduan lagi.', en: 'This route link has expired. Please scan the QR Code again from the nearest Kiosk if you need guidance.' },
      'scan_qr_desc': { id: 'Pindai menggunakan kamera HP Anda. Pastikan HP dan Kiosk terhubung ke WiFi yang sama.', en: 'Scan using your phone camera. Make sure both devices are on the same WiFi.' },
      'show_qr_btn': { id: 'Tampilkan QR Code Navigasi', en: 'Show Navigation QR Code' }
    };
    return dict[key] ? dict[key][language] : key;
  };

  const getRoomTranslation = (indoName) => {
    if (language === 'id') return indoName;
    const room = rooms.find(r => r.name && r.name.toLowerCase() === indoName.toLowerCase());
    if (room && room.name_en) {
      return room.name_en;
    }
    const kiosk = kiosks.find(k => k.name && k.name.toLowerCase() === indoName.toLowerCase());
    if (kiosk && kiosk.name_en) {
      return kiosk.name_en;
    }
    return translateName(indoName, language);
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    localStorage.setItem('language', newLang);

    const translatedSearch = search ? translateName(search, newLang) : search;
    if (search) setSearch(translatedSearch);
    if (targetRoomName) setTargetRoomName(translateName(targetRoomName, newLang));

    if (navigationSteps.length > 0 && !isNavFinished) {
      executeSearch(location, translatedSearch, newLang, activeStepIndex >= 0 ? activeStepIndex : 0);
    } else if (outputText) {
      setOutputText("");
    }
  };


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lockId = params.get("set_kiosk");
    const unlock = params.get("unlock_kiosk");


    const start = params.get("start");
    const end = params.get("end");
    const mobile = params.get("mobile");
    const expires = params.get("expires");

    if (mobile === "true") {
      setIsMobileMode(true);
      if (start && end) {
        if (expires && Date.now() > parseInt(expires, 10)) {
          setIsSessionExpired(true);
          return;
        }
        setLocation(start);
        setSearch(end);
        executeSearch(start, end);
      } else {
        setIsSessionExpired(true);
      }
    }

    if (lockId) {
      localStorage.setItem("locked_kiosk_id", lockId);
      setLocation(lockId);
      setIsKioskLocked(true);
      if (language === 'en') {
        showAlert(`This device is now permanently locked as Kiosk: ${lockId}`);
      } else {
        showAlert(`Perangkat ini berhasil dikunci permanen sebagai Kiosk: ${lockId}`);
      }
      window.history.replaceState(null, "", window.location.pathname);
    } else if (unlock === "true") {
      localStorage.removeItem("locked_kiosk_id");
      setLocation("");
      setIsKioskLocked(false);
      if (language === 'en') {
        showAlert("Kiosk mode released. Device is back to normal mode.");
      } else {
        showAlert("Mode Kiosk dilepas. Perangkat kembali ke mode normal.");
      }
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const hasAutoSwitchedFloor = useRef(false);
  const floorOrderRef = useRef({});

  useEffect(() => {
    if (!db) {
      fetch('/api/map-data')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.rooms?.length) {
            setRooms(data.rooms);
            const loadedKiosks = data.kiosks || [];
            setKiosks(loadedKiosks);

            const lockedId = localStorage.getItem("locked_kiosk_id");
            if (lockedId) {
              const matchedKiosk = loadedKiosks.find(k => k.id === lockedId);
              if (matchedKiosk) {
                setLocation(lockedId);
                setIsKioskLocked(true);
                if (matchedKiosk.floor) setFloor(matchedKiosk.floor);
                if (matchedKiosk.building) setBuilding(matchedKiosk.building);
              } else {
                // Kiosk lama (seperti K008) tidak ada di data mall sekarang
                localStorage.removeItem("locked_kiosk_id");
                setIsKioskLocked(false);
                if (loadedKiosks.length > 0) {
                  setLocation(loadedKiosks[0].id);
                  if (loadedKiosks[0].floor) setFloor(loadedKiosks[0].floor);
                  if (loadedKiosks[0].building) setBuilding(loadedKiosks[0].building);
                } else {
                  setLocation("");
                }
              }
            } else if (loadedKiosks.length > 0) {
              // Default ke kiosk pertama jika belum dipilih
              setLocation(loadedKiosks[0].id);
              if (loadedKiosks[0].floor) setFloor(loadedKiosks[0].floor);
              if (loadedKiosks[0].building) setBuilding(loadedKiosks[0].building);
            } else if (data.floors?.length) {
              setBuilding(data.floors[0].building || "Mall Utama");
              setFloor(data.floors[0].name || "Ground Floor");
            }
          } else {
            setKiosks(SAMPLE_KIOSKS);
            setRooms(SAMPLE_ROOMS);
            setBuilding("Gedung A");
            setFloor("Lantai 1");
          }
        })
        .catch(() => {
          setKiosks(SAMPLE_KIOSKS);
          setRooms(SAMPLE_ROOMS);
          setBuilding("Gedung A");
          setFloor("Lantai 1");
        });
      return;
    }

    const unsubscribeKiosks = onSnapshot(collection(db, "Kiosks"), (kioskSnap) => {
      const loadedKiosks = [];
      const foundFloors = new Set(["Lantai 1"]);
      const foundBuildings = new Set();

      let floorToSwitch = null;
      let buildingToSwitch = null;

      kioskSnap.forEach((docSnap) => {
        const data = docSnap.data();
        loadedKiosks.push({ id: docSnap.id, ...data });
        if (data.floor) foundFloors.add(data.floor);
        if (data.building) foundBuildings.add(data.building);

        const lockedId = localStorage.getItem("locked_kiosk_id");
        if (lockedId && docSnap.id === lockedId) {
          if (data.floor) floorToSwitch = data.floor;
          if (data.building) buildingToSwitch = data.building;
        }
      });
      setKiosks(loadedKiosks);

      if (floorToSwitch && !hasAutoSwitchedFloor.current) {
        setFloor(floorToSwitch);
        if (buildingToSwitch) setBuilding(buildingToSwitch);
        hasAutoSwitchedFloor.current = true;
      }
    });


    const unsubscribeRooms = onSnapshot(collection(db, "Rooms"), (roomSnap) => {
      const foundFloors = new Set();
      const foundBuildings = new Set();
      const loadedRooms = [];

      roomSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.floor) foundFloors.add(data.floor);
        if (data.building) foundBuildings.add(data.building);

        if (data.name && data.name !== "Tanpa Nama" && data.name.toLowerCase() !== "pintu masuk") {
          loadedRooms.push({ id: docSnap.id, name: data.name, name_en: data.name_en, floor: data.floor || "Lantai 1", building: data.building || "Gedung A" });
        }
      });

      loadedRooms.sort((a, b) => a.name.localeCompare(b.name));
      setRooms(loadedRooms);
    });


    const unsubscribeConfig = onSnapshot(doc(db, "Settings", "MapConfig"), (docSnap) => {
      if (docSnap.exists()) {
        if (docSnap.data().floorOrder) {
          floorOrderRef.current = docSnap.data().floorOrder;
          setFloorOrder(docSnap.data().floorOrder);
        }
        if (docSnap.data().buildingOrder) {
          setBuildingOrder(docSnap.data().buildingOrder);
        }
      }
    });

    return () => {
      unsubscribeKiosks();
      unsubscribeRooms();
      unsubscribeConfig();
    };
  }, []);

  const floors = useMemo(() => {
    const bFloors = new Set();
    kiosks.forEach(k => { if (k.building === building && k.floor) bFloors.add(k.floor); });
    rooms.forEach(r => { if (r.building === building && r.floor) bFloors.add(r.floor); });

    let arr = Array.from(bFloors);
    if (arr.length === 0) arr = ["Lantai 1"];
    return arr.sort((a, b) => {
      const orderArray = Array.isArray(floorOrder) ? floorOrder : (floorOrder[building] || []);
      const idxA = orderArray.indexOf(a);
      const idxB = orderArray.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [kiosks, rooms, building, floorOrder]);

  const isMountedRef = useRef(true);
  const resetTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const latestTranscriptRef = useRef("");
  const recognitionRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchWrapperRef = useRef(null);

  const scrollTextRef = useRef(null);
  const lastUpdatedByVoiceRef = useRef(false);
  const transformComponentRef = useRef(null);
  const isProgrammaticPanRef = useRef(false);
  const panTimeoutRef = useRef(null);

  // Camera follow: smoothly pan to keep avatar on-screen
  const hasAutoZoomedRef = useRef(false);

  // Reset auto-zoom flag when step changes
  useEffect(() => { hasAutoZoomedRef.current = false; }, [activeStepIndex]);

  const handleAvatarPositionChange = useCallback((screenX, screenY, pathBounds) => {
    const ref = transformComponentRef.current;
    if (!ref) return;
    if (isNavFinished || activeStepIndex === -1 || isUserPanning) return;

    // react-zoom-pan-pinch ref shape varies by version; try both paths
    let scale, positionX, positionY, wrapper;
    try {
      const ts = ref.instance?.transformState ?? ref.state;
      if (!ts) return;
      scale = ts.scale;
      positionX = ts.positionX;
      positionY = ts.positionY;
      wrapper = ref.instance?.wrapperComponent ?? ref.wrapperComponent;
    } catch { return; }
    if (!wrapper || scale == null) return;

    const wWidth = wrapper.offsetWidth;
    const wHeight = wrapper.offsetHeight;

    let newScale = scale;
    let newX = positionX;
    let newY = positionY;
    let needsChange = false;

    // Dynamic zoom: only on step start, compute ideal scale from content-space path bounds
    if (!hasAutoZoomedRef.current && pathBounds && pathBounds.w > 0 && pathBounds.h > 0) {
      hasAutoZoomedRef.current = true;

      // Compute how much viewport the path occupies at current scale
      const pathViewportW = pathBounds.w * scale;
      const pathViewportH = pathBounds.h * scale;
      const coverageW = pathViewportW / wWidth;
      const coverageH = pathViewportH / wHeight;
      const maxCoverage = Math.max(coverageW, coverageH);

      // Target: path should cover ~40-60% of viewport
      // If path covers less than 20% → too far, zoom in
      // If path covers more than 80% → too close, zoom out slightly
      if (maxCoverage < 0.2 || maxCoverage > 0.85) {
        const targetCoverage = 0.5;
        const idealScaleW = (wWidth * targetCoverage) / pathBounds.w;
        const idealScaleH = (wHeight * targetCoverage) / pathBounds.h;
        let idealScale = Math.min(idealScaleW, idealScaleH);
        // Clamp to reasonable bounds
        idealScale = Math.max(0.5, Math.min(idealScale, 3.0));

        newScale = idealScale;
        newX = (wWidth / 2) - (screenX * newScale);
        newY = (wHeight / 2) - (screenY * newScale);
        needsChange = true;
      }
    }

    if (!needsChange) {
      // Keep the avatar in view by panning — don't force zoom changes
      const vx = screenX * scale + positionX;
      const vy = screenY * scale + positionY;

      // Safe zone: center 40% of viewport (30% margin each side)
      const mX = wWidth * 0.3;
      const mY = wHeight * 0.3;

      if (vx < mX) { newX = positionX + (mX - vx); needsChange = true; }
      else if (vx > wWidth - mX) { newX = positionX - (vx - (wWidth - mX)); needsChange = true; }

      if (vy < mY) { newY = positionY + (mY - vy); needsChange = true; }
      else if (vy > wHeight - mY) { newY = positionY - (vy - (wHeight - mY)); needsChange = true; }
    }

    if (needsChange) {
      isProgrammaticPanRef.current = true;
      ref.setTransform(newX, newY, newScale, 50, "linear");
      if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
      panTimeoutRef.current = setTimeout(() => { isProgrammaticPanRef.current = false; }, 100);

      setResolutionScale(prev => {
        if (Math.abs(prev - newScale) > 0.1) return newScale;
        return prev;
      });
    }
  }, [isNavFinished, activeStepIndex, isUserPanning]);

  // --- Autocomplete Filtering Logic ---
  const filteredDropdownRooms = useMemo(() => {
    // Abaikan ruangan palsu untuk submap
    const realRooms = rooms.filter(r => !r.floor.startsWith("submap_"));

    let rawResults = [];
    if (!search.trim()) {
      // Jika pencarian kosong, tampilkan semua ruangan dari semua gedung
      rawResults = [...realRooms].sort((a, b) => {
        if (a.building === building && b.building !== building) return -1;
        if (a.building !== building && b.building === building) return 1;
        if (a.building !== b.building) return (a.building || "").localeCompare(b.building || "");
        return a.name.localeCompare(b.name);
      });
    } else {
      const query = search.toLowerCase();

      const scoredRooms = realRooms.map(r => {
        let score = 0;
        const name = r.name.toLowerCase();
        const nameEn = (r.name_en || "").toLowerCase();
        const id = r.id.toLowerCase();

        if (name.includes(query) || nameEn.includes(query) || id.includes(query)) {
          score += 10;
          // Prioritaskan gedung saat ini
          if (r.building === building) score += 5;
        }
        return { room: r, score };
      }).filter(item => item.score > 0);

      scoredRooms.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.room.name.localeCompare(b.room.name);
      });

      // Batasi ke 15 hasil teratas untuk performa
      rawResults = scoredRooms.slice(0, 15).map(item => item.room);
    }

    // Deduplication pass
    const dedupMap = new Map();
    for (const r of rawResults) {
      const key = r.name.trim().toLowerCase();
      if (!dedupMap.has(key)) {
        dedupMap.set(key, { ...r, _count: 1 });
      } else {
        dedupMap.get(key)._count++;
      }
    }

    return Array.from(dedupMap.values()).map(r => ({
      ...r,
      isGeneric: r._count > 1 || ['toilet', 'lift', 'tangga', 'pintu masuk', 'igd'].includes(r.name.toLowerCase())
    }));
  }, [rooms, search, building]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (scrollTextRef.current) {
      const timer = setTimeout(() => {
        if (scrollTextRef.current) {
          scrollTextRef.current.scrollLeft = 999999;
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [search]);

  useEffect(() => {
    let timeoutId;
    const fetchIp = () => {
      fetch("/api/ip")
        .then(res => res.json())
        .then(data => {
          setServerIp(data.ip);
        })
        .catch(err => {
          console.error("Gagal mendapatkan IP server, mencoba lagi...", err);
          timeoutId = setTimeout(fetchIp, 2000);
        });
    };
    fetchIp();

    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.utterances = [];
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const speakSteps = (langkahNavigasi, startIndex = 0, currentLang = language) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.utterances = [];

      const playNext = (index) => {
        if (!isMountedRef.current) return;
        if (index >= langkahNavigasi.length) return;

        const step = langkahNavigasi[index];
        const utterance = new SpeechSynthesisUtterance(step.teks);
        window.utterances.push(utterance);

        utterance.lang = currentLang === 'en' ? 'en-US' : 'id-ID';
        utterance.rate = 1.15;

        utterance.onstart = () => {
          setActiveStepIndex(index);
          if (step.floor) {
            setFloor(step.floor);
          }
          if (step.building) {
            setBuilding(step.building);
          }
        };

        utterance.onend = () => {
          if (index === langkahNavigasi.length - 1) {
            setIsNavFinished(true);
            setCountdownValue(10);

            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = setInterval(() => {
              setCountdownValue(prev => prev > 0 ? prev - 1 : 0);
            }, 1000);

            resetTimeoutRef.current = setTimeout(() => {
              if (!isMountedRef.current) return;
              setSearch("");
              setOutputText("");

              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

              if (!isKioskLocked) {
                setLocation("");
              }

              setPathData([]);
              setNavigationSteps([]);
              setActiveStepIndex(-1);
              setTargetRoomName("");
              setIsNavFinished(false);
              setIsQrModalOpen(false);
            }, 10000);
          } else {
            playNext(index + 1);
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      playNext(startIndex);
    }
  };

  const executeSearch = async (overrideLocation, overrideTarget, overrideLang, resumeStepIndex = 0) => {
    const searchLocation = typeof overrideLocation === 'string' ? overrideLocation : location;
    const searchTarget = typeof overrideTarget === 'string' ? overrideTarget : search;
    const currentLang = overrideLang || language;

    if (!searchTarget.trim()) return;

    setIsSearchDropdownOpen(false);
    setIsNavFinished(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const silentUtterance = new SpeechSynthesisUtterance('');
      silentUtterance.volume = 0;
      window.speechSynthesis.speak(silentUtterance);
    }

    if (!searchLocation) {
      setOutputText(getText('fail_kiosk_first'));
      return;
    }

    setOutputText(getText('searching'));
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          start_node_id: searchLocation,
          teks_pencarian: searchTarget.trim(),
          language: currentLang,
          current_floor: floor
        })
      });

      const textResponse = await response.text();

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        console.error("Server tidak mengembalikan JSON yang valid:", textResponse);
        throw new Error(`Server Backend Crash/Mati. Cek terminal Python! Respons: ${textResponse.substring(0, 50)}`);
      }

      if (!response.ok) {
        setOutputText(`${getText('failed')} ${data.detail || "Terjadi kesalahan"}`);
        setPathData([]);
        setNavigationSteps([]);
        setActiveStepIndex(-1);
      } else {
        const roomName = translateName(data.data_target.nama_ruangan, currentLang, data.data_target.nama_ruangan_en);
        setTargetRoomName(roomName);
        setSearch(roomName);
        setPathData(data.jalur_koordinat);
        setNavigationSteps(data.langkah_navigasi);
        setActiveStepIndex(resumeStepIndex);

        let allText = getText('no_nav_text');
        if (data.langkah_navigasi && data.langkah_navigasi.length > 0) {
          allText = data.langkah_navigasi.map(l => l.teks).join("\n\n");
          const finalText = `${getText('route_found')}\n${getText('towards')} ${roomName}\n\n${allText}`;
          setOutputText(finalText);

          const isMob = new URLSearchParams(window.location.search).get("mobile") === "true";
          if (isMob) {
            if (data.langkah_navigasi[0].floor) setFloor(data.langkah_navigasi[0].floor);
            if (data.langkah_navigasi[0].building) setBuilding(data.langkah_navigasi[0].building);
          } else {
            speakSteps(data.langkah_navigasi, resumeStepIndex, currentLang);
          }
        } else {
          const fallbackText = `${getText('route_found')} ${getText('towards')} ${roomName}`;
          setOutputText(fallbackText);

          if (data.jalur_koordinat && data.jalur_koordinat.length > 0 && data.jalur_koordinat[0].floor) {
            setFloor(data.jalur_koordinat[0].floor);
            if (data.jalur_koordinat[0].building) setBuilding(data.jalur_koordinat[0].building);
          }

          const isMob = new URLSearchParams(window.location.search).get("mobile") === "true";
          if ('speechSynthesis' in window && !isMob) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(fallbackText);
            utterance.lang = language === 'en' ? 'en-US' : 'id-ID';
            utterance.rate = 1.15;
            window.speechSynthesis.speak(utterance);
          }
        }
      }
    } catch (error) {
      setOutputText(`Error: Tidak dapat terhubung ke server (${error.message})`);
      setPathData([]);
    }
  };

  const activePath = useMemo(() => {
    if (activeStepIndex === -1 || !navigationSteps.length || !pathData.length) return null;
    const endIndex = navigationSteps[activeStepIndex].index_akhir;
    const rawPath = pathData.slice(0, endIndex + 1);
    return rawPath.filter(p => (p.building || "Gedung A") === building && p.floor === floor);
  }, [pathData, navigationSteps, activeStepIndex, building, floor]);

  const activeStepPath = useMemo(() => {
    if (activeStepIndex === -1 || !navigationSteps.length || !pathData.length) return null;
    const startIndex = activeStepIndex > 0 ? navigationSteps[activeStepIndex - 1].index_akhir : 0;
    const endIndex = navigationSteps[activeStepIndex].index_akhir;
    return pathData.slice(startIndex, endIndex + 1);
  }, [pathData, navigationSteps, activeStepIndex]);


  const nextStepPath = useMemo(() => {
    const nextIndex = activeStepIndex + 1;
    if (activeStepIndex === -1 || nextIndex >= navigationSteps.length || !pathData.length) return null;
    const startIndex = navigationSteps[activeStepIndex].index_akhir;
    const endIndex = navigationSteps[nextIndex].index_akhir;
    return pathData.slice(startIndex, endIndex + 1);
  }, [pathData, navigationSteps, activeStepIndex]);

  const filteredPathData = useMemo(() => {
    return pathData.filter(p => (p.building || "Gedung A") === building && p.floor === floor);
  }, [pathData, building, floor]);

  const handleLogin = async () => {
    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setErrorMsg(language === 'en' ? "Harap masukkan email dan kata sandi!" : "Harap masukkan email dan kata sandi!");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // Kredensial Resmi Admin Navigator
    if (u === "adminavigator@admin.com" && p === "navigasiindoor2026") {
      localStorage.setItem("wayfinder_admin_auth", "true");
      setIsLoginOpen(false);
      setUsername("");
      setPassword("");
      setErrorMsg("");
      navigate("/admin", { state: { authorized: true } });
      return;
    }

    setErrorMsg(language === 'en' ? "Invalid email or password!" : "Email atau kata sandi salah!");
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const qrCodeUrl = useMemo(() => {
    if (!isQrModalOpen) return "";
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? serverIp : window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : "";
    const expires = Date.now() + 5 * 60 * 1000;
    return `${window.location.protocol}//${host}${port}/?start=${encodeURIComponent(location)}&end=${encodeURIComponent(search)}&mobile=true&expires=${expires}`;
  }, [isQrModalOpen, serverIp, location, search]);

  const handleQuickTipAction = (actionType) => {
    switch (actionType) {
      case 'voice':
        startListening();
        break;
      case 'qr':
        if (navigationSteps.length > 0) {
          setIsQrModalOpen(true);
        }
        break;
      case 'toggle3d':
        const next3D = !is3DMode;
        setIs3DMode(next3D);
        localStorage.setItem("map_view_mode", next3D ? "3d" : "2d");
        break;
      case 'bridge':
        setBuilding('Galaxy Mall 2');
        break;
      case 'toilet':
        setSearch('Toilet');
        executeSearch(location, 'Toilet');
        break;
      default:
        break;
    }
  };

  if (isSessionExpired) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text-main)', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#e74c3c' }}>{getText('session_expired_title')}</h1>
        <p style={{ marginTop: '10px', fontSize: '16px', maxWidth: '400px', lineHeight: '1.5' }}>
          {getText('session_expired_desc')}
        </p>
      </div>
    );
  }

  return (
    <div>
      {!isMobileMode && (
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={LogoImg} alt="Wayfinder Logo" style={{ height: '35px', width: 'auto', filter: isDarkMode ? "brightness(0.1)" : "none" }} />
            <span className="header-logo">Wayfinder</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label className="theme-switch" title={isDarkMode ? "Light Mode" : "Dark Mode"}>
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={() => {
                  const newMode = !isDarkMode;
                  setIsDarkMode(newMode);
                  localStorage.setItem('theme', newMode ? 'dark' : 'light');
                }}
              />
              <span className="slider">
                <span className="slider-icon">🌙</span>
                <span className="slider-icon">☀️</span>
              </span>
            </label>
            <LanguageSelector
              language={language}
              onChange={handleLanguageChange}
            />
            <button className="header-login-btn Onclick" onClick={() => { setIsLoginOpen(true); setErrorMsg(""); setUsername(""); setPassword(""); }}>
              <LoginIcon />
              <span>{getText('login')}</span>
            </button>
          </div>
        </header>
      )}

      {isLoginOpen && (
        <div className="modal-overlay glass-overlay" onClick={() => { setIsLoginOpen(false); setErrorMsg(""); }}>
          <div className={`login-modal-card ${isShaking ? "shake-anim" : ""}`} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => { setIsLoginOpen(false); setErrorMsg(""); }}>×</button>
            <div className="login-header">
              <div className="login-icon-badge">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h2>{getText('admin_login_title')}</h2>
              <p className="login-subtitle">{getText('admin_login_subtitle')}</p>
            </div>

            {errorMsg && (
              <div className="login-error-alert animate-fade-in">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}


            <div className="login-form-body">
              <div className="modern-input-group">
                <label>{getText('username')}</label>
                <div className="input-with-icon">
                  <svg className="field-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type="text"
                    placeholder={getText('email_placeholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              </div>

              <div className="modern-input-group">
                <label>{getText('password')}</label>
                <div className="input-with-icon">
                  <svg className="field-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              </div>

              <button className="modern-submit-btn" onClick={handleLogin}>
                <span>{getText('login_btn')}</span>
                <svg className="btn-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {isQrModalOpen && (
        <div className="modal-overlay" onClick={() => setIsQrModalOpen(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", width: "300px" }}>
            <button className="close-btn" onClick={() => setIsQrModalOpen(false)}>×</button>
            <div style={{ background: "white", padding: "16px", borderRadius: "10px", display: "inline-block" }}>
              <QRCodeCanvas
                value={qrCodeUrl}
                size={200}
              />
            </div>
            <p style={{ marginTop: "20px", fontSize: "13px", color: "var(--text-muted)" }}>
              {getText('scan_qr_desc')}
            </p>
          </div>
        </div>
      )}

      <div className={`main-layout ${isMobileMode ? 'mobile-mode' : ''}`}>
        {isMobileMode && (
          <header className="mobile-top-header">
            <div className="mobile-header-left">
              <div className="mobile-building-badge">
                <span className="mobile-badge-icon">🏢</span>
                <span className="mobile-building-name">{building || "Mall"}</span>
                <span className="mobile-badge-dot">•</span>
                <span className="mobile-floor-name">{floor}</span>
              </div>
            </div>
            <div className="mobile-header-right">
              {/* Toggle 2D / 3D di HP */}
              <div className="mobile-view-toggle">
                <button
                  type="button"
                  className={`mobile-view-btn ${!is3DMode ? "active" : ""}`}
                  onClick={() => {
                    setIs3DMode(false);
                    localStorage.setItem("map_view_mode", "2d");
                  }}
                >
                  2D
                </button>
                <button
                  type="button"
                  className={`mobile-view-btn ${is3DMode ? "active" : ""}`}
                  onClick={() => {
                    setIs3DMode(true);
                    localStorage.setItem("map_view_mode", "3d");
                  }}
                >
                  3D
                </button>
              </div>

              {/* Theme Switch */}
              <label className="theme-switch mobile-theme-switch" title={isDarkMode ? "Light Mode" : "Dark Mode"}>
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={() => {
                    const newMode = !isDarkMode;
                    setIsDarkMode(newMode);
                    localStorage.setItem('theme', newMode ? 'dark' : 'light');
                  }}
                />
                <span className="slider">
                  <span className="slider-icon">🌙</span>
                  <span className="slider-icon">☀️</span>
                </span>
              </label>

              {/* Language Selector */}
              <LanguageSelector
                language={language}
                onChange={handleLanguageChange}
                isMobile={true}
              />
            </div>
          </header>
        )}
        <aside className={`left-panel ${isMobileMode ? 'mobile-panel' : ''}`}>

          {!isMobileMode && (
            <>
              <div className="route-planner-container">
                <div className="route-planner-timeline">
                  <div className="timeline-icon-target" title="Building">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                      <line x1="9" y1="6" x2="9" y2="6.01"></line>
                      <line x1="15" y1="6" x2="15" y2="6.01"></line>
                      <line x1="9" y1="10" x2="9" y2="10.01"></line>
                      <line x1="15" y1="10" x2="15" y2="10.01"></line>
                      <line x1="9" y1="14" x2="9" y2="14.01"></line>
                      <line x1="15" y1="14" x2="15" y2="14.01"></line>
                      <path d="M9 18h6"></path>
                    </svg>
                  </div>
                  <div className="timeline-line"></div>
                  <div className="timeline-icon-target">
                    <TargetIcon />
                  </div>
                  <div className="timeline-line"></div>
                  <div className="timeline-icon-pin">
                    <PinIcon />
                  </div>
                </div>
                <div className="route-planner-inputs">
                  <div className="dropdown-wrapper kiosk-input">
                    <select
                      className="dropdown-select route-select"
                      value={building}
                      onChange={(e) => {
                        const newB = e.target.value;
                        setBuilding(newB);
                        // User requested not to clear the location when building changes
                        const bFloors = new Set();
                        kiosks.forEach(k => { if (k.building === newB && k.floor && !k.floor.startsWith("submap_")) bFloors.add(k.floor); });
                        rooms.forEach(r => { if (r.building === newB && r.floor && !r.floor.startsWith("submap_")) bFloors.add(r.floor); });
                        let newFloors = Array.from(bFloors);
                        if (newFloors.length > 0) {
                          newFloors.sort((a, b) => {
                            const orderArray = Array.isArray(floorOrder) ? floorOrder : (floorOrder[newB] || []);
                            const idxA = orderArray.indexOf(a);
                            const idxB = orderArray.indexOf(b);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return a.localeCompare(b);
                          });
                          const targetFloor = newFloors.find(f => f.toLowerCase() === "lantai 1" || f.toLowerCase() === "first floor") || newFloors[0];
                          setFloor(targetFloor);
                        }
                      }}
                    >
                      {buildings.map(b => (
                        <option key={b} value={b}>{translateName(b, language)}</option>
                      ))}
                    </select>
                    <ChevronIcon />
                  </div>

                  {/* dropdown kiosk atau info kiosk terkunci */}
                  {isKioskLocked ? (
                    <div className="dropdown-wrapper kiosk-input" style={{ padding: "10px 12px", background: "var(--white)", borderRadius: "8px", border: "1.5px solid var(--border)", color: "var(--text-main)", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span title="Kiosk Terkunci">🔒</span> {getText('you_are_here')} {kiosks.find(k => k.id === location)?.name || location}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem("locked_kiosk_id");
                          setIsKioskLocked(false);
                        }}
                        style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          background: "var(--bg-tag, #f1f5f9)",
                          border: "1px solid var(--border)",
                          borderRadius: "4px",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          fontWeight: "600",
                          whiteSpace: "nowrap"
                        }}
                        title={language === 'en' ? 'Release kiosk lock' : 'Lepas kunci kios'}
                      >
                        {language === 'en' ? 'Unlock' : 'Buka Kunci'}
                      </button>
                    </div>
                  ) : (
                    <div className="dropdown-wrapper kiosk-input">
                      <select
                        className="dropdown-select route-select"
                        value={location}
                        required
                        onChange={(e) => {
                          const newLocation = e.target.value;
                          setLocation(newLocation);

                          const selectedKioskObj = kiosks.find(k => k.id === newLocation);
                          if (selectedKioskObj) {
                            if (selectedKioskObj.floor) setFloor(selectedKioskObj.floor);
                            if (selectedKioskObj.building) setBuilding(selectedKioskObj.building);
                          }

                          if (search.trim()) {
                            executeSearch(newLocation, search);
                          }
                        }}
                      >
                        <option value="" disabled>{getText('select_kiosk')}</option>
                        {(() => {
                          const currentKiosk = kiosks.find(k => k.id === location);
                          if (currentKiosk && currentKiosk.building !== building) {
                            return (
                              <option value={currentKiosk.id} hidden>
                                {translateName(currentKiosk.name || currentKiosk.id, language, currentKiosk.name_en)}
                              </option>
                            );
                          }
                          return null;
                        })()}
                        {kiosks.filter(k => !k.name?.toLowerCase().includes('pintu') && k.building === building).map((kiosk) => (
                          <option key={kiosk.id} value={kiosk.id}>
                            {translateName(kiosk.name || kiosk.id, language, kiosk.name_en)}
                          </option>
                        ))}
                      </select>
                      <ChevronIcon />
                    </div>
                  )}

                  {/* pencarian & dropdown ruangan */}
                  <div className="search-wrapper destination-input" style={{ position: "relative" }} ref={searchWrapperRef}>
                    <form onSubmit={(e) => { e.preventDefault(); setIsSearchDropdownOpen(false); if (searchInputRef.current) searchInputRef.current.blur(); executeSearch(location, search); }} style={{ width: "100%", margin: 0 }}>
                      <input
                        ref={searchInputRef}
                        inputMode={isListening ? "none" : "search"}
                        className="search-input route-search"
                        style={{ paddingRight: "48px", width: "100%", color: (search && (isListening || lastUpdatedByVoiceRef.current)) ? "transparent" : "inherit" }}
                        type="search"
                        placeholder={isListening ? (language === 'en' ? 'Listening...' : 'Mendengarkan...') : getText('search_placeholder')}
                        value={search}
                        onFocus={() => { lastUpdatedByVoiceRef.current = false; setIsSearchDropdownOpen(true); }}
                        onClick={() => setIsSearchDropdownOpen(true)}
                        onChange={(e) => { setSearch(e.target.value); setIsSearchDropdownOpen(true); }}
                      />
                      {(search && (isListening || lastUpdatedByVoiceRef.current)) && (
                        <div style={{
                          position: 'absolute',
                          left: '18px',
                          top: '0',
                          bottom: '0',
                          right: '48px',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}>
                          <div ref={scrollTextRef} style={{ width: '100%', overflow: 'hidden', color: 'var(--text-main)', fontSize: '0.92rem', fontFamily: "'DM Sans', sans-serif" }}>
                            {search}
                          </div>
                        </div>
                      )}
                    </form>

                    {search.length > 0 ? (
                      <div className="mic-btn-wrapper" onClick={() => setSearch("")} title={language === 'en' ? 'Clear' : 'Hapus'}>
                        <span style={{ fontSize: "24px", color: "var(--text-muted)", lineHeight: 1 }}>&times;</span>
                      </div>
                    ) : (
                      <div className="mic-btn-wrapper" onClick={startListening} title={language === 'en' ? 'Voice Search' : 'Pencarian Suara'}>
                        <MicIcon isListening={isListening} />
                      </div>
                    )}

                    {isSearchDropdownOpen && filteredDropdownRooms.length > 0 && (
                      <ul className="autocomplete-dropdown">
                        {filteredDropdownRooms.map(room => {
                          let displayName = getDisplayNodeName(room, language);
                          let subtitle = "";
                          if (room.isGeneric) {
                            subtitle = language === 'en' ? '(Nearest)' : '(Terdekat)';
                          } else if (room.floor.startsWith("submap_")) {
                            const parentId = room.floor.replace("submap_", "");
                            const parentRoom = rooms.find(r => r.id === parentId);
                            if (parentRoom) {
                              displayName += " " + getDisplayNodeName(parentRoom, language);
                              subtitle = `${room.building || "Gedung A"} • ${translateName(parentRoom.floor, language)}`;
                            }
                          } else {
                            subtitle = `${room.building || "Gedung A"} • ${translateName(room.floor, language)}`;
                          }

                          return (
                            <li
                              key={room.id}
                              className="autocomplete-item"
                              onClick={() => {
                                setSearch(displayName);
                                setIsSearchDropdownOpen(false);
                                executeSearch(location, room.isGeneric ? room.name : room.id);
                              }}
                            >
                              <span className="autocomplete-item-name">{displayName}</span>
                              <span className="autocomplete-item-subtitle">{subtitle}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Tips Bar (Opsi 2: Teks Petunjuk Dinamis Interaktif) */}
              <QuickTipsBar
                language={language}
                isDarkMode={isDarkMode}
                is3DMode={is3DMode}
                hasActiveRoute={navigationSteps.length > 0}
                onAction={handleQuickTipAction}
                hidden={isSearchDropdownOpen && filteredDropdownRooms.length > 0}
              />

              {/* aksi cepat — hanya tampil saat belum ada tujuan dipilih */}
              <div className={`quick-actions-section${(search.trim() || isSearchDropdownOpen) ? ' quick-actions-hidden' : ''}`}>
                <p className="quick-actions-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  {language === 'id' ? 'Pencarian Cepat' : 'Quick Searches'}
                </p>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={() => { const q = 'Toilet'; setSearch(q); executeSearch(location, q); }}>
                    <span>🚻</span> {language === 'en' ? 'Restroom' : 'Toilet'}
                  </button>
                  <button className="quick-action-btn" onClick={() => { const q = 'Musholla'; setSearch(q); executeSearch(location, q); }}>
                    <span>🕌</span> {language === 'en' ? 'Prayer Room' : 'Musholla'}
                  </button>
                  <button className="quick-action-btn" onClick={() => { const q = 'Lift'; setSearch(q); executeSearch(location, q); }}>
                    <span>🛗</span> {language === 'en' ? 'Elevator' : 'Lift'}
                  </button>
                  <button className="quick-action-btn" onClick={() => { const q = 'Customer Service'; setSearch(q); executeSearch(location, q); }}>
                    <span>ℹ️</span> {language === 'en' ? 'Info Desk' : 'Pusat Informasi'}
                  </button>
                  <button className="quick-action-btn" onClick={() => { const q = 'ATM Center'; setSearch(q); executeSearch(location, q); }}>
                    <span>🏧</span> {language === 'en' ? 'ATM' : 'ATM Center'}
                  </button>
                  <button className="quick-action-btn" onClick={() => { const q = 'Starbucks'; setSearch(q); executeSearch(location, q); }}>
                    <span>☕</span> Starbucks
                  </button>
                  <button className="quick-action-btn" onClick={() => { const q = 'XXI'; setSearch(q); executeSearch(location, q); }}>
                    <span>🍿</span> Cinema XXI
                  </button>
                  <button className="quick-action-btn" onClick={() => { const q = 'Uniqlo'; setSearch(q); executeSearch(location, q); }}>
                    <span>👕</span> Uniqlo
                  </button>
                  <button className="quick-action-btn" onClick={() => { const q = 'Food Court'; setSearch(q); executeSearch(location, q); }}>
                    <span>🍔</span> Food Court
                  </button>
                </div>
              </div>

            </>
          )}

          {/* kotak teks navigasi dinamis */}
          {(outputText || navigationSteps.length > 0) && (
            <div className={`destination-output-dynamic ${isMobileMode ? 'mobile-nav-box' : ''}`}>
              {navigationSteps.length > 0 ? (
                <>
                  <div className="nav-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: isMobileMode ? '0.88rem' : '1rem', color: 'var(--text-main)' }}>
                      {getText('route_found')} {getText('towards')} {targetRoomName}
                    </span>
                    {isMobileMode && (
                      <button
                        onClick={() => {
                          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                          if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
                          setPathData([]);
                          setNavigationSteps([]);
                          setActiveStepIndex(-1);
                          setTargetRoomName("");
                          setOutputText("");
                          setIsNavFinished(false);
                          setSearch("");
                        }}
                        style={{
                          background: 'rgba(0,0,0,0.06)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          lineHeight: 1,
                        }}
                        title={language === 'en' ? 'Stop Navigation' : 'Tutup Navigasi'}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {navigationSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`nav-step ${activeStepIndex === idx ? 'active-step' : ''}`}
                      style={{ display: isMobileMode ? (activeStepIndex === idx ? 'block' : 'none') : 'block' }}
                      ref={(!isMobileMode && activeStepIndex === idx) ? (el) => el && el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) : null}
                    >
                      {step.teks}
                    </div>
                  ))}

                  {isMobileMode && navigationSteps.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px' }}>
                      <button
                        onClick={() => {
                          const newIdx = Math.max(0, activeStepIndex - 1);
                          setActiveStepIndex(newIdx);
                          if (navigationSteps[newIdx]?.floor) {
                            setFloor(navigationSteps[newIdx].floor);
                          }
                          if (navigationSteps[newIdx]?.building) {
                            setBuilding(navigationSteps[newIdx].building);
                          }
                        }}
                        disabled={activeStepIndex === 0}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          border: 'none',
                          background: activeStepIndex === 0 ? (isDarkMode ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0') : (isDarkMode ? 'rgba(30, 41, 59, 0.9)' : '#e0e7ff'),
                          color: activeStepIndex === 0 ? (isDarkMode ? '#64748b' : '#94a3b8') : 'var(--blue-primary)',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          cursor: activeStepIndex === 0 ? 'not-allowed' : 'pointer',
                          minWidth: '78px',
                        }}
                      >
                        {language === 'en' ? 'Prev' : 'Mundur'}
                      </button>
                      <span style={{ fontWeight: '700', color: 'var(--blue-primary)', fontSize: '0.9rem' }}>
                        {activeStepIndex + 1} / {navigationSteps.length}
                      </span>
                      <button
                        onClick={() => {
                          const newIdx = Math.min(navigationSteps.length - 1, activeStepIndex + 1);
                          setActiveStepIndex(newIdx);
                          if (navigationSteps[newIdx]?.floor) {
                            setFloor(navigationSteps[newIdx].floor);
                          }
                          if (navigationSteps[newIdx]?.building) {
                            setBuilding(navigationSteps[newIdx].building);
                          }
                        }}
                        disabled={activeStepIndex === navigationSteps.length - 1}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          border: 'none',
                          background: activeStepIndex === navigationSteps.length - 1 ? (isDarkMode ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0') : 'var(--blue-primary)',
                          color: activeStepIndex === navigationSteps.length - 1 ? (isDarkMode ? '#64748b' : '#94a3b8') : 'white',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          cursor: activeStepIndex === navigationSteps.length - 1 ? 'not-allowed' : 'pointer',
                          minWidth: '78px',
                          boxShadow: activeStepIndex === navigationSteps.length - 1 ? 'none' : '0 3px 10px rgba(26, 115, 200, 0.35)',
                        }}
                      >
                        {language === 'en' ? 'Next' : 'Maju'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="nav-step">{outputText}</div>
              )}
            </div>
          )}

          {isNavFinished && (
            <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "12px 24px", background: isDarkMode ? "rgba(234, 179, 8, 0.2)" : "#fff3cd", color: isDarkMode ? "#fde047" : "#856404", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", textAlign: "center", border: isDarkMode ? "1px solid rgba(234, 179, 8, 0.4)" : "1px solid #ffeeba", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              {language === 'en'
                ? `Navigation complete. The screen will reset in ${countdownValue} seconds.`
                : `Navigasi selesai. Layar akan di-reset dalam ${countdownValue} detik.`}
            </div>
          )}

          {!isMobileMode && navigationSteps.length > 0 && (
            <button
              className="show-qr-btn"
              onClick={() => setIsQrModalOpen(true)}
              style={{ marginTop: "15px" }}
            >
              {getText('show_qr_btn')}
            </button>
          )}

          {!isMobileMode && navigationSteps.length > 0 && (
            <button
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
                setPathData([]);
                setNavigationSteps([]);
                setActiveStepIndex(-1);
                setTargetRoomName("");
                setOutputText("");
                setIsNavFinished(false);
                setSearch("");
              }}
              style={{
                marginTop: "10px",
                width: "100%",
                padding: "12px",
                background: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "#e74c3c",
                color: isDarkMode ? "#ef4444" : "white",
                border: isDarkMode ? "1px solid rgba(239, 68, 68, 0.3)" : "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {language === 'id' ? 'Hentikan Navigasi' : 'Stop Navigation'}
            </button>
          )}

        </aside>

        <main className="map-panel" style={{ position: "relative" }}>

          {/* kontrol lantai vertikal (opsi 1) */}
          <div className="vertical-scrubber-wrapper">
            {(() => {
              const visibleFloors = floors.filter(f => {
                if (f.startsWith("submap_")) return false;
                if (isMobileMode && navigationSteps.length > 0) {
                  return navigationSteps.some(step => step.floor === f);
                }
                return true;
              });

              const initialCounts = {};
              visibleFloors.forEach(f => {
                if (!f.toLowerCase().startsWith("lantai ") && f.length > 0) {
                  const initial = f.charAt(0).toUpperCase();
                  initialCounts[initial] = (initialCounts[initial] || 0) + 1;
                }
              });

              return visibleFloors.map((f) => {
                const isActive = (() => {
                  if (floor.startsWith("submap_")) {
                    const parentId = floor.replace("submap_", "");
                    const parent = rooms.find(r => r.id === parentId);
                    return parent ? parent.floor === f : false;
                  }
                  return floor === f;
                })();

                let shortName = f;
                if (f.toLowerCase().startsWith("lantai ")) {
                  shortName = f.substring(7).trim();
                } else if (f) {
                  const initial = f.charAt(0).toUpperCase();
                  if (initialCounts[initial] > 1) {
                    const match = f.match(/^([a-zA-Z])[a-z]*\s*(\d+)/i);
                    if (match && match[2]) {
                      shortName = (match[1] + match[2]).toUpperCase();
                    } else {
                      shortName = f.substring(0, 2);
                      shortName = shortName.charAt(0).toUpperCase() + (shortName.length > 1 ? shortName.charAt(1).toLowerCase() : "");
                    }
                  } else {
                    shortName = initial;
                  }
                }

                return (
                  <button
                    key={f}
                    className={`scrubber-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setFloor(f)}
                    title={f}
                  >
                    {shortName}
                  </button>
                );
              });
            })()}
          </div>

          {floor.startsWith("submap_") && (
            <button
              onClick={() => {
                const parentRoomId = floor.replace("submap_", "");
                const parentRoom = rooms.find(r => r.id === parentRoomId);
                setFloor(parentRoom?.floor || "Lantai 1");
              }}
              style={{ position: "absolute", top: "20px", left: "20px", zIndex: 100, padding: "10px 20px", background: "#1A73C8", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
            >
              Kembali ke Lantai Utama
            </button>
          )}
          {/* Toggle View Mode (2D / 3D) - Desktop only (di HP sudah masuk di mobile-top-header) */}
          {!isMobileMode && (
            <div className="view-mode-toggle-wrapper">
              <button
                type="button"
                className={`view-mode-btn ${!is3DMode ? "active" : ""}`}
                onClick={() => {
                  setIs3DMode(false);
                  localStorage.setItem("map_view_mode", "2d");
                }}
              >
                2D
              </button>
              <button
                type="button"
                className={`view-mode-btn ${is3DMode ? "active" : ""}`}
                onClick={() => {
                  setIs3DMode(true);
                  localStorage.setItem("map_view_mode", "3d");
                }}
              >
                3D
              </button>
            </div>
          )}

          {is3DMode ? (
            <div className="map-content-3d" style={{ width: "100%", height: "100%", position: "relative" }}>
              <SharedMap3D
                rooms={rooms}
                kiosks={kiosks}
                path={filteredPathData}
                activePath={activePath}
                activeStepPath={activeStepPath}
                nextStepPath={nextStepPath}
                activeStepIndex={activeStepIndex}
                navigationSteps={navigationSteps}
                currentFloor={floor}
                currentBuilding={building}
                language={language}
                selectedKiosk={location}
                isDarkMode={isDarkMode}
                isMobile={isMobileMode}
                hasActiveNavigation={navigationSteps.length > 0}
                onRoomClick={(room, e) => {
                  if (isMobileMode) return;
                  const hasSubmap = floors.includes(`submap_${room.id}`);
                  if (hasSubmap) {
                    const clientX = e?.evt?.clientX ?? window.innerWidth / 2;
                    const clientY = e?.evt?.clientY ?? window.innerHeight / 2;
                    setRoomActionModal({ room, hasSubmap: true, x: clientX, y: clientY });
                  } else {
                    if (room.type === "kiosk" && !room.is_connector) {
                      setLocation(room.id);
                      if (search) {
                        executeSearch(room.id, search);
                      }
                    } else {
                      const roomName = getDisplayNodeName(room, language);
                      setSearch(roomName);
                      if (location) {
                        executeSearch(location, room.id);
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <TransformWrapper ref={transformComponentRef} onZoom={(ref) => { const s = ref.state.scale; setResolutionScale(prev => Math.abs(prev - s) > 0.05 ? s : prev); }} onZoomStop={(ref) => setResolutionScale(ref.state.scale)} onPanningStart={() => { if (!isProgrammaticPanRef.current) setIsUserPanning(true); }} initialScale={1} minScale={0.05} maxScale={10} centerOnInit={true} limitToBounds={false} wheel={{ step: 0.005, smoothStep: 0.002 }}>
              <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: "grab" }} contentStyle={{ width: "100%", height: "100vh" }}>
                <div className="map-content" style={{ width: "100%", height: "100%" }}>
                  <SharedMap
                    rooms={rooms}
                    kiosks={kiosks}
                    resolutionScale={resolutionScale}
                    path={filteredPathData}
                    activePath={activePath}
                    activeStepPath={activeStepPath}
                    nextStepPath={nextStepPath}
                    activeStepIndex={activeStepIndex}
                    navigationSteps={navigationSteps}
                    currentFloor={floor}
                    currentBuilding={building}
                    language={language}
                    selectedKiosk={location}
                    isDarkMode={isDarkMode}
                    onAvatarPositionChange={handleAvatarPositionChange}
                    onRoomClick={(room, e) => {
                      if (isMobileMode) return;
                      const hasSubmap = floors.includes(`submap_${room.id}`);
                      if (hasSubmap) {
                        const clientX = e?.evt?.clientX ?? window.innerWidth / 2;
                        const clientY = e?.evt?.clientY ?? window.innerHeight / 2;
                        setRoomActionModal({ room, hasSubmap: true, x: clientX, y: clientY });
                      } else {
                        if (room.type === "kiosk" && !room.is_connector) {
                          setLocation(room.id);
                          if (search) {
                            executeSearch(room.id, search);
                          }
                        } else {
                          const roomName = getDisplayNodeName(room, language);
                          setSearch(roomName);
                          if (location) {
                            executeSearch(location, room.id);
                          }
                        }
                      }
                    }}
                    showGrid={false}
                    showBorder={true}
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
          )}
        </main>

        {/* ── room action modal ── */}
        {roomActionModal && (
          <div
            onClick={() => setRoomActionModal(null)}
            style={{
              position: "fixed", inset: 0,
              zIndex: 3000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: roomActionModal.x,
                top: roomActionModal.y - 15,
                transform: "translate(-50%, -100%)",
                background: isDarkMode ? "#1e293b" : "#ffffff",
                borderRadius: "16px",
                padding: "16px",
                width: "280px",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
                border: `1px solid ${isDarkMode ? "#334155" : "rgba(226,232,240,0.8)"}`,
                animation: "modalEnter 0.2s ease-out forwards",
                pointerEvents: "auto"
              }}
            >
              {/* Bagian Atas */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: isDarkMode ? "rgba(26,115,200,0.15)" : "#E8F0FE",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--blue-primary)", flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: isDarkMode ? "#f1f5f9" : "#172B4D" }}>
                    {getDisplayNodeName(roomActionModal.room, language)}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {language === 'id' ? 'Pilih tindakan untuk ruangan ini' : 'Choose an action for this room'}
                  </div>
                </div>
                <button
                  onClick={() => setRoomActionModal(null)}
                  style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "16px", flexShrink: 0 }}
                >
                  ×
                </button>
              </div>

              <div style={{ height: "1px", background: isDarkMode ? "#334155" : "#e2e8f0", marginBottom: "12px" }} />

              {/* Tombol Aksi */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Tombol Navigasi */}
                <button
                  onClick={() => {
                    const room = roomActionModal.room;
                    const roomName = getDisplayNodeName(room, language);
                    setSearch(roomName);
                    setRoomActionModal(null);
                    if (location) {
                      executeSearch(location, room.id);
                    }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, var(--blue-primary) 0%, var(--blue-dark) 100%)",
                    color: "white", cursor: "pointer", textAlign: "left",
                    boxShadow: "0 4px 12px rgba(26,115,200,0.3)",
                    transition: "all 0.2s ease", width: "100%"
                  }}
                >
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{language === 'id' ? 'Navigasi ke Sini' : 'Navigate Here'}</div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.85, marginTop: "1px" }}>{language === 'id' ? 'Tampilkan rute dari posisi Anda' : 'Show route from your position'}</div>
                  </div>
                </button>

                {/* Tombol Masuk Submap */}
                {roomActionModal.hasSubmap && (
                  <button
                    onClick={() => {
                      setFloor(`submap_${roomActionModal.room.id}`);
                      setRoomActionModal(null);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 12px", borderRadius: "10px",
                      border: `1px solid ${isDarkMode ? "#334155" : "var(--border)"}`,
                      background: isDarkMode ? "rgba(30,41,59,0.6)" : "#f8fafc",
                      color: isDarkMode ? "#e2e8f0" : "var(--text-main)", cursor: "pointer", textAlign: "left",
                      transition: "all 0.2s ease", width: "100%"
                    }}
                  >
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: isDarkMode ? "rgba(26,115,200,0.15)" : "#E8F0FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--blue-primary)" }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 3v18" />
                        <path d="M3 9h6" />
                        <path d="M3 15h6" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{language === 'id' ? 'Masuk ke Ruangan' : 'Enter Room'}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "1px" }}>{language === 'id' ? 'Lihat denah bagian dalam ruangan' : 'View the inner floor plan'}</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <AlertDialog
          isOpen={customAlert.isOpen}
          message={customAlert.message}
          onClose={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
}