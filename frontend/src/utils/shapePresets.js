/**
 * shapePresets.js
 * Utilitas untuk menghasilkan koordinat titik sudut (vertices) untuk berbagai bentuk layout
 * seperti Kotak, Bentuk L, Setengah Lingkaran, Lingkaran, Trapesium, dan Poligon Bebas.
 */

export const SHAPE_TYPES = [
  { id: 'rect', label: 'Kotak', icon: '⬛', desc: 'Persegi panjang standar' },
  { id: 'circle', label: 'Lingkaran', icon: '⚪', desc: 'Atrium / booth bulat' },
  { id: 'semicircle', label: '1/2 Lingkaran', icon: '🌓', desc: 'Panggung / kubah lengkung' },
  { id: 't_shape', label: 'Bentuk T', icon: '┳', desc: 'Ruangan bersayap' },
  { id: 'l_shape', label: 'Bentuk L', icon: '📐', desc: 'Ruangan sudut menyiku' },
  { id: 'polygon', label: 'Bebas', icon: '✏️', desc: 'Poligon kustom titik bebas' },
];

/**
 * Menghasilkan array relatif [x0, y0, x1, y1, ...] untuk bentuk preset tertentu.
 */
export function getPresetPoints(shapeType, width, height, gridSize = 25) {
  const w = Math.max(gridSize * 2, width || gridSize * 4);
  const h = Math.max(gridSize * 2, height || gridSize * 4);
  const snap = (v) => Math.max(gridSize, Math.round(v / gridSize) * gridSize);

  switch (shapeType) {
    case 'l_shape': {
      const midW = snap(w * 0.5);
      const midH = snap(h * 0.5);
      return [
        0, 0,
        midW, 0,
        midW, midH,
        w, midH,
        w, h,
        0, h
      ];
    }
    case 't_shape': {
      const leftW = snap(w * 0.3);
      const rightW = snap(w * 0.7);
      const topH = snap(h * 0.4);
      return [
        0, 0,
        w, 0,
        w, topH,
        rightW, topH,
        rightW, h,
        leftW, h,
        leftW, topH,
        0, topH
      ];
    }
    case 'u_shape': {
      const leftW = snap(w * 0.3);
      const rightW = snap(w * 0.7);
      const botH = snap(h * 0.6);
      return [
        0, 0,
        leftW, 0,
        leftW, botH,
        rightW, botH,
        rightW, 0,
        w, 0,
        w, h,
        0, h
      ];
    }
    case 'semicircle': {
      // Setengah lingkaran lengkung ke atas dengan dasar datar di bawah
      const pts = [0, h];
      const segments = 12;
      const rx = w / 2;
      const ry = h;
      const cx = w / 2;
      for (let i = 0; i <= segments; i++) {
        const rad = Math.PI - (i / segments) * Math.PI; // pi -> 0
        const px = Math.round(cx + rx * Math.cos(rad));
        const py = Math.round(h - ry * Math.sin(rad));
        pts.push(px, py);
      }
      pts.push(w, h, 0, h);
      return cleanPolygonPoints(pts);
    }
    case 'circle': {
      // Poligon 16 titik membentuk lingkaran/oval halus
      const pts = [];
      const segments = 16;
      const rx = w / 2;
      const ry = h / 2;
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < segments; i++) {
        const rad = (i / segments) * 2 * Math.PI;
        pts.push(
          Math.round(cx + rx * Math.cos(rad)),
          Math.round(cy + ry * Math.sin(rad))
        );
      }
      return cleanPolygonPoints(pts);
    }
    case 'trapezoid': {
      const inset = snap(w * 0.25);
      return [
        inset, 0,
        w - inset, 0,
        w, h,
        0, h
      ];
    }
    case 'polygon': {
      // Default bentuk L untuk awal poligon bebas jika belum ada
      const midW = snap(w * 0.5);
      const midH = snap(h * 0.5);
      return [
        0, 0,
        midW, 0,
        midW, midH,
        w, midH,
        w, h,
        0, h
      ];
    }
    default:
      return [0, 0, w, 0, w, h, 0, h];
  }
}

/**
 * Menghapus titik-titik berturut-turut yang duplikat
 */
export function cleanPolygonPoints(pts) {
  const result = [];
  for (let i = 0; i < pts.length; i += 2) {
    if (result.length >= 2) {
      const prevX = result[result.length - 2];
      const prevY = result[result.length - 1];
      if (Math.abs(prevX - pts[i]) < 0.5 && Math.abs(prevY - pts[i + 1]) < 0.5) {
        continue;
      }
    }
    result.push(pts[i], pts[i + 1]);
  }
  return result;
}

/**
 * Menormalisasi koordinat poligon agar bounding box selalu berada di titik (x, y)
 * dan seluruh titik relatif bernilai >= 0.
 */
export function normalizePolygonPoints(points, x, y, gridSize = 25) {
  if (!points || points.length < 6) {
    return { points, x, y, width: gridSize, height: gridSize };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxX = Math.max(maxX, points[i]);
    maxY = Math.max(maxY, points[i + 1]);
  }

  const shiftX = minX;
  const shiftY = minY;

  const adjustedPoints = points.map((p, idx) => {
    return idx % 2 === 0 ? p - shiftX : p - shiftY;
  });

  const width = Math.max(gridSize, maxX - minX);
  const height = Math.max(gridSize, maxY - minY);

  return {
    points: adjustedPoints,
    x: x + shiftX,
    y: y + shiftY,
    width,
    height
  };
}
