import type { Transition, Variants } from "motion/react";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const panelReveal: Variants = {
  animate: {
    filter: "blur(0px)",
    opacity: 1,
    scale: 1,
    y: 0
  },
  initial: {
    filter: "blur(12px)",
    opacity: 0,
    scale: 0.985,
    y: 22
  }
};

export const listItemReveal: Variants = {
  animate: {
    filter: "blur(0px)",
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0
  },
  exit: {
    filter: "blur(8px)",
    opacity: 0,
    scale: 0.98,
    x: 12,
    y: -12
  },
  initial: {
    filter: "blur(10px)",
    opacity: 0,
    scale: 0.975,
    x: -10,
    y: 16
  }
};

export const statusReveal: Variants = {
  animate: {
    filter: "blur(0px)",
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0
  },
  exit: {
    filter: "blur(8px)",
    opacity: 0,
    scale: 0.99,
    x: 12,
    y: -6
  },
  initial: {
    filter: "blur(8px)",
    opacity: 0,
    scale: 0.99,
    x: -12,
    y: 8
  }
};

export const overlayReveal: Variants = {
  animate: {
    opacity: 1
  },
  exit: {
    opacity: 0
  },
  initial: {
    opacity: 0
  }
};

export const swapReveal: Variants = {
  animate: {
    filter: "blur(0px)",
    opacity: 1,
    scale: 1,
    y: 0
  },
  exit: {
    filter: "blur(8px)",
    opacity: 0,
    scale: 0.98,
    y: -8
  },
  initial: {
    filter: "blur(8px)",
    opacity: 0,
    scale: 0.98,
    y: 8
  }
};

export const panelTransition: Transition = {
  duration: 0.55,
  ease: easeOut
};

export const listItemTransition: Transition = {
  duration: 0.4,
  ease: easeOut
};

export const statusTransition: Transition = {
  duration: 0.3,
  ease: easeOut
};

export const overlayTransition: Transition = {
  duration: 0.22,
  ease: easeOut
};

export const swapTransition: Transition = {
  duration: 0.24,
  ease: easeOut
};

export function withStagger(delayIndex = 0, step = 0.06): Transition {
  return {
    ...listItemTransition,
    delay: delayIndex * step
  };
}
