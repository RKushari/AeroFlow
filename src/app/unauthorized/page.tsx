import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="glass-card p-10 max-w-lg w-full rounded-2xl flex flex-col items-center text-center border border-red-500/20">
        <div className="p-4 rounded-full bg-red-500/20 text-red-500 mb-6">
          <ShieldAlert size={48} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
        <p className="text-white/60 mb-8 leading-relaxed">
          You do not have the required role privileges to access this workspace. All cross-dashboard access attempts are logged for security auditing.
        </p>
        <Link 
          href="/" 
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Return to Home
        </Link>
      </div>
    </div>
  );
}
