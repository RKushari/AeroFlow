'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import * as THREE from 'three';
import { 
  CheckCircle2, 
  AlertCircle, 
  Fuel, 
  Package, 
  Wrench, 
  ShieldCheck, 
  X, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Layers, 
  Eye, 
  Check, 
  Sparkles,
  Plane,
  MousePointer
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
  position: [number, number, number]; // 3D coordinates on airframe
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
    name: 'GEnx Turbofan Engines (Port & Stbd)',
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

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 540;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // slate-950
    scene.fog = new THREE.FogExp2(0x020617, 0.03);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(7.5, 4.8, 8.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
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

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xffffff, 3.2);
    mainSun.position.set(12, 20, 15);
    mainSun.castShadow = true;
    scene.add(mainSun);

    const bimanFill = new THREE.DirectionalLight(0x059669, 1.8); // Emerald Green rim light
    bimanFill.position.set(-15, -8, -10);
    scene.add(bimanFill);

    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.5);
    cyanRim.position.set(0, 10, -15);
    scene.add(cyanRim);

    // Holographic Circular Platform Grid
    const gridHelper = new THREE.GridHelper(26, 26, 0x059669, 0x1e293b);
    gridHelper.position.y = -1.8;
    scene.add(gridHelper);

    // Aircraft Group
    const aircraftGroup = new THREE.Group();
    scene.add(aircraftGroup);

    const clickableList: THREE.Object3D[] = [];

    // =========================================================
    // REALISTIC BOEING 787 DREAMLINER - BIMAN BANGLADESH LIVERY
    // =========================================================

    const BIMAN_GREEN = 0x006a4e; // Emerald Green
    const BIMAN_RED = 0xe11d48;   // Biman Sun Red
    const PEARL_WHITE = 0xffffff; // Bright Pure White
    const SILVER_WING = 0xd1d5db; // Metallic Aircraft Aluminum
    const TITANIUM_DARK = 0x1e293b;

    // 1. Aerodynamic Contoured Fuselage (Lathe / Smooth Tube)
    // Create smooth nose cone to tail taper profile points
    const points: THREE.Vector2[] = [];
    // Tail tip to rear fuselage
    points.push(new THREE.Vector2(0.08, -4.8));
    points.push(new THREE.Vector2(0.35, -4.4));
    points.push(new THREE.Vector2(0.68, -3.5));
    // Main fuselage tube
    points.push(new THREE.Vector2(0.75, -2.0));
    points.push(new THREE.Vector2(0.75, 2.5));
    // Streamlined curved nose cone
    points.push(new THREE.Vector2(0.72, 3.8));
    points.push(new THREE.Vector2(0.55, 4.6));
    points.push(new THREE.Vector2(0.28, 5.2));
    points.push(new THREE.Vector2(0.05, 5.5));

    const fuselageGeo = new THREE.LatheGeometry(points, 48);
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: PEARL_WHITE,
      roughness: 0.12,
      metalness: 0.25,
    });
    const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.userData = { zoneId: 'cabin_doors' };
    aircraftGroup.add(fuselage);
    clickableList.push(fuselage);

    // Biman Bangladesh Green Cheatline Stripe (Emerald Green side ribbon)
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

    // 2. Streamlined Cockpit Windshield (Boeing 787 Curved 4-Panel Glass)
    const cockpitGeo = new THREE.BoxGeometry(0.68, 0.32, 0.6);
    const cockpitMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x38bdf8, 
      roughness: 0.1, 
      metalness: 0.9, 
      transmission: 0.6,
      transparent: true,
      opacity: 0.9
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.48, 4.45);
    cockpit.rotation.x = -0.32;
    cockpit.userData = { zoneId: 'nose' };
    aircraftGroup.add(cockpit);
    clickableList.push(cockpit);

    // Metallic Pitot Probe Sensors
    const pitotGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
    const pitotMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const leftPitot = new THREE.Mesh(pitotGeo, pitotMat);
    leftPitot.rotation.z = Math.PI / 2;
    leftPitot.position.set(-0.76, 0.2, 4.8);
    leftPitot.userData = { zoneId: 'nose' };
    aircraftGroup.add(leftPitot);
    clickableList.push(leftPitot);

    const rightPitot = new THREE.Mesh(pitotGeo, pitotMat);
    rightPitot.rotation.z = Math.PI / 2;
    rightPitot.position.set(0.76, 0.2, 4.8);
    rightPitot.userData = { zoneId: 'nose' };
    aircraftGroup.add(rightPitot);
    clickableList.push(rightPitot);

    // 3. Swept Aerodynamic Main Wings with Dihedral Angle & Raked Wingtips
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(4.8, -2.8);
    wingShape.lineTo(4.6, -3.5);
    wingShape.lineTo(0, -1.3);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    const wingMat = new THREE.MeshStandardMaterial({ color: SILVER_WING, metalness: 0.6, roughness: 0.25 });

    // Right Swept Wing
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotation.x = Math.PI / 2;
    rightWing.rotation.z = 0.07; // Dihedral angle
    rightWing.position.set(0.65, 0, 0.5);
    rightWing.userData = { zoneId: 'wings' };
    aircraftGroup.add(rightWing);
    clickableList.push(rightWing);

    // Left Swept Wing
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.rotation.y = Math.PI;
    leftWing.rotation.z = -0.07; // Dihedral angle
    leftWing.position.set(-0.65, 0, 0.5);
    leftWing.userData = { zoneId: 'wings' };
    aircraftGroup.add(leftWing);
    clickableList.push(leftWing);

    // Under-wing Flap Track Fairings (Canoe Pods)
    const canoeGeo = new THREE.CylinderGeometry(0.06, 0.02, 0.9);
    const canoeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });

    [-3.2, -2.1, 2.1, 3.2].forEach(x => {
      const canoe = new THREE.Mesh(canoeGeo, canoeMat);
      canoe.rotation.x = Math.PI / 2;
      canoe.position.set(x, -0.15, -1.8);
      canoe.userData = { zoneId: 'wings' };
      aircraftGroup.add(canoe);
      clickableList.push(canoe);
    });

    // Biman Winglets (Green with Red Sun Tip)
    const wingletGeo = new THREE.BoxGeometry(0.07, 0.8, 0.5);
    const wingletMat = new THREE.MeshStandardMaterial({ color: BIMAN_GREEN, roughness: 0.2 });
    const wingletRedMat = new THREE.MeshBasicMaterial({ color: BIMAN_RED });

    const rwWinglet = new THREE.Mesh(wingletGeo, wingletMat);
    rwWinglet.position.set(4.8, 0.45, -2.8);
    rwWinglet.rotation.z = 0.4;
    rwWinglet.userData = { zoneId: 'wings' };
    aircraftGroup.add(rwWinglet);
    clickableList.push(rwWinglet);

    const rwWingletTip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.5), wingletRedMat);
    rwWingletTip.position.set(4.9, 0.8, -2.8);
    rwWingletTip.rotation.z = 0.4;
    rwWingletTip.userData = { zoneId: 'wings' };
    aircraftGroup.add(rwWingletTip);
    clickableList.push(rwWingletTip);

    const lwWinglet = new THREE.Mesh(wingletGeo, wingletMat);
    lwWinglet.position.set(-4.8, 0.45, -2.8);
    lwWinglet.rotation.z = -0.4;
    lwWinglet.userData = { zoneId: 'wings' };
    aircraftGroup.add(lwWinglet);
    clickableList.push(lwWinglet);

    const lwWingletTip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.5), wingletRedMat);
    lwWingletTip.position.set(-4.9, 0.8, -2.8);
    lwWingletTip.rotation.z = -0.4;
    lwWingletTip.userData = { zoneId: 'wings' };
    aircraftGroup.add(lwWingletTip);
    clickableList.push(lwWingletTip);

    // 4. GEnx High-Bypass Turbofan Engines (Biman Emerald Green Nacelle + Titanium Blades)
    const engineNacelleGeo = new THREE.CylinderGeometry(0.42, 0.38, 2.1, 32);
    const engineNacelleMat = new THREE.MeshStandardMaterial({ color: BIMAN_GREEN, metalness: 0.4, roughness: 0.25 });
    const chromeRimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.05 });
    const fanSpinnerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });

    // Engine Mounting Pylons
    const pylonGeo = new THREE.BoxGeometry(0.1, 0.4, 1.2);
    const pylonMat = new THREE.MeshStandardMaterial({ color: SILVER_WING });

    // Right Engine Assembly
    const rightPylon = new THREE.Mesh(pylonGeo, pylonMat);
    rightPylon.position.set(2.0, -0.1, 0.5);
    rightPylon.userData = { zoneId: 'engines' };
    aircraftGroup.add(rightPylon);
    clickableList.push(rightPylon);

    const rightEngine = new THREE.Mesh(engineNacelleGeo, engineNacelleMat);
    rightEngine.rotation.x = Math.PI / 2;
    rightEngine.position.set(2.0, -0.45, 0.5);
    rightEngine.userData = { zoneId: 'engines' };
    aircraftGroup.add(rightEngine);
    clickableList.push(rightEngine);

    const rightEngineRim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 16, 32), chromeRimMat);
    rightEngineRim.position.set(2.0, -0.45, 1.55);
    rightEngineRim.userData = { zoneId: 'engines' };
    aircraftGroup.add(rightEngineRim);
    clickableList.push(rightEngineRim);

    const rightSpinner = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 16), fanSpinnerMat);
    rightSpinner.rotation.x = Math.PI / 2;
    rightSpinner.position.set(2.0, -0.45, 1.45);
    rightSpinner.userData = { zoneId: 'engines' };
    aircraftGroup.add(rightSpinner);
    clickableList.push(rightSpinner);

    // Left Engine Assembly
    const leftPylon = new THREE.Mesh(pylonGeo, pylonMat);
    leftPylon.position.set(-2.0, -0.1, 0.5);
    leftPylon.userData = { zoneId: 'engines' };
    aircraftGroup.add(leftPylon);
    clickableList.push(leftPylon);

    const leftEngine = new THREE.Mesh(engineNacelleGeo, engineNacelleMat);
    leftEngine.rotation.x = Math.PI / 2;
    leftEngine.position.set(-2.0, -0.45, 0.5);
    leftEngine.userData = { zoneId: 'engines' };
    aircraftGroup.add(leftEngine);
    clickableList.push(leftEngine);

    const leftEngineRim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 16, 32), chromeRimMat);
    leftEngineRim.position.set(-2.0, -0.45, 1.55);
    leftEngineRim.userData = { zoneId: 'engines' };
    aircraftGroup.add(leftEngineRim);
    clickableList.push(leftEngineRim);

    const leftSpinner = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 16), fanSpinnerMat);
    leftSpinner.rotation.x = Math.PI / 2;
    leftSpinner.position.set(-2.0, -0.45, 1.45);
    leftSpinner.userData = { zoneId: 'engines' };
    aircraftGroup.add(leftSpinner);
    clickableList.push(leftSpinner);

    // 5. Biman Emerald Green Swept Vertical Stabilizer & Red Sun Logo
    const vertTailShape = new THREE.Shape();
    vertTailShape.moveTo(0, 0);
    vertTailShape.lineTo(0.08, 0);
    vertTailShape.lineTo(-1.2, 2.4);
    vertTailShape.lineTo(-1.8, 2.4);
    vertTailShape.closePath();

    const vertTailGeo = new THREE.ExtrudeGeometry(vertTailShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    const vertTailMat = new THREE.MeshStandardMaterial({ color: BIMAN_GREEN, roughness: 0.25 });
    const vertTail = new THREE.Mesh(vertTailGeo, vertTailMat);
    vertTail.position.set(-0.05, 0.6, -3.2);
    vertTail.userData = { zoneId: 'cabin_doors' };
    aircraftGroup.add(vertTail);
    clickableList.push(vertTail);

    // Iconic Biman Red Stork / Sun Emblem Disk on Tail
    const sunDiscGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.1, 32);
    const sunDiscMat = new THREE.MeshBasicMaterial({ color: BIMAN_RED });
    
    const leftSunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
    leftSunDisc.rotation.z = Math.PI / 2;
    leftSunDisc.position.set(-0.06, 1.8, -4.2);
    leftSunDisc.userData = { zoneId: 'cabin_doors' };
    aircraftGroup.add(leftSunDisc);
    clickableList.push(leftSunDisc);

    const rightSunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
    rightSunDisc.rotation.z = Math.PI / 2;
    rightSunDisc.position.set(0.06, 1.8, -4.2);
    rightSunDisc.userData = { zoneId: 'cabin_doors' };
    aircraftGroup.add(rightSunDisc);
    clickableList.push(rightSunDisc);

    // Horizontal Tail Stabilizers
    const horizTailGeo = new THREE.BoxGeometry(3.6, 0.06, 0.9);
    const horizTail = new THREE.Mesh(horizTailGeo, wingMat);
    horizTail.position.set(0, 0.45, -4.6);
    horizTail.userData = { zoneId: 'wings' };
    aircraftGroup.add(horizTail);
    clickableList.push(horizTail);

    // 6. Detailed Landing Gear Assembly (Struts, Oleo Pistons & Tires)
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const tireMat = new THREE.MeshStandardMaterial({ color: TITANIUM_DARK, roughness: 0.85 });

    // Nose Gear (Dual Wheels)
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3), strutMat);
    noseStrut.position.set(0, -0.9, 4.0);
    noseStrut.userData = { zoneId: 'landing_gear' };
    aircraftGroup.add(noseStrut);
    clickableList.push(noseStrut);

    const noseTireL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 20), tireMat);
    noseTireL.rotation.z = Math.PI / 2;
    noseTireL.position.set(-0.12, -1.45, 4.0);
    noseTireL.userData = { zoneId: 'landing_gear' };
    aircraftGroup.add(noseTireL);
    clickableList.push(noseTireL);

    const noseTireR = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 20), tireMat);
    noseTireR.rotation.z = Math.PI / 2;
    noseTireR.position.set(0.12, -1.45, 4.0);
    noseTireR.userData = { zoneId: 'landing_gear' };
    aircraftGroup.add(noseTireR);
    clickableList.push(noseTireR);

    // Main Gear Left & Right (4-Wheel Bogie Assemblies)
    [-1.3, 1.3].forEach(x => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3), strutMat);
      strut.position.set(x, -0.9, -0.5);
      strut.userData = { zoneId: 'landing_gear' };
      aircraftGroup.add(strut);
      clickableList.push(strut);

      [-0.2, 0.2].forEach(zOffset => {
        const tireL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 20), tireMat);
        tireL.rotation.z = Math.PI / 2;
        tireL.position.set(x - 0.15, -1.45, -0.5 + zOffset);
        tireL.userData = { zoneId: 'landing_gear' };
        aircraftGroup.add(tireL);
        clickableList.push(tireL);

        const tireR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 20), tireMat);
        tireR.rotation.z = Math.PI / 2;
        tireR.position.set(x + 0.15, -1.45, -0.5 + zOffset);
        tireR.userData = { zoneId: 'landing_gear' };
        aircraftGroup.add(tireR);
        clickableList.push(tireR);
      });
    });

    // 7. Refueling Panel & Cargo Door Hatch Details
    const fuelCapGeo = new THREE.BoxGeometry(0.32, 0.06, 0.32);
    const fuelCapMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2 });
    const fuelCap = new THREE.Mesh(fuelCapGeo, fuelCapMat);
    fuelCap.position.set(2.5, -0.15, 0.2);
    fuelCap.userData = { zoneId: 'fuel_panel' };
    aircraftGroup.add(fuelCap);
    clickableList.push(fuelCap);

    const cargoDoorGeo = new THREE.BoxGeometry(0.08, 0.55, 0.95);
    const cargoDoorMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
    const cargoDoor = new THREE.Mesh(cargoDoorGeo, cargoDoorMat);
    cargoDoor.position.set(0.72, -0.2, 1.8);
    cargoDoor.userData = { zoneId: 'cargo_doors' };
    aircraftGroup.add(cargoDoor);
    clickableList.push(cargoDoor);

    // Create 3D Hotspot Sphere Pins
    const hotspotMap = new Map<string, THREE.Mesh>();

    zones.forEach((zone) => {
      const pinGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: zone.isVerified ? 0x10b981 : 0xf59e0b, // Green if verified, Yellow/Amber if pending
        transparent: true,
        opacity: 0.95
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(...zone.position);
      pin.userData = { zoneId: zone.id };
      aircraftGroup.add(pin);
      hotspotMap.set(zone.id, pin);
      clickableList.push(pin);

      // Outer Pulsing Glow Ring
      const ringGeo = new THREE.RingGeometry(0.32, 0.4, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: zone.isVerified ? 0x10b981 : 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(...zone.position);
      ring.rotation.x = Math.PI / 2;
      ring.userData = { zoneId: zone.id };
      aircraftGroup.add(ring);
      clickableList.push(ring);
    });

    hotspotMeshesRef.current = hotspotMap;
    clickableObjectsRef.current = clickableList;

    // =========================================================
    // INTERACTIVE 3D RAYCASTING CLICKING & ORBIT DRAGGING
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

      // Drag Orbit Rotation
      if (e.buttons === 1) {
        const moveX = e.clientX - previousMousePosition.x;
        const moveY = e.clientY - previousMousePosition.y;

        aircraftGroup.rotation.y += moveX * 0.008;
        aircraftGroup.rotation.x += moveY * 0.005;

        // Limit pitch
        aircraftGroup.rotation.x = Math.max(-0.6, Math.min(0.6, aircraftGroup.rotation.x));
      } else {
        // Hover Raycast for Interactive Cursor & Tooltip
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
            const hovered = INITIAL_ZONES.find(z => z.id === currObj!.userData.zoneId);
            setHoveredZoneName(hovered ? hovered.name : null);
          } else {
            container.style.cursor = 'grab';
            setHoveredZoneName(null);
          }
        } else {
          container.style.cursor = 'grab';
          setHoveredZoneName(null);
        }
      }

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: MouseEvent) => {
      // Raycast Click Detection (if mouse moved less than 5px)
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

      // Gentle continuous hover floating if not user dragging
      if (!isDragging) {
        aircraftGroup.rotation.y += 0.0018;
        aircraftGroup.position.y = Math.sin(elapsedTime * 1.4) * 0.07;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 540;
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

  // Update 3D hotspot colors when zone verification changes (Yellow -> Green)
  useEffect(() => {
    zones.forEach((zone) => {
      const mesh = hotspotMeshesRef.current.get(zone.id);
      if (mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.color.setHex(zone.isVerified ? 0x10b981 : 0xf59e0b);
      }
    });
  }, [zones]);

  // Handle Completing a Sub-item in the modal
  const handleToggleSubItem = (zoneId: string, subItemId: string) => {
    setZones(prev => prev.map(zone => {
      if (zone.id !== zoneId) return zone;

      const updatedSubItems = zone.subItems.map(item => {
        if (item.id === subItemId) {
          return { ...item, isComplete: !item.isComplete };
        }
        return item;
      });

      const allDone = updatedSubItems.every(i => i.isComplete);
      return {
        ...zone,
        subItems: updatedSubItems,
        isVerified: allDone
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

  // Confirm All Sub-items for a zone (turns Yellow -> Green)
  const handleConfirmZone = (zoneId: string) => {
    startTransition(async () => {
      // Complete all items in state
      setZones(prev => prev.map(zone => {
        if (zone.id !== zoneId) return zone;
        return {
          ...zone,
          isVerified: true,
          subItems: zone.subItems.map(i => ({ ...i, isComplete: true }))
        };
      }));

      // Trigger server actions for matching DB items if any
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
      <div className="absolute top-0 inset-x-0 p-4 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 z-20 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-1">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm font-mono text-white tracking-wider flex items-center gap-2">
                BIMAN BANGLADESH AIRLINES — 3D AIRFRAME INSPECTION ENGINE
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FLIGHT {flightNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              <span>Boeing 787 Dreamliner · Biman White Livery · Interactive 3D Raycasting</span>
            </p>
          </div>
        </div>

        {/* Department Filters & Fullscreen */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl font-mono text-xs overflow-x-auto">
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
                    ? 'bg-emerald-600 text-white shadow-xs'
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

      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-[540px] bg-slate-950 cursor-grab active:cursor-grabbing relative">
        {/* Raycast Hover Tooltip Badge */}
        {hoveredZoneName && (
          <div className="absolute top-20 left-6 z-30 pointer-events-none bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-emerald-200 shadow-xl flex items-center gap-2 animate-fadeIn">
            <MousePointer className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>Click to inspect: <strong>{hoveredZoneName}</strong></span>
          </div>
        )}
      </div>

      {/* Floating 3D Zone Hotspots Control Overlay */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        <div className="p-3 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-2xl pointer-events-auto space-y-2">
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

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Hotspots List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {filteredZones.map(zone => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setActiveZone(zone)}
                className={`w-full p-2 rounded-xl text-left text-xs font-mono flex items-center justify-between transition-all border cursor-pointer ${
                  zone.isVerified
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200 hover:bg-emerald-950/50'
                    : 'bg-slate-900/80 border-amber-500/40 text-amber-200 hover:bg-amber-950/40 hover:border-amber-400'
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
                  {zone.isVerified ? 'VERIFIED' : 'PENDING'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom HUD Orbit Instructions */}
      <div className="absolute bottom-4 left-4 z-20 p-2.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400 pointer-events-none hidden sm:flex items-center gap-3">
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Interactive 3D Biman Airframe:
        </span>
        <span>Click ANY part of the plane (Nose, Engines, Wings, Gear, Tail, Doors) to inspect · Drag to orbit</span>
      </div>

      {/* Modal Dialog for Active Inspection Zone */}
      <AnimatePresence>
        {activeZone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-100 font-mono"
            >
              {/* Modal Header */}
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
                      Department: <strong className="uppercase text-emerald-400">{activeZone.department}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveZone(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Zone Description */}
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {activeZone.description}
              </p>

              {/* Sub-Items Checklist */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Mandatory Inspection Points</span>
                  <span>{activeZone.subItems.filter(i => i.isComplete).length} / {activeZone.subItems.length} Checked</span>
                </div>

                <div className="space-y-2">
                  {activeZone.subItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleSubItem(activeZone.id, item.id)}
                      className={`p-3 rounded-xl border text-xs flex items-start gap-3 cursor-pointer transition-all ${
                        item.isComplete
                          ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
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

              {/* Modal Footer / Confirm Verification */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className={`w-2 h-2 rounded-full ${
                    activeZone.isVerified ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span>{activeZone.isVerified ? 'Status: Green (Inspected)' : 'Status: Yellow (Incomplete)'}</span>
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
