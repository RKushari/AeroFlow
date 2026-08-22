'use client';

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ApproveDispatchButtonProps {
  flightId: string;
  isCritical: boolean;
  allMandatoryComplete: boolean;
  currentStatus: string;
}

export function ApproveDispatchButton({
  flightId,
  isCritical,
  allMandatoryComplete,
  currentStatus,
}: ApproveDispatchButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canApprove = !isCritical && allMandatoryComplete && currentStatus === 'BOARDING';

  const handleApprove = () => {
    startTransition(async () => {
      const { approveDispatch } = await import("@/lib/actions/flight");
      await approveDispatch(flightId);

      // Auto-download the approved dossier PDF
      window.open(`/api/export?flightId=${flightId}`, "_blank");

      router.refresh();
    });
  };

  return (
    <form action={handleApprove}>
      <button
        type="submit"
        disabled={!canApprove || isPending}
        className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 ${
          canApprove && !isPending
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-slate-400 cursor-not-allowed"
        }`}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {!allMandatoryComplete && currentStatus === 'BOARDING'
          ? "Checklists Incomplete"
          : currentStatus === 'SCHEDULED'
          ? "Awaiting Crew Checklists"
          : isCritical
          ? "Critical Risk — Blocked"
          : "Approve Dispatch"}
      </button>
    </form>
  );
}
