'use client';

import dynamic from "next/dynamic";
import React from "react";

const AnalyticsDashboardDynamic = dynamic(
  () => import("./client-dashboard").then((mod) => mod.AnalyticsDashboard),
  { ssr: false }
);

export function AnalyticsWrapper(props: any) {
  return <AnalyticsDashboardDynamic {...props} />;
}
