import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-6 items-center justify-center min-h-[70vh]">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AeroFlow Operations
        </h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Secure, mobile-first aviation safety and risk intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-8">
        <Link
          href="/dispatcher"
          className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center flex flex-col gap-2"
        >
          <span className="font-semibold text-lg">Flight Dispatcher</span>
          <span className="text-sm text-slate-500">Approve & Monitor</span>
        </Link>
        <Link
          href="/crew"
          className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center flex flex-col gap-2"
        >
          <span className="font-semibold text-lg">Ground Crew</span>
          <span className="text-sm text-slate-500">Checklists & Logs</span>
        </Link>
        <Link
          href="/director"
          className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center flex flex-col gap-2"
        >
          <span className="font-semibold text-lg">Director</span>
          <span className="text-sm text-slate-500">Audit & Analytics</span>
        </Link>
      </div>
    </div>
  );
}
