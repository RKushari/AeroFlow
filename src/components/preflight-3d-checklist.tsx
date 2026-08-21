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
  Zap
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

const BOEING_ZONES: InspectionZone[] = [
  {
    id: 'nose',
    name: 'Boeing Nose Radome & Weather Radar',
    department: 'avionics',
    icon: 'plane',
    position: [0, 0.3, 4.8],
    description: 'Inspect Boeing 787 composite weather radome nose cone, pitot-static probes, and AoA vane sensors.',
    isVerified: false,
    subItems: [
      { id: 'sub-nose-1', task: 'Boeing composite radome surface free of cracks or impact damage', isComplete: false, department: 'avionics' },
      { id: 'sub-nose-2', task: 'All pitot-static probe protective red covers removed before pushback', isComplete: false, department: 'avionics' },
      { id: 'sub-nose-3', task: 'Forward weather radar transceiver unit self-test passed', isComplete: false, department: 'avionics' },
    ]
  },
  {
    id: 'engines',
    name: 'GEnx-1B High-Bypass Turbofan Engines',
    department: 'mechanics',
    icon: 'wrench',
    position: [-2.2, -0.4, 0.4],
    description: 'Inspect GEnx turbofan engine cowlings, titanium fan blades for FOD, oil levels, and thrust reversers.',
    isVerified: false,
    subItems: [
      { id: 'sub-eng-1', task: 'Titanium fan blades inspected for foreign object damage (FOD) nicks', isComplete: false, department: 'mechanics' },
      { id: 'sub-eng-2', task: 'Engine oil sight glass level verified within normal green band', isComplete: false, department: 'mechanics' },
      { id: 'sub-eng-3', task: 'Thrust reverser cascade cowlings locked and latched securely', isComplete: false, department: 'mechanics' },
      { id: 'sub-eng-4', task: 'Exhaust chevron nozzle free of fuel or hydraulic oil seepage', isComplete: false, department: 'mechanics' },
    ]
  },
  {
    id: 'landing_gear',
    name: 'Main & Nose Landing Gear Assembly',
    department: 'mechanics',
    icon: 'wrench',
    position: [0, -1.2, -0.4],
    description: 'Check oleo shock strut extension, tire tread wear, brake wear pin indicators, and hydraulic actuators.',
    isVerified: false,
    subItems: [
      { id: 'sub-gear-1', task: 'Main wheel tire inflation pressure and tread groove depth within limits', isComplete: false, department: 'mechanics' },
      { id: 'sub-gear-2', task: 'Carbon brake disk wear pin indicators checked (min 3mm protrusion)', isComplete: false, department: 'mechanics' },
      { id: 'sub-gear-3', task: 'Main oleo shock strut chrome piston extension clean with no fluid leaks', isComplete: false, department: 'mechanics' },
      { id: 'sub-gear-4', task: 'Nose gear ground bypass safety pin removed prior to flight deck handover', isComplete: false, department: 'mechanics' },
    ]
  },
  {
    id: 'wings',
    name: 'Boeing Raked Wings & Flight Controls',
    department: 'mechanics',
    icon: 'wrench',
    position: [3.4, 0.3, -1.0],
    description: 'Inspect Boeing 787 super-critical swept wings, raked wingtips, slats, double-slotted flaps, and ailerons.',
    isVerified: false,
    subItems: [
      { id: 'sub-wing-1', task: 'Leading-edge slats and trailing-edge flaps free of ice and contamination', isComplete: false, department: 'mechanics' },
      { id: 'sub-wing-2', task: 'Static discharge wicks intact on Boeing raked wingtips', isComplete: false, department: 'mechanics' },
      { id: 'sub-wing-3', task: 'High-speed ailerons and flight spoiler actuators free of hydraulic weeping', isComplete: false, department: 'mechanics' },
    ]
  },
  {
    id: 'fuel_panel',
    name: 'Single-Point Refueling Panel',
    department: 'fuel',
    icon: 'fuel',
    position: [2.5, -0.2, 0.2],
    description: 'Verify fueling hose coupling lock, fuel tank sump water drain test, and density calculations.',
    isVerified: false,
    subItems: [
      { id: 'sub-fuel-1', task: 'Single-point refueling panel access door latched & bonding wire connected', isComplete: false, department: 'fuel' },
      { id: 'sub-fuel-2', task: 'Fuel tank water drain sump test clear with zero water contamination', isComplete: false, department: 'fuel' },
      { id: 'sub-fuel-3', task: 'Fuel density and total block fuel quantity reconciled against flight plan', isComplete: false, department: 'fuel' },
    ]
  },
  {
    id: 'cargo_doors',
    name: 'Forward & Aft Cargo Hold Doors',
    department: 'cargo',
    icon: 'package',
    position: [0.8, -0.3, 1.8],
    description: 'Confirm ULD container locks engaged, cargo nets secured, and electric hold doors locked flush.',
    isVerified: false,
    subItems: [
      { id: 'sub-cargo-1', task: 'All pallet locks and ULD restraint latches mechanically engaged', isComplete: false, department: 'cargo' },
      { id: 'sub-cargo-2', task: 'Forward and aft cargo door mechanical lock indicators flush and green', isComplete: false, department: 'cargo' },
      { id: 'sub-cargo-3', task: 'Dangerous Goods (HAZMAT) load manifests verified by ground lead', isComplete: false, department: 'cargo' },
    ]
  },
  {
    id: 'cabin_doors',
    name: 'Boeing Fuselage & Main Entrance Doors',
    department: 'avionics',
    icon: 'plane',
    position: [-0.9, 0.5, 2.5],
    description: 'Inspect door seal integrity, slide girt bar status, and exterior handle stowage on Boeing fuselage.',
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
  const [zones, setZones] = useState<InspectionZone[]>(BOEING_ZONES);
  const [activeZone, setActiveZone] = useState<InspectionZone | null>(null);
  const [hoveredZone, setHoveredZone] = useState<InspectionZone | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'mechanics' | 'fuel' | 'cargo' | 'avionics'>('ALL');
  const [isPending, startTransition] = useTransition();

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const clickableObjectsRef = useRef<THREE.Object3D[]>([]);
  const highlightedMeshRef = useRef<THREE.Mesh | null>(null);

  const verifiedZonesCount = zones.filter(z => z.isVerified).length;
  const totalZonesCount = zones.length;
  const progressPercent = Math.round((verifiedZonesCount / totalZonesCount) * 100);

  // Initialize High-Fidelity Interactive Boeing 787 3D Engine
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 560;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.025);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(7.8, 4.5, 8.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
    keyLight.position.set(12, 22, 16);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const bimanEmeraldRim = new THREE.DirectionalLight(0x059669, 2.2);
    bimanEmeraldRim.position.set(-16, -6, -12);
    scene.add(bimanEmeraldRim);

    const cyanFill = new THREE.DirectionalLight(0x38bdf8, 1.6);
    cyanFill.position.set(0, 12, -16);
    scene.add(cyanFill);

    // Holographic Circular Platform Grid
    const gridHelper = new THREE.GridHelper(28, 28, 0x059669, 0x1e293b);
    gridHelper.position.y = -1.8;
    scene.add(gridHelper);

    // Boeing Aircraft Group
    const boeingGroup = new THREE.Group();
    scene.add(boeingGroup);

    const clickableList: THREE.Object3D[] = [];

    // =========================================================
    // HIGH-FIDELITY BOEING 787 DREAMLINER - INTERACTIVE COMPONENTS
    // =========================================================

    const BIMAN_GREEN = 0x006a4e;
    const BIMAN_RED = 0xe11d48;
    const PEARL_WHITE = 0xffffff;
    const ALUMINUM_SILVER = 0xd1d5db;
    const COCKPIT_GLASS = 0x38bdf8;
    const TITANIUM_DARK = 0x0f172a;

    // 1. BOEING NOSE RADOME & COCKPIT WINDSHIELD
    const nosePoints: THREE.Vector2[] = [];
    nosePoints.push(new THREE.Vector2(0.05, 5.6));
    nosePoints.push(new THREE.Vector2(0.28, 5.2));
    nosePoints.push(new THREE.Vector2(0.55, 4.6));
    nosePoints.push(new THREE.Vector2(0.72, 3.8));
    nosePoints.push(new THREE.Vector2(0.76, 2.8));

    const noseGeo = new THREE.LatheGeometry(nosePoints, 48);
    const noseMat = new THREE.MeshStandardMaterial({ color: PEARL_WHITE, roughness: 0.15, metalness: 0.2 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.userData = { zoneId: 'nose', name: 'Boeing Nose Radome' };
    boeingGroup.add(noseMesh);
    clickableList.push(noseMesh);

    // Curved Cockpit Windshield (Boeing 787 Glass)
    const cockpitGeo = new THREE.BoxGeometry(0.72, 0.34, 0.65);
    const cockpitMat = new THREE.MeshPhysicalMaterial({
      color: COCKPIT_GLASS,
      roughness: 0.08,
      metalness: 0.9,
      transmission: 0.7,
      transparent: true,
      opacity: 0.95
    });
    const cockpitMesh = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpitMesh.position.set(0, 0.48, 4.4);
    cockpitMesh.rotation.x = -0.32;
    cockpitMesh.userData = { zoneId: 'nose', name: 'Boeing Cockpit Glass' };
    boeingGroup.add(cockpitMesh);
    clickableList.push(cockpitMesh);

    // 2. FUSELAGE & MAIN CABIN DOORS
    const fusePoints: THREE.Vector2[] = [];
    fusePoints.push(new THREE.Vector2(0.76, 2.8));
    fusePoints.push(new THREE.Vector2(0.76, -2.2));
    fusePoints.push(new THREE.Vector2(0.68, -3.6));
    fusePoints.push(new THREE.Vector2(0.35, -4.4));
    fusePoints.push(new THREE.Vector2(0.08, -4.8));

    const fuseGeo = new THREE.LatheGeometry(fusePoints, 48);
    const fuseMat = new THREE.MeshStandardMaterial({ color: PEARL_WHITE, roughness: 0.12, metalness: 0.25 });
    const fuseMesh = new THREE.Mesh(fuseGeo, fuseMat);
    fuseMesh.rotation.x = Math.PI / 2;
    fuseMesh.userData = { zoneId: 'cabin_doors', name: 'Boeing Fuselage & Doors' };
    boeingGroup.add(fuseMesh);
    clickableList.push(fuseMesh);

    // Biman Emerald Green Cheatline Stripe
    const stripeGeo = new THREE.BoxGeometry(0.04, 0.14, 8.8);
    const stripeMat = new THREE.MeshStandardMaterial({ color: BIMAN_GREEN, roughness: 0.2 });
    
    const leftStripe = new THREE.Mesh(stripeGeo, stripeMat);
    leftStripe.position.set(-0.75, 0.12, 0.2);
    leftStripe.userData = { zoneId: 'cabin_doors', name: 'Biman Livery Stripe' };
    boeingGroup.add(leftStripe);
    clickableList.push(leftStripe);

    const rightStripe = new THREE.Mesh(stripeGeo, stripeMat);
    rightStripe.position.set(0.75, 0.12, 0.2);
    rightStripe.userData = { zoneId: 'cabin_doors', name: 'Biman Livery Stripe' };
    boeingGroup.add(rightStripe);
    clickableList.push(rightStripe);

    // 3. BOEING RAKED SWEPT WINGS & WINGLETS
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(4.9, -2.8);
    wingShape.lineTo(4.7, -3.5);
    wingShape.lineTo(0, -1.3);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.03, bevelThickness: 0.03 });
    const wingMat = new THREE.MeshStandardMaterial({ color: ALUMINUM_SILVER, metalness: 0.6, roughness: 0.25 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotation.x = Math.PI / 2;
    rightWing.rotation.z = 0.07;
    rightWing.position.set(0.65, 0, 0.5);
    rightWing.userData = { zoneId: 'wings', name: 'Right Boeing Swept Wing' };
    boeingGroup.add(rightWing);
    clickableList.push(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.rotation.y = Math.PI;
    leftWing.rotation.z = -0.07;
    leftWing.position.set(-0.65, 0, 0.5);
    leftWing.userData = { zoneId: 'wings', name: 'Left Boeing Swept Wing' };
    boeingGroup.add(leftWing);
    clickableList.push(leftWing);

    // Flap Track Canoe Fairings
    const canoeGeo = new THREE.CylinderGeometry(0.06, 0.02, 0.95);
    const canoeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    [-3.2, -2.1, 2.1, 3.2].forEach(x => {
      const canoe = new THREE.Mesh(canoeGeo, canoeMat);
      canoe.rotation.x = Math.PI / 2;
      canoe.position.set(x, -0.15, -1.8);
      canoe.userData = { zoneId: 'wings', name: 'Flap Track Fairing' };
      boeingGroup.add(canoe);
      clickableList.push(canoe);
    });

    // 4. GEnx-1B TURBOFAN ENGINES (PORT & STBD)
    const nacelleGeo = new THREE.CylinderGeometry(0.44, 0.4, 2.2, 32);
    const nacelleMat = new THREE.MeshStandardMaterial({ color: BIMAN_GREEN, metalness: 0.4, roughness: 0.25 });
    const chromeRimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.05 });
    const fanSpinnerMat = new THREE.MeshStandardMaterial({ color: TITANIUM_DARK, metalness: 0.9, roughness: 0.2 });

    const pylonGeo = new THREE.BoxGeometry(0.1, 0.4, 1.2);
    const pylonMat = new THREE.MeshStandardMaterial({ color: ALUMINUM_SILVER });

    // Right Engine Assembly
    const rPylon = new THREE.Mesh(pylonGeo, pylonMat);
    rPylon.position.set(2.0, -0.1, 0.5);
    rPylon.userData = { zoneId: 'engines', name: 'Right Engine Pylon' };
    boeingGroup.add(rPylon);
    clickableList.push(rPylon);

    const rEngine = new THREE.Mesh(nacelleGeo, nacelleMat);
    rEngine.rotation.x = Math.PI / 2;
    rEngine.position.set(2.0, -0.45, 0.5);
    rEngine.userData = { zoneId: 'engines', name: 'GEnx Turbofan Engine (Right)' };
    boeingGroup.add(rEngine);
    clickableList.push(rEngine);

    const rRim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 16, 32), chromeRimMat);
    rRim.position.set(2.0, -0.45, 1.6);
    rRim.userData = { zoneId: 'engines', name: 'Engine Intake Rim' };
    boeingGroup.add(rRim);
    clickableList.push(rRim);

    const rSpinner = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 16), fanSpinnerMat);
    rSpinner.rotation.x = Math.PI / 2;
    rSpinner.position.set(2.0, -0.45, 1.5);
    rSpinner.userData = { zoneId: 'engines', name: 'Turbine Fan Spinner' };
    boeingGroup.add(rSpinner);
    clickableList.push(rSpinner);

    // Left Engine Assembly
    const lPylon = new THREE.Mesh(pylonGeo, pylonMat);
    lPylon.position.set(-2.0, -0.1, 0.5);
    lPylon.userData = { zoneId: 'engines', name: 'Left Engine Pylon' };
    boeingGroup.add(lPylon);
    clickableList.push(lPylon);

    const lEngine = new THREE.Mesh(nacelleGeo, nacelleMat);
    lEngine.rotation.x = Math.PI / 2;
    lEngine.position.set(-2.0, -0.45, 0.5);
    lEngine.userData = { zoneId: 'engines', name: 'GEnx Turbofan Engine (Left)' };
    boeingGroup.add(lEngine);
    clickableList.push(lEngine);

    const lRim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 16, 32), chromeRimMat);
    lRim.position.set(-2.0, -0.45, 1.6);
    lRim.userData = { zoneId: 'engines', name: 'Engine Intake Rim' };
    boeingGroup.add(lRim);
    clickableList.push(lRim);

    const lSpinner = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 16), fanSpinnerMat);
    lSpinner.rotation.x = Math.PI / 2;
    lSpinner.position.set(-2.0, -0.45, 1.5);
    lSpinner.userData = { zoneId: 'engines', name: 'Turbine Fan Spinner' };
    boeingGroup.add(lSpinner);
    clickableList.push(lSpinner);

    // 5. LANDING GEAR ASSEMBLIES
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const tireMat = new THREE.MeshStandardMaterial({ color: TITANIUM_DARK, roughness: 0.85 });

    // Nose Landing Gear
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3), strutMat);
    noseStrut.position.set(0, -0.9, 4.0);
    noseStrut.userData = { zoneId: 'landing_gear', name: 'Nose Landing Gear Strut' };
    boeingGroup.add(noseStrut);
    clickableList.push(noseStrut);

    [-0.12, 0.12].forEach(x => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 20), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, -1.45, 4.0);
      tire.userData = { zoneId: 'landing_gear', name: 'Nose Wheel Tire' };
      boeingGroup.add(tire);
      clickableList.push(tire);
    });

    // Main Landing Gear Bogies
    [-1.3, 1.3].forEach(x => {
      const mainStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3), strutMat);
      mainStrut.position.set(x, -0.9, -0.5);
      mainStrut.userData = { zoneId: 'landing_gear', name: 'Main Landing Gear Shock Strut' };
      boeingGroup.add(mainStrut);
      clickableList.push(mainStrut);

      [-0.2, 0.2].forEach(zOffset => {
        [-0.15, 0.15].forEach(xOffset => {
          const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 20), tireMat);
          tire.rotation.z = Math.PI / 2;
          tire.position.set(x + xOffset, -1.45, -0.5 + zOffset);
          tire.userData = { zoneId: 'landing_gear', name: 'Main Gear Carbon Brake Tire' };
          boeingGroup.add(tire);
          clickableList.push(tire);
        });
      });
    });

    // 6. REFUELING PANEL & CARGO HOLD DOORS
    const fuelCapGeo = new THREE.BoxGeometry(0.34, 0.06, 0.34);
    const fuelCapMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2 });
    const fuelCap = new THREE.Mesh(fuelCapGeo, fuelCapMat);
    fuelCap.position.set(2.5, -0.15, 0.2);
    fuelCap.userData = { zoneId: 'fuel_panel', name: 'Single-Point Refueling Panel' };
    boeingGroup.add(fuelCap);
    clickableList.push(fuelCap);

    const cargoDoorGeo = new THREE.BoxGeometry(0.08, 0.55, 0.95);
    const cargoDoorMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
    const cargoDoor = new THREE.Mesh(cargoDoorGeo, cargoDoorMat);
    cargoDoor.position.set(0.74, -0.2, 1.8);
    cargoDoor.userData = { zoneId: 'cargo_doors', name: 'Forward Cargo Hold Door' };
    boeingGroup.add(cargoDoor);
    clickableList.push(cargoDoor);

    // 7. 3D HOTSPOT SPHERES & RINGS
    BOEING_ZONES.forEach((zone) => {
      const pinGeo = new THREE.SphereGeometry(0.28, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: zone.isVerified ? 0x10b981 : 0xf59e0b,
        transparent: true,
        opacity: 0.95
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(...zone.position);
      pin.userData = { zoneId: zone.id, name: zone.name };
      boeingGroup.add(pin);
      clickableList.push(pin);

      const ringGeo = new THREE.RingGeometry(0.35, 0.44, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: zone.isVerified ? 0x10b981 : 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(...zone.position);
      ring.rotation.x = Math.PI / 2;
      ring.userData = { zoneId: zone.id, name: zone.name };
      boeingGroup.add(ring);
      clickableList.push(ring);
    });

    clickableObjectsRef.current = clickableList;

    // =========================================================
    // RAYCASTING CLICK DETECTOR & COMPONENT HOVER HIGHLIGHTING
    // =========================================================
    let isDragging = false;
    let dragStartPosition = { x: 0, y: 0 };
    let previousMousePosition = { x: 0, y: 0 };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent) => {
      isDragging = false;
      dragStartPosition = { x: e.clientX, y: e.clientY };
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: MouseEvent) => {
      const deltaX = Math.abs(e.clientX - dragStartPosition.x);
      const deltaY = Math.abs(e.clientY - dragStartPosition.y);
      if (deltaX > 4 || deltaY > 4) {
        isDragging = true;
      }

      if (e.buttons === 1) {
        const moveX = e.clientX - previousMousePosition.x;
        const moveY = e.clientY - previousMousePosition.y;

        boeingGroup.rotation.y += moveX * 0.008;
        boeingGroup.rotation.x += moveY * 0.005;
        boeingGroup.rotation.x = Math.max(-0.6, Math.min(0.6, boeingGroup.rotation.x));
      } else {
        // Hover Raycasting
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
            container.style.cursor = 'pointer';
            const matchedZone = BOEING_ZONES.find(z => z.id === currObj!.userData.zoneId);
            setHoveredZone(matchedZone || null);
          } else {
            container.style.cursor = 'grab';
            setHoveredZone(null);
          }
        } else {
          container.style.cursor = 'grab';
          setHoveredZone(null);
        }
      }

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: MouseEvent) => {
      // Direct Component Click Handler
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
              if (targetZone) {
                setActiveZone(targetZone);
              }
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

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!isDragging) {
        boeingGroup.rotation.y += 0.002;
        boeingGroup.position.y = Math.sin(elapsedTime * 1.4) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', onPointerDown);
      domElement.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

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
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-xl shadow-md shadow-blue-900/30 flex items-center gap-1">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm font-mono text-white tracking-wider flex items-center gap-2">
                BOEING 787 DREAMLINER — BIMAN BANGLADESH 3D AIRFRAME ENGINE
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FLIGHT {flightNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span>Click directly on ANY Boeing aircraft part (Nose, Engines, Wings, Gear, Tail, Doors) to inspect</span>
            </p>
          </div>
        </div>

        {/* Department Filters & Fullscreen */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl font-mono text-xs overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Zones' },
              { id: 'mechanics', label: 'Mechanics' },
              { id: 'fuel', label: 'Fuel' },
              { id: 'cargo', label: 'Cargo' },
              { id: 'avionics', label: 'Avionics' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDepartmentFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  departmentFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
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

      {/* 3D WebGL Viewport */}
      <div ref={mountRef} className="w-full h-[580px] bg-slate-950 cursor-grab active:cursor-grabbing relative">
        {/* Floating Tooltip when hovering over aircraft parts */}
        {hoveredZone && (
          <div className="absolute top-20 left-6 z-30 pointer-events-none bg-emerald-950/90 border border-emerald-500/60 backdrop-blur-md px-4 py-2.5 rounded-2xl text-xs font-mono font-bold text-emerald-200 shadow-2xl flex items-center gap-2.5 animate-fadeIn">
            <MousePointer className="w-4 h-4 text-emerald-400 animate-bounce" />
            <div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Click to Inspect Component</p>
              <p className="text-sm font-extrabold text-white">{hoveredZone.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating 3D Zone Hotspots Control Overlay */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        <div className="p-3 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-2xl pointer-events-auto space-y-2.5 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Boeing Components ({verifiedZonesCount}/{totalZonesCount})
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

      {/* Bottom HUD HUD Navigation Guide */}
      <div className="absolute bottom-4 left-4 z-20 p-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl text-xs font-mono text-slate-300 pointer-events-none flex items-center gap-3">
        <span className="text-cyan-400 font-bold flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" /> 3D Direct Part Raycaster Active:
        </span>
        <span>Click ANY part on the Boeing plane to launch component checklist modal</span>
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
                      Boeing 787 Airframe Component · Department: <strong className="uppercase text-emerald-400">{activeZone.department}</strong>
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
                        item.isComplete
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
