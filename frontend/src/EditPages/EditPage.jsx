import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import LogoImg from '../assets/Logo.png';
import { useNavigate } from "react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Stage, Layer, Rect, Text, Line, Transformer, Circle } from "react-konva";
import { collection, getDocs, doc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { translateName } from "../utils/translator";
import { SAMPLE_ROOMS, SAMPLE_KIOSKS } from "../utils/mockData";
import { PromptDialog, AlertDialog, ConfirmDialog } from "../components/Dialogs";
import LanguageSelector from "../components/LanguageSelector";
import { SHAPE_TYPES, getPresetPoints, normalizePolygonPoints } from "../utils/shapePresets";
import "./Edit.css";

const ElementShape = React.memo(({
  shapeProps,
  isSelected,
  isEditingVertices,
  selectedVertexIndex,
  onSelectVertex,
  onVertexDrag,
  onSelect,
  onChange,
  setIsDraggingElement,
  GRID_SIZE,
  originalElements,
  language,
  isDarkMode,
  onRequestRename
}) => {
  const shapeRef = useRef();

  const handleRename = () => {
    const typeLabel = shapeProps.type === 'kiosk' ? (language === 'en' ? 'Kiosk' : 'Kiosk') : (language === 'en' ? 'Room' : 'Ruangan');
    const promptText = language === 'en' ? `Enter ${typeLabel} Name:` : `Masukkan Nama ${typeLabel}:`;
    onRequestRename(promptText, shapeProps.name || "", (newName) => {
      onChange({ ...shapeProps, name: newName });
    });
  };

  let displayName = translateName(shapeProps.name || (shapeProps.type === 'kiosk' ? 'Kiosk' : 'Tanpa Nama'), language, shapeProps.name_en);
  let textContent = displayName;
  if (shapeProps.is_connector && shapeProps.target_building) {
    const translatedTarget = translateName(shapeProps.target_building, language);
    textContent = language === 'id' ? `Pintu ke ${translatedTarget}` : `Door to ${translatedTarget}`;
    displayName = textContent;
  }
  const textContentLen = Math.max(1, displayName.length);
  const longestWordLen = Math.max(...displayName.split(' ').map(w => w.length), 1);
  const actualUsableWidth = Math.max(10, shapeProps.width - 10);
  const actualUsableHeight = Math.max(10, shapeProps.height - 10);

  const maxFontSizeWord = actualUsableWidth / (longestWordLen * 0.65);
  const safetyFactor = displayName.split(' ').length > 1 ? 1.5 : 1.1;
  const maxFontSizeArea = Math.sqrt((actualUsableWidth * actualUsableHeight) / (textContentLen * 0.65 * 1.2 * safetyFactor));
  const maxFontSizeSingleLine = actualUsableHeight / 1.2;

  const dynamicFontSize = Math.max(9, Math.min(maxFontSizeWord, maxFontSizeArea, maxFontSizeSingleLine));

  const getVisualColors = useCallback(() => {
    const original = originalElements.find(el => el.id === shapeProps.id);
    const isNew = !original;
    const isChanged = original && (Math.abs(original.x - shapeProps.x) > 0.1 || Math.abs(original.y - shapeProps.y) > 0.1 || Math.abs(original.width - shapeProps.width) > 0.1 || Math.abs(original.height - shapeProps.height) > 0.1);

    const isEntrance = shapeProps.type === 'kiosk' && shapeProps.name?.toLowerCase().includes('pintu');
    const isLift = shapeProps.name?.toLowerCase().includes('lift');
    const isStairs = shapeProps.name?.toLowerCase().includes('tangga') || shapeProps.name?.toLowerCase().includes('stairs');
    const isKiosk = shapeProps.type === 'kiosk' && !isEntrance && !isLift && !isStairs;

    if (isEntrance) {
      if (isNew) return { fill: isDarkMode ? "#1b5e20" : "#a5d6a7", stroke: isDarkMode ? "#2e7d32" : "#4caf50", text: isDarkMode ? "#ffffff" : "#1b5e20" };
      if (isChanged) return { fill: isDarkMode ? "#827717" : "#e6ee9c", stroke: isDarkMode ? "#9e9d24" : "#c0ca33", text: isDarkMode ? "#ffffff" : "#827717" };
      return { fill: "#4CAF50", stroke: "#2E7D32", text: "#FFFFFF" };
    }

    if (isLift) {
      if (isNew) return { fill: isDarkMode ? "#4a148c" : "#e1bee7", stroke: isDarkMode ? "#6a1b9a" : "#ab47bc", text: isDarkMode ? "#ffffff" : "#4a148c" };
      if (isChanged) return { fill: isDarkMode ? "#311b92" : "#d1c4e9", stroke: isDarkMode ? "#4527a0" : "#9575cd", text: isDarkMode ? "#ffffff" : "#311b92" };
      return { fill: "#9C27B0", stroke: "#6A1B9A", text: "#FFFFFF" };
    }

    if (isStairs) {
      if (isNew) return { fill: isDarkMode ? "#e65100" : "#ffe0b2", stroke: isDarkMode ? "#ef6c00" : "#ff9800", text: isDarkMode ? "#ffffff" : "#e65100" };
      if (isChanged) return { fill: isDarkMode ? "#bf360c" : "#ffccbc", stroke: isDarkMode ? "#d84315" : "#ff5722", text: isDarkMode ? "#ffffff" : "#bf360c" };
      return { fill: "#FF9800", stroke: "#E65100", text: "#FFFFFF" };
    }

    if (isKiosk) {
      if (isNew) return { fill: isDarkMode ? "#0d47a1" : "#bbdefb", stroke: isDarkMode ? "#1565c0" : "#2196f3", text: isDarkMode ? "#ffffff" : "#0d47a1" };
      if (isChanged) return { fill: isDarkMode ? "#311b92" : "#d1c4e9", stroke: isDarkMode ? "#4527a0" : "#9575cd", text: isDarkMode ? "#ffffff" : "#311b92" };
      return { fill: "#2196F3", stroke: "#0D47A1", text: "#FFFFFF" };
    }

    if (isNew) return { fill: isDarkMode ? "#064e3b" : "#d4edda", stroke: isDarkMode ? "#065f46" : "#c3e6cb", text: isDarkMode ? "#d1fae5" : "#155724" };
    if (isChanged) return { fill: isDarkMode ? "#3f3f00" : "#fff3cd", stroke: isDarkMode ? "#666600" : "#ffeeba", text: isDarkMode ? "#fff" : "#856404" };

    return { fill: isDarkMode ? "#334155" : "#cbd5e1", stroke: isDarkMode ? "#64748b" : "#94a3b8", text: isDarkMode ? "#f8fafc" : "#0f172a" };
  }, [shapeProps, originalElements, isDarkMode]);

  const visualColors = getVisualColors();

  const renderEndpoints = () => {
    const isRoom = shapeProps.type === 'room';
    const isKiosk = shapeProps.type === 'kiosk';
    if (!isRoom && !isKiosk) return null;
    const endpoints = shapeProps.endpoints || ['bottom'];
    const markerLen = 16;
    const markerThick = 4;

    return endpoints.map((side) => {
      let mX, mY, mW, mH;
      if (side === 'top') {
        mX = shapeProps.x + shapeProps.width / 2 - markerThick / 2; mY = shapeProps.y - markerLen / 2; mW = markerThick; mH = markerLen;
      } else if (side === 'bottom') {
        mX = shapeProps.x + shapeProps.width / 2 - markerThick / 2; mY = shapeProps.y + shapeProps.height - markerLen / 2; mW = markerThick; mH = markerLen;
      } else if (side === 'left') {
        mX = shapeProps.x - markerLen / 2; mY = shapeProps.y + shapeProps.height / 2 - markerThick / 2; mW = markerLen; mH = markerThick;
      } else if (side === 'right') {
        mX = shapeProps.x + shapeProps.width - markerLen / 2; mY = shapeProps.y + shapeProps.height / 2 - markerThick / 2; mW = markerLen; mH = markerThick;
      }
      return <Rect key={side} x={mX} y={mY} width={mW} height={mH} fill="#B71C1C" listening={false} />;
    });
  };

  const hasPoints = shapeProps.points && shapeProps.points.length >= 6;

  return (
    <React.Fragment>
      {hasPoints ? (
        <Line
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleRename}
          onDblTap={handleRename}
          ref={shapeRef}
          id={shapeProps.id}
          x={shapeProps.x}
          y={shapeProps.y}
          points={shapeProps.points}
          closed={true}
          fill={visualColors.fill}
          stroke={visualColors.stroke}
          draggable={!isEditingVertices}
          strokeWidth={isSelected ? 3 : 2}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          onTouchStart={() => setIsDraggingElement(true)}
          onTouchEnd={() => setIsDraggingElement(false)}
          onMouseDown={() => setIsDraggingElement(true)}
          onMouseUp={() => setIsDraggingElement(false)}
          onDragStart={() => setIsDraggingElement(true)}
          onTransformStart={() => setIsDraggingElement(true)}
          dragBoundFunc={(pos) => ({
            x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
          })}
          onDragEnd={(e) => {
            setIsDraggingElement(false);
            onChange({
              ...shapeProps,
              x: Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE,
              y: Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE,
            }, "drag");
          }}
        />
      ) : (
        <Rect
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleRename}
          onDblTap={handleRename}
          ref={shapeRef}
          id={shapeProps.id}
          {...shapeProps}
          fill={visualColors.fill}
          stroke={visualColors.stroke}
          draggable
          strokeWidth={isSelected ? 3 : 2}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          onTouchStart={() => setIsDraggingElement(true)}
          onTouchEnd={() => setIsDraggingElement(false)}
          onMouseDown={() => setIsDraggingElement(true)}
          onMouseUp={() => setIsDraggingElement(false)}
          onDragStart={() => setIsDraggingElement(true)}
          onTransformStart={() => setIsDraggingElement(true)}
          dragBoundFunc={(pos) => ({
            x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
          })}
          onDragEnd={(e) => {
            setIsDraggingElement(false);
            onChange({
              ...shapeProps,
              x: Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE,
              y: Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE,
            }, "drag");
          }}
        />
      )}

      <Text
        text={textContent}
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        fontSize={dynamicFontSize}
        fontStyle="bold"
        fill={visualColors.text}
        align="center"
        verticalAlign="middle"
        padding={5}
        listening={false}
        wrap="word"
        ellipsis={false}
        perfectDrawEnabled={false}
      />
      {renderEndpoints()}

      {/* Titik Sudut Draggable Handles saat Mode Edit Titik Aktif */}
      {isEditingVertices && isSelected && hasPoints && (
        Array.from({ length: shapeProps.points.length / 2 }).map((_, vIdx) => {
          const vx = shapeProps.x + shapeProps.points[vIdx * 2];
          const vy = shapeProps.y + shapeProps.points[vIdx * 2 + 1];
          const isVSelected = selectedVertexIndex === vIdx;
          return (
            <Circle
              key={`vertex-handle-${vIdx}`}
              x={vx}
              y={vy}
              radius={isVSelected ? 7 : 5.5}
              fill={isVSelected ? "#ef4444" : "#2563eb"}
              stroke="#ffffff"
              strokeWidth={2}
              draggable
              dragBoundFunc={(pos) => ({
                x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
                y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
              })}
              onClick={(e) => {
                e.cancelBubble = true;
                onSelectVertex && onSelectVertex(vIdx);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onSelectVertex && onSelectVertex(vIdx);
              }}
              onDragStart={() => setIsDraggingElement(true)}
              onDragEnd={(e) => {
                setIsDraggingElement(false);
                const absX = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE;
                const absY = Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE;
                onVertexDrag && onVertexDrag(vIdx, absX, absY);
              }}
            />
          );
        })
      )}

    </React.Fragment>
  );
}, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.isEditingVertices === next.isEditingVertices &&
    prev.selectedVertexIndex === next.selectedVertexIndex &&
    prev.language === next.language &&
    prev.isDarkMode === next.isDarkMode &&
    prev.GRID_SIZE === next.GRID_SIZE &&
    prev.shapeProps.x === next.shapeProps.x &&
    prev.shapeProps.y === next.shapeProps.y &&
    prev.shapeProps.width === next.shapeProps.width &&
    prev.shapeProps.height === next.shapeProps.height &&
    prev.shapeProps.name === next.shapeProps.name &&
    prev.shapeProps.floor === next.shapeProps.floor &&
    prev.shapeProps.type === next.shapeProps.type &&
    prev.shapeProps.shape_type === next.shapeProps.shape_type &&
    (prev.shapeProps.points || []).join(',') === (next.shapeProps.points || []).join(',') &&
    (prev.shapeProps.endpoints || []).join(',') === (next.shapeProps.endpoints || []).join(',')
  );
});

export default function EditPage() {
  const navigate = useNavigate();
  const [placedElements, setPlacedElements] = useState([]);
  const [mapSize, setMapSize] = useState({ width: 2000, height: 1500 });
  const [originalElements, setOriginalElements] = useState([]);

  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const stateRef = useRef({ placedElements, history, historyStep });
  useEffect(() => {
    stateRef.current = { placedElements, history, historyStep };
  }, [placedElements, history, historyStep]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleGlobalKeyUp = (e) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState(0);

  useEffect(() => {
    if (selectedIds.length !== 1) {
      setIsEditingVertices(false);
      setSelectedVertexIndex(0);
    }
  }, [selectedIds]);

  const [selectionRect, setSelectionRect] = useState({ visible: false, x: 0, y: 0, width: 0, height: 0 });
  const selectionStartRef = useRef({ x: 0, y: 0 });
  const [deletedElements, setDeletedElements] = useState([]);
  const [clipboardElement, setClipboardElement] = useState(null);

  const [customPrompt, setCustomPrompt] = useState({ isOpen: false, title: '', defaultValue: '', onSubmit: null });
  const [customAlert, setCustomAlert] = useState({ isOpen: false, message: '', onCloseCallback: null });
  const [customConfirm, setCustomConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const showAlert = useCallback((message, onCloseCallback = null) => {
    setCustomAlert({ isOpen: true, message, onCloseCallback });
  }, []);

  const [floors, setFloors] = useState(["Lantai 1"]);
  const [activeEditFloor, setActiveEditFloor] = useState("Lantai 1");
  const [buildings, setBuildings] = useState([]);
  const [activeEditBuilding, setActiveEditBuilding] = useState("");
  const [isFloorDropdownOpen, setIsFloorDropdownOpen] = useState(false);
  const [isBuildingDropdownOpen, setIsBuildingDropdownOpen] = useState(false);
  const dragItemIndexRef = useRef(null);
  const dragOverItemIndexRef = useRef(null);
  const globalFloorOrderRef = useRef({});
  const globalBuildingOrderRef = useRef([]);
  const allServerFloorsRef = useRef([]);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'id');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    document.body.classList.toggle('dark-mode', newTheme === 'dark');
  };

  const getText = (key) => {
    const dict = {
      'save_map': { id: 'Simpan Peta', en: 'Save Map' },
      'cancel': { id: 'Batal', en: 'Cancel' },
      'ok': { id: 'OK', en: 'OK' },
      'drag_drop_info': { id: 'Drag item ke dalam peta', en: 'Drag items into the map' },
      'room': { id: 'Ruangan', en: 'Room' },
      'kiosk': { id: 'Kios', en: 'Kiosk' },
      'entrance': { id: 'Pintu Masuk', en: 'Entrance' },
      'exit': { id: 'Pintu Keluar', en: 'Exit' },
      'add_floor': { id: 'Tambah', en: 'Add' },
      'del_floor': { id: 'Hapus', en: 'Delete' },
      'save_confirm': { id: 'Konfirmasi Simpan', en: 'Confirm Save' },
      'cancel_confirm': { id: 'Konfirmasi Batal', en: 'Confirm Cancel' },
      'are_you_sure_save': { id: 'Apakah Anda yakin ingin menyimpan perubahan peta ke database?', en: 'Are you sure you want to save map changes to the database?' },
      'are_you_sure_cancel': { id: 'Semua perubahan yang belum disimpan akan hilang. Lanjutkan?', en: 'All unsaved changes will be lost. Continue?' },
      'yes': { id: 'Iya', en: 'Yes' },
      'no': { id: 'Tidak', en: 'No' },
      'edit_mode': { id: 'Mode Edit', en: 'Edit Mode' },
      'building_management': { id: 'Manajemen Gedung', en: 'Building Management' },
      'floor_management': { id: 'Manajemen Lantai', en: 'Floor Management' },
      'floors_count': { id: 'Lantai', en: 'Floors' },
      'back_to_main_floor': { id: 'Kembali ke Lantai Utama', en: 'Back to Main Floor' },
      'verification': { id: 'Verifikasi', en: 'Verification' },
      'selected': { id: 'Terpilih', en: 'Selected' },
      'no_element_selected': { id: 'Tidak ada elemen terpilih', en: 'No element selected' },
      'edit_panel': { id: 'Panel Edit', en: 'Edit Panel' },
      'template_elements': { id: 'Template Elemen', en: 'Element Templates' },
      'template_hint': { id: 'Tarik template langsung ke peta.', en: 'Drag templates directly onto the map.' },
      'drag_kiosk': { id: 'Kios', en: 'Kiosk' },
      'tmpl_biasa': { id: 'Biasa', en: 'Standard' },
      'tmpl_1_pintu': { id: '1 Pintu', en: '1 Door' },
      'tmpl_2_pintu': { id: '2 Pintu', en: '2 Doors' },
      'tmpl_3_pintu': { id: '3 Pintu', en: '3 Doors' },
      'tmpl_4_pintu': { id: '4 Pintu', en: '4 Doors' },
      'del_element': { id: 'Hapus Elemen', en: 'Delete Element' },
      'enter_submap': { id: 'Masuk ke Bagian Dalam', en: 'Enter Inner Section' },
      'active_endpoint_side': { id: 'Sisi Endpoint Aktif', en: 'Active Endpoint Side' },
      'change_manual_hint': { id: 'Ubah manual jika template tidak sesuai:', en: 'Change manually if template does not fit:' },
      'top': { id: 'Atas', en: 'Top' },
      'bottom': { id: 'Bawah', en: 'Bottom' },
      'left': { id: 'Kiri', en: 'Left' },
      'right': { id: 'Kanan', en: 'Right' },
      'undo': { id: 'Urungkan', en: 'Undo' },
      'redo': { id: 'Ulangi', en: 'Redo' },
      'rename_floor': { id: 'Ganti Nama', en: 'Rename' },
      'move_up': { id: 'Geser ke Atas', en: 'Move Up' },
      'move_down': { id: 'Geser ke Bawah', en: 'Move Down' },
      'prompt_new_floor': { id: 'Masukkan nama lantai baru:\n(Contoh: Lantai 5, Gedung B, Basement)', en: 'Enter new floor name:\n(Example: Floor 5, Building B, Basement)' },
      'alert_floor_exists': { id: 'Lantai tersebut sudah ada di daftar!', en: 'That floor is already in the list!' },
      'alert_min_one_floor': { id: 'Tidak dapat menghapus. Harus tersisa minimal satu lantai di editor!', en: 'Cannot delete. At least one floor must remain in the editor!' },
      'confirm_delete_floor_1': { id: 'Apakah Anda yakin ingin menghapus', en: 'Are you sure you want to delete' },
      'confirm_delete_floor_2': { id: 'PERHATIAN: Seluruh elemen (Ruangan & Kiosk) yang berada di lantai ini akan terhapus dari database saat Anda menekan tombol Save.', en: 'WARNING: All elements (Rooms & Kiosks) on this floor will be deleted from the database when you click Save.' },
      'prompt_rename_floor': { id: 'Masukkan nama baru untuk', en: 'Enter new name for' },
      'alert_name_used': { id: 'Nama lantai tersebut sudah digunakan!', en: 'That floor name is already used!' },
      'alert_save_success': { id: 'Denah dan setingan endpoint baru berhasil disimpan!', en: 'Map and endpoint settings successfully saved!' },
      'alert_save_fail': { id: 'Gagal simpan:', en: 'Failed to save:' },
      'saving_map': { id: 'Menyimpan Peta...', en: 'Saving Map...' }
    };
    return dict[key] ? dict[key][language] : key;
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const mapRef = useRef(null);
  const trRef = useRef(null);

  useEffect(() => {
    if (trRef.current) {
      if (isEditingVertices) {
        trRef.current.nodes([]);
      } else {
        const stage = trRef.current.getStage();
        const nodes = selectedIds.map(id => stage.findOne('#' + id)).filter(Boolean);
        trRef.current.nodes(nodes);
      }
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, placedElements, isEditingVertices]);
  const transformRef = useRef(null);
  const GRID_SIZE = 25;

  const calculatedMapSize = useMemo(() => {
    let maxX = mapSize.width || 2000;
    let maxY = mapSize.height || 1500;

    placedElements.forEach(el => {
      if (el.floor === activeEditFloor && (el.building || activeEditBuilding || "Mall Utama") === activeEditBuilding) {
        const right = el.x + el.width;
        const bottom = el.y + el.height;
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
      }
    });

    return {
      width: maxX + 1000,
      height: maxY + 1000
    };
  }, [placedElements, activeEditFloor, activeEditBuilding, mapSize.width, mapSize.height]);

  const saveHistory = useCallback((newElements) => {
    let newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newElements);

    if (newHistory.length > 50) {
      newHistory = newHistory.slice(newHistory.length - 50);
    }

    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [history, historyStep]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!db) {
        try {
          const res = await fetch('/api/map-data');
          const data = await res.json();
          if (data.status === 'success') {
            const allElements = [];
            const uniqueFloors = new Set();
            const uniqueBuildings = new Set();

            (data.rooms || []).forEach((r) => {
              const fl = r.floor || "Ground Floor";
              const bld = r.building || "Mall Utama";
              if (!fl.startsWith("submap_")) uniqueFloors.add(fl);
              uniqueBuildings.add(bld);
              allElements.push({
                id: r.id,
                type: 'room',
                category: r.category || 'Retail',
                sub_category: r.sub_category || '',
                unit_number: r.unit_number || '',
                facility_type: r.facility_type || '',
                floor: fl,
                building: bld,
                is_connector: r.is_connector || false,
                connector_group: r.connector_group || '',
                target_building: r.target_building || '',
                name: r.name || "Tanpa Nama",
                name_en: r.name_en || "",
                x: (r.grid_x || 0) * GRID_SIZE,
                y: (r.grid_y || 0) * GRID_SIZE,
                width: (r.grid_width || 1) * GRID_SIZE,
                height: (r.grid_height || 1) * GRID_SIZE,
                endpoints: r.endpoints && r.endpoints.length > 0 ? r.endpoints : ['bottom'],
                shape_type: r.shape_type || 'rect',
                points: r.points || null,
                keywords: r.keywords || [],
                description: r.description || ''
              });
            });

            (data.kiosks || []).forEach((k) => {
              const fl = k.floor || "Ground Floor";
              const bld = k.building || "Mall Utama";
              if (!fl.startsWith("submap_")) uniqueFloors.add(fl);
              uniqueBuildings.add(bld);
              allElements.push({
                id: k.id,
                type: 'kiosk',
                floor: fl,
                building: bld,
                is_connector: false,
                target_building: "",
                name: k.name || "Kiosk",
                name_en: k.name || "Kiosk",
                x: (k.grid_x || 0) * GRID_SIZE,
                y: (k.grid_y || 0) * GRID_SIZE,
                width: (k.grid_width || 2) * GRID_SIZE,
                height: (k.grid_height || 2) * GRID_SIZE,
                shape_type: k.shape_type || 'rect',
                points: k.points || null,
                endpoints: k.endpoints && k.endpoints.length > 0 ? k.endpoints : ['bottom']
              });
            });

            setPlacedElements(allElements);
            setOriginalElements(JSON.parse(JSON.stringify(allElements)));
            setHistory([allElements]);
            setHistoryStep(0);

            allServerFloorsRef.current = data.floors || [];
            (data.floors || []).forEach(f => {
              if (f.building) uniqueBuildings.add(f.building);
            });
            const finalBuildings = Array.from(uniqueBuildings).sort();
            if (finalBuildings.length === 0) finalBuildings.push("Galaxy Mall 1");
            setBuildings(finalBuildings);

            const initialBuilding = finalBuildings.includes("Galaxy Mall 1") ? "Galaxy Mall 1" : finalBuildings[0];
            setActiveEditBuilding(initialBuilding);

            let initialFloors = (data.floors || [])
              .filter(f => !f.building || f.building === initialBuilding)
              .map(f => f.name);
            if (initialFloors.length === 0) {
              initialFloors = Array.from(uniqueFloors);
            }
            if (initialFloors.length === 0) initialFloors = ["Ground Floor"];
            setFloors(initialFloors);
            const defaultFloor = initialFloors.find(f => f.toLowerCase() === "ground floor" || f.toLowerCase() === "lantai 1") || initialFloors[0] || "Ground Floor";
            setActiveEditFloor(defaultFloor);
            return;
          }
        } catch (error) {
          console.error("Gagal memuat denah dari server lokal:", error);
        }
      }

      try {
        const [roomsSnapshot, kioskSnapshot, mapConfigSnap] = await Promise.all([
          getDocs(collection(db, "Rooms")),
          getDocs(collection(db, "Kiosks")),
          getDoc(doc(db, "Settings", "MapConfig"))
        ]);

        const allElements = [];
        const uniqueFloors = new Set(["Lantai 1"]);
        const uniqueBuildings = new Set();

        roomsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.floor && !data.floor.startsWith("submap_")) uniqueFloors.add(data.floor);
          if (data.building) uniqueBuildings.add(data.building);
          allElements.push({
            id: docSnap.id,
            type: 'room',
            floor: data.floor || "Lantai 1",
            building: data.building || "Gedung A",
            is_connector: data.is_connector || false,
            target_building: data.target_building || "",
            name: data.name || "Tanpa Nama",
            name_en: data.name_en || "",
            x: (data.grid_x || 0) * GRID_SIZE,
            y: (data.grid_y || 0) * GRID_SIZE,
            width: (data.grid_width || 1) * GRID_SIZE,
            height: (data.grid_height || 1) * GRID_SIZE,
            endpoints: data.endpoints && data.endpoints.length > 0 ? data.endpoints : ['bottom'],
            shape_type: data.shape_type || 'rect',
            points: data.points || null,
            keywords: data.keywords || []
          });
        });

        kioskSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.floor && !data.floor.startsWith("submap_")) uniqueFloors.add(data.floor);
          if (data.building) uniqueBuildings.add(data.building);
          allElements.push({
            id: docSnap.id,
            type: 'kiosk',
            floor: data.floor || "Lantai 1",
            building: data.building || "Gedung A",
            is_connector: data.is_connector || false,
            target_building: data.target_building || "",
            name: data.name || "Kiosk",
            name_en: data.name_en || "",
            x: (data.grid_x || 0) * GRID_SIZE,
            y: (data.grid_y || 0) * GRID_SIZE,
            width: (data.grid_width || 2) * GRID_SIZE,
            height: (data.grid_height || 2) * GRID_SIZE,
            shape_type: data.shape_type || 'rect',
            points: data.points || null,
            endpoints: data.endpoints && data.endpoints.length > 0 ? data.endpoints : ['bottom']
          });
        });

        setPlacedElements(allElements);
        setOriginalElements(JSON.parse(JSON.stringify(allElements)));

        setHistory([allElements]);
        setHistoryStep(0);

        let savedFloorOrder = {};
        let savedBuildingOrder = [];
        if (mapConfigSnap.exists()) {
          if (mapConfigSnap.data().floorOrder) savedFloorOrder = mapConfigSnap.data().floorOrder;
          if (mapConfigSnap.data().buildingOrder) savedBuildingOrder = mapConfigSnap.data().buildingOrder;
        }

        globalBuildingOrderRef.current = savedBuildingOrder;

        const finalBuildings = Array.from(uniqueBuildings).sort((a, b) => {
          const idxA = savedBuildingOrder.indexOf(a);
          const idxB = savedBuildingOrder.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });
        setBuildings(finalBuildings);

        // Perhitungan awal gedung dan lantai
        const initialBuilding = finalBuildings[0] || "Gedung A";
        setActiveEditBuilding(initialBuilding);

        if (Array.isArray(savedFloorOrder)) {
          savedFloorOrder = { [initialBuilding]: savedFloorOrder };
        }
        globalFloorOrderRef.current = savedFloorOrder;

        const bFloors = new Set();
        allElements.forEach(el => {
          if (el.building === initialBuilding && el.floor && !el.floor.startsWith("submap_")) {
            bFloors.add(el.floor);
          }
        });

        let initialFloors = Array.from(bFloors);
        if (initialFloors.length === 0) initialFloors = ["Lantai 1"];
        else initialFloors.sort((a, b) => {
          const orderArray = savedFloorOrder[initialBuilding] || [];
          const idxA = orderArray.indexOf(a);
          const idxB = orderArray.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });

        setFloors(initialFloors);
        const defaultFloor = initialFloors.find(f => f.toLowerCase() === "lantai 1" || f.toLowerCase() === "first floor") || initialFloors[0] || "Lantai 1";
        setActiveEditFloor(defaultFloor);
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      }
    };
    fetchAllData();
  }, []);

  const handleBuildingChange = (newBuilding, currentElements = placedElements) => {
    setActiveEditBuilding(newBuilding);
    const bFloors = new Set();
    currentElements.forEach(el => {
      if (el.building === newBuilding && el.floor && !el.floor.startsWith("submap_")) {
        bFloors.add(el.floor);
      }
    });
    (allServerFloorsRef.current || []).forEach(f => {
      if (f.building === newBuilding && f.name && !f.name.startsWith("submap_")) {
        bFloors.add(f.name);
      }
    });
    let newFloors = Array.from(bFloors);
    if (newFloors.length === 0) newFloors = ["Lantai 1"];
    else newFloors.sort((a, b) => {
      const orderArray = globalFloorOrderRef.current[newBuilding] || [];
      const idxA = orderArray.indexOf(a);
      const idxB = orderArray.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    setFloors(newFloors);
    const targetFloor = newFloors.find(f => f.toLowerCase() === "lantai 1" || f.toLowerCase() === "first floor") || newFloors[0];
    setActiveEditFloor(targetFloor);
  };

  useEffect(() => {
    const updateMapSize = () => {
      if (mapRef.current) {
        setMapSize({
          width: mapRef.current.clientWidth || 2000,
          height: mapRef.current.clientHeight || 1500
        });
      }
    };
    setTimeout(updateMapSize, 100);
    window.addEventListener("resize", updateMapSize);
    return () => window.removeEventListener("resize", updateMapSize);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setPlacedElements(history[prevStep]);
      setSelectedIds([]);
    }
  }, [history, historyStep]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setPlacedElements(history[nextStep]);
      setSelectedIds([]);
    }
  }, [history, historyStep]);

  const deleteSelectedElement = useCallback(() => {
    if (selectedIds.length > 0) {
      setDeletedElements((prev) => [...prev, ...selectedIds]);
      const newElements = placedElements.filter((el) => !selectedIds.includes(el.id));
      setPlacedElements(newElements);
      saveHistory(newElements);
      setSelectedIds([]);
    }
  }, [selectedIds, placedElements, saveHistory]);

  const cloneSelectedElement = useCallback(() => {
    if (selectedIds.length > 0) {
      const newClonedElements = [];
      let newElements = [...placedElements];

      selectedIds.forEach((id) => {
        const selectedEl = placedElements.find(el => el.id === id);
        if (selectedEl) {
          let maxNumber = 0;
          const prefix = selectedEl.type === 'kiosk' ? 'K' : 'R';
          newElements.forEach((el) => {
            if (el.id.startsWith(prefix)) {
              const num = parseInt(el.id.substring(1), 10);
              if (!isNaN(num) && num > maxNumber) maxNumber = num;
            }
          });
          const newId = `${prefix}${String(maxNumber + 1).padStart(3, '0')}`;

          const clonedEl = {
            ...selectedEl,
            id: newId,
            x: selectedEl.x + GRID_SIZE,
            y: selectedEl.y + GRID_SIZE
          };
          newClonedElements.push(clonedEl);
          newElements.push(clonedEl);
        }
      });

      setPlacedElements(newElements);
      saveHistory(newElements);
      setSelectedIds(newClonedElements.map(el => el.id));
    }
  }, [selectedIds, placedElements, saveHistory]);

  const pasteElement = useCallback(() => {
    if (clipboardElement) {
      let maxNumber = 0;
      const prefix = clipboardElement.type === 'kiosk' ? 'K' : 'R';
      placedElements.forEach((el) => {
        if (el.id.startsWith(prefix)) {
          const num = parseInt(el.id.substring(1), 10);
          if (!isNaN(num) && num > maxNumber) maxNumber = num;
        }
      });
      const newId = `${prefix}${String(maxNumber + 1).padStart(3, '0')}`;

      const newX = clipboardElement.x + GRID_SIZE;
      const newY = clipboardElement.y + GRID_SIZE;

      const pastedEl = {
        ...clipboardElement,
        id: newId,
        x: newX,
        y: newY,
        floor: activeEditFloor,
        building: activeEditBuilding
      };

      const newElements = [...placedElements, pastedEl];
      setPlacedElements(newElements);
      saveHistory(newElements);
      setSelectedIds([newId]);
      setClipboardElement(pastedEl);
    }
  }, [clipboardElement, placedElements, saveHistory, activeEditFloor, activeEditBuilding]);

  const handleVertexDrag = useCallback((vIdx, absX, absY) => {
    if (selectedIds.length !== 1) return;
    const targetId = selectedIds[0];
    const { placedElements } = stateRef.current;
    const elIndex = placedElements.findIndex(e => e.id === targetId);
    if (elIndex === -1) return;

    const el = placedElements[elIndex];
    if (!el.points || el.points.length < 6) return;

    const newPoints = [...el.points];
    newPoints[vIdx * 2] = absX - el.x;
    newPoints[vIdx * 2 + 1] = absY - el.y;

    const normalized = normalizePolygonPoints(newPoints, el.x, el.y, GRID_SIZE);
    const updatedEl = {
      ...el,
      x: normalized.x,
      y: normalized.y,
      width: normalized.width,
      height: normalized.height,
      points: normalized.points,
      shape_type: el.shape_type === 'rect' ? 'polygon' : (el.shape_type || 'polygon'),
    };

    const newElements = placedElements.map((item, idx) => idx === elIndex ? updatedEl : item);
    setPlacedElements(newElements);
    saveHistory(newElements);
  }, [selectedIds, GRID_SIZE, saveHistory]);

  const handleAddVertex = useCallback(() => {
    if (selectedIds.length !== 1) return;
    const targetId = selectedIds[0];
    const el = placedElements.find(e => e.id === targetId);
    if (!el) return;

    let pts = el.points;
    if (!pts || pts.length < 6) {
      pts = getPresetPoints(el.shape_type || 'polygon', el.width, el.height, GRID_SIZE);
    }

    const numVertices = pts.length / 2;
    const curIdx = Math.min(selectedVertexIndex, numVertices - 1);
    const nextIdx = (curIdx + 1) % numVertices;

    const p1x = pts[curIdx * 2];
    const p1y = pts[curIdx * 2 + 1];
    const p2x = pts[nextIdx * 2];
    const p2y = pts[nextIdx * 2 + 1];

    const midX = Math.round(((p1x + p2x) / 2) / GRID_SIZE) * GRID_SIZE;
    const midY = Math.round(((p1y + p2y) / 2) / GRID_SIZE) * GRID_SIZE;

    const newPts = [...pts];
    newPts.splice((curIdx + 1) * 2, 0, midX, midY);

    const normalized = normalizePolygonPoints(newPts, el.x, el.y, GRID_SIZE);
    const updatedEl = {
      ...el,
      x: normalized.x,
      y: normalized.y,
      width: normalized.width,
      height: normalized.height,
      points: normalized.points,
      shape_type: 'polygon'
    };

    const newElements = placedElements.map(e => e.id === targetId ? updatedEl : e);
    setPlacedElements(newElements);
    saveHistory(newElements);
    setSelectedVertexIndex(curIdx + 1);
  }, [selectedIds, placedElements, selectedVertexIndex, GRID_SIZE, saveHistory]);

  const handleRemoveVertex = useCallback(() => {
    if (selectedIds.length !== 1) return;
    const targetId = selectedIds[0];
    const el = placedElements.find(e => e.id === targetId);
    if (!el || !el.points || el.points.length <= 6) {
      showAlert(language === 'id' ? 'Bentuk poligon minimal harus memiliki 3 titik sudut!' : 'Polygon must have at least 3 vertices!');
      return;
    }

    const curIdx = Math.min(selectedVertexIndex, (el.points.length / 2) - 1);
    const newPts = [...el.points];
    newPts.splice(curIdx * 2, 2);

    const normalized = normalizePolygonPoints(newPts, el.x, el.y, GRID_SIZE);
    const updatedEl = {
      ...el,
      x: normalized.x,
      y: normalized.y,
      width: normalized.width,
      height: normalized.height,
      points: normalized.points,
      shape_type: 'polygon'
    };

    const newElements = placedElements.map(e => e.id === targetId ? updatedEl : e);
    setPlacedElements(newElements);
    saveHistory(newElements);
    setSelectedVertexIndex(Math.max(0, curIdx - 1));
  }, [selectedIds, placedElements, selectedVertexIndex, GRID_SIZE, language, showAlert, saveHistory]);

  const handleShapeTypeChange = useCallback((newShapeType) => {
    if (selectedIds.length !== 1) return;
    const targetId = selectedIds[0];
    const el = placedElements.find(e => e.id === targetId);
    if (!el) return;

    if (newShapeType === 'rect') {
      const updatedEl = {
        ...el,
        shape_type: 'rect',
        points: null,
      };
      const newElements = placedElements.map(e => e.id === targetId ? updatedEl : e);
      setPlacedElements(newElements);
      saveHistory(newElements);
      setIsEditingVertices(false);
      return;
    }

    const pts = getPresetPoints(newShapeType, el.width, el.height, GRID_SIZE);
    const normalized = normalizePolygonPoints(pts, el.x, el.y, GRID_SIZE);
    const updatedEl = {
      ...el,
      shape_type: newShapeType,
      x: normalized.x,
      y: normalized.y,
      width: normalized.width,
      height: normalized.height,
      points: normalized.points
    };

    const newElements = placedElements.map(e => e.id === targetId ? updatedEl : e);
    setPlacedElements(newElements);
    saveHistory(newElements);
  }, [selectedIds, placedElements, GRID_SIZE, saveHistory]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        deleteSelectedElement();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(stateRef.current.placedElements.filter(el => el.floor === activeEditFloor && el.building === activeEditBuilding).map(el => el.id));
      }
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        cloneSelectedElement();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "c") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const selectedEls = stateRef.current.placedElements.filter(el => selectedIds.includes(el.id));
          if (selectedEls.length > 0) {
            setClipboardElement(selectedEls);
          }
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteElement();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, deleteSelectedElement, handleUndo, handleRedo, cloneSelectedElement, pasteElement, activeEditFloor, activeEditBuilding]);

  const checkDeselect = (e) => {
    // Klik pada stage - hapus seleksi
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.id() === 'bg-grid';
    if (clickedOnEmpty) {
      setSelectedIds([]);
    }
  };

  const handleStageMouseDown = (e) => {
    if (e.evt.shiftKey) {
      e.evt.preventDefault();
      const pos = e.target.getStage().getPointerPosition();
      selectionStartRef.current = { x: pos.x, y: pos.y };
      setSelectionRect({
        visible: true,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0
      });
      return;
    }
    checkDeselect(e);
  };

  const handleStageMouseMove = (e) => {
    if (!selectionRect.visible) {
      return;
    }
    e.evt.preventDefault();
    const pos = e.target.getStage().getPointerPosition();
    const startX = selectionStartRef.current.x;
    const startY = selectionStartRef.current.y;

    setSelectionRect({
      visible: true,
      x: Math.min(startX, pos.x),
      y: Math.min(startY, pos.y),
      width: Math.abs(pos.x - startX),
      height: Math.abs(pos.y - startY),
    });
  };

  const handleStageMouseUp = (e) => {
    if (!selectionRect.visible) {
      return;
    }
    e.evt.preventDefault();
    setSelectionRect(prev => ({ ...prev, visible: false }));

    const shapes = activeFloorElements;
    const box = selectionRect;

    // Cari semua bentuk yang berpotongan dengan kotak seleksi
    const selected = shapes.filter(shape => {
      // Deteksi tabrakan AABB sederhana
      return (
        shape.x < box.x + box.width &&
        shape.x + shape.width > box.x &&
        shape.y < box.y + box.height &&
        shape.y + shape.height > box.y
      );
    });

    if (selected.length > 0) {
      setSelectedIds(selected.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const generateNextRoomId = () => {
    let maxNumber = 0;
    placedElements.forEach((el) => {
      if (el.id.startsWith('R')) {
        const num = parseInt(el.id.substring(1), 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });
    return `R${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const generateNextKioskId = () => {
    let maxNumber = 0;
    placedElements.forEach((el) => {
      if (el.id.startsWith('K')) {
        const num = parseInt(el.id.substring(1), 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });
    return `K${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const handleAddFloor = () => {
    setCustomPrompt({
      isOpen: true,
      title: getText('prompt_new_floor'),
      defaultValue: '',
      onSubmit: (newFloor) => {
        setCustomPrompt(prev => ({ ...prev, isOpen: false }));
        if (newFloor && newFloor.trim() !== "") {
          const formattedFloor = newFloor.trim();
          const currentOrder = globalFloorOrderRef.current[activeEditBuilding] || [];
          if (!floors.includes(formattedFloor) && !currentOrder.includes(formattedFloor)) {
            const newFloorsList = [...floors, formattedFloor];
            setFloors(newFloorsList);
            globalFloorOrderRef.current = {
              ...globalFloorOrderRef.current,
              [activeEditBuilding]: [...currentOrder, formattedFloor]
            };
            setActiveEditFloor(formattedFloor);
            setSelectedIds([]);
          } else {
            showAlert(getText('alert_floor_exists'));
          }
        }
      }
    });
  };
  const handleRenameBuilding = () => {
    setCustomPrompt({
      isOpen: true,
      title: `${language === 'id' ? 'Ubah nama gedung' : 'Rename building'} "${activeEditBuilding}":`,
      defaultValue: activeEditBuilding,
      onSubmit: (newBuilding) => {
        setCustomPrompt(prev => ({ ...prev, isOpen: false }));
        if (newBuilding && newBuilding.trim() !== "" && newBuilding.trim() !== activeEditBuilding) {
          const formattedBuilding = newBuilding.trim();
          if (buildings.includes(formattedBuilding)) {
            showAlert(getText('alert_name_used'));
            return;
          }

          const newElements = placedElements.map(el => {
            if (el.building === activeEditBuilding) {
              return { ...el, building: formattedBuilding };
            }
            return el;
          });

          setPlacedElements(newElements);
          saveHistory(newElements);

          const newBuildingsList = buildings.map(b => b === activeEditBuilding ? formattedBuilding : b);
          setBuildings(newBuildingsList);

          if (globalFloorOrderRef.current[activeEditBuilding]) {
            globalFloorOrderRef.current[formattedBuilding] = globalFloorOrderRef.current[activeEditBuilding];
            delete globalFloorOrderRef.current[activeEditBuilding];
          }

          setActiveEditBuilding(formattedBuilding);
        }
      }
    });
  };

  const handleDeleteBuilding = () => {
    if (buildings.length <= 1) {
      showAlert(language === 'id' ? 'Minimal harus ada 1 gedung!' : 'There must be at least 1 building!');
      return;
    }

    setCustomConfirm({
      isOpen: true,
      title: `${language === 'id' ? 'Hapus gedung' : 'Delete building'} "${activeEditBuilding}"?`,
      message: language === 'id' ? 'Semua elemen di gedung ini akan ikut terhapus!' : 'All elements in this building will also be deleted!',
      onConfirm: () => {
        setCustomConfirm(prev => ({ ...prev, isOpen: false }));
        const elementsToDelete = placedElements.filter(el => el.building === activeEditBuilding);
        const idsToDelete = elementsToDelete.map(el => el.id);
        setDeletedElements(prev => [...prev, ...idsToDelete]);

        const newElements = placedElements.filter(el => el.building !== activeEditBuilding);
        setPlacedElements(newElements);
        saveHistory(newElements);

        const remainingBuildings = buildings.filter(b => b !== activeEditBuilding);
        setBuildings(remainingBuildings);

        delete globalFloorOrderRef.current[activeEditBuilding];

        handleBuildingChange(remainingBuildings[0]);
      }
    });
  };

  const handleDeleteFloor = () => {
    if (floors.length <= 1) {
      showAlert(getText('alert_min_one_floor'));
      return;
    }

    setCustomConfirm({
      isOpen: true,
      title: `${getText('confirm_delete_floor_1')} "${formatFloorName(activeEditFloor)}"?`,
      message: getText('confirm_delete_floor_2'),
      onConfirm: () => {
        setCustomConfirm(prev => ({ ...prev, isOpen: false }));
        const elementsToDelete = placedElements.filter(el => el.floor === activeEditFloor);
        const idsToDelete = elementsToDelete.map(el => el.id);
        setDeletedElements(prev => [...prev, ...idsToDelete]);

        const newElements = placedElements.filter(el => el.floor !== activeEditFloor);
        setPlacedElements(newElements);
        saveHistory(newElements);

        const floorToDelete = activeEditFloor;
        const remainingFloors = floors.filter(f => f !== floorToDelete);
        setFloors(remainingFloors);
        const currentOrder = globalFloorOrderRef.current[activeEditBuilding] || [];
        globalFloorOrderRef.current = {
          ...globalFloorOrderRef.current,
          [activeEditBuilding]: currentOrder.filter(f => f !== floorToDelete)
        };

        setActiveEditFloor(remainingFloors.includes("Lantai 1") ? "Lantai 1" : remainingFloors[remainingFloors.length - 1]);
        setSelectedIds([]);
      }
    });
  };

  const handleRenameFloor = () => {
    setCustomPrompt({
      isOpen: true,
      title: `${getText('prompt_rename_floor')} "${formatFloorName(activeEditFloor)}":`,
      defaultValue: activeEditFloor,
      onSubmit: (newFloor) => {
        setCustomPrompt(prev => ({ ...prev, isOpen: false }));
        if (newFloor && newFloor.trim() !== "" && newFloor.trim() !== activeEditFloor) {
          const formattedFloor = newFloor.trim();
          if (floors.includes(formattedFloor)) {
            showAlert(getText('alert_name_used'));
            return;
          }

          const newElements = placedElements.map(el => {
            if (el.floor === activeEditFloor) {
              return { ...el, floor: formattedFloor };
            }
            return el;
          });

          setPlacedElements(newElements);
          saveHistory(newElements);

          const currentOrder = globalFloorOrderRef.current[activeEditBuilding] || [];
          if (!floors.includes(formattedFloor) && !currentOrder.includes(formattedFloor)) {
            const newFloorsList = floors.map(f => f === activeEditFloor ? formattedFloor : f);
            setFloors(newFloorsList);
            globalFloorOrderRef.current = {
              ...globalFloorOrderRef.current,
              [activeEditBuilding]: currentOrder.map(f => f === activeEditFloor ? formattedFloor : f)
            };
            setActiveEditFloor(formattedFloor);
          }
        }
      }
    });
  };

  const handleBuildingDragSort = () => {
    const dragIndex = dragItemIndexRef.current;
    const hoverIndex = dragOverItemIndexRef.current;

    if (dragIndex === null || hoverIndex === null || dragIndex === hoverIndex) return;

    const newBuildings = [...buildings];
    const draggedItem = newBuildings[dragIndex];

    newBuildings.splice(dragIndex, 1);
    newBuildings.splice(hoverIndex, 0, draggedItem);

    setBuildings(newBuildings);
    globalBuildingOrderRef.current = newBuildings;

    dragItemIndexRef.current = null;
    dragOverItemIndexRef.current = null;
  };

  const handleDragSort = () => {
    const dragIndex = dragItemIndexRef.current;
    const hoverIndex = dragOverItemIndexRef.current;

    if (dragIndex === null || hoverIndex === null || dragIndex === hoverIndex) return;

    const newFloors = [...floors];
    const draggedItem = newFloors[dragIndex];

    newFloors.splice(dragIndex, 1);
    newFloors.splice(hoverIndex, 0, draggedItem);

    setFloors(newFloors);

    // Memperbarui urutan lantai global sambil mempertahankan urutan relatif
    const currentOrder = globalFloorOrderRef.current[activeEditBuilding] || [];
    const otherFloors = currentOrder.filter(f => !newFloors.includes(f));
    globalFloorOrderRef.current = {
      ...globalFloorOrderRef.current,
      [activeEditBuilding]: [...otherFloors, ...newFloors]
    };

    dragItemIndexRef.current = null;
    dragOverItemIndexRef.current = null;
  };
  const getViewportCenter = () => {
    if (!transformRef.current || !mapRef.current) return { x: 200, y: 200 };
    const { scale, positionX, positionY } = transformRef.current.state;
    const mapRect = mapRef.current.getBoundingClientRect();
    const centerX = mapRect.width / 2;
    const centerY = mapRect.height / 2;
    const x = (centerX - positionX) / scale;
    const y = (centerY - positionY) / scale;
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE
    };
  };

  const processDrop = (clientX, clientY, dragData) => {
    if (transformRef.current && dragData) {
      const { scale, positionX, positionY } = transformRef.current.state;
      const x = (clientX - positionX) / scale;
      const y = (clientY - positionY) / scale;
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

      let newElements = [...placedElements];
      let newId;

      if (dragData.type === "new-kiosk" || dragData.type === "new-entrance") {
        newId = generateNextKioskId();
        newElements.push({
          id: newId, type: 'kiosk', floor: activeEditFloor, building: activeEditBuilding,
          x: snappedX, y: snappedY, width: GRID_SIZE * (dragData.defaultGridWidth || 2), height: GRID_SIZE * (dragData.defaultGridHeight || 2),
          name: dragData.defaultName,
        });
      } else if (dragData.type === "new-room") {
        newId = generateNextRoomId();
        const w = GRID_SIZE * (dragData.defaultGridWidth || 4);
        const h = GRID_SIZE * (dragData.defaultGridHeight || 2);
        const shapeType = dragData.shapeType || 'rect';
        const pts = shapeType !== 'rect' ? getPresetPoints(shapeType, w, h, GRID_SIZE) : null;
        newElements.push({
          id: newId, type: 'room', floor: activeEditFloor, building: activeEditBuilding,
          x: snappedX, y: snappedY, width: w, height: h,
          endpoints: dragData.endpoints, name: dragData.defaultName,
          shape_type: shapeType,
          points: pts,
        });
      } else if (dragData.type === "new-connector") {
        newId = generateNextRoomId();
        newElements.push({
          id: newId, type: 'room', floor: activeEditFloor, building: activeEditBuilding,
          x: snappedX, y: snappedY, width: GRID_SIZE * (dragData.defaultGridWidth || 4), height: GRID_SIZE * (dragData.defaultGridHeight || 4),
          endpoints: dragData.endpoints, name: dragData.defaultName,
          is_connector: true, target_building: ""
        });
      }

      setPlacedElements(newElements);
      saveHistory(newElements);
      setSelectedIds([newId]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const mapRect = mapRef.current.getBoundingClientRect();
    const clientX = e.clientX - mapRect.left;
    const clientY = e.clientY - mapRect.top;

    let dragData;
    try {
      dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }

    processDrop(clientX, clientY, dragData);
  };

  const handleConfirmYes = async () => {
    setIsConfirmOpen(false);
    if (confirmAction === "save") {
      setIsSaving(true);
      try {
        const namesToTranslate = Array.from(new Set(placedElements.map(el => el.name).filter(n => n && n !== "Tanpa Nama")));
        const namesToGenerateKeywords = Array.from(new Set(placedElements.filter(el => {
          if (el.type !== 'room' || !el.name || el.name === "Tanpa Nama") return false;
          const orig = originalElements.find(o => o.id === el.id);
          const lacksKeywords = !orig || !orig.keywords || orig.keywords.length === 0;
          const nameChanged = !orig || orig.name !== el.name;
          return lacksKeywords || nameChanged;
        }).map(el => el.name)));

        let translations = {};
        let generatedKeywords = {};

        const fetchPromises = [];

        if (namesToTranslate.length > 0) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000);
          fetchPromises.push(
            fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ names: namesToTranslate }),
              signal: controller.signal
            })
              .then(res => res.json())
              .then(data => { if (data.status === "success") translations = data.translations || {}; })
              .catch(err => console.error("Gagal fetch terjemahan:", err))
              .finally(() => clearTimeout(timeoutId))
          );
        }

        if (namesToGenerateKeywords.length > 0) {
          const controllerKw = new AbortController();
          const timeoutIdKw = setTimeout(() => controllerKw.abort(), 120000);
          fetchPromises.push(
            fetch("/api/generate_keywords", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ names: namesToGenerateKeywords }),
              signal: controllerKw.signal
            })
              .then(res => res.json())
              .then(data => { if (data.status === "success") generatedKeywords = data.keywords || {}; })
              .catch(err => console.error("Gagal fetch keywords:", err))
              .finally(() => clearTimeout(timeoutIdKw))
          );
        }

        // Compute elements to delete
        const currentIds = new Set(placedElements.map(el => el.id));
        const originalMap = new Map(originalElements.map(el => [el.id, el]));

        const idsToDelete = new Set(deletedElements);
        for (const orig of originalElements) {
          if (!currentIds.has(orig.id)) {
            idsToDelete.add(orig.id);
          }
        }

        if (!db) {
          const elementsPayload = placedElements.map((el) => ({
            id: el.id.toString(),
            type: el.type || 'room',
            name: el.name || "Tanpa Nama",
            name_en: el.name_en || el.name || "",
            category: el.category || "Retail",
            sub_category: el.sub_category || "",
            unit_number: el.unit_number || "",
            facility_type: el.facility_type || "",
            floor: el.floor || activeEditFloor,
            building: el.building || activeEditBuilding || "Mall Utama",
            grid_x: Math.round(el.x / GRID_SIZE) || 0,
            grid_y: Math.round(el.y / GRID_SIZE) || 0,
            grid_width: Math.round(el.width / GRID_SIZE) || 1,
            grid_height: Math.round(el.height / GRID_SIZE) || 1,
            endpoints: el.endpoints && el.endpoints.length > 0 ? el.endpoints : ['bottom'],
            shape_type: el.shape_type || 'rect',
            points: el.points || null,
            keywords: el.keywords || [],
            is_connector: Boolean(el.is_connector),
            connector_group: el.connector_group || null,
            target_building: el.target_building || null,
            description: el.description || ""
          }));

          const floorMap = new Map();
          floors.forEach((f, idx) => {
            floorMap.set(`${activeEditBuilding || "Mall Utama"}_${f}`, {
              name: f,
              building: activeEditBuilding || "Mall Utama",
              floor_level: idx + 1
            });
          });
          placedElements.forEach(el => {
            if (el.floor && el.building && !el.floor.startsWith("submap_")) {
              const key = `${el.building}_${el.floor}`;
              if (!floorMap.has(key)) {
                floorMap.set(key, {
                  name: el.floor,
                  building: el.building,
                  floor_level: 1
                });
              }
            }
          });

          const response = await fetch("/api/map-data/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              elements: elementsPayload,
              deleted_ids: Array.from(idsToDelete),
              floors: Array.from(floorMap.values())
            })
          });

          const result = await response.json();
          if (!response.ok || result.status !== "success") {
            throw new Error(result.detail || result.message || "Gagal menyimpan denah ke database lokal.");
          }

          showAlert(getText('alert_save_success'), () => {
            navigate("/admin", { state: { authorized: true } });
          });
          return;
        }

        const batch = writeBatch(db);
        idsToDelete.forEach((id) => {
          const orig = originalMap.get(id);
          const col = orig
            ? (orig.type === 'kiosk' ? "Kiosks" : "Rooms")
            : (id.startsWith('K') ? "Kiosks" : "Rooms");
          batch.delete(doc(db, col, id));
        });

        // Save structure immediately WITHOUT waiting for slow LLMs
        placedElements.forEach((el) => {
          const col = el.type === 'kiosk' ? "Kiosks" : "Rooms";
          if (!el.id) return;
          const docData = {
            id: el.id.toString(),
            name: el.name || "Tanpa Nama",
            floor: el.floor || "Lantai 1",
            building: el.building || "Gedung A",
            grid_x: Math.round(el.x / GRID_SIZE) || 0,
            grid_y: Math.round(el.y / GRID_SIZE) || 0,
            grid_width: Math.round(el.width / GRID_SIZE) || 1,
            grid_height: Math.round(el.height / GRID_SIZE) || 1,
            shape_type: el.shape_type || 'rect',
            points: el.points || null,
            ...((el.type === 'room' || el.type === 'kiosk') && { endpoints: el.endpoints || ['bottom'] }),
            ...(el.is_connector && { is_connector: true, target_building: el.target_building || "" })
          };

          Object.keys(docData).forEach(key => docData[key] === undefined && delete docData[key]);
          batch.set(doc(db, col, el.id.toString()), docData, { merge: true });
        });

        batch.set(doc(db, "Settings", "MapConfig"), {
          floorOrder: globalFloorOrderRef.current,
          buildingOrder: globalBuildingOrderRef.current || buildings
        }, { merge: true });

        // Commit structural changes instantly
        await batch.commit();

        // Let the user know the map is saved instantly
        showAlert(getText('alert_save_success'), () => {
          navigate("/admin", { state: { authorized: true } });
        });

        // Now wait for translations and keywords in the background
        if (fetchPromises.length > 0) {
          Promise.all(fetchPromises).then(() => {
            const backgroundBatch = writeBatch(db);
            placedElements.forEach((el) => {
              const col = el.type === 'kiosk' ? "Kiosks" : "Rooms";
              if (!el.id) return;
              let backgroundData = {};

              if (translations[el.name]) {
                if (typeof translations[el.name] === 'string') {
                  backgroundData.name_en = translations[el.name] || "";
                } else {
                  backgroundData.name = translations[el.name].id || (el.name || "Tanpa Nama");
                  backgroundData.name_en = translations[el.name].en || "";
                }
              }
              if (generatedKeywords[el.name]) {
                backgroundData.keywords = generatedKeywords[el.name];
              }

              if (Object.keys(backgroundData).length > 0) {
                backgroundBatch.set(doc(db, col, el.id.toString()), backgroundData, { merge: true });
              }
            });
            backgroundBatch.commit().catch(err => console.error("Background LLM update failed:", err));
          }).catch(err => console.error("Background LLM processing failed:", err));
        }

      } catch (error) {
        console.error("Gagal simpan:", error);
        showAlert(getText('alert_save_fail') + " " + error.message);
      } finally {
        setIsSaving(false);
      }
    } else navigate("/admin", { state: { authorized: true } });
    setConfirmAction(null);
  };

  const drawGrid = () => {
    const lines = [];
    const { width, height } = calculatedMapSize;
    const gridColor = isDarkMode ? "#334155" : "#9e9e9e";
    for (let i = 0; i < width / GRID_SIZE; i++) lines.push(<Line key={`v${i}`} points={[Math.round(i * GRID_SIZE), 0, Math.round(i * GRID_SIZE), height]} stroke={gridColor} strokeWidth={1} />);
    for (let j = 0; j < height / GRID_SIZE; j++) lines.push(<Line key={`h${j}`} points={[0, Math.round(j * GRID_SIZE), width, Math.round(j * GRID_SIZE)]} stroke={gridColor} strokeWidth={1} />);
    return lines;
  };

  const formatFloorName = (floorName) => {
    if (typeof floorName === 'string' && floorName.startsWith('submap_')) {
      const roomId = floorName.replace('submap_', '');
      const room = placedElements.find(el => el.id === roomId);
      if (room && room.name) {
        return `Submap - ${translateName(room.name, language, room.name_en)}`;
      }
      return `Submap - ${roomId}`;
    }
    return translateName(floorName, language);
  };

  const activeFloorElements = useMemo(() => {
    const currentBld = activeEditBuilding || (buildings.length > 0 ? buildings[0] : "Mall Utama");
    return placedElements.filter(el => el.floor === activeEditFloor && (el.building || currentBld) === currentBld);
  }, [placedElements, activeEditFloor, activeEditBuilding, buildings]);

  // Outline batas gedung fleksibel di halaman admin edit
  const activeFloorBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    activeFloorElements.forEach(el => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });
    if (minX === Infinity || minY === Infinity) return null;
    const rawW = maxX - minX;
    const rawH = maxY - minY;
    const dynamicPadding = Math.max(50, Math.min(120, Math.round(Math.max(rawW, rawH) * 0.06)));
    return {
      x: minX - dynamicPadding,
      y: minY - dynamicPadding,
      width: rawW + dynamicPadding * 2,
      height: rawH + dynamicPadding * 2,
    };
  }, [activeFloorElements]);

  return (
    <div className="edit-page-container">
      <header className="edit-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={LogoImg} alt="Wayfinder Logo" style={{ height: '28px', width: 'auto', filter: isDarkMode ? "brightness(0.1)" : "none" }} />
          <span className="edit-page-logo">Wayfinder</span>
        </div>

        <div className="header-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <label className="theme-switch" title={isDarkMode ? (language === 'id' ? 'Mode Terang' : 'Light Mode') : (language === 'id' ? 'Mode Gelap' : 'Dark Mode')}>
            <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
            <span className="slider">
              <span className="slider-icon"></span>
              <span className="slider-icon"></span>
            </span>
          </label>
          <LanguageSelector
            language={language}
            onChange={handleLanguageChange}
          />

          <button className="edit-page-btn cancel" onClick={() => setIsConfirmOpen(true)}><span>{getText('cancel')}</span></button>
          <button className="edit-page-btn save" onClick={() => { setConfirmAction("save"); setIsConfirmOpen(true); }}><span>{getText('save_map')}</span></button>
        </div>
      </header>

      {isConfirmOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            {confirmAction === "save" ? (
              <div className="confirm-icon-badge save-badge">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
              </div>
            ) : (
              <div className="confirm-icon-badge cancel-badge">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
            )}
            <h3>{confirmAction === "save" ? getText('save_confirm') : getText('cancel_confirm')}</h3>
            <p>{confirmAction === "save" ? getText('are_you_sure_save') : getText('are_you_sure_cancel')}</p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn no" onClick={() => setIsConfirmOpen(false)}>{getText('no')}</button>
              <button className="confirm-btn yes" onClick={handleConfirmYes}>{getText('yes')}</button>
            </div>
          </div>
        </div>
      )}

      <PromptDialog
        isOpen={customPrompt.isOpen}
        title={customPrompt.title}
        defaultValue={customPrompt.defaultValue}
        onSubmit={customPrompt.onSubmit}
        onCancel={() => setCustomPrompt(prev => ({ ...prev, isOpen: false }))}
        okText={getText('ok')}
        cancelText={getText('cancel')}
      />
      <AlertDialog
        isOpen={customAlert.isOpen}
        message={customAlert.message}
        onClose={() => {
          setCustomAlert(prev => ({ ...prev, isOpen: false }));
          if (customAlert.onCloseCallback) customAlert.onCloseCallback();
        }}
        okText={getText('ok')}
      />
      <ConfirmDialog
        isOpen={customConfirm.isOpen}
        title={customConfirm.title}
        message={customConfirm.message}
        onConfirm={customConfirm.onConfirm}
        onCancel={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))}
        okText={getText('ok')}
        cancelText={getText('cancel')}
      />

      {isSaving && (
        <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ color: 'white', marginTop: '20px' }}>{getText('saving_map')}</h2>
        </div>
      )}

      <div className="edit-page-layout">
        <main className="edit-page-map" ref={mapRef} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <TransformWrapper ref={transformRef} panning={{ disabled: isDraggingElement || isShiftPressed || selectionRect.visible }} initialScale={1} minScale={0.05} maxScale={10} limitToBounds={false} wheel={{ step: 0.005, smoothStep: 0.002 }}>
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: isDraggingElement ? "grabbing" : "grab" }}>
              <div className="map-content" style={{ width: calculatedMapSize.width, height: calculatedMapSize.height, background: isDarkMode ? "#0f172a" : "#e0e0e0" }}>
                <Stage pixelRatio={2} width={calculatedMapSize.width} height={calculatedMapSize.height} onMouseDown={handleStageMouseDown} onMouseMove={handleStageMouseMove} onMouseUp={handleStageMouseUp} onTouchStart={handleStageMouseDown} onTouchMove={handleStageMouseMove} onTouchEnd={handleStageMouseUp}>
                  <Layer>
                    <Rect id="bg-grid" x={0} y={0} width={calculatedMapSize.width} height={calculatedMapSize.height} fill="transparent" />
                    {drawGrid()}

                    {/* Outline Fleksibel Batas Gedung di Edit Page */}
                    {activeFloorBounds && (
                      <Rect
                        x={activeFloorBounds.x}
                        y={activeFloorBounds.y}
                        width={activeFloorBounds.width}
                        height={activeFloorBounds.height}
                        fill={isDarkMode ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.85)"}
                        stroke={isDarkMode ? "#3b82f6" : "#1a73c8"}
                        strokeWidth={2}
                        dash={[12, 6]}
                        cornerRadius={20}
                        shadowColor={isDarkMode ? "rgba(59, 130, 246, 0.12)" : "rgba(26, 115, 200, 0.1)"}
                        shadowBlur={12}
                        shadowOffset={{ x: 0, y: 4 }}
                        listening={false}
                      />
                    )}

                    {activeFloorElements
                      .map((rect) => (
                        <ElementShape
                          key={rect.id}
                          shapeProps={rect}
                          isSelected={selectedIds.includes(rect.id)}
                          isEditingVertices={isEditingVertices && selectedIds.length === 1 && selectedIds[0] === rect.id}
                          selectedVertexIndex={selectedVertexIndex}
                          onSelectVertex={(vIdx) => setSelectedVertexIndex(vIdx)}
                          onVertexDrag={handleVertexDrag}
                          setIsDraggingElement={setIsDraggingElement}
                          GRID_SIZE={GRID_SIZE}
                          onSelect={(e) => {
                            const evt = e.evt || e;
                            if (evt.shiftKey) {
                              setSelectedIds(prev => prev.includes(rect.id) ? prev.filter(id => id !== rect.id) : [...prev, rect.id]);
                            } else {
                              setSelectedIds([rect.id]);
                            }
                          }}
                          onChange={(newAttrs, actionType) => {
                            const { placedElements, history, historyStep } = stateRef.current;

                            const dx = newAttrs.x - rect.x;
                            const dy = newAttrs.y - rect.y;

                            const isSelectedGroup = selectedIds.includes(rect.id);

                            const newElements = placedElements.map(e => {
                              if (actionType === "drag" && isSelectedGroup && selectedIds.includes(e.id)) {
                                if (e.id === rect.id) return newAttrs;
                                return {
                                  ...e,
                                  x: e.x + dx,
                                  y: e.y + dy
                                };
                              }
                              if (e.id === rect.id) return newAttrs;
                              return e;
                            });

                            setPlacedElements(newElements);

                            let newHistory = history.slice(0, historyStep + 1);
                            newHistory.push(newElements);
                            if (newHistory.length > 50) {
                              newHistory = newHistory.slice(newHistory.length - 50);
                            }
                            setHistory(newHistory);
                            setHistoryStep(newHistory.length - 1);
                          }}
                          originalElements={originalElements}
                          language={language}
                          isDarkMode={isDarkMode}
                          onRequestRename={(title, defVal, onSubmit) => {
                            setCustomPrompt({
                              isOpen: true,
                              title,
                              defaultValue: defVal,
                              onSubmit: async (val) => {
                                setCustomPrompt(prev => ({ ...prev, isOpen: false }));
                                if (!val || val.trim() === "") return;

                                onSubmit(val.trim());

                                try {
                                  const res = await fetch("/api/translate", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ names: [val.trim()] })
                                  });
                                  const data = await res.json();
                                  if (data.status === "success" && data.translations[val.trim()]) {
                                    const trans = data.translations[val.trim()];
                                    const idName = typeof trans === 'string' ? val.trim() : (trans.id || val.trim());
                                    const enName = typeof trans === 'string' ? trans : (trans.en || "");

                                    const { placedElements, history, historyStep } = stateRef.current;
                                    const index = placedElements.findIndex(e => e.id === rect.id);
                                    if (index !== -1) {
                                      const newElements = [...placedElements];
                                      newElements[index] = { ...newElements[index], name: idName, name_en: enName };
                                      setPlacedElements(newElements);

                                      let newHistory = history.slice(0, historyStep + 1);
                                      newHistory.push(newElements);
                                      if (newHistory.length > 50) {
                                        newHistory = newHistory.slice(newHistory.length - 50);
                                      }
                                      setHistory(newHistory);
                                      setHistoryStep(newHistory.length - 1);
                                      stateRef.current = { placedElements: newElements, history: newHistory, historyStep: newHistory.length - 1 };
                                    }
                                  }
                                } catch (error) {
                                  console.error("Gagal real-time translate:", error);
                                }
                              }
                            });
                          }}
                        />
                      ))}

                    {selectionRect.visible && (
                      <Rect
                        x={selectionRect.x}
                        y={selectionRect.y}
                        width={selectionRect.width}
                        height={selectionRect.height}
                        fill="rgba(0,0,255,0.1)"
                        stroke="rgba(0,0,255,0.5)"
                        listening={false}
                      />
                    )}
                    {selectedIds.length > 0 && !isEditingVertices && (
                      <Transformer ref={trRef} rotateEnabled={false}
                        boundBoxFunc={(oldBox, newBox) => {
                          if (newBox.width < GRID_SIZE || newBox.height < GRID_SIZE) {
                            return oldBox;
                          }
                          return newBox;
                        }}
                        onTransformEnd={() => {
                          setIsDraggingElement(false);
                          const nodes = trRef.current.nodes();
                          const { placedElements, history, historyStep } = stateRef.current;
                          let newElements = [...placedElements];

                          nodes.forEach(node => {
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            node.scaleX(1);
                            node.scaleY(1);

                            const id = node.id();
                            const index = newElements.findIndex(e => e.id === id);
                            if (index !== -1) {
                              const el = newElements[index];
                              let newPoints = el.points;
                              if (newPoints && newPoints.length >= 6) {
                                newPoints = newPoints.map((val, pIdx) => {
                                  const factor = pIdx % 2 === 0 ? scaleX : scaleY;
                                  return Math.round(val * factor);
                                });
                              }
                              newElements[index] = {
                                ...el,
                                x: Math.round(node.x() / GRID_SIZE) * GRID_SIZE,
                                y: Math.round(node.y() / GRID_SIZE) * GRID_SIZE,
                                width: Math.max(GRID_SIZE, Math.round((node.width() * scaleX) / GRID_SIZE) * GRID_SIZE),
                                height: Math.max(GRID_SIZE, Math.round((node.height() * scaleY) / GRID_SIZE) * GRID_SIZE),
                                points: newPoints,
                              };
                            }
                          });

                          setPlacedElements(newElements);

                          let newHistory = history.slice(0, historyStep + 1);
                          newHistory.push(newElements);
                          if (newHistory.length > 50) {
                            newHistory = newHistory.slice(newHistory.length - 50);
                          }
                          setHistory(newHistory);
                          setHistoryStep(newHistory.length - 1);
                        }}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </main>

        <aside className="edit-page-right-panel">
          <div className="edit-card" style={{ marginBottom: "15px" }}>
            <h4 className="edit-card-title">
              <span>{getText('building_management')}</span>
              <span className="badge">{buildings.length}</span>
            </h4>
            <div className="custom-floor-dropdown" style={{ marginBottom: "10px" }}>
              <div
                className="custom-dropdown-header"
                onClick={() => setIsBuildingDropdownOpen(!isBuildingDropdownOpen)}
              >
                <span>{activeEditBuilding}</span>
                <span className="dropdown-arrow">{isBuildingDropdownOpen ? '▲' : '▼'}</span>
              </div>

              {isBuildingDropdownOpen && (
                <div className="custom-dropdown-list">
                  {buildings.map((b, index) => (
                    <div
                      key={b}
                      className={`custom-dropdown-item ${activeEditBuilding === b ? 'active' : ''}`}
                      draggable
                      data-index={index}
                      onDragStart={(e) => {
                        dragItemIndexRef.current = index;
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnter={() => {
                        dragOverItemIndexRef.current = index;
                      }}
                      onDragEnd={handleBuildingDragSort}
                      onDragOver={(e) => e.preventDefault()}
                      onTouchStart={() => {
                        dragItemIndexRef.current = index;
                      }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0];
                        const target = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (target) {
                          const dropItem = target.closest('.custom-dropdown-item');
                          if (dropItem && dropItem.dataset.index !== undefined) {
                            dragOverItemIndexRef.current = parseInt(dropItem.dataset.index, 10);
                          }
                        }
                      }}
                      onTouchEnd={handleBuildingDragSort}
                      style={{ touchAction: 'none' }}
                      onClick={() => {
                        handleBuildingChange(b);
                        setSelectedIds([]);
                        setIsBuildingDropdownOpen(false);
                      }}
                    >
                      <span className="floor-name">{b}</span>
                      <span className="drag-handle">≡</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="edit-btn-group" style={{ marginBottom: "5px" }}>
              <button onClick={() => {
                const promptText = language === 'id' ? 'Masukkan nama gedung baru:' : 'Enter new building name:';
                setCustomPrompt({
                  isOpen: true,
                  title: promptText,
                  defaultValue: "",
                  onSubmit: (val) => {
                    setCustomPrompt(prev => ({ ...prev, isOpen: false }));
                    if (val && val.trim() !== "") {
                      const newBuilding = val.trim();
                      if (!buildings.includes(newBuilding)) {
                        setBuildings([...buildings, newBuilding].sort());
                        handleBuildingChange(newBuilding);
                      }
                    }
                  }
                });
              }} className="edit-btn btn-success">{language === 'id' ? 'Tambah' : 'Add'}</button>
              <button onClick={handleRenameBuilding} className="edit-btn btn-primary">{language === 'id' ? 'Ganti Nama' : 'Rename'}</button>
              <button onClick={handleDeleteBuilding} className="edit-btn btn-danger">{language === 'id' ? 'Hapus' : 'Delete'}</button>
            </div>
          </div>

          <div className="edit-card">
            <h4 className="edit-card-title">
              <span>{getText('floor_management')}</span>
              <span className="badge">{floors.length}</span>
            </h4>
            <div className="custom-floor-dropdown">
              <div
                className="custom-dropdown-header"
                onClick={() => setIsFloorDropdownOpen(!isFloorDropdownOpen)}
              >
                <span>{formatFloorName(activeEditFloor)}</span>
                <span className="dropdown-arrow">{isFloorDropdownOpen ? '▲' : '▼'}</span>
              </div>

              {isFloorDropdownOpen && (
                <div className="custom-dropdown-list">
                  {floors.map((f, index) => (
                    <div
                      key={f}
                      className={`custom-dropdown-item ${activeEditFloor === f ? 'active' : ''}`}
                      draggable
                      data-index={index}
                      onDragStart={(e) => {
                        dragItemIndexRef.current = index;
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnter={() => {
                        dragOverItemIndexRef.current = index;
                      }}
                      onDragEnd={handleDragSort}
                      onDragOver={(e) => e.preventDefault()}
                      onTouchStart={() => {
                        dragItemIndexRef.current = index;
                      }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0];
                        const target = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (target) {
                          const dropItem = target.closest('.custom-dropdown-item');
                          if (dropItem && dropItem.dataset.index !== undefined) {
                            dragOverItemIndexRef.current = parseInt(dropItem.dataset.index, 10);
                          }
                        }
                      }}
                      onTouchEnd={handleDragSort}
                      onClick={() => {
                        setActiveEditFloor(f);
                        setSelectedIds([]);
                        setIsFloorDropdownOpen(false);
                      }}
                      style={{ touchAction: 'none' }}
                    >
                      <span className="floor-name">{formatFloorName(f)}</span>
                      <span className="drag-handle" title="Drag to reorder">≡</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="edit-btn-group" style={{ marginBottom: "5px" }}>
              <button onClick={handleAddFloor} className="edit-btn btn-success">{getText('add_floor')}</button>
              <button onClick={handleRenameFloor} className="edit-btn btn-primary">{getText('rename_floor')}</button>
              <button onClick={handleDeleteFloor} className="edit-btn btn-danger">{getText('del_floor')}</button>
            </div>
          </div>

          <div className="edit-card" style={{ marginBottom: "16px" }}>
            <h4 className="edit-card-title">
              <span>{language === 'id' ? 'Alat Global' : 'Global Tools'}</span>
            </h4>
            <div className="edit-btn-group" style={{ marginBottom: "10px" }}>
              <button onClick={handleUndo} disabled={historyStep <= 0} className="edit-btn btn-secondary" title="Undo (Ctrl+Z)">
                ↶ {getText('undo')}
              </button>
              <button onClick={handleRedo} disabled={historyStep >= history.length - 1} className="edit-btn btn-secondary" title="Redo (Ctrl+Y)">
                {getText('redo')} ↷
              </button>
            </div>
          </div>

          <div className="edit-card" style={{ marginBottom: "16px" }}>
            <h4 className="edit-card-title">
              <span>{getText('edit_panel')} - {formatFloorName(activeEditFloor)}</span>
            </h4>
            <div className="edit-tools">
              <p className="edit-selected-text">
                {selectedIds.length === 0 ? getText('no_element_selected') : (selectedIds.length === 1 ? `${getText('selected')}: ${translateName(placedElements.find(el => el.id === selectedIds[0])?.name || "Kiosk", language, placedElements.find(el => el.id === selectedIds[0])?.name_en)}` : `Banyak elemen terpilih (${selectedIds.length})`)}
              </p>
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                {selectedIds.length === 1 && (
                  <button className="edit-btn btn-success" onClick={cloneSelectedElement} style={{ flex: 1 }} title="Clone (Ctrl+D)">
                    {language === 'id' ? 'Gandakan' : 'Clone'}
                  </button>
                )}

                {selectedIds.length === 1 && placedElements.find(el => el.id === selectedIds[0])?.type === 'room' && (
                  <button onClick={() => {
                    const room = placedElements.find(el => el.id === selectedIds[0]);
                    const submapId = `submap_${room.id}`;
                    setActiveEditFloor(submapId);
                    setSelectedIds([]);
                    const hasPintuMasuk = placedElements.some(el => el.floor === submapId && el.name.toLowerCase() === 'pintu masuk');
                    if (!hasPintuMasuk) {
                      const newId = generateNextKioskId();
                      const newElements = [...placedElements, {
                        id: newId, type: 'kiosk', floor: submapId, x: 200, y: 200,
                        width: GRID_SIZE * 2, height: GRID_SIZE * 2,
                        name: "Pintu Masuk", fill: "#FF9800", stroke: "#E65100"
                      }];
                      setPlacedElements(newElements);
                      saveHistory(newElements);
                    }
                  }}
                    className="edit-btn btn-primary" style={{ flex: 1 }}>
                    {getText('enter_submap')}
                  </button>
                )}

                {selectedIds.length === 1 && (
                  <button className="edit-btn btn-danger delete-btn" onClick={deleteSelectedElement} style={{ flex: 1 }}>
                    {getText('del_element')}
                  </button>
                )}
              </div>

              {activeEditFloor.startsWith("submap_") && (
                <button className="edit-btn btn-secondary" style={{ width: "100%", marginTop: "4px", marginBottom: "10px" }} onClick={() => {
                  const parentRoomId = activeEditFloor.replace("submap_", "");
                  const parentRoom = placedElements.find(el => el.id === parentRoomId);
                  setActiveEditFloor(parentRoom ? parentRoom.floor : floors[0]);
                }}>
                  ← {getText('back_to_main_floor')}
                </button>
              )}

              {selectedIds.length === 1 && (() => {
                const el = placedElements.find(e => e.id === selectedIds[0]);
                if (!el) return null;
                const isRoom = el.type === 'room';
                const isKiosk = el.type === 'kiosk';
                if (!isRoom && !isKiosk) return null;
                const room = el;
                const updateRoom = (changes) => {
                  const newElements = placedElements.map(el => el.id === selectedIds[0] ? { ...el, ...changes } : el);
                  setPlacedElements(newElements);
                  saveHistory(newElements);
                };
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {room.is_connector && (
                      <div className="endpoint-controls edit-card-inner">
                        <h4 className="endpoint-title">{language === 'id' ? 'Menuju Gedung' : 'Target Building'}</h4>
                        <select
                          value={room.target_building || ""}
                          onChange={(e) => updateRoom({ target_building: e.target.value })}
                          style={{ width: "100%", padding: "5px", borderRadius: "5px", border: "1px solid #ccc", color: "black", marginTop: "5px" }}
                        >
                          <option value="" disabled>{language === 'id' ? 'Pilih Gedung Tujuan' : 'Select Target Building'}</option>
                          {buildings.filter(b => b !== activeEditBuilding).map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="endpoint-controls edit-card-inner">
                      <h4 className="endpoint-title">{getText('active_endpoint_side')}</h4>
                      <p className="endpoint-hint">{getText('change_manual_hint')}</p>
                      <div className="endpoint-grid">
                        {['top', 'bottom', 'left', 'right'].map(side => {
                          const labels = { top: getText('top'), bottom: getText('bottom'), left: getText('left'), right: getText('right') };
                          const isChecked = (room.endpoints || []).includes(side);
                          return (
                            <label key={side} className="endpoint-label">
                              <input type="checkbox" checked={isChecked} onChange={() => {
                                const curr = room.endpoints || [];
                                const next = isChecked ? curr.filter(s => s !== side) : [...curr, side];
                                updateRoom({ endpoints: next.length > 0 ? next : ['bottom'] });
                              }} />
                              <span className="checkbox-custom"></span>
                              {labels[side]}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pemilihan Bentuk Ruangan / Layout Preset & Vertex Editor */}
                    <div className="endpoint-controls edit-card-inner">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 className="endpoint-title" style={{ margin: 0 }}>
                          {language === 'id' ? 'Bentuk Layout' : 'Shape Layout'}
                        </h4>
                        {room.points && room.points.length >= 6 && (
                          <span style={{ fontSize: "11px", color: "var(--primary-color)", fontWeight: "600" }}>
                            {room.points.length / 2} {language === 'id' ? 'titik' : 'pts'}
                          </span>
                        )}
                      </div>
                      <div className="shape-selector-grid">
                        {SHAPE_TYPES.map(st => {
                          const isCurrentShape = (room.shape_type || 'rect') === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              className={`shape-btn ${isCurrentShape ? 'active' : ''}`}
                              onClick={() => handleShapeTypeChange(st.id)}
                              title={st.desc}
                            >
                              <span className="shape-btn-icon">{st.icon}</span>
                              <span>{st.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {room.shape_type && room.shape_type !== 'rect' && (
                        <div className="vertex-editor-box">
                          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                            <button
                              type="button"
                              className={`edit-btn ${isEditingVertices ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                              onClick={() => setIsEditingVertices(prev => !prev)}
                            >
                              {isEditingVertices ? (language === 'id' ? '✓ Selesai Edit Titik' : '✓ Done Editing') : (language === 'id' ? '✏️ Edit Titik Sudut' : '✏️ Edit Vertices')}
                            </button>
                          </div>

                          {isEditingVertices && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <p style={{ fontSize: "10px", color: "var(--primary-color)", margin: 0, fontWeight: "500", lineHeight: 1.4 }}>
                                💡 {language === 'id' ? 'Klik & geser titik bulat di denah untuk membentuk dinding ruangan!' : 'Click and drag the circular handles on the map to shape walls!'}
                              </p>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  className="edit-btn btn-secondary"
                                  style={{ flex: 1, fontSize: "11px", padding: "4px" }}
                                  onClick={handleAddVertex}
                                  title={language === 'id' ? 'Tambah titik sudut baru' : 'Add new vertex'}
                                >
                                  ➕ {language === 'id' ? 'Tambah' : 'Add Point'}
                                </button>
                                <button
                                  type="button"
                                  className="edit-btn btn-danger"
                                  style={{ flex: 1, fontSize: "11px", padding: "4px" }}
                                  onClick={handleRemoveVertex}
                                  title={language === 'id' ? 'Hapus titik sudut yang dipilih' : 'Remove selected vertex'}
                                >
                                  ➖ {language === 'id' ? 'Hapus' : 'Delete'}
                                </button>
                                <button
                                  type="button"
                                  className="edit-btn btn-secondary"
                                  style={{ flex: 1, fontSize: "11px", padding: "4px" }}
                                  onClick={() => handleShapeTypeChange(room.shape_type || 'polygon')}
                                  title={language === 'id' ? 'Kembalikan titik sudut ke bentuk awal' : 'Reset vertices to default'}
                                >
                                  ↺ {language === 'id' ? 'Reset' : 'Reset'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="edit-card">
            <h4 className="edit-card-title">
              <span>{getText('template_elements')}</span>
            </h4>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "-5px", marginBottom: "8px" }}>{getText('template_hint')}</p>
            <div className="dnd-zone">
              <h5 style={{ margin: "5px 0 10px 0", fontSize: "12px", color: "var(--text-main)", fontWeight: "700" }}>{language === 'id' ? 'Ruangan' : 'Rooms'}</h5>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
                {[
                  { name: "Ruangan Pintu Berlawanan", shortName: "tmpl_biasa", endpoints: ['left', 'right'], color: "#4caf50", icon: "🚪" },
                  { name: "Ruangan 1 Pintu", shortName: "tmpl_1_pintu", endpoints: ['top'], color: "#4caf50", icon: "🚪" },
                  { name: "Ruangan 2 Pintu", shortName: "tmpl_2_pintu", endpoints: ['left', 'bottom'], color: "#4caf50", icon: "🚪" },
                  { name: "Ruangan 3 Pintu", shortName: "tmpl_3_pintu", endpoints: ['left', 'right', 'bottom'], color: "#4caf50", icon: "🚪" },
                  { name: "Ruangan 4 Pintu", shortName: "tmpl_4_pintu", endpoints: ['top', 'bottom', 'left', 'right'], color: "#4caf50", icon: "🚪" }
                ].map(preset => (
                  <div
                    key={preset.name}
                    draggable
                    className="template-card template-room"
                    title={translateName(preset.name, language)}
                    style={{ touchAction: 'none' }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", JSON.stringify({
                        type: "new-room",
                        defaultName: preset.name,
                        endpoints: preset.endpoints,
                        defaultGridWidth: 4,
                        defaultGridHeight: 4
                      }));
                    }}
                    onTouchStart={() => {
                      touchDragDataRef.current = {
                        type: "new-room",
                        defaultName: preset.name,
                        endpoints: preset.endpoints,
                        defaultGridWidth: 4,
                        defaultGridHeight: 4
                      };
                    }}
                    onTouchEnd={(e) => {
                      if (!touchDragDataRef.current) return;
                      const touch = e.changedTouches[0];
                      const target = document.elementFromPoint(touch.clientX, touch.clientY);
                      const mapContainer = mapRef.current;
                      if (mapContainer && mapContainer.contains(target)) {
                        const mapRect = mapContainer.getBoundingClientRect();
                        const clientX = touch.clientX - mapRect.left;
                        const clientY = touch.clientY - mapRect.top;
                        processDrop(clientX, clientY, touchDragDataRef.current);
                      }
                      touchDragDataRef.current = null;
                    }}
                    onClick={() => {
                      const center = getViewportCenter();
                      const newId = generateNextRoomId();
                      const newElements = [...placedElements, {
                        id: newId, type: 'room', floor: activeEditFloor, building: activeEditBuilding,
                        x: center.x, y: center.y, width: GRID_SIZE * 4, height: GRID_SIZE * 4,
                        name: preset.name, fill: "#e0e0e0", stroke: "#9e9e9e",
                        endpoints: preset.endpoints
                      }];
                      setPlacedElements(newElements);
                      saveHistory(newElements);
                    }}
                  >
                    <div className="template-icon">{preset.icon}</div>
                    <p>{getText(preset.shortName)}</p>
                  </div>
                ))}
              </div>

              <div style={{ margin: "10px 0", borderTop: "1px solid var(--border)" }}></div>

              <h5 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "var(--text-main)", fontWeight: "700" }}>{language === 'id' ? 'Bentuk Khusus (Preset)' : 'Custom Shapes'}</h5>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
                {[
                  { id: 'circle', name: "Lingkaran", w: 4, h: 4 },
                  { id: 'semicircle', name: "1/2 Lingkaran", w: 4, h: 3 },
                  { id: 't_shape', name: "Bentuk T", w: 5, h: 4 },
                  { id: 'l_shape', name: "Bentuk L", w: 4, h: 4 },
                  { id: 'polygon', name: "Bebas", w: 4, h: 4 }
                ].map(preset => (
                  <div
                    key={preset.id}
                    draggable
                    className="template-card template-room"
                    title={preset.name}
                    style={{
                      touchAction: 'none',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '8px 6px',
                      minHeight: '36px'
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", JSON.stringify({
                        type: "new-room",
                        shapeType: preset.id,
                        defaultName: preset.name,
                        endpoints: ['bottom'],
                        defaultGridWidth: preset.w,
                        defaultGridHeight: preset.h
                      }));
                    }}
                    onTouchStart={() => {
                      touchDragDataRef.current = {
                        type: "new-room",
                        shapeType: preset.id,
                        defaultName: preset.name,
                        endpoints: ['bottom'],
                        defaultGridWidth: preset.w,
                        defaultGridHeight: preset.h
                      };
                    }}
                    onTouchEnd={(e) => {
                      if (!touchDragDataRef.current) return;
                      const touch = e.changedTouches[0];
                      const target = document.elementFromPoint(touch.clientX, touch.clientY);
                      const mapContainer = mapRef.current;
                      if (mapContainer && mapContainer.contains(target)) {
                        const mapRect = mapContainer.getBoundingClientRect();
                        const clientX = touch.clientX - mapRect.left;
                        const clientY = touch.clientY - mapRect.top;
                        processDrop(clientX, clientY, touchDragDataRef.current);
                      }
                      touchDragDataRef.current = null;
                    }}
                    onClick={() => {
                      const center = getViewportCenter();
                      const newId = generateNextRoomId();
                      const w = GRID_SIZE * preset.w;
                      const h = GRID_SIZE * preset.h;
                      const pts = getPresetPoints(preset.id, w, h, GRID_SIZE);
                      const newElements = [...placedElements, {
                        id: newId, type: 'room', floor: activeEditFloor, building: activeEditBuilding,
                        x: center.x, y: center.y, width: w, height: h,
                        name: preset.name, fill: "#e0e0e0", stroke: "#9e9e9e",
                        endpoints: ['bottom'],
                        shape_type: preset.id,
                        points: pts
                      }];
                      setPlacedElements(newElements);
                      saveHistory(newElements);
                      setSelectedIds([newId]);
                    }}
                  >
                    <p style={{ margin: 0, textAlign: 'center', width: '100%', fontSize: '11px', fontWeight: 600 }}>{preset.name}</p>
                  </div>
                ))}
              </div>

              <div style={{ margin: "10px 0", borderTop: "1px solid var(--border)" }}></div>

              <h5 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "var(--text-main)", fontWeight: "700" }}>{language === 'id' ? 'Lainnya' : 'Others'}</h5>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
                <div
                  draggable
                  style={{ touchAction: 'none' }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify({
                      type: "new-kiosk",
                      defaultName: "Kios Baru",
                      defaultGridWidth: 2,
                      defaultGridHeight: 2
                    }));
                  }}
                  onTouchStart={() => {
                    touchDragDataRef.current = {
                      type: "new-kiosk",
                      defaultName: "Kios Baru",
                      defaultGridWidth: 2,
                      defaultGridHeight: 2
                    };
                  }}
                  onTouchEnd={(e) => {
                    if (!touchDragDataRef.current) return;
                    const touch = e.changedTouches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY);
                    const mapContainer = mapRef.current;
                    if (mapContainer && mapContainer.contains(target)) {
                      const mapRect = mapContainer.getBoundingClientRect();
                      const clientX = touch.clientX - mapRect.left;
                      const clientY = touch.clientY - mapRect.top;
                      processDrop(clientX, clientY, touchDragDataRef.current);
                    }
                    touchDragDataRef.current = null;
                  }}
                  onClick={() => {
                    const center = getViewportCenter();
                    const newId = generateNextKioskId();
                    const newElements = [...placedElements, {
                      id: newId, type: 'kiosk', floor: activeEditFloor, building: activeEditBuilding,
                      x: center.x, y: center.y, width: GRID_SIZE * 2, height: GRID_SIZE * 2,
                      name: "Kios Baru"
                    }];
                    setPlacedElements(newElements);
                    saveHistory(newElements);
                  }}
                  className="template-card template-kiosk"
                >
                  <div className="template-icon">ℹ️</div>
                  <p>{getText('drag_kiosk')}</p>
                </div>

                <div
                  draggable
                  style={{ touchAction: 'none' }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify({
                      type: "new-entrance",
                      defaultName: language === 'id' ? "Pintu Masuk Utama" : "Main Entrance",
                      defaultGridWidth: 2,
                      defaultGridHeight: 2
                    }));
                  }}
                  onTouchStart={() => {
                    touchDragDataRef.current = {
                      type: "new-entrance",
                      defaultName: language === 'id' ? "Pintu Masuk Utama" : "Main Entrance",
                      defaultGridWidth: 2,
                      defaultGridHeight: 2
                    };
                  }}
                  onTouchEnd={(e) => {
                    if (!touchDragDataRef.current) return;
                    const touch = e.changedTouches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY);
                    const mapContainer = mapRef.current;
                    if (mapContainer && mapContainer.contains(target)) {
                      const mapRect = mapContainer.getBoundingClientRect();
                      const clientX = touch.clientX - mapRect.left;
                      const clientY = touch.clientY - mapRect.top;
                      processDrop(clientX, clientY, touchDragDataRef.current);
                    }
                    touchDragDataRef.current = null;
                  }}
                  onClick={() => {
                    const center = getViewportCenter();
                    const newId = generateNextKioskId();
                    const newElements = [...placedElements, {
                      id: newId, type: 'kiosk', floor: activeEditFloor, building: activeEditBuilding,
                      x: center.x, y: center.y, width: GRID_SIZE * 2, height: GRID_SIZE * 2,
                      name: language === 'id' ? "Pintu Masuk Utama" : "Main Entrance"
                    }];
                    setPlacedElements(newElements);
                    saveHistory(newElements);
                  }}
                  className="template-card template-entrance"
                >
                  <div className="template-icon">🚪</div>
                  <p>{language === 'id' ? 'Pintu Masuk' : 'Entrance'}</p>
                </div>

                <div
                  draggable
                  style={{ touchAction: 'none' }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify({
                      type: "new-connector",
                      defaultName: language === 'id' ? "Pintu Penghubung" : "Connector Door",
                      defaultGridWidth: 4,
                      defaultGridHeight: 4,
                      endpoints: ["bottom"]
                    }));
                  }}
                  onTouchStart={() => {
                    touchDragDataRef.current = {
                      type: "new-connector",
                      defaultName: language === 'id' ? "Pintu Penghubung" : "Connector Door",
                      defaultGridWidth: 4,
                      defaultGridHeight: 4,
                      endpoints: ["bottom"]
                    };
                  }}
                  onTouchEnd={(e) => {
                    if (!touchDragDataRef.current) return;
                    const touch = e.changedTouches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY);
                    const mapContainer = mapRef.current;
                    if (mapContainer && mapContainer.contains(target)) {
                      const mapRect = mapContainer.getBoundingClientRect();
                      const clientX = touch.clientX - mapRect.left;
                      const clientY = touch.clientY - mapRect.top;
                      processDrop(clientX, clientY, touchDragDataRef.current);
                    }
                    touchDragDataRef.current = null;
                  }}
                  onClick={() => {
                    const center = getViewportCenter();
                    const newId = generateNextRoomId();
                    const newElements = [...placedElements, {
                      id: newId, type: 'room', floor: activeEditFloor, building: activeEditBuilding,
                      x: center.x, y: center.y, width: GRID_SIZE * 4, height: GRID_SIZE * 4,
                      endpoints: ["bottom"], name: language === 'id' ? "Pintu Penghubung" : "Connector Door",
                      is_connector: true, target_building: ""
                    }];
                    setPlacedElements(newElements);
                    saveHistory(newElements);
                  }}
                  className="template-card template-connector"
                >
                  <div className="template-icon">🚪</div>
                  <p>{language === 'id' ? 'Pintu Gedung' : 'Building Door'}</p>
                </div>

                <div
                  draggable
                  style={{ touchAction: 'none' }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify({
                      type: "new-room",
                      defaultName: "Lift",
                      defaultGridWidth: 2,
                      defaultGridHeight: 2,
                      endpoints: ["bottom"]
                    }));
                  }}
                  onTouchStart={() => {
                    touchDragDataRef.current = {
                      type: "new-room",
                      defaultName: "Lift",
                      defaultGridWidth: 2,
                      defaultGridHeight: 2,
                      endpoints: ["bottom"]
                    };
                  }}
                  onTouchEnd={(e) => {
                    if (!touchDragDataRef.current) return;
                    const touch = e.changedTouches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY);
                    const mapContainer = mapRef.current;
                    if (mapContainer && mapContainer.contains(target)) {
                      const mapRect = mapContainer.getBoundingClientRect();
                      const clientX = touch.clientX - mapRect.left;
                      const clientY = touch.clientY - mapRect.top;
                      processDrop(clientX, clientY, touchDragDataRef.current);
                    }
                    touchDragDataRef.current = null;
                  }}
                  onClick={() => {
                    const center = getViewportCenter();
                    const newId = generateNextRoomId();
                    const newElements = [...placedElements, {
                      id: newId, type: 'room', floor: activeEditFloor, building: activeEditBuilding,
                      x: center.x, y: center.y, width: GRID_SIZE * 2, height: GRID_SIZE * 2,
                      endpoints: ["bottom"], name: "Lift"
                    }];
                    setPlacedElements(newElements);
                    saveHistory(newElements);
                  }}
                  className="template-card template-lift"
                >
                  <div className="template-icon">🛗</div>
                  <p>Lift</p>
                </div>

                <div
                  draggable
                  style={{ touchAction: 'none' }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify({
                      type: "new-room",
                      defaultName: language === 'id' ? "Tangga" : "Stairs",
                      defaultGridWidth: 3,
                      defaultGridHeight: 3,
                      endpoints: ["bottom"]
                    }));
                  }}
                  onTouchStart={() => {
                    touchDragDataRef.current = {
                      type: "new-room",
                      defaultName: language === 'id' ? "Tangga" : "Stairs",
                      defaultGridWidth: 3,
                      defaultGridHeight: 3,
                      endpoints: ["bottom"]
                    };
                  }}
                  onTouchEnd={(e) => {
                    if (!touchDragDataRef.current) return;
                    const touch = e.changedTouches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY);
                    const mapContainer = mapRef.current;
                    if (mapContainer && mapContainer.contains(target)) {
                      const mapRect = mapContainer.getBoundingClientRect();
                      const clientX = touch.clientX - mapRect.left;
                      const clientY = touch.clientY - mapRect.top;
                      processDrop(clientX, clientY, touchDragDataRef.current);
                    }
                    touchDragDataRef.current = null;
                  }}
                  onClick={() => {
                    const center = getViewportCenter();
                    const newId = generateNextRoomId();
                    const newElements = [...placedElements, {
                      id: newId, type: 'room', floor: activeEditFloor, building: activeEditBuilding,
                      x: center.x, y: center.y, width: GRID_SIZE * 3, height: GRID_SIZE * 3,
                      endpoints: ["bottom"], name: language === 'id' ? "Tangga" : "Stairs"
                    }];
                    setPlacedElements(newElements);
                    saveHistory(newElements);
                  }}
                  className="template-card template-stairs"
                >
                  <div className="template-icon">🪜</div>
                  <p>{language === 'id' ? 'Tangga' : 'Stairs'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}