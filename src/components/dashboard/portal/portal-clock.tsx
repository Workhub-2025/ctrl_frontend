"use client";

import { useEffect, useState } from "react";

function formatPortalClockTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** Live portal clock — visible in shared chrome beside accessibility controls. */
export function PortalClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const label = formatPortalClockTime(now);

  return (
    <time
      dateTime={now.toISOString()}
      className="hidden shrink-0 tabular-nums text-xs font-medium text-muted-foreground sm:inline"
      aria-label={`Current time ${label}`}
    >
      {label}
    </time>
  );
}
