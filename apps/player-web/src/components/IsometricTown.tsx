import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, TownLocationId } from '@goal/shared-types';
import { sound } from '../audio/soundSynth';
import { useGameStore } from '../store/gameStore';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Footprints,
} from 'lucide-react';

interface IsometricTownProps {
  state?: GameState;
  onSelectLocation?: (loc: TownLocationId) => void;
}

// Map base coordinate constants (2560 x 1440 HD world)
const MAP_BASE_WIDTH = 2560;
const MAP_BASE_HEIGHT = 1440;

// Coordinates on the 2560x1440 map in percentages
const LOCATION_COORDINATES: Record<string, { x: number; y: number; name: string; icon: string }> = {
  HOME: { x: 24, y: 58, name: 'Mein Zuhause', icon: '🏠' },
  SCHOOL_UNI: { x: 72, y: 16, name: 'Schule & Uni-Campus', icon: '🎓' },
  BANK: { x: 39, y: 61, name: 'Sparkasse', icon: '🏦' },
  INSURANCE_OFFICE: { x: 69, y: 63, name: 'Versicherungsbüro', icon: '🛡️' },
  WORK: { x: 86, y: 74, name: 'Arbeitsplatz & Werkstatt', icon: '💼' },
  MARKET: { x: 50, y: 53, name: 'Markt & Bäcker', icon: '🥨' },
  PARK_SHRINE: { x: 56, y: 72, name: 'Stadtpark & Biergarten', icon: '🌳' },
  CENTER: { x: 50, y: 49, name: 'Stadtzentrum', icon: '🧍' },
};

// Preset camera positions for districts in world pixel offsets
const DISTRICT_PRESETS: Record<string, { panX: number; panY: number; label: string; icon: string }> = {
  HOME: { panX: 580, panY: -120, label: 'Zuhause', icon: '🏠' },
  SCHOOL_UNI: { panX: -560, panY: 440, label: 'Campus', icon: '🎓' },
  BANK: { panX: 280, panY: -150, label: 'Sparkasse', icon: '🏦' },
  INSURANCE_OFFICE: { panX: -450, panY: -180, label: 'Versicherungsbüro', icon: '🛡️' },
  WORK: { panX: -880, panY: -340, label: 'Arbeit', icon: '💼' },
  MARKET: { panX: 0, panY: -20, label: 'Markt', icon: '🥨' },
  PARK_SHRINE: { panX: -150, panY: -320, label: 'Stadtpark', icon: '🌳' },
  CENTER: { panX: 0, panY: 0, label: 'Zentrum', icon: '🧍' },
};

export const IsometricTown: React.FC<IsometricTownProps> = ({
  state: propState,
  onSelectLocation: propOnSelectLocation,
}) => {
  const storeState = useGameStore((s) => s.gameState);
  const setActiveModal = useGameStore((s) => s.setActiveModal);

  const state = propState || storeState;
  const onSelectLocation = propOnSelectLocation || setActiveModal;

  const [hoveredBuilding, setHoveredBuilding] = useState<TownLocationId | null>(null);
  const [speechText, setSpeechText] = useState<string>('Bereit für neue Entscheidungen!');

  // Player Avatar Position & Walking State
  const [avatarPos, setAvatarPos] = useState<{ x: number; y: number }>({ x: 50, y: 49 });
  const [isWalking, setIsWalking] = useState<boolean>(false);

  // Zoom & Pan state (pan in pixels relative to center)
  const [zoom, setZoom] = useState<number>(0.95);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const travelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mouse drag-to-pan state
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Calculate pan clamp boundaries so map edges NEVER show empty space
  const clampPan = useCallback(
    (targetX: number, targetY: number, targetZoom: number) => {
      const container = viewportRef.current;
      if (!container) return { x: targetX, y: targetY };

      const vw = container.clientWidth;
      const vh = container.clientHeight;

      const effectiveWidth = MAP_BASE_WIDTH * targetZoom;
      const effectiveHeight = MAP_BASE_HEIGHT * targetZoom;

      const maxPanX = Math.max(0, (effectiveWidth - vw) / 2);
      const maxPanY = Math.max(0, (effectiveHeight - vh) / 2);

      const clampedX = Math.max(-maxPanX, Math.min(maxPanX, targetX));
      const clampedY = Math.max(-maxPanY, Math.min(maxPanY, targetY));

      return { x: clampedX, y: clampedY };
    },
    []
  );

  // Re-clamp on window resize or zoom change
  useEffect(() => {
    const handleResize = () => {
      const clamped = clampPan(panX, panY, zoom);
      setPanX(clamped.x);
      setPanY(clamped.y);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [panX, panY, zoom, clampPan]);

  // Clean up travel timeout
  useEffect(() => {
    return () => {
      if (travelTimeoutRef.current) clearTimeout(travelTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    if (isWalking) return;

    if (state.bankAccount.giroBalance < 0) {
      setSpeechText('Achtung: Konto im Dispo! Ich sollte sparen.');
    } else if (state.activeEvent) {
      setSpeechText('Oh, ein wichtiges Lebensereignis steht an!');
    } else if (state.career.type === 'SCHUELER') {
      setSpeechText('Noch in der Schule – bald geht das Berufsleben los!');
    } else if (state.career.type === 'AUSBILDUNG') {
      setSpeechText(`Im ${state.career.currentYear}. Ausbildungsjahr – fleißig lernen!`);
    } else if (state.career.type === 'STUDIUM') {
      setSpeechText(`Semester ${state.career.currentYear * 2} – Vorlesungen & Prüfungen!`);
    } else {
      setSpeechText(`Berufstätig als ${state.career.title} mit ${state.career.monthlySalaryNet} € Netto`);
    }
  }, [state?.currentAge, state?.currentMonth, state?.career, state?.bankAccount.giroBalance, state?.activeEvent, isWalking]);

  if (!state) return null;

  // Function to move avatar to a specific location on the map and optionally open its modal
  const travelToLocation = (locKey: string, openModal = true) => {
    sound.playPop();

    const target = LOCATION_COORDINATES[locKey];
    const preset = DISTRICT_PRESETS[locKey];

    if (target) {
      setIsWalking(true);
      setSpeechText(`Unterwegs zu: ${target.name}...`);
      setAvatarPos({ x: target.x, y: target.y });
    }

    if (preset) {
      const clamped = clampPan(preset.panX, preset.panY, zoom);
      setPanX(clamped.x);
      setPanY(clamped.y);
    }

    if (travelTimeoutRef.current) clearTimeout(travelTimeoutRef.current);

    travelTimeoutRef.current = setTimeout(() => {
      setIsWalking(false);
      if (target) {
        setSpeechText(`Angekommen: ${target.name}!`);
      }
      if (openModal && locKey !== 'CENTER') {
        onSelectLocation(locKey as TownLocationId);
      }
    }, 700);
  };

  const handleLocationClick = (loc: TownLocationId) => {
    travelToLocation(loc, true);
  };

  const movePan = (dx: number, dy: number) => {
    sound.playPop();
    const clamped = clampPan(panX + dx, panY + dy, zoom);
    setPanX(clamped.x);
    setPanY(clamped.y);
  };

  const jumpToDistrict = (presetKey: string) => {
    travelToLocation(presetKey, false);
  };

  const changeZoom = (delta: number) => {
    sound.playPop();
    const nextZoom = Math.max(0.6, Math.min(1.6, Math.round((zoom + delta) * 100) / 100));
    const clamped = clampPan(panX, panY, nextZoom);
    setZoom(nextZoom);
    setPanX(clamped.x);
    setPanY(clamped.y);
  };

  const resetCamera = () => {
    sound.playPop();
    const targetZoom = 0.95;
    const clamped = clampPan(0, 0, targetZoom);
    setZoom(targetZoom);
    setPanX(clamped.x);
    setPanY(clamped.y);
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panX,
      startPanY: panY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    const clamped = clampPan(dragStart.current.startPanX + deltaX, dragStart.current.startPanY + deltaY, zoom);
    setPanX(clamped.x);
    setPanY(clamped.y);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const avatarSrc = `/assets/avatars/${state.character.avatar}.jpg`;

  return (
    <div
      ref={viewportRef}
      className="relative w-full h-[540px] md:h-[620px] bg-[#2a3439] rounded-3xl md:rounded-4xl overflow-hidden shadow-cozy border-4 border-[#ede5cb] select-none group cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoomable and Pannable 2560x1440 HD World Container */}
      <div
        className="absolute top-1/2 left-1/2 transition-transform duration-300 ease-out origin-center"
        style={{
          width: `${MAP_BASE_WIDTH}px`,
          height: `${MAP_BASE_HEIGHT}px`,
          marginLeft: `-${MAP_BASE_WIDTH / 2}px`,
          marginTop: `-${MAP_BASE_HEIGHT / 2}px`,
          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
        }}
      >
        {/* Background Town Map Image (Large 5x expansive German/European Town) */}
        <img
          src="/assets/town_map.jpg"
          alt="GOAL Expansive German Town Map"
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Ambient Warm Sunlit Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/5 pointer-events-none" />

        {/* --- INTERACTIVE LOCATION HOTSPOT PINS --- */}

        {/* 1. MEIN ZUHAUSE (Fachwerk-Wohnviertel - Center Left) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLocationClick('HOME');
          }}
          onMouseEnter={() => setHoveredBuilding('HOME')}
          onMouseLeave={() => setHoveredBuilding(null)}
          className="absolute top-[58%] left-[24%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 z-20"
        >
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-terracotta-500 flex items-center gap-2 text-xs font-black text-terracotta-700 hover:bg-terracotta-50 shadow-md">
            <span className="text-lg">🏠</span>
            <span>Mein Zuhause</span>
          </div>
        </div>

        {/* 2. CAMPUS & SCHULE (Historischer Campus mit Sportplatz - Top Right) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLocationClick('SCHOOL_UNI');
          }}
          onMouseEnter={() => setHoveredBuilding('SCHOOL_UNI')}
          onMouseLeave={() => setHoveredBuilding(null)}
          className="absolute top-[16%] left-[72%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 z-20"
        >
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-skyline-500 flex items-center gap-2 text-xs font-black text-skyline-700 hover:bg-skyline-50 shadow-md">
            <span className="text-lg">🎓</span>
            <span>Schule & Uni-Campus</span>
          </div>
        </div>

        {/* 3. ARBEITSPLATZ & WERKSTATT (Industrie- & Handwerksviertel - Bottom Right) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLocationClick('WORK');
          }}
          onMouseEnter={() => setHoveredBuilding('WORK')}
          onMouseLeave={() => setHoveredBuilding(null)}
          className="absolute top-[74%] left-[86%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 z-20"
        >
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-indigo-500 flex items-center gap-2 text-xs font-black text-indigo-700 hover:bg-indigo-50 shadow-md">
            <span className="text-lg">💼</span>
            <span>Arbeitsplatz & Werkstatt</span>
          </div>
        </div>

        {/* 4. STADTBANK & SPARKASSE (Center-South-West) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLocationClick('BANK');
          }}
          onMouseEnter={() => setHoveredBuilding('BANK')}
          onMouseLeave={() => setHoveredBuilding(null)}
          className="absolute top-[61%] left-[39%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 z-20"
        >
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-matcha-500 flex items-center gap-2 text-xs font-black text-matcha-700 hover:bg-matcha-50 shadow-md">
            <span className="text-lg">🏦</span>
            <span>Sparkasse</span>
          </div>
        </div>

        {/* 5. VERSICHERUNGSBÜRO (Zentrum-Ost / Gewerbeviertel) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLocationClick('INSURANCE_OFFICE');
          }}
          onMouseEnter={() => setHoveredBuilding('INSURANCE_OFFICE')}
          onMouseLeave={() => setHoveredBuilding(null)}
          className="absolute top-[63%] left-[69%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 z-20"
        >
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-amber-500 flex items-center gap-2 text-xs font-black text-amber-700 hover:bg-amber-50 shadow-md">
            <span className="text-lg">🛡️</span>
            <span>Versicherungsbüro</span>
          </div>
        </div>

        {/* 6. MARKTPLATZ & BÄCKEREI (Historischer Marktplatz - Center) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLocationClick('MARKET');
          }}
          onMouseEnter={() => setHoveredBuilding('MARKET')}
          onMouseLeave={() => setHoveredBuilding(null)}
          className="absolute top-[53%] left-[50%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 z-20"
        >
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-rose-500 flex items-center gap-2 text-xs font-black text-rose-700 hover:bg-rose-50 shadow-md">
            <span className="text-lg">🥨</span>
            <span>Markt & Bäcker</span>
          </div>
        </div>

        {/* 7. STADTPARK, BIERGARTEN & SEE (South Center) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLocationClick('PARK_SHRINE');
          }}
          onMouseEnter={() => setHoveredBuilding('PARK_SHRINE')}
          onMouseLeave={() => setHoveredBuilding(null)}
          className="absolute top-[72%] left-[56%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 z-20"
        >
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-emerald-500 flex items-center gap-2 text-xs font-black text-emerald-800 hover:bg-emerald-50 shadow-md">
            <span className="text-lg">🌳</span>
            <span>Stadtpark & Biergarten</span>
          </div>
        </div>

        {/* --- DYNAMISCH WANDERNDER SPIELER-AVATAR --- */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto z-30"
          style={{
            top: `${avatarPos.y}%`,
            left: `${avatarPos.x}%`,
            transition: 'top 700ms cubic-bezier(0.34, 1.56, 0.64, 1), left 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Speech Bubble */}
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border-2 border-sakura-300 text-xs font-black text-gray-800 mb-2 max-w-[280px] text-center relative animate-fadeIn pointer-events-none">
            <div className="flex items-center justify-center gap-1.5">
              {isWalking && <Footprints className="w-3.5 h-3.5 text-matcha-600 animate-pulse shrink-0" />}
              <span>{speechText}</span>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-white" />
          </div>

          {/* Large Prominent Character Avatar Portrait Frame */}
          <div className={`w-20 h-20 rounded-full bg-white p-1 shadow-2xl border-4 border-matcha-500 transition-all duration-300 ${
            isWalking ? 'scale-115 -translate-y-2 ring-4 ring-matcha-300/60' : 'hover:scale-110'
          }`}>
            <img
              src={avatarSrc}
              onError={(e) => {
                e.currentTarget.src = `/assets/avatars/${state.character.avatar}.svg`;
              }}
              alt={state.character.name}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <span className="bg-white/90 backdrop-blur-md text-[11px] font-black text-gray-800 px-3 py-0.5 rounded-full shadow-md border border-gray-200 mt-1">
            {state.character.name} (Alter {state.currentAge})
          </span>
        </div>
      </div>

      {/* --- EDGE NAVIGATION ARROWS (With ample clearance above bottom bar) --- */}
      {/* Top Edge Arrow */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          movePan(0, 200);
        }}
        type="button"
        title="Nach Norden bewegen"
        className="absolute top-3 left-1/2 transform -translate-x-1/2 z-30 p-2.5 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-lg border border-gray-200 transition-all hover:scale-110 active:scale-95 cursor-pointer"
      >
        <ChevronUp className="w-5 h-5 text-gray-800" />
      </button>

      {/* Bottom Edge Arrow (Positioned safely above the Schnellreise bar) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          movePan(0, -200);
        }}
        type="button"
        title="Nach Süden bewegen"
        className="absolute bottom-24 md:bottom-20 left-1/2 transform -translate-x-1/2 z-30 p-2.5 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-lg border border-gray-200 transition-all hover:scale-110 active:scale-95 cursor-pointer"
      >
        <ChevronDown className="w-5 h-5 text-gray-800" />
      </button>

      {/* Left Edge Arrow */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          movePan(250, 0);
        }}
        type="button"
        title="Nach Westen bewegen"
        className="absolute top-1/2 left-3 transform -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-lg border border-gray-200 transition-all hover:scale-110 active:scale-95 cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5 text-gray-800" />
      </button>

      {/* Right Edge Arrow */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          movePan(-250, 0);
        }}
        type="button"
        title="Nach Osten bewegen"
        className="absolute top-1/2 right-3 transform -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-lg border border-gray-200 transition-all hover:scale-110 active:scale-95 cursor-pointer"
      >
        <ChevronRight className="w-5 h-5 text-gray-800" />
      </button>

      {/* --- TOP-RIGHT FLOATING ZOOM & CAMERA CONTROLS --- */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-md border border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            changeZoom(0.15);
          }}
          type="button"
          title="Heranzoomen (+)"
          className="p-2 rounded-xl bg-gray-50 hover:bg-white text-gray-700 hover:text-gray-900 transition-all active:scale-95 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            changeZoom(-0.15);
          }}
          type="button"
          title="Herauszoomen (-)"
          className="p-2 rounded-xl bg-gray-50 hover:bg-white text-gray-700 hover:text-gray-900 transition-all active:scale-95 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            resetCamera();
          }}
          type="button"
          title="Kamera zentrieren"
          className="p-2 rounded-xl bg-gray-50 hover:bg-white text-gray-700 hover:text-gray-900 transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* --- BOTTOM FLOATING SCHNELLREISE & HINT BAR (2-Row Responsive Layout) --- */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between flex-wrap gap-2 pointer-events-none">
        {/* District Quick-Jump Buttons */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-gray-200 overflow-x-auto scrollbar-none pointer-events-auto max-w-full">
          <div className="text-[10px] font-black text-gray-400 uppercase px-2 hidden sm:block shrink-0">
            Schnellreise:
          </div>

          {Object.entries(DISTRICT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                jumpToDistrict(key);
              }}
              type="button"
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-gray-50 hover:bg-white hover:border-matcha-400 border border-gray-200 transition-all active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer text-gray-800"
            >
              <span>{preset.icon}</span>
              <span className="hidden sm:inline">{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Drag Hint Tag */}
        <div className="hidden lg:flex items-center gap-1.5 bg-black/65 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-2xl pointer-events-auto shadow-md shrink-0">
          <span>🖱️ Ziehen zum Bewegen • Strikte Randbegrenzung</span>
        </div>
      </div>
    </div>
  );
};
