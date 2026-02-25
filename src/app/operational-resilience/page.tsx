"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ORRedirectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tab = searchParams.get("tab");
    let target: string;
    if (tab === "dashboard") {
      target = "/processes?tab=or-overview";
    } else if (tab === "ibs") {
      target = "/processes?tab=ibs";
    } else if (tab === "self-assessment") {
      target = "/processes?tab=self-assessment";
    } else {
      // Bare /operational-resilience → processes (default tab)
      target = "/processes";
    }
    router.replace(target);
  }, [searchParams, router]);

  return null;
}

export default function OperationalResiliencePage() {
  return (
    <Suspense>
      <ORRedirectInner />
    </Suspense>
  );
}
