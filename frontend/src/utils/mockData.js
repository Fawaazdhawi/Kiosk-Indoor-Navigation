export const SAMPLE_ROOMS = [
  {
    id: "room_1",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Lobby Utama",
    name_en: "Main Lobby",
    grid_x: 2,
    grid_y: 2,
    grid_width: 8,
    grid_height: 6,
    endpoints: ["bottom"],
    is_connector: false
  },
  {
    id: "room_2",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Ruang Informasi",
    name_en: "Information Center",
    grid_x: 12,
    grid_y: 2,
    grid_width: 6,
    grid_height: 6,
    endpoints: ["bottom"],
    is_connector: false
  },
  {
    id: "room_3",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Ruang Seminar A",
    name_en: "Seminar Room A",
    grid_x: 20,
    grid_y: 2,
    grid_width: 10,
    grid_height: 8,
    endpoints: ["bottom"],
    is_connector: false
  },
  {
    id: "room_4",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Laboratorium Komputer",
    name_en: "Computer Lab",
    grid_x: 2,
    grid_y: 12,
    grid_width: 10,
    grid_height: 8,
    endpoints: ["top"],
    is_connector: false
  },
  {
    id: "room_5",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Perpustakaan",
    name_en: "Library",
    grid_x: 14,
    grid_y: 12,
    grid_width: 12,
    grid_height: 8,
    endpoints: ["top"],
    is_connector: false
  },
  {
    id: "room_pintu",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Pintu Masuk Utama",
    name_en: "Main Entrance",
    grid_x: 6,
    grid_y: 9,
    grid_width: 4,
    grid_height: 2,
    endpoints: ["top", "bottom"],
    is_connector: true
  },
  {
    id: "room_lift",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Lift Lantai 1",
    name_en: "Elevator Floor 1",
    grid_x: 28,
    grid_y: 12,
    grid_width: 4,
    grid_height: 4,
    endpoints: ["left"],
    is_connector: true
  },
  {
    id: "room_tangga",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Tangga Darurat",
    name_en: "Emergency Stairs",
    grid_x: 28,
    grid_y: 3,
    grid_width: 4,
    grid_height: 4,
    endpoints: ["left"],
    is_connector: true
  }
];

export const SAMPLE_KIOSKS = [
  {
    id: "kiosk_lobby",
    type: "kiosk",
    floor: "Lantai 1",
    building: "Gedung A",
    name: "Kiosk Informasi",
    name_en: "Info Kiosk",
    grid_x: 10,
    grid_y: 9,
    grid_width: 2,
    grid_height: 2,
    is_connector: false
  }
];

export const SAMPLE_PATH = [
  { x: 10, y: 10, floor: "Lantai 1", building: "Gedung A" },
  { x: 10, y: 11, floor: "Lantai 1", building: "Gedung A" },
  { x: 13, y: 11, floor: "Lantai 1", building: "Gedung A" },
  { x: 18, y: 11, floor: "Lantai 1", building: "Gedung A" },
  { x: 20, y: 11, floor: "Lantai 1", building: "Gedung A" },
  { x: 20, y: 10, floor: "Lantai 1", building: "Gedung A" }
];
