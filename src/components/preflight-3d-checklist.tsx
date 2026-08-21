'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
  ChevronDown,
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
    position: [0, 0.3, 3.8],
    description: 'Inspect weather radar radome, pitot-static tube covers removed, and angle-of-attack sensors.',
    isVerified: false,
    subItems: [
      { id: 'sub-nose-1', task: 'Radome surface free of bird strikes or structural cracks', isComplete: false, department: 'avionics' },
      { id: 'sub-nose-2', task: 'All pitot-static probe protective red covers removed', isComplete: false, department: 'avionics' },
      { id: 'sub-nose-3', task: 'Total Air Temp (TAT) and Alpha vane sensors unobstructed', isComplete: false, department: 'avionics' },
    ]
  },
  {
    id: 'engines',
    name: 'CFM56 / GE9x Turbofan Engines',
    department: 'mechanics',
    icon: 'wrench',
    position: [-2.0, -0.4, 0.4],
    description: 'Inspect engine intake cowlings, titanium fan blades for FOD nicks, and thrust reverser latches.',
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
    position: [0, -1.0, -0.4],
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
    position: [3.0, 0.1, -0.8],
    description: 'Inspect leading-edge slats, trailing-edge flaps, ailerons, winglets, and static discharge wicks.',
    isVerified: false,
    subItems: [
      { id: 'sub-wing-1', task: 'Leading-edge slats and Krueger flaps free of ice and contamination', isComplete: false, department: 'mechanics' },
      { id: 'sub-wing-2', task: 'Static discharge wicks intact on wingtips and blended winglets', isComplete: false, department: 'mechanics' },
      { id: 'sub-wing-3', task: 'Aileron and flight spoiler actuators free of hydraulic weeping', isComplete: false, department: 'mechanics' },
    ]
  },
  {
    id: 'fuel_panel',
    name: 'Refueling Receptacle & Sump Vents',
    department: 'fuel',
    icon: 'fuel',
    position: [2.2, -0.2, 0.2],
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
    position: [0.7, -0.3, 1.5],
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
    position: [-0.8, 0.4, 2.2],
    description: 'Inspect door seal integrity, slide girt bar status, and exterior handle stowage.',
    isVerified: false,
    subItems: [
      { id: 'sub-door-1', task: 'Main entrance L1/R1 doors exterior handle flush in locked position', isComplete: false, department: 'avionics' },
      { id: 'sub-door-2', task: 'Overwing emergency exit hatches locked and verified from exterior', isComplete: false, department: 'avionics' },
      { id: 'sub-door-3', task: 'Passenger boarding bridge / airstairs safety interlock disengaged', isComplete: false, department: 'avionics' },
    ]
  }
];

export const AVAILABLE_MODELS = [
  { id: 'B787_nologo.glb', label: 'Boeing 787 Dreamliner (amvlab Open-Source 3D)' },
  { id: 'B737_nologo.glb', label: 'Boeing 737-800 Twin-Jet (amvlab Open-Source 3D)' },
  { id: 'A350_nologo.glb', label: 'Airbus A350-900 Widebody (amvlab Open-Source 3D)' },
  { id: 'A380_nologo.glb', label: 'Airbus A380 Superjumbo (amvlab Open-Source 3D)' },
];

interface Preflight3DChecklistProps {
  flightId?: string;
  flightNumber?: string;
  dbChecklistItems?: Array<{ id: string; task: string; isComplete: boolean; isMandatory: boolean }>;
}

export function Preflight3DChecklist({
  flightId,
  flightNumber = 'AF-1042',
  dbChecklistItems = []
}: Preflight3DChecklistProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedModelFile, setSelectedModelFile] = useState<string>('B787_nologo.glb');
  const [zones, setZones] = useState<InspectionZone[]>(INITIAL_ZONES);
  const [activeZone, setActiveZone] = useState<InspectionZone | null>(null);
  const [hoveredZoneName, setHoveredZoneName] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'mechanics' | 'fuel' | 'cargo' | 'avionics'>('ALL');
  const [isPending, startTransition] = useTransition();
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);

  // Three.js state refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const aircraftGroupRef = useRef<THREE.Group | null>(null);
  const meshToZoneMapRef = useRef<Map<THREE.Mesh, string>>(new Map());

  const verifiedZonesCount = zones.filter(z => z.isVerified).length;
  const totalZonesCount = zones.length;
  const progressPercent = Math.round((verifiedZonesCount / totalZonesCount) * 100);

  // Initialize Three.js Scene with Direct Mesh Component Raycasting (NO SPHERE GLOBES)
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712); // slate-950
    scene.fog = new THREE.FogExp2(0x030712, 0.035);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(6, 4, 7);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.5);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 1.8);
    dirLight2.position.set(-10, -5, -10);
    scene.add(dirLight2);

    // Hologram Ground Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -1.8;
    scene.add(gridHelper);

    // Aircraft Group
    const aircraftGroup = new THREE.Group();
    scene.add(aircraftGroup);
    aircraftGroupRef.current = aircraftGroup;

    const meshToZoneMap = new Map<THREE.Mesh, string>();
    meshToZoneMapRef.current = meshToZoneMap;

    // Load amvlab GLTF / GLB model
    setIsLoadingModel(true);
    const loader = new GLTFLoader();
    const modelPath = `/models/${selectedModelFile}`;

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Auto-scale & center model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 7 / maxDim;

        model.scale.set(scale, scale, scale);
        model.position.sub(center.multiplyScalar(scale));

        // Traverse 3D airframe meshes and tag them for direct component clicking
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const worldPos = new THREE.Vector3();
            mesh.getWorldPosition(worldPos);

            // Determine zone ID based on 3D geometry coordinates and name
            let zoneId = 'cabin_doors';
            const nameLower = (mesh.name || '').toLowerCase();

            if (nameLower.includes('nose') || nameLower.includes('radome') || nameLower.includes('cockpit') || worldPos.z > 2.2) {
              zoneId = 'nose';
            } else if (nameLower.includes('engine') || nameLower.includes('fan') || nameLower.includes('nacelle') || (Math.abs(worldPos.x) > 1.2 && worldPos.y < 0.2 && Math.abs(worldPos.z) < 1.5)) {
              zoneId = 'engines';
            } else if (nameLower.includes('wing') || nameLower.includes('flap') || nameLower.includes('slat') || nameLower.includes('aileron') || Math.abs(worldPos.x) > 2.0) {
              zoneId = 'wings';
            } else if (nameLower.includes('gear') || nameLower.includes('wheel') || nameLower.includes('tire') || nameLower.includes('strut') || worldPos.y < -0.4) {
              zoneId = 'landing_gear';
            } else if (nameLower.includes('fuel') || nameLower.includes('tank')) {
              zoneId = 'fuel_panel';
            } else if (nameLower.includes('cargo') || nameLower.includes('door')) {
              zoneId = 'cargo_doors';
            }

            mesh.userData = { zoneId };
            meshToZoneMap.set(mesh, zoneId);

            // Biman Emerald / Pearl White styling
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => {
                  if ('metalness' in m) (m as THREE.MeshStandardMaterial).metalness = 0.4;
                  if ('roughness' in m) (m as THREE.MeshStandardMaterial).roughness = 0.3;
                });
              } else if ('metalness' in mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.metalness = 0.4;
                mat.roughness = 0.3;
              }
            }
          }
        });

        aircraftGroup.add(model);
        setIsLoadingModel(false);
      },
      undefined,
      (err) => {
        console.warn("Failed loading GLTF GLB from amvlab models, using procedural geometry fallback:", err);
        setIsLoadingModel(false);

        // Procedural 3D Airframe Fallback with tagged component meshes
        const fuselageGeo = new THREE.CylinderGeometry(0.7, 0.7, 9, 32);
        const fuselageMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
        const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.userData = { zoneId: 'cabin_doors' };
        meshToZoneMap.set(fuselage, 'cabin_doors');
        aircraftGroup.add(fuselage);

        const noseGeo = new THREE.ConeGeometry(0.7, 2, 32);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.9 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = 5.5;
        nose.userData = { zoneId: 'nose' };
        meshToZoneMap.set(nose, 'nose');
        aircraftGroup.add(nose);
      }
    );

    // Direct Raycast Mouse Interaction (No Globes)
    let isDragging = false;
    let dragDistance = 0;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragDistance = 0;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

        aircraftGroup.rotation.y += deltaX * 0.008;
        aircraftGroup.rotation.x += deltaY * 0.005;
        aircraftGroup.rotation.x = Math.max(-0.6, Math.min(0.6, aircraftGroup.rotation.x));
        previousMousePosition = { x: e.clientX, y: e.clientY };
        return;
      }

      // Raycast hover check for direct 3D component highlights
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(aircraftGroup.children, true);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const zoneId = hitMesh.userData?.zoneId || meshToZoneMap.get(hitMesh);
        if (zoneId) {
          domElement.style.cursor = 'pointer';
          const zone = INITIAL_ZONES.find(z => z.id === zoneId);
          if (zone) {
            setHoveredZoneName(zone.name);
          }
          return;
        }
      }
      domElement.style.cursor = 'grab';
      setHoveredZoneName(null);
    };

    const onMouseUp = (e: MouseEvent) => {
      // Direct Mesh Component Click Detection
      if (dragDistance < 5) {
        const rect = domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(aircraftGroup.children, true);

        if (intersects.length > 0) {
          for (const hit of intersects) {
            const hitMesh = hit.object as THREE.Mesh;
            const zoneId = hitMesh.userData?.zoneId || meshToZoneMap.get(hitMesh);
            if (zoneId) {
              setZones(currentZones => {
                const targetZone = currentZones.find(z => z.id === zoneId);
                if (targetZone) {
                  setActiveZone(targetZone);
                }
                return currentZones;
              });
              break;
            }
          }
        }
      }
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!isDragging) {
        aircraftGroup.rotation.y += 0.002;
        aircraftGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animationFrameId);
      
      try {
        if (container && domElement && container.contains(domElement)) {
          container.removeChild(domElement);
        }
      } catch (e) {
        // Suppress DOM removal errors
      }

      renderer.dispose();
    };
  }, [selectedModelFile]);

  // Highlight 3D Airframe Meshes directly when verified (Green tint on inspected parts)
  useEffect(() => {
    if (!aircraftGroupRef.current) return;
    const group = aircraftGroupRef.current;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const zoneId = mesh.userData?.zoneId || meshToZoneMapRef.current.get(mesh);
        if (zoneId) {
          const zone = zones.find(z => z.id === zoneId);
          if (zone && zone.isVerified) {
            if (mesh.material && 'color' in mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981); // Emerald Green
            }
          }
        }
      }
    });
  }, [zones]);

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
      <div className="absolute top-0 inset-x-0 p-4 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 z-20 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-md shadow-emerald-900/30">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm font-mono text-white tracking-wider">
                3D DIRECT AIRFRAME INSPECTION ENGINE (amvlab GLTF)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FLIGHT {flightNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Click Any Aircraft Component Directly on 3D Model to Open Inspection Checklist
            </p>
          </div>
        </div>

        {/* Model Selector & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Aircraft Model Dropdown */}
          <div className="relative">
            <select
              value={selectedModelFile}
              onChange={(e) => setSelectedModelFile(e.target.value)}
              className="appearance-none bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold px-3 py-1.5 pr-8 rounded-xl cursor-pointer hover:border-emerald-400 focus:outline-none"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl font-mono text-xs overflow-x-auto">
            {[
              { id: 'ALL', label: 'All' },
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

      {/* Loading Overlay */}
      {isLoadingModel && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm font-mono text-xs text-emerald-400">
          <div className="flex items-center gap-3 bg-slate-900 border border-emerald-500/30 px-5 py-3 rounded-2xl shadow-2xl">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading 3D Aircraft glTF Model ({selectedModelFile})...</span>
          </div>
        </div>
      )}

      {/* Real-time Component Hover Badge */}
      <AnimatePresence>
        {hoveredZoneName && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-6 z-20 bg-slate-900/90 border border-emerald-500/50 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-mono text-emerald-300 font-bold shadow-xl flex items-center gap-2 pointer-events-none"
          >
            <MousePointer className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>Click Component to Inspect: <strong className="text-white">{hoveredZoneName}</strong></span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-[520px] bg-slate-950 cursor-grab active:cursor-grabbing" />

      {/* Floating Zone Inspection List Control Overlay */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        <div className="p-3 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-2xl pointer-events-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Inspection Zones ({verifiedZonesCount}/{totalZonesCount})
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
                    zone.isVerified ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400'
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

      {/* Bottom HUD Instructions */}
      <div className="absolute bottom-4 left-4 z-20 p-2.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400 pointer-events-none hidden sm:flex items-center gap-3">
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Direct Component Selection:
        </span>
        <span>Click Nose, Engines, Wings, Landing Gear or Fuselage directly on 3D Model to launch inspection checklist</span>
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

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {activeZone.description}
              </p>

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
