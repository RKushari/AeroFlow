'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import * as THREE from 'three';
import { 
  CheckCircle2, 
  Fuel, 
  Package, 
  Wrench, 
  X, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Eye, 
  Check, 
  Plane,
  MousePointer,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { completeChecklistItem } from '@/lib/actions/crew';

export interface InspectionSubItem {
  id: string;
  task: string;
  isComplete: boolean;
  department: 'mechanics' | 'fuel' | 'cargo' | 'avionics';
}

export interface InspectionZone {
  id: string;
  name: string;
  department: 'mechanics' | 'fuel' | 'cargo' | 'avionics';
  icon: 'wrench' | 'fuel' | 'package' | 'plane';
  position: [number, number, number];
  description: string;
  subItems: InspectionSubItem[];
  isVerified: boolean;
}

const INITIAL_ZONES: InspectionZone[] = [
  {
    id: 'nose',
    name: 'Nose Radome & Pitot Probes',
    department: 'avionics',
    icon: 'plane',
    position: [0, 0.3, 4.6],
    description: 'Inspect Biman Bangladesh weather radar radome, pitot-static tube covers removed, and angle-of-attack sensors.',
    isVerified: false,
    subItems: [
      { id: 'sub-nose-1', task: 'Radome surface free of bird strikes or structural cracks', isComplete: false, department: 'avionics' },
      { id: 'sub-nose-2', task: 'All pitot-static probe protective red covers removed', isComplete: false, department: 'avionics' },
      { id: 'sub-nose-3', task: 'Total Air Temp (TAT) and Alpha vane sensors unobstructed', isComplete: false, department: 'avionics' },
    ]
  },
  {
    id: 'engines',
    name: 'GEnx / GE90 Turbofan Engines (Port & Stbd)',
    department: 'mechanics',
    icon: 'wrench',
    position: [-2.2, -0.4, 0.4],
    description: 'Inspect Biman Emerald Green engine cowlings, titanium fan blades for FOD nicks, and thrust reverser latches.',
    isVerified: false,
    subItems: [
      { id: 'sub-eng-1', task: 'Fan blades inspected for foreign object damage (FOD) nicks', isComplete: false, department: 'mechanics' },
      { id: 'sub-eng-2', task: 'Engine oil sight glass level verified within normal operating band', isComplete: false, department: 'mechanics' },
      { id: 'sub-eng-3', task: 'Thrust reverser cascade cowlings locked and latched securely', isComplete: false, department: 'mechanics' },
      { id: 'sub-eng-4', task: 'Exhaust nozzle and tailpipe turbine area free of oil seepage', isComplete: false, department: 'mechanics' },
    ]
  },
  {
    id: 'landing_gear',
    name: 'Main & Nose Landing Gear Assembly',
    department: 'mechanics',
    icon: 'wrench',
    position: [0, -1.2, -0.4],
    description: 'Check oleo strut pressure, tire tread wear, brake wear pin indicators, and hydraulic lines.',
    isVerified: false,
    subItems: [
      { id: 'sub-gear-1', task: 'Tire inflation pressure and tread groove depth within limits', isComplete: false, department: 'mechanics' },
      { id: 'sub-gear-2', task: 'Brake wear pin indicators checked (min 3mm protrusion)', isComplete: false, department: 'mechanics' },
      { id: 'sub-gear-3', task: 'Main oleo shock strut extension clean with no hydraulic fluid leaks', isComplete: false, department: 'mechanics' },
      { id: 'sub-gear-4', task: 'Nose wheel steering lock pin removed prior to pushback', isComplete: false, department: 'mechanics' },
    ]
  },
  {
    id: 'wings',
    name: 'Wings & Flight Control Surfaces',
    department: 'mechanics',
    icon: 'wrench',
    position: [3.4, 0.3, -1.0],
    description: 'Inspect swept main wings, raked wingtip winglets, slats, flaps, ailerons, and static discharge wicks.',
    isVerified: false,
    subItems: [
      { id: 'sub-wing-1', task: 'Leading-edge slats and Krueger flaps free of ice and contamination', isComplete: false, department: 'mechanics' },
      { id: 'sub-wing-2', task: 'Static discharge wicks intact on Biman green-and-red winglet tips', isComplete: false, department: 'mechanics' },
      { id: 'sub-wing-3', task: 'Aileron and flight spoiler actuators free of hydraulic weeping', isComplete: false, department: 'mechanics' },
    ]
  },
  {
    id: 'fuel_panel',
    name: 'Refueling Receptacle & Sump Vents',
    department: 'fuel',
    icon: 'fuel',
    position: [2.5, -0.2, 0.2],
    description: 'Verify fueling hose coupling seal, water drainage sumps, and fuel quantity indicator gauges.',
    isVerified: false,
    subItems: [
      { id: 'sub-fuel-1', task: 'Single-point refueling panel access door latched & grounded', isComplete: false, department: 'fuel' },
      { id: 'sub-fuel-2', task: 'Fuel tank water drain sump test clear with zero contamination', isComplete: false, department: 'fuel' },
      { id: 'sub-fuel-3', task: 'Fuel density and total block fuel quantity reconciled against flight plan', isComplete: false, department: 'fuel' },
    ]
  },
  {
    id: 'cargo_doors',
    name: 'Forward & Aft Cargo Hold Doors',
    department: 'cargo',
    icon: 'package',
    position: [0.8, -0.3, 1.8],
    description: 'Confirm ULD container locks engaged, cargo nets secured, and hold doors locked flush.',
    isVerified: false,
    subItems: [
      { id: 'sub-cargo-1', task: 'All pallet locks and ULD restraint latches mechanically engaged', isComplete: false, department: 'cargo' },
      { id: 'sub-cargo-2', task: 'Forward and aft cargo door mechanical lock indicators flush and green', isComplete: false, department: 'cargo' },
      { id: 'sub-cargo-3', task: 'Dangerous Goods (HAZMAT) load manifests verified by ground lead', isComplete: false, department: 'cargo' },
    ]
  },
  {
    id: 'cabin_doors',
    name: 'Main Cabin Doors & Emergency Slides',
    department: 'avionics',
    icon: 'plane',
    position: [-0.9, 0.5, 2.5],
    description: 'Inspect door seal integrity, slide girt bar status, and exterior handle stowage on Biman fuselage.',
    isVerified: false,
    subItems: [
      { id: 'sub-door-1', task: 'Main entrance L1/R1 doors exterior handle flush in locked position', isComplete: false, department: 'avionics' },
      { id: 'sub-door-2', task: 'Overwing emergency exit hatches locked and verified from exterior', isComplete: false, department: 'avionics' },
      { id: 'sub-door-3', task: 'Passenger boarding bridge / airstairs safety interlock disengaged', isComplete: false, department: 'avionics' },
    ]
  }
];

interface Preflight3DChecklistProps {
  flightId?: string;
  flightNumber?: string;
  dbChecklistItems?: Array<{ id: string; task: string; isComplete: boolean; isMandatory: boolean }>;
}

export function Preflight3DChecklist({
  flightId,
  flightNumber = 'BG-1042',
  dbChecklistItems = []
}: Preflight3DChecklistProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<InspectionZone[]>(INITIAL_ZONES);
  const [activeZone, setActiveZone] = useState<InspectionZone | null>(null);
  const [hoveredZoneName, setHoveredZoneName] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'REAL_SKETCHFAB' | 'CANVAS_XRAY'>('REAL_SKETCHFAB');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'mechanics' | 'fuel' | 'cargo' | 'avionics'>('ALL');
  const [isPending, startTransition] = useTransition();

  // Three.js state refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const hotspotMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const clickableObjectsRef = useRef<THREE.Object3D[]>([]);

  // Count progress
  const verifiedZonesCount = zones.filter(z => z.isVerified).length;
  const totalZonesCount = zones.length;
  const progressPercent = Math.round((verifiedZonesCount / totalZonesCount) * 100);

  // Three.js Canvas initialization for CANVAS_XRAY mode
  useEffect(() => {
    if (viewMode !== 'CANVAS_XRAY' || !mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.03);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(7.5, 4.8, 8.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xffffff, 3.2);
    mainSun.position.set(12, 20, 15);
    mainSun.castShadow = true;
    scene.add(mainSun);

    const bimanFill = new THREE.DirectionalLight(0x059669, 1.8);
    bimanFill.position.set(-15, -8, -10);
    scene.add(bimanFill);

    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.5);
    cyanRim.position.set(0, 10, -15);
    scene.add(cyanRim);

    const gridHelper = new THREE.GridHelper(26, 26, 0x059669, 0x1e293b);
    gridHelper.position.y = -1.8;
    scene.add(gridHelper);

    const aircraftGroup = new THREE.Group();
    scene.add(aircraftGroup);

    const clickableList: THREE.Object3D[] = [];

    const BIMAN_GREEN = 0x006a4e;
    const BIMAN_RED = 0xe11d48;
    const PEARL_WHITE = 0xffffff;
    const SILVER_WING = 0xd1d5db;
    const TITANIUM_DARK = 0x1e293b;

    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0.08, -4.8));
    points.push(new THREE.Vector2(0.35, -4.4));
    points.push(new THREE.Vector2(0.68, -3.5));
    points.push(new THREE.Vector2(0.75, -2.0));
    points.push(new THREE.Vector2(0.75, 2.5));
    points.push(new THREE.Vector2(0.72, 3.8));
    points.push(new THREE.Vector2(0.55, 4.6));
    points.push(new THREE.Vector2(0.28, 5.2));
    points.push(new THREE.Vector2(0.05, 5.5));

    const fuselageGeo = new THREE.LatheGeometry(points, 48);
    const fuselageMat = new THREE.MeshStandardMaterial({ color: PEARL_WHITE, roughness: 0.12, metalness: 0.25 });
    const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.userData = { zoneId: 'cabin_doors' };
    aircraftGroup.add(fuselage);
    clickableList.push(fuselage);

    const stripeGeo = new THREE.BoxGeometry(0.04, 0.14, 8.8);
    const stripeMat = new THREE.MeshStandardMaterial({ color: BIMAN_GREEN, roughness: 0.2 });
    
    const leftStripe = new THREE.Mesh(stripeGeo, stripeMat);
    leftStripe.position.set(-0.74, 0.12, 0.2);
    leftStripe.userData = { zoneId: 'cabin_doors' };
    aircraftGroup.add(leftStripe);
    clickableList.push(leftStripe);

    const rightStripe = new THREE.Mesh(stripeGeo, stripeMat);
    rightStripe.position.set(0.74, 0.12, 0.2);
    rightStripe.userData = { zoneId: 'cabin_doors' };
    aircraftGroup.add(rightStripe);
    clickableList.push(rightStripe);

    const cockpitGeo = new THREE.BoxGeometry(0.68, 0.32, 0.6);
    const cockpitMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9, transmission: 0.6, transparent: true, opacity: 0.9 });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.48, 4.45);
    cockpit.rotation.x = -0.32;
    cockpit.userData = { zoneId: 'nose' };
    aircraftGroup.add(cockpit);
    clickableList.push(cockpit);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(4.8, -2.8);
    wingShape.lineTo(4.6, -3.5);
    wingShape.lineTo(0, -1.3);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 });
    const wingMat = new THREE.MeshStandardMaterial({ color: SILVER_WING, metalness: 0.6, roughness: 0.25 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotation.x = Math.PI / 2;
    rightWing.rotation.z = 0.07;
    rightWing.position.set(0.65, 0, 0.5);
    rightWing.userData = { zoneId: 'wings' };
    aircraftGroup.add(rightWing);
    clickableList.push(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.rotation.y = Math.PI;
    leftWing.rotation.z = -0.07;
    leftWing.position.set(-0.65, 0, 0.5);
    leftWing.userData = { zoneId: 'wings' };
    aircraftGroup.add(leftWing);
    clickableList.push(leftWing);

    const engineNacelleGeo = new THREE.CylinderGeometry(0.42, 0.38, 2.1, 32);
    const engineNacelleMat = new THREE.MeshStandardMaterial({ color: BIMAN_GREEN, metalness: 0.4, roughness: 0.25 });
    
    const rightEngine = new THREE.Mesh(engineNacelleGeo, engineNacelleMat);
    rightEngine.rotation.x = Math.PI / 2;
    rightEngine.position.set(2.0, -0.45, 0.5);
    rightEngine.userData = { zoneId: 'engines' };
    aircraftGroup.add(rightEngine);
    clickableList.push(rightEngine);

    const leftEngine = new THREE.Mesh(engineNacelleGeo, engineNacelleMat);
    leftEngine.rotation.x = Math.PI / 2;
    leftEngine.position.set(-2.0, -0.45, 0.5);
    leftEngine.userData = { zoneId: 'engines' };
    aircraftGroup.add(leftEngine);
    clickableList.push(leftEngine);

    const hotspotMap = new Map<string, THREE.Mesh>();
    zones.forEach((zone) => {
      const pinGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: zone.isVerified ? 0x10b981 : 0xf59e0b,
        transparent: true,
        opacity: 0.95
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(...zone.position);
      pin.userData = { zoneId: zone.id };
      aircraftGroup.add(pin);
      hotspotMap.set(zone.id, pin);
      clickableList.push(pin);
    });

    hotspotMeshesRef.current = hotspotMap;
    clickableObjectsRef.current = clickableList;

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent) => {
      isDragging = false;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: MouseEvent) => {
      if (e.buttons === 1) {
        isDragging = true;
        const moveX = e.clientX - previousMousePosition.x;
        const moveY = e.clientY - previousMousePosition.y;
        aircraftGroup.rotation.y += moveX * 0.008;
        aircraftGroup.rotation.x += moveY * 0.005;
      }
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: MouseEvent) => {
      if (!isDragging) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickableObjectsRef.current, true);
        if (intersects.length > 0) {
          let currObj: THREE.Object3D | null = intersects[0].object;
          while (currObj && !currObj.userData?.zoneId) {
            currObj = currObj.parent;
          }
          if (currObj && currObj.userData?.zoneId) {
            const targetZoneId = currObj.userData.zoneId;
            setZones(currentZones => {
              const targetZone = currentZones.find(z => z.id === targetZoneId);
              if (targetZone) setActiveZone(targetZone);
              return currentZones;
            });
          }
        }
      }
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onPointerDown);
    domElement.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      if (!isDragging) {
        aircraftGroup.rotation.y += 0.0018;
        aircraftGroup.position.y = Math.sin(elapsedTime * 1.4) * 0.07;
      }
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      domElement.removeEventListener('mousedown', onPointerDown);
      domElement.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [viewMode]);

  // Handle Sub-Item Check Toggle
  const handleToggleSubItem = (zoneId: string, subItemId: string) => {
    setZones(prev => prev.map(zone => {
      if (zone.id !== zoneId) return zone;

      const updatedSubItems = zone.subItems.map(item => {
        if (item.id === subItemId) {
          return { ...item, isComplete: !item.isComplete };
        }
        return item;
      });

      return {
        ...zone,
        subItems: updatedSubItems,
        isVerified: updatedSubItems.every(i => i.isComplete)
      };
    }));

    if (activeZone && activeZone.id === zoneId) {
      setActiveZone(prev => {
        if (!prev) return null;
        const updatedSubItems = prev.subItems.map(item => item.id === subItemId ? { ...item, isComplete: !item.isComplete } : item);
        return {
          ...prev,
          subItems: updatedSubItems,
          isVerified: updatedSubItems.every(i => i.isComplete)
        };
      });
    }
  };

  const handleConfirmZone = (zoneId: string) => {
    startTransition(async () => {
      setZones(prev => prev.map(zone => {
        if (zone.id !== zoneId) return zone;
        return {
          ...zone,
          isVerified: true,
          subItems: zone.subItems.map(i => ({ ...i, isComplete: true }))
        };
      }));

      if (dbChecklistItems.length > 0) {
        for (const item of dbChecklistItems) {
          if (!item.isComplete) {
            try {
              await completeChecklistItem(item.id);
            } catch (err) {
              console.warn("DB checklist sync error:", err);
            }
          }
        }
      }

      setActiveZone(null);
    });
  };

  const filteredZones = zones.filter(z => {
    if (departmentFilter === 'ALL') return true;
    return z.department === departmentFilter;
  });

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl transition-all ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full min-h-[640px]'}`}>
      {/* HUD Header Bar */}
      <div className="absolute top-0 inset-x-0 p-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 z-20 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-1">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm font-mono text-white tracking-wider flex items-center gap-2">
                BIMAN BANGLADESH AIRLINES — AIRBUS A310-300 3D INSPECTION ENGINE
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FLIGHT {flightNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span>Photorealistic 3D Model by OUTPISTON · Interactive Inspection Hotspots</span>
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Department Filters */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl font-mono text-xs">
            <button
              onClick={() => setViewMode('REAL_SKETCHFAB')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'REAL_SKETCHFAB'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real 3D Sketchfab</span>
            </button>
            <button
              onClick={() => setViewMode('CANVAS_XRAY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'CANVAS_XRAY'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Canvas X-Ray</span>
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Viewport Body */}
      <div className="w-full h-[580px] bg-slate-950 relative overflow-hidden">
        {viewMode === 'REAL_SKETCHFAB' ? (
          <div className="w-full h-full relative pt-16">
            {/* User Provided Exact Sketchfab 3D Embed iframe */}
            <iframe 
              title="Biman Bangladesh Airlines Airbus A310-300"
              className="w-full h-full border-0"
              src="https://sketchfab.com/models/7bb2ad6df3594caebd034c03c7d3ad03/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_controls=1&ui_infos=0&ui_inspector=0"
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen
            />
          </div>
        ) : (
          <div ref={mountRef} className="w-full h-full bg-slate-950 cursor-grab active:cursor-grabbing relative pt-16" />
        )}
      </div>

      {/* Floating 3D Zone Hotspots Control Overlay */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        <div className="p-3 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-2xl pointer-events-auto space-y-2.5 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Inspection Hotspots ({verifiedZonesCount}/{totalZonesCount})
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              progressPercent === 100 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {progressPercent}% Complete
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Clickable Hotspots List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {filteredZones.map(zone => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setActiveZone(zone)}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-mono flex items-center justify-between transition-all border cursor-pointer ${
                  zone.isVerified
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200 hover:bg-emerald-950/60'
                    : 'bg-slate-900/90 border-amber-500/50 text-amber-200 hover:bg-amber-950/50 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    zone.isVerified ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} />
                  <span className="truncate font-semibold">{zone.name}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  zone.isVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {zone.isVerified ? 'VERIFIED' : 'INSPECT'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom HUD Model Attribution & Instructions */}
      <div className="absolute bottom-4 left-4 z-20 p-2.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 pointer-events-auto flex items-center gap-3">
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Biman Bangladesh Airbus A310-300:
        </span>
        <a 
          href="https://sketchfab.com/3d-models/biman-bangladesh-airlines-airbus-a310-300-7bb2ad6df3594caebd034c03c7d3ad03" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
        >
          <span>3D Model by OUTPISTON on Sketchfab</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Modal Dialog for Active Inspection Zone */}
      <AnimatePresence>
        {activeZone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-100 font-mono"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    activeZone.isVerified 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {activeZone.department === 'fuel' ? <Fuel className="w-5 h-5" /> :
                     activeZone.department === 'cargo' ? <Package className="w-5 h-5" /> :
                     <Wrench className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      {activeZone.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Airbus A310 Zone · Department: <strong className="uppercase text-emerald-400">{activeZone.department}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveZone(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {activeZone.description}
              </p>

              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Mandatory Inspection Tasks</span>
                  <span>{activeZone.subItems.filter(i => i.isComplete).length} / {activeZone.subItems.length} Completed</span>
                </div>

                <div className="space-y-2">
                  {activeZone.subItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleSubItem(activeZone.id, item.id)}
                      className={`p-3 rounded-xl border text-xs flex items-start gap-3 cursor-pointer transition-all ${
                        item.isComplete
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        item.itemComplete || item.isComplete
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}>
                        {item.isComplete && <Check className="w-3 h-3" />}
                      </div>
                      <span className="leading-snug">{item.task}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className={`w-2 h-2 rounded-full ${
                    activeZone.isVerified ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span>{activeZone.isVerified ? 'Status: Inspected & Verified' : 'Status: Pending Inspection'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveZone(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmZone(activeZone.id)}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Verify Zone
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
