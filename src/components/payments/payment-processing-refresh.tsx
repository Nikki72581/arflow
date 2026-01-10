"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface PaymentProcessingRefreshProps {
  autoRefresh?: boolean;
  delayMs?: number;
}

export function PaymentProcessingRefresh({
  autoRefresh = true,
  delayMs = 3000,
}: PaymentProcessingRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (autoRefresh) {
      const timer = setTimeout(() => {
        router.refresh();
      }, delayMs);

      return () => clearTimeout(timer);
    }
  }, [autoRefresh, delayMs, router]);

  return null;
}
