"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ComponentsLibPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=components");
  }, [router]);
  return null;
}
