import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * useIsMobile Hook
 * 
 * A utility hook that tracks window resize events to determine if the user
 * is currently on a mobile viewport (width < 768px). 
 * Useful for responsive conditional rendering.
 * 
 * @returns {boolean} True if the viewport is considered mobile.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Ensure this only runs on the client
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Handler to update state based on media query match status
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // Set the initial state
    setIsMobile(mql.matches);

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
