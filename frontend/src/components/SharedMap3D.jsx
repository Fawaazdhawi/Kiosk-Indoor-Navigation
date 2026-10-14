import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { translateName, getDisplayNodeName } from "../utils/translator";
import { SAMPLE_ROOMS, SAMPLE_KIOSKS } from "../utils/mockData";

const GRID_SIZE = 25;
const WALL_HEIGHT = 28;
const PATH_HEIGHT = 3.5;
const ROTATION_DURATION = 350;
const WALK_SPEED = 140;

function getTotalPathLength(pathPoints) {
  let total = 0;
  for (let i = 0; i < pathPoints.length - 2; i += 2) {
    const x1 = pathPoints[i];
    const y1 = pathPoints[i + 1];
    const x2 = pathPoints[i + 2];
    const y2 = pathPoints[i + 3];
    const dx = x2 - x1;
    const dy = y2 - y1;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function getPointAtDistance(pathPoints, distance) {
  let currentDist = 0;
  for (let i = 0; i < pathPoints.length - 2; i += 2) {
    const x1 = pathPoints[i];
    const y1 = pathPoints[i + 1];
    const x2 = pathPoints[i + 2];
    const y2 = pathPoints[i + 3];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (segLen === 0) continue;

    if (currentDist + segLen >= distance) {
      const ratio = (distance - currentDist) / segLen;
      const x = x1 + dx * ratio;
      const y = y1 + dy * ratio;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return { x, y, angle };
    }
    currentDist += segLen;
  }

  const lastX = pathPoints[pathPoints.length - 2];
  const lastY = pathPoints[pathPoints.length - 1];

  if (pathPoints.length >= 4) {
    for (let i = pathPoints.length - 2; i >= 2; i -= 2) {
      const dx = pathPoints[i] - pathPoints[i - 2];
      const dy = pathPoints[i + 1] - pathPoints[i - 1];
      if (dx !== 0 || dy !== 0) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return { x: lastX, y: lastY, angle };
      }
    }
  }
  return { x: lastX, y: lastY, angle: 0 };
}

function getIdlePosition(kiosk, floorRooms, floorKiosks) {
  const OFFSET = 22;
  const AV = 28;
  const cx = kiosk.x + kiosk.width / 2;
  const cy = kiosk.y + kiosk.height / 2;

  const candidates = [
    { x: cx, y: kiosk.y + kiosk.height + OFFSET },
    { x: kiosk.x + kiosk.width + OFFSET, y: cy },
    { x: kiosk.x - OFFSET, y: cy },
    { x: cx, y: kiosk.y - OFFSET },
  ];
  const allBoxes = [...floorRooms, ...floorKiosks].filter(b => b.id !== kiosk.id);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  [...floorRooms, ...floorKiosks].forEach(b => {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  });

  for (const pos of candidates) {
    const ax = pos.x - AV / 2;
    const ay = pos.y - AV / 2;
    const overlaps = allBoxes.some(b =>
      ax < b.x + b.width && ax + AV > b.x && ay < b.y + b.height && ay + AV > b.y
    );
    const isInsideBounds = ax >= minX && (ax + AV) <= maxX && ay >= minY && (ay + AV) <= maxY;
    if (!overlaps && isInsideBounds) return pos;
  }

  for (const pos of candidates) {
    const ax = pos.x - AV / 2;
    const ay = pos.y - AV / 2;
    const overlaps = allBoxes.some(b =>
      ax < b.x + b.width && ax + AV > b.x && ay < b.y + b.height && ay + AV > b.y
    );
    if (!overlaps) return pos;
  }

  return candidates[0];
}

// Helper untuk membuat Canvas Sprite Badge label ruangan yang tajam & high-DPI
function createRoomBadgeSprite(text, typeColor, isDark) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const scale = 2; // Hi-DPI
  const fontSize = 14 * scale;
  ctx.font = `bold ${fontSize}px 'DM Sans', -apple-system, sans-serif`;

  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const paddingH = 14 * scale;
  const paddingV = 7 * scale;
  const width = Math.max(textWidth + paddingH * 2 + 12 * scale, 60 * scale);
  const height = fontSize + paddingV * 2;

  canvas.width = width;
  canvas.height = height;

  // Render ulang font setelah resize canvas
  ctx.font = `bold ${fontSize}px 'DM Sans', -apple-system, sans-serif`;
  ctx.imageSmoothingEnabled = true;

  // Background pill badge
  const radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();

  ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.92)";
  ctx.fill();

  ctx.strokeStyle = typeColor || (isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)");
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  // Color dot indicator
  const dotX = paddingH;
  const dotY = height / 2;
  const dotR = 4 * scale;
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fillStyle = typeColor || "#3b82f6";
  ctx.fill();

  // Text
  ctx.fillStyle = isDark ? "#f8fafc" : "#0f172a";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, dotX + dotR + 6 * scale, height / 2 + 0.5 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  const aspect = width / height;
  const worldHeight = 11;
  sprite.scale.set(worldHeight * aspect, worldHeight, 1);
  return sprite;
}

export default function SharedMap3D({
  rooms: propRooms,
  kiosks: propKiosks,
  path = [],
  activePath = null,
  activeStepPath = null,
  nextStepPath = null,
  activeStepIndex = 0,
  navigationSteps = [],
  currentFloor = "Ground Floor",
  currentBuilding = "Mall Utama",
  selectedKiosk,
  onRoomClick,
  language = "id",
  isDarkMode = false,
}) {
  const containerRef = useRef(null);
  const [rooms, setRooms] = useState([]);
  const [kiosks, setKiosks] = useState([]);
  const [isFollowingAvatar, setIsFollowingAvatar] = useState(false);
  const [viewAngle, setViewAngle] = useState("isometric"); // "isometric" | "top"

  // Normalisasi data dari props atau state lokal
  const effectiveRooms = useMemo(() => {
    const raw = (propRooms && propRooms.length > 0) ? propRooms : rooms;
    return raw.map(r => ({
      ...r,
      x: r.x !== undefined ? r.x : (r.grid_x || 0) * GRID_SIZE,
      y: r.y !== undefined ? r.y : (r.grid_y || 0) * GRID_SIZE,
      width: r.width !== undefined ? r.width : (r.grid_width || 1) * GRID_SIZE,
      height: r.height !== undefined ? r.height : (r.grid_height || 1) * GRID_SIZE,
      building: r.building || "Mall Utama",
      floor: r.floor || "Ground Floor"
    }));
  }, [propRooms, rooms]);

  const effectiveKiosks = useMemo(() => {
    const raw = (propKiosks && propKiosks.length > 0) ? propKiosks : kiosks;
    return raw.map(k => ({
      ...k,
      x: k.x !== undefined ? k.x : (k.grid_x || 0) * GRID_SIZE,
      y: k.y !== undefined ? k.y : (k.grid_y || 0) * GRID_SIZE,
      width: k.width !== undefined ? k.width : (k.grid_width || 1) * GRID_SIZE,
      height: k.height !== undefined ? k.height : (k.grid_height || 1) * GRID_SIZE,
      building: k.building || "Mall Utama",
      floor: k.floor || "Ground Floor"
    }));
  }, [propKiosks, kiosks]);

  // Three.js Core Refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const centerOffsetRef = useRef({ x: 0, z: 0 });

  // Mesh Groups
  const groundGroupRef = useRef(new THREE.Group());
  const roomsGroupRef = useRef(new THREE.Group());
  const labelsGroupRef = useRef(new THREE.Group());
  const pathsGroupRef = useRef(new THREE.Group());
  const avatarGroupRef = useRef(new THREE.Group());

  // Interactive Hover & Raycast
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2(-999, -999));
  const hoveredRoomRef = useRef(null);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });

  // Avatar Animation State
  const walkedDistanceRef = useRef(0);
  const animPhaseRef = useRef("idle"); // "idle" | "waving" | "walking" | "rotating"
  const rotateStartTimeRef = useRef(0);
  const rotateFromAngleRef = useRef(0);
  const rotateToAngleRef = useRef(0);
  const walkStartTimeRef = useRef(0);
  const avatarPartsRef = useRef({});

  // Firestore & Backend API Sync
  useEffect(() => {
    if (!db) {
      fetch('/api/map-data')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.rooms?.length) {
            setRooms(data.rooms.map(r => ({
              ...r,
              x: (r.grid_x || 0) * GRID_SIZE,
              y: (r.grid_y || 0) * GRID_SIZE,
              width: (r.grid_width || 1) * GRID_SIZE,
              height: (r.grid_height || 1) * GRID_SIZE,
            })));
            setKiosks((data.kiosks || []).map(k => ({
              ...k,
              x: (k.grid_x || 0) * GRID_SIZE,
              y: (k.grid_y || 0) * GRID_SIZE,
              width: (k.grid_width || 1) * GRID_SIZE,
              height: (k.grid_height || 1) * GRID_SIZE,
            })));
            return;
          }
          throw new Error('No rooms');
        })
        .catch(() => {
          setRooms(
            SAMPLE_ROOMS.map((r) => ({
              ...r,
              x: (r.grid_x || 0) * GRID_SIZE,
              y: (r.grid_y || 0) * GRID_SIZE,
              width: (r.grid_width || 1) * GRID_SIZE,
              height: (r.grid_height || 1) * GRID_SIZE,
            }))
          );
          setKiosks(
            SAMPLE_KIOSKS.map((k) => ({
              ...k,
              x: (k.grid_x || 0) * GRID_SIZE,
              y: (k.grid_y || 0) * GRID_SIZE,
              width: (k.grid_width || 2) * GRID_SIZE,
              height: (k.grid_height || 2) * GRID_SIZE,
            }))
          );
        });
      return;
    }

    const unsubRooms = onSnapshot(
      collection(db, "Rooms"),
      (snap) => {
        const loaded = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            type: "room",
            floor: data.floor || "Lantai 1",
            building: data.building || "Gedung A",
            name: data.name || "Tanpa Nama",
            name_en: data.name_en,
            x: (data.grid_x || 0) * GRID_SIZE,
            y: (data.grid_y || 0) * GRID_SIZE,
            width: (data.grid_width || 1) * GRID_SIZE,
            height: (data.grid_height || 1) * GRID_SIZE,
            endpoints: data.endpoints || ["bottom"],
            is_connector: data.is_connector || false,
            target_building: data.target_building || "",
          });
        });
        setRooms(loaded);
      },
      (err) => console.error("3D Gagal memuat ruangan:", err)
    );

    const unsubKiosks = onSnapshot(
      collection(db, "Kiosks"),
      (snap) => {
        const loaded = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            type: "kiosk",
            floor: data.floor || "Lantai 1",
            building: data.building || "Gedung A",
            name: data.name || "Kiosk",
            name_en: data.name_en,
            x: (data.grid_x || 0) * GRID_SIZE,
            y: (data.grid_y || 0) * GRID_SIZE,
            width: (data.grid_width || 2) * GRID_SIZE,
            height: (data.grid_height || 2) * GRID_SIZE,
            is_connector: data.is_connector || false,
            target_building: data.target_building || "",
          });
        });
        setKiosks(loaded);
      },
      (err) => console.error("3D Gagal memuat kiosk:", err)
    );

    return () => {
      unsubRooms();
      unsubKiosks();
    };
  }, []);

  const targetBuilding = (currentBuilding || "").trim();
  const targetFloor = (currentFloor || "").trim();

  const currentFloorRooms = useMemo(() => {
    const r = effectiveRooms.filter((room) => {
      const matchFloor = (room.floor || "").trim().toLowerCase() === targetFloor.toLowerCase();
      const matchBuilding = !targetBuilding || (room.building || "").trim().toLowerCase() === targetBuilding.toLowerCase();
      return matchFloor && matchBuilding;
    });
    const kAsR = effectiveKiosks.filter((kiosk) => {
      const matchFloor = (kiosk.floor || "").trim().toLowerCase() === targetFloor.toLowerCase();
      const matchBuilding = !targetBuilding || (kiosk.building || "").trim().toLowerCase() === targetBuilding.toLowerCase();
      return matchFloor && matchBuilding && kiosk.name?.toLowerCase().includes("pintu");
    });
    return [...r, ...kAsR];
  }, [effectiveRooms, effectiveKiosks, targetFloor, targetBuilding]);

  const currentFloorKiosks = useMemo(() => {
    return effectiveKiosks.filter((kiosk) => {
      const matchFloor = (kiosk.floor || "").trim().toLowerCase() === targetFloor.toLowerCase();
      const matchBuilding = !targetBuilding || (kiosk.building || "").trim().toLowerCase() === targetBuilding.toLowerCase();
      return matchFloor && matchBuilding && !kiosk.name?.toLowerCase().includes("pintu");
    });
  }, [effectiveKiosks, targetFloor, targetBuilding]);

  const selectedKioskData = useMemo(() => {
    if (!selectedKiosk) return null;
    return currentFloorKiosks.find((k) => k.id === selectedKiosk) || null;
  }, [selectedKiosk, currentFloorKiosks]);

  // Hitung Bounds & Center Offset
  const mapBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentFloorRooms.forEach((r) => {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    });
    currentFloorKiosks.forEach((k) => {
      minX = Math.min(minX, k.x);
      minY = Math.min(minY, k.y);
      maxX = Math.max(maxX, k.x + k.width);
      maxY = Math.max(maxY, k.y + k.height);
    });

    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000, centerX: 500, centerZ: 500 };
    const rawW = maxX - minX;
    const rawH = maxY - minY;
    // Padding fleksibel menyesuaikan besar gedung di 3D
    const pad = Math.max(50, Math.min(120, Math.round(Math.max(rawW, rawH) * 0.06)));
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: rawW + pad * 2,
      height: rawH + pad * 2,
      centerX: (minX + maxX) / 2,
      centerZ: (minY + maxY) / 2,
    };
  }, [currentFloorRooms, currentFloorKiosks]);

  // Kalkulasi jarak dan posisi kamera 3D adaptif yang fleksibel mengikuti besar ruangan / gedung
  const getIdealCameraPos = useCallback((bounds, angle) => {
    const bSpanX = Math.max(bounds?.width || 600, 200);
    const bSpanZ = Math.max(bounds?.height || 600, 200);
    const container = containerRef.current;
    const w = container ? (container.clientWidth || window.innerWidth) : window.innerWidth;
    const h = container ? (container.clientHeight || window.innerHeight) : window.innerHeight;
    const aspect = Math.max(0.2, w / h);
    const fovVRad = THREE.MathUtils.degToRad(40);
    const fovHRad = 2 * Math.atan(Math.tan(fovVRad / 2) * aspect);

    // Menghitung jarak kamera yang presisi agar denah gedung pas di layar
    const distX = (bSpanX / 2) / Math.tan(fovHRad / 2);
    const pitchAngleRad = THREE.MathUtils.degToRad(40);
    const distY = ((bSpanZ * Math.sin(pitchAngleRad) + 80) / 2) / Math.tan(fovVRad / 2);
    const idealDist = Math.max(distX, distY) * 1.25;
    const clampedDist = Math.max(380, Math.min(idealDist, 3500));

    if (angle === "top") {
      return {
        x: 0,
        y: Math.max(distX, distY) * 1.15,
        z: 1,
        dist: clampedDist,
      };
    } else {
      return {
        x: 0,
        y: clampedDist * Math.sin(pitchAngleRad),
        z: clampedDist * Math.cos(pitchAngleRad),
        dist: clampedDist,
      };
    }
  }, []);

  useEffect(() => {
    centerOffsetRef.current = {
      x: mapBounds.centerX,
      z: mapBounds.centerZ,
      centerX: mapBounds.centerX,
      centerZ: mapBounds.centerZ,
    };
  }, [mapBounds]);

  // Path Points 2D
  const fullPathPoints = useMemo(() => {
    const filtered = path.filter(
      (p) => (!p.floor || p.floor === currentFloor) && (!p.building || p.building === currentBuilding)
    );
    return filtered.flatMap((p) => [
      (p.x || 0) * GRID_SIZE + GRID_SIZE / 2,
      (p.y || 0) * GRID_SIZE + GRID_SIZE / 2,
    ]);
  }, [path, currentFloor, currentBuilding]);

  const activeStepPathPoints = useMemo(() => {
    if (!activeStepPath || activeStepPath.length === 0) return [];
    const filtered = activeStepPath.filter(
      (p) => (!p.floor || p.floor === currentFloor) && (!p.building || p.building === currentBuilding)
    );
    let pts = filtered.flatMap((p) => [
      (p.x || 0) * GRID_SIZE + GRID_SIZE / 2,
      (p.y || 0) * GRID_SIZE + GRID_SIZE / 2,
    ]);

    if (activeStepIndex === 0 && selectedKioskData && pts.length >= 2) {
      const idlePos = getIdlePosition(selectedKioskData, currentFloorRooms, currentFloorKiosks);
      let closestPoint = { x: pts[0], y: pts[1] };
      let closestDist = Infinity;
      let segIdx = 0;

      for (let i = 0; i < pts.length - 2; i += 2) {
        const x1 = pts[i], y1 = pts[i + 1], x2 = pts[i + 2], y2 = pts[i + 3];
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        let t = len2 > 0 ? ((idlePos.x - x1) * dx + (idlePos.y - y1) * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const px = x1 + t * dx, py = y1 + t * dy;
        const d2 = (idlePos.x - px) ** 2 + (idlePos.y - py) ** 2;
        if (d2 < closestDist) {
          closestDist = d2;
          closestPoint = { x: px, y: py };
          segIdx = i;
        }
      }

      const newPts = [idlePos.x, idlePos.y, closestPoint.x, closestPoint.y];
      for (let i = segIdx + 2; i < pts.length; i++) {
        newPts.push(pts[i]);
      }
      pts = newPts;
    }
    return pts;
  }, [activeStepPath, currentFloor, currentBuilding, activeStepIndex, selectedKioskData, currentFloorRooms, currentFloorKiosks]);

  // Inisialisasi Three.js Scene, Camera, Renderer, Controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(isDarkMode ? 0x090d16 : 0xf1f5f9);

    // Fog untuk depth atmosferik
    scene.fog = new THREE.FogExp2(isDarkMode ? 0x090d16 : 0xf1f5f9, 0.0007);

    // Camera (Perspective Isometric Style)
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 6000);
    cameraRef.current = camera;
    const initialCam = getIdealCameraPos(mapBounds, viewAngle);
    camera.position.set(initialCam.x, initialCam.y, initialCam.z);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Mencegah kamera tembus ke bawah lantai
    controls.minPolarAngle = 0.05;
    controls.minDistance = Math.max(60, initialCam.dist * 0.15);
    controls.maxDistance = Math.max(3000, initialCam.dist * 2.5);
    controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(isDarkMode ? 0x94a3b8 : 0xffffff, isDarkMode ? 0.75 : 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(
      isDarkMode ? 0x38bdf8 : 0xffffff,
      isDarkMode ? 0x090d16 : 0xe2e8f0,
      isDarkMode ? 0.45 : 0.5
    );
    hemiLight.position.set(0, 600, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(isDarkMode ? 0x60a5fa : 0xffffff, isDarkMode ? 0.9 : 1.1);
    dirLight.position.set(300, 650, 450);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 50;
    dirLight.shadow.camera.far = 2000;
    const d = 800;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Add Groups to Scene
    scene.add(groundGroupRef.current);
    scene.add(roomsGroupRef.current);
    scene.add(labelsGroupRef.current);
    scene.add(pathsGroupRef.current);
    scene.add(avatarGroupRef.current);

    // Create 3D Avatar Model
    const avatarGroup = avatarGroupRef.current;
    avatarGroup.clear();

    const charRoot = new THREE.Group();
    charRoot.name = "charRoot";

    // Torso
    const torsoGeo = new THREE.CylinderGeometry(4.5, 4, 10, 16);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.3,
      metalness: 0.2,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 11;
    torso.castShadow = true;
    charRoot.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(4.5, 20, 20);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffd1b3,
      roughness: 0.5,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 19;
    head.castShadow = true;
    charRoot.add(head);

    // Visor / Sunglasses
    const visorGeo = new THREE.BoxGeometry(6, 2, 2.5);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.8,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 19, 3.5);
    charRoot.add(visor);

    // Left & Right Foot
    const footGeo = new THREE.BoxGeometry(2.5, 2.5, 5);
    const footMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const leftFoot = new THREE.Mesh(footGeo, footMat);
    leftFoot.position.set(-2.5, 1.25, 0);
    leftFoot.castShadow = true;
    charRoot.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, footMat);
    rightFoot.position.set(2.5, 1.25, 0);
    rightFoot.castShadow = true;
    charRoot.add(rightFoot);

    // Waving Arm (pivot di bahu kanan)
    const armGroup = new THREE.Group();
    armGroup.position.set(5.5, 14, 0);
    const armGeo = new THREE.CylinderGeometry(1.2, 1.2, 7, 12);
    armGeo.translate(0, 3.5, 0);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.4 });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armGroup.add(armMesh);
    charRoot.add(armGroup);

    // Pulsing Ground Ring Beacon
    const ringGeo = new THREE.RingGeometry(8, 10.5, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.4;
    avatarGroup.add(ring);

    avatarGroup.add(charRoot);
    avatarPartsRef.current = {
      root: charRoot,
      leftFoot,
      rightFoot,
      armGroup,
      ring,
    };
    avatarGroup.visible = false;

    // Animation Loop
    let lastTime = performance.now();
    const animate = (time) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const deltaSec = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      controls.update();

      // Animasi Floating Ground Ring di avatar
      if (avatarPartsRef.current.ring && avatarGroup.visible) {
        const pulse = Math.sin(time * 0.005) * 0.2 + 0.9;
        avatarPartsRef.current.ring.scale.set(pulse, pulse, pulse);
      }

      // Animasi Avatar Berjalan / Waving
      const phase = animPhaseRef.current;
      const pts = activeStepPathPointsRef.current;
      const totalLen = pts.length >= 4 ? getTotalPathLength(pts) : 0;
      const { root, leftFoot: lf, rightFoot: rf, armGroup: ag } = avatarPartsRef.current;

      if (phase === "waving" && ag) {
        ag.rotation.z = Math.sin(time * 0.008) * 0.4 - 0.4;
        if (lf && rf) {
          lf.position.z = 0;
          rf.position.z = 0;
        }
      } else if (phase === "walking" && pts && pts.length >= 4 && root) {
        let currentWalkSpeed = WALK_SPEED;
        const currentStep = navigationStepsRef.current[activeStepIndexRef.current];
        if (currentStep && currentStep.teks) {
          const estimatedSpeechMs = Math.max((currentStep.teks.length / 17) * 1000, 2000);
          const walkDurationSec = Math.max((estimatedSpeechMs - ROTATION_DURATION) / 1000, 1);
          if (totalLen > 0) currentWalkSpeed = totalLen / walkDurationSec;
        }

        walkedDistanceRef.current = Math.min(
          walkedDistanceRef.current + currentWalkSpeed * deltaSec,
          totalLen
        );

        const dist = walkedDistanceRef.current;
        const isMoving = dist < totalLen;
        const { x, y, angle } = getPointAtDistance(pts, dist);

        // Map ke koordinat 3D
        const worldX = x - centerOffsetRef.current.x;
        const worldZ = y - centerOffsetRef.current.z;
        avatarGroup.position.set(worldX, 0, worldZ);

        // Rotasi Avatar menghadap ke arah jalan
        const rad = (-angle * Math.PI) / 180 + Math.PI / 2;
        root.rotation.y = rad;

        // Ayunan Kaki
        if (lf && rf) {
          const swing = isMoving ? Math.sin(time * 0.012) * 3 : 0;
          lf.position.z = swing;
          rf.position.z = -swing;
        }
        if (ag) ag.rotation.z = 0;

        // Smooth Camera Follow jika diaktifkan
        if (isFollowingAvatarRef.current && isMoving) {
          controls.target.lerp(new THREE.Vector3(worldX, 0, worldZ), 0.05);
        }

        if (!isMoving) {
          const nextPts = nextStepPathPointsRef.current;
          if (nextPts && nextPts.length >= 4) {
            animPhaseRef.current = "pre-rotating";
            rotateStartTimeRef.current = time;
            rotateFromAngleRef.current = root.rotation.y;
            const nextDir = getPointAtDistance(nextPts, 0);
            rotateToAngleRef.current = (-nextDir.angle * Math.PI) / 180 + Math.PI / 2;
          } else {
            animPhaseRef.current = "waving";
          }
        }
      } else if (phase === "pre-rotating" && root) {
        const elapsed = time - rotateStartTimeRef.current;
        const progress = Math.min(elapsed / ROTATION_DURATION, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        let diff = rotateToAngleRef.current - rotateFromAngleRef.current;
        diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        root.rotation.y = rotateFromAngleRef.current + diff * ease;
      }

      renderer.render(scene, camera);
    };
    animFrameIdRef.current = requestAnimationFrame(animate);

    // Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDarkMode]);

  // Update Scene Theme Background & Lighting
  useEffect(() => {
    if (!sceneRef.current) return;
    const bgCol = isDarkMode ? 0x090d16 : 0xf1f5f9;
    sceneRef.current.background = new THREE.Color(bgCol);
    if (sceneRef.current.fog) sceneRef.current.fog.color = new THREE.Color(bgCol);
  }, [isDarkMode]);

  // Sync Animation Persistent Refs
  const activeStepPathPointsRef = useRef([]);
  const nextStepPathPointsRef = useRef([]);
  const activeStepIndexRef = useRef(0);
  const navigationStepsRef = useRef([]);
  const isFollowingAvatarRef = useRef(isFollowingAvatar);

  useEffect(() => {
    activeStepPathPointsRef.current = activeStepPathPoints;
  }, [activeStepPathPoints]);

  useEffect(() => {
    nextStepPathPointsRef.current = nextStepPath
      ? nextStepPath
        .filter((p) => (!p.floor || p.floor === currentFloor) && (!p.building || p.building === currentBuilding))
        .flatMap((p) => [(p.x || 0) * GRID_SIZE + GRID_SIZE / 2, (p.y || 0) * GRID_SIZE + GRID_SIZE / 2])
      : [];
  }, [nextStepPath, currentFloor, currentBuilding]);

  useEffect(() => {
    activeStepIndexRef.current = activeStepIndex;
  }, [activeStepIndex]);

  useEffect(() => {
    navigationStepsRef.current = navigationSteps;
  }, [navigationSteps]);

  useEffect(() => {
    isFollowingAvatarRef.current = isFollowingAvatar;
  }, [isFollowingAvatar]);

  // Render Base Floor Slab (Ground Platform)
  useEffect(() => {
    const groundGroup = groundGroupRef.current;
    groundGroup.clear();

    const { width, height } = mapBounds;
    const slabW = width + 100;
    const slabH = height + 100;

    // Floor Slab Mesh
    const slabGeo = new THREE.BoxGeometry(slabW, 8, slabH);
    const slabMat = new THREE.MeshStandardMaterial({
      color: isDarkMode ? 0x0f172a : 0xffffff,
      roughness: 0.6,
      metalness: 0.1,
    });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.set(0, -4.1, 0);
    slabMesh.receiveShadow = true;
    groundGroup.add(slabMesh);

    // Border Frame di sekeliling lantai
    const borderEdges = new THREE.EdgesGeometry(slabGeo);
    const borderMat = new THREE.LineBasicMaterial({
      color: isDarkMode ? 0x38bdf8 : 0x1a73c8,
      linewidth: 2,
    });
    const borderLines = new THREE.LineSegments(borderEdges, borderMat);
    borderLines.position.copy(slabMesh.position);
    groundGroup.add(borderLines);

    // Subtle 3D Grid Lines di atas lantai
    const gridHelper = new THREE.GridHelper(
      Math.max(slabW, slabH),
      Math.round(Math.max(slabW, slabH) / GRID_SIZE),
      isDarkMode ? 0x334155 : 0xe2e8f0,
      isDarkMode ? 0x1e293b : 0xf1f5f9
    );
    gridHelper.position.y = 0.05;
    groundGroup.add(gridHelper);
  }, [mapBounds, isDarkMode]);

  // Render 3D Rooms & Kiosks & Label Badges
  useEffect(() => {
    const roomsGroup = roomsGroupRef.current;
    const labelsGroup = labelsGroupRef.current;
    roomsGroup.clear();
    labelsGroup.clear();

    const { centerX, centerZ } = mapBounds;

    const allBlocks = [
      ...currentFloorRooms.map((r) => ({ ...r, isKiosk: false })),
      ...currentFloorKiosks.map((k) => ({ ...k, isKiosk: true })),
    ];

    console.log("3D Map Render: allBlocks =", allBlocks.length, "centerX =", centerX, "centerZ =", centerZ, "bounds =", mapBounds);

    allBlocks.forEach((item) => {
      const isPintu = item.is_connector || item.name?.toLowerCase().includes("pintu");
      const isLift = item.name?.toLowerCase().includes("lift");
      const isStairs = item.name?.toLowerCase().includes("tangga") || item.name?.toLowerCase().includes("stairs");
      const isKiosk = item.isKiosk;

      let color = isDarkMode ? 0x1e293b : 0xf8fafc;
      let emissive = 0x000000;
      let typeBadgeColor = isDarkMode ? "#64748b" : "#94a3b8";

      if (isKiosk) {
        color = 0x3b82f6;
        emissive = 0x1d4ed8;
        typeBadgeColor = "#3b82f6";
      } else if (isPintu) {
        color = 0x22c55e;
        emissive = 0x15803d;
        typeBadgeColor = "#22c55e";
      } else if (isLift) {
        color = 0xa855f7;
        emissive = 0x7e22ce;
        typeBadgeColor = "#a855f7";
      } else if (isStairs) {
        color = 0xf97316;
        emissive = 0xc2410c;
        typeBadgeColor = "#f97316";
      }

      const w = Math.max(item.width - 2, 4);
      const d = Math.max(item.height - 2, 4);
      const h = isKiosk ? WALL_HEIGHT * 0.75 : WALL_HEIGHT;

      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: isKiosk || isLift || isStairs || isPintu ? 0.3 : 0.45,
        metalness: 0.15,
        transparent: true,
        opacity: isKiosk || isLift || isStairs || isPintu ? 0.95 : 0.88,
        emissive: new THREE.Color(emissive),
        emissiveIntensity: isDarkMode ? 0.25 : 0.1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      const posX = item.x + item.width / 2 - centerX;
      const posZ = item.y + item.height / 2 - centerZ;
      mesh.position.set(posX, h / 2, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { room: item, originalColor: color, originalY: h / 2 };

      // Edges highlight
      const edges = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: isDarkMode ? 0x475569 : 0xcbd5e1,
      });
      const edgeLine = new THREE.LineSegments(edges, edgeMat);
      mesh.add(edgeLine);

      roomsGroup.add(mesh);

      // Label Badge Sprite melayang di atas ruangan
      let displayName = getDisplayNodeName(item, language);
      if (!displayName) displayName = translateName(isKiosk ? "Kiosk" : "Tanpa Nama", language);

      const sprite = createRoomBadgeSprite(displayName, typeBadgeColor, isDarkMode);
      sprite.position.set(posX, h + 10, posZ);
      labelsGroup.add(sprite);
    });
  }, [currentFloorRooms, currentFloorKiosks, mapBounds, isDarkMode, language]);

  // Render 3D Path Lines (Glowing Neon Route)
  useEffect(() => {
    const pathsGroup = pathsGroupRef.current;
    pathsGroup.clear();

    const { centerX, centerZ } = mapBounds;

    // 1. Rute Lengkap (Full Path) — Jalur dasar bercahaya lembut
    if (fullPathPoints.length >= 4) {
      const fullCurvePoints = [];
      for (let i = 0; i < fullPathPoints.length - 1; i += 2) {
        fullCurvePoints.push(
          new THREE.Vector3(fullPathPoints[i] - centerX, PATH_HEIGHT, fullPathPoints[i + 1] - centerZ)
        );
      }
      if (fullCurvePoints.length >= 2) {
        const fullCurve = new THREE.CatmullRomCurve3(fullCurvePoints, false, "catmullrom", 0);
        const fullTubeGeo = new THREE.TubeGeometry(fullCurve, fullCurvePoints.length * 6, 2.8, 8, false);
        const fullTubeMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
        });
        const fullTubeMesh = new THREE.Mesh(fullTubeGeo, fullTubeMat);
        pathsGroup.add(fullTubeMesh);
      }
    }

    // 2. Rute Langkah Aktif (Active Step Path) — Neon menyala terang dengan penanda tujuan
    if (activeStepPathPoints.length >= 4) {
      const activeCurvePoints = [];
      for (let i = 0; i < activeStepPathPoints.length - 1; i += 2) {
        activeCurvePoints.push(
          new THREE.Vector3(activeStepPathPoints[i] - centerX, PATH_HEIGHT + 0.8, activeStepPathPoints[i + 1] - centerZ)
        );
      }
      if (activeCurvePoints.length >= 2) {
        const activeCurve = new THREE.CatmullRomCurve3(activeCurvePoints, false, "catmullrom", 0);
        const activeTubeGeo = new THREE.TubeGeometry(activeCurve, activeCurvePoints.length * 8, 3.8, 12, false);
        const activeTubeMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xff0055,
          emissiveIntensity: 0.8,
          roughness: 0.2,
        });
        const activeTubeMesh = new THREE.Mesh(activeTubeGeo, activeTubeMat);
        pathsGroup.add(activeTubeMesh);

        // Marker Titik Tujuan (Destination Beacon di akhir rute)
        const lastPt = activeCurvePoints[activeCurvePoints.length - 1];
        const destGeo = new THREE.CylinderGeometry(0.1, 7, 16, 24);
        destGeo.rotateX(Math.PI);
        const destMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xff0044,
          emissiveIntensity: 0.7,
        });
        const destMesh = new THREE.Mesh(destGeo, destMat);
        destMesh.position.set(lastPt.x, 18, lastPt.z);
        pathsGroup.add(destMesh);
      }
    }
  }, [fullPathPoints, activeStepPathPoints, mapBounds]);

  // Set Posisi Avatar Saat Kiosk Dipilih / Navigasi Berjalan
  useEffect(() => {
    const avatarGroup = avatarGroupRef.current;
    if (!avatarGroup) return;

    if (!selectedKioskData && activeStepPathPoints.length < 4) {
      avatarGroup.visible = false;
      animPhaseRef.current = "idle";
      return;
    }

    avatarGroup.visible = true;
    const { centerX, centerZ } = mapBounds;

    if (activeStepPathPoints.length >= 4) {
      // Mulai Animasi Berjalan
      walkedDistanceRef.current = 0;
      animPhaseRef.current = "walking";
      walkStartTimeRef.current = performance.now();
      const p0 = getPointAtDistance(activeStepPathPoints, 0);
      avatarGroup.position.set(p0.x - centerX, 0, p0.y - centerZ);
    } else if (selectedKioskData) {
      // Posisi Idle di samping kiosk
      const idlePos = getIdlePosition(selectedKioskData, currentFloorRooms, currentFloorKiosks);
      avatarGroup.position.set(idlePos.x - centerX, 0, idlePos.y - centerZ);
      animPhaseRef.current = "waving";
      if (avatarPartsRef.current.root) {
        avatarPartsRef.current.root.rotation.y = 0;
      }
    }
  }, [selectedKioskData, activeStepPathPoints, currentFloorRooms, currentFloorKiosks, mapBounds]);

  // Raycasting Pointer / Click Handlers
  const handlePointerDown = (e) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
    // Jika user sedang drag/orbit peta (> 5px), abaikan klik ruangan
    if (dx > 6 || dy > 6) return;

    const container = containerRef.current;
    if (!container || !cameraRef.current || !onRoomClick) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera({ x: mouseX, y: mouseY }, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(roomsGroupRef.current.children, false);

    if (intersects.length > 0) {
      const hitRoom = intersects[0].object.userData.room;
      if (hitRoom) {
        onRoomClick(hitRoom, { evt: { clientX: e.clientX, clientY: e.clientY } });
      }
    }
  };

  const handlePointerMove = (e) => {
    const container = containerRef.current;
    if (!container || !cameraRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera({ x: mouseX, y: mouseY }, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(roomsGroupRef.current.children, false);

    if (intersects.length > 0) {
      container.style.cursor = "pointer";
      const targetMesh = intersects[0].object;
      if (hoveredRoomRef.current !== targetMesh) {
        if (hoveredRoomRef.current) {
          hoveredRoomRef.current.position.y = hoveredRoomRef.current.userData.originalY;
        }
        hoveredRoomRef.current = targetMesh;
        targetMesh.position.y = targetMesh.userData.originalY + 3;
      }
    } else {
      container.style.cursor = "default";
      if (hoveredRoomRef.current) {
        hoveredRoomRef.current.position.y = hoveredRoomRef.current.userData.originalY;
        hoveredRoomRef.current = null;
      }
    }
  };

  // Otomatis sesuaikan posisi kamera default saat denah lantai, gedung, atau ukuran ruangan berubah
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const ideal = getIdealCameraPos(mapBounds, viewAngle);
    cameraRef.current.position.set(ideal.x, ideal.y, ideal.z);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.maxDistance = Math.max(3000, ideal.dist * 2.5);
    controlsRef.current.minDistance = Math.max(60, ideal.dist * 0.15);
    controlsRef.current.update();
  }, [mapBounds, viewAngle, targetFloor, targetBuilding, getIdealCameraPos]);

  // Reset Camera View Helper
  const handleResetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    controlsRef.current.target.set(0, 0, 0);
    const ideal = getIdealCameraPos(mapBounds, viewAngle);
    cameraRef.current.position.set(ideal.x, ideal.y, ideal.z);
    controlsRef.current.update();
  }, [mapBounds, viewAngle, getIdealCameraPos]);

  // Toggle View Angle (Isometric vs Top-down)
  const toggleViewAngle = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    controlsRef.current.target.set(0, 0, 0);
    const nextAngle = viewAngle === "isometric" ? "top" : "isometric";
    setViewAngle(nextAngle);
    const ideal = getIdealCameraPos(mapBounds, nextAngle);
    cameraRef.current.position.set(ideal.x, ideal.y, ideal.z);
    controlsRef.current.update();
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
        }}
      />

      {/* Floating 3D Controls Bar */}
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 40,
        }}
      >
        {/* Toggle Follow Avatar */}
        {activeStepPathPoints.length >= 4 && (
          <button
            onClick={() => setIsFollowingAvatar((prev) => !prev)}
            style={{
              padding: "10px 14px",
              background: isFollowingAvatar
                ? "var(--blue-primary, #1A73C8)"
                : isDarkMode
                  ? "rgba(30, 41, 59, 0.85)"
                  : "rgba(255, 255, 255, 0.9)",
              color: isFollowingAvatar ? "#ffffff" : isDarkMode ? "#f8fafc" : "#1e293b",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "12px",
              backdropFilter: "blur(12px)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            title={language === "id" ? "Kamera otomatis ikuti avatar" : "Auto follow avatar"}
          >
            <span>{isFollowingAvatar ? (language === "id" ? "Ikuti Avatar ON" : "Follow ON") : (language === "id" ? "Ikuti Avatar" : "Follow")}</span>
          </button>
        )}

        {/* Toggle Angle (Isometric / Top) */}
        <button
          onClick={toggleViewAngle}
          style={{
            padding: "10px 14px",
            background: isDarkMode ? "rgba(30, 41, 59, 0.85)" : "rgba(255, 255, 255, 0.9)",
            color: isDarkMode ? "#f8fafc" : "#1e293b",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "12px",
            backdropFilter: "blur(12px)",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease",
          }}
          title={language === "id" ? "Ganti Sudut Pandang" : "Toggle View Angle"}
        >
          <span>{viewAngle === "isometric" ? "Sudut 3D" : "Tampak Atas"}</span>
        </button>

        {/* Reset Camera Button */}
        <button
          onClick={handleResetCamera}
          style={{
            padding: "10px 14px",
            background: isDarkMode ? "rgba(30, 41, 59, 0.85)" : "rgba(255, 255, 255, 0.9)",
            color: isDarkMode ? "#f8fafc" : "#1e293b",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "12px",
            backdropFilter: "blur(12px)",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease",
          }}
          title={language === "id" ? "Reset posisi kamera" : "Reset Camera"}
        >
          <span>{language === "id" ? "Pusatkan Peta" : "Center Map"}</span>
        </button>
      </div>

      {/* Floating Info Guide Badge */}
      <div
        style={{
          position: "absolute",
          top: "70px",
          right: "24px",
          background: isDarkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.85)",
          color: isDarkMode ? "#94a3b8" : "#64748b",
          border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: "20px",
          padding: "6px 14px",
          fontSize: "11px",
          fontWeight: "500",
          backdropFilter: "blur(8px)",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <span>🖱️ Putar: Klik Kiri | Geser: Klik Kanan | Zoom: Scroll</span>
      </div>
    </div>
  );
}
