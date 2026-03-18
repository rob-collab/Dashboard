"use client";

import { useEffect, useRef } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";

interface LoopingIconProps extends AnimatedIconProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ForwardRefExoticComponent<AnimatedIconProps & React.RefAttributes<any>>;
  /** ms between each animation play (default 2200) */
  interval?: number;
  /** ms before the first play — stagger multiple icons (default 0) */
  initialDelay?: number;
}

/**
 * Wraps any animated icon component and plays its animation on a continuous loop
 * rather than only on hover. The icon's own hover handlers remain active.
 */
export default function LoopingIcon({
  icon: Icon,
  interval = 2200,
  initialDelay = 0,
  ...props
}: LoopingIconProps) {
  const ref = useRef<AnimatedIconHandle>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const timeoutId = setTimeout(() => {
      ref.current?.startAnimation();
      intervalId = setInterval(() => {
        ref.current?.startAnimation();
      }, interval);
    }, initialDelay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [interval, initialDelay]);

  return <Icon ref={ref} {...props} />;
}
