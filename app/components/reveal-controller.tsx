"use client";

import { useEffect } from "react";

export function RevealController() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const items = document.querySelectorAll(".reveal");

    if (reducedMotion) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const timers: number[] = [];
    items.forEach((el, index) => {
      const timer = window.setTimeout(() => {
        el.classList.add("is-visible");
      }, 120 + index * 140);
      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
