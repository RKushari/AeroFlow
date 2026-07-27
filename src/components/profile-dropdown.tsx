'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, ShieldCheck, User, ChevronDown, LogOut, Settings, X, Save, Image as ImageIcon, Trash2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { getProfileSettings, updateProfileSettings } from '@/lib/actions/profile';

export default function ProfileDropdown({ session }: { session: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState({
    name: session?.user?.name || 'Loading...',
    email: session?.user?.email || 'loading@aeroflow.com',
    role: session?.user?.role || 'Loading...',
    pictureUrl: null as string | null,
    status: 'ON_DUTY' as 'ON_DUTY' | 'OFF_DUTY',
  });
  
  const [editPicture, setEditPicture] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'ON_DUTY' | 'OFF_DUTY'>('ON_DUTY');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfileSettings().then(data => {
      if (data) {
        setProfile(prev => ({
          ...prev,
          name: data.name || prev.name,
          email: data.email || prev.email,
          role: data.email === 'johndoe@gmail.com' ? 'SUPER_ADMIN' : data.role,
          pictureUrl: data.pictureUrl,
          status: data.status,
        }));
        setEditPicture(data.pictureUrl);
        setEditStatus(data.status);
      }
    });
  }, []);

  const getAuthorityLevel = (role: string) => {
    if (role === 'SUPER_ADMIN') return 4;
    if (role === 'OPERATIONS_DIRECTOR') return 3;
    if (role === 'FLIGHT_DISPATCHER') return 2;
    return 1;
  };

  const getRoleDisplayName = (role: string) => {
    if (role === 'SUPER_ADMIN') return 'SUPER ADMIN';
    if (role === 'OPERATIONS_DIRECTOR') return 'DIRECTOR';
    if (role === 'FLIGHT_DISPATCHER') return 'DISPATCHER';
    return 'GROUND CREW';
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role: string) => {
    if (role === 'SUPER_ADMIN') return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60';
    if (role === 'OPERATIONS_DIRECTOR') return 'text-purple-400 bg-purple-950/40 border-purple-800/60';
    if (role === 'FLIGHT_DISPATCHER') return 'text-blue-400 bg-blue-950/40 border-blue-800/60';
    return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
  };

  const getRoleIcon = (role: string) => {
    if (role === 'SUPER_ADMIN') return <ShieldAlert className="w-4 h-4 text-cyan-400" />;
    if (role === 'OPERATIONS_DIRECTOR') return <Shield className="w-4 h-4 text-purple-400" />;
    if (role === 'FLIGHT_DISPATCHER') return <ShieldCheck className="w-4 h-4 text-blue-400" />;
    return <User className="w-4 h-4 text-emerald-400" />;
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await updateProfileSettings(editPicture, editStatus);
    setProfile(prev => ({ ...prev, pictureUrl: editPicture, status: editStatus }));
    setIsSettingsOpen(false);
    setIsSaving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const authorityLevel = getAuthorityLevel(profile.role);
  
  // Neon Green for ON_DUTY, Bright Red for OFF_DUTY
  const statusRingColor = profile.status === 'ON_DUTY' ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]' : 'ring-2 ring-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]';

  return (
    <>
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-[#121E36] transition-colors focus:outline-none"
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 overflow-hidden transition-all ${statusRingColor}`}>
          {profile.pictureUrl ? (
            <img src={profile.pictureUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : profile.role === 'SUPER_ADMIN' ? (
            <span className="text-xs font-bold text-cyan-400">JD</span>
          ) : (
            <span className="text-xs font-bold text-slate-300">
              {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-slate-300" />}
            </span>
          )}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-medium text-slate-200 leading-tight">
            {profile.email}
          </span>
          <span className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
            {profile.status === 'ON_DUTY' ? <span className="text-emerald-400 font-semibold">ON DUTY</span> : <span className="text-red-400 font-semibold">OFF DUTY</span>} • Lvl {authorityLevel}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="px-4 py-4 border-b border-slate-800/80">
            <p className="text-xs text-slate-400 font-medium">Active AeroFlow Profile</p>
            <p className="text-sm font-semibold text-slate-100 truncate mt-0.5">
              {profile.email}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getRoleBadgeColor(profile.role)}`}>
                {getRoleIcon(profile.role)}
                {getRoleDisplayName(profile.role)}
              </span>
            </div>
          </div>

          <div className="px-4 py-3.5 space-y-2 border-b border-slate-800/80 bg-slate-900/30">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Current Status:</span>
              <span className={`font-semibold ${profile.status === 'ON_DUTY' ? 'text-emerald-400' : 'text-red-400'}`}>{profile.status === 'ON_DUTY' ? 'ON DUTY' : 'OFF DUTY'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Authority Access:</span>
              <span className="font-mono text-cyan-400 font-bold">
                Level {authorityLevel} / 4
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Bypass Permissions:</span>
              <span className={`font-semibold ${profile.role === 'SUPER_ADMIN'? 'text-emerald-400' : 'text-slate-500'}`}>
                {profile.role === 'SUPER_ADMIN'? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>

          <div className="p-1">
            <button
              onClick={() => { 
                setEditPicture(profile.pictureUrl);
                setEditStatus(profile.status);
                setIsSettingsOpen(true); 
                setIsOpen(false); 
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800/40 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Profile Configuration
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/api/auth/signin' })}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-950/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 text-rose-400/80" />
              Log Out Session
            </button>
          </div>
        </div>
      )}
    </div>

    {isSettingsOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div ref={modalRef} className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
          <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
          
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="text-blue-400" size={18} /> Profile Configuration
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                  {editPicture ? (
                    <img src={editPicture} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-slate-500" />
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-600 transition-colors"
                  >
                    <ImageIcon size={14} /> Upload Image
                  </button>
                  {editPicture && (
                    <button 
                      onClick={() => setEditPicture(null)}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 text-xs font-medium rounded border border-rose-900/50 transition-colors"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Availability Status</label>
              <select 
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as 'ON_DUTY' | 'OFF_DUTY')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none" 
              >
                <option value="ON_DUTY">On Duty (Available)</option>
                <option value="OFF_DUTY">Off Duty (Unavailable)</option>
              </select>
            </div>
            
            <button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
