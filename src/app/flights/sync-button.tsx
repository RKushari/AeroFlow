'use client';

import { useState } from 'react';
import { DownloadCloud, Loader2 } from 'lucide-react';
import { syncLiveToInternal } from '@/lib/actions/sync-flights';

export function SyncFlightsButton() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const result = await syncLiveToInternal();
      if (result.success) {
        setMessage(`Synced ${result.count} new flights!`);
      } else {
        setMessage(`Sync failed: ${result.error}`);
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs font-semibold text-emerald-600">{message}</span>}
      <button 
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
      >
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
        Sync from OpenSky
      </button>
    </div>
  );
}
