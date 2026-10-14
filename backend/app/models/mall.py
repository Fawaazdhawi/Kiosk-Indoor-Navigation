from sqlalchemy import Column, String, Integer, Boolean, Text, JSON, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from app.core.database import Base

class Floor(Base):
    __tablename__ = "floors"

    id = Column(String(50), primary_key=True, index=True)         # misal: "GF", "L1", "L2", "L3"
    building = Column(String(100), default="Mall Utama", index=True)
    name = Column(String(100), nullable=False)                    # "Ground Floor", "Lantai 1"
    floor_level = Column(Integer, default=1)                      # 0, 1, 2 (urutan ketinggian 3D)
    grid_width = Column(Integer, default=80)
    grid_height = Column(Integer, default=80)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(50), primary_key=True, index=True)         # "STORE_STARBUCKS_GF"
    name = Column(String(150), nullable=False, index=True)        # "Starbucks Reserve"
    name_en = Column(String(150), nullable=True)                  # "Starbucks Reserve"
    category = Column(String(50), nullable=False, index=True)     # "F&B", "Fashion", "Gadget", "Cinema"
    sub_category = Column(String(100), nullable=True)             # "Cafe & Bakery", "Apparel"
    unit_number = Column(String(30), nullable=True)               # "GF-05"
    building = Column(String(100), default="Mall Utama", index=True)
    floor = Column(String(50), nullable=False, index=True)        # "Ground Floor", "Lantai 1"
    
    # Koordinat Denah Grid 2D & 3D WebGL
    grid_x = Column(Integer, nullable=False)
    grid_y = Column(Integer, nullable=False)
    grid_width = Column(Integer, default=4)
    grid_height = Column(Integer, default=4)
    endpoints = Column(JSON, default=["bottom"])                  # ["top", "bottom", "left", "right"]
    
    # Deskripsi & Pencarian NLP/AI
    description = Column(Text, nullable=True)
    keywords = Column(JSON, default=[])                           # ["kopi", "espresso", "frappuccino", "croissant"]
    logo_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(String(50), primary_key=True, index=True)         # "TOILET_GF_NORTH"
    name = Column(String(100), nullable=False, index=True)        # "Toilet Pria & Wanita"
    name_en = Column(String(100), nullable=True)                  # "Restroom"
    facility_type = Column(String(50), nullable=False, index=True)# "toilet", "musholla", "nursery", "atm", "customer_service", "elevator", "escalator"
    building = Column(String(100), default="Mall Utama")
    floor = Column(String(50), nullable=False, index=True)        # "Ground Floor"
    
    grid_x = Column(Integer, nullable=False)
    grid_y = Column(Integer, nullable=False)
    grid_width = Column(Integer, default=2)
    grid_height = Column(Integer, default=2)
    endpoints = Column(JSON, default=["bottom"])
    
    # Penghubung antar lantai (Lift / Eskalator)
    is_connector = Column(Boolean, default=False)
    connector_group = Column(String(50), nullable=True)           # "LIFT_UTAMA", "ESKALATOR_CENTRAL"
    target_building = Column(String(100), nullable=True)
    is_accessible = Column(Boolean, default=True)                 # Ramah disabilitas / kursi roda
    
    keywords = Column(JSON, default=[])

class Kiosk(Base):
    __tablename__ = "kiosks"

    id = Column(String(50), primary_key=True, index=True)         # "KIOSK_LOBBY_UTAMA"
    name = Column(String(100), nullable=False)                    # "Kiosk Lobby Utama GF"
    building = Column(String(100), default="Mall Utama")
    floor = Column(String(50), nullable=False, index=True)        # "Ground Floor"
    
    grid_x = Column(Integer, nullable=False)
    grid_y = Column(Integer, nullable=False)
    grid_width = Column(Integer, default=1)
    grid_height = Column(Integer, default=1)
    endpoints = Column(JSON, default=["bottom"])
    
    is_locked = Column(Boolean, default=False)
    last_ping = Column(DateTime(timezone=True), nullable=True)

class SearchAnalytics(Base):
    __tablename__ = "search_analytics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    kiosk_id = Column(String(50), nullable=True)
    query_text = Column(String(255), nullable=False)
    matched_target_id = Column(String(50), nullable=True)
    matched_target_name = Column(String(150), nullable=True)
    searched_at = Column(DateTime(timezone=True), server_default=func.now())
