import { easings } from "./animation/transitions";

/**
 * Common animation presets
 */
export const presets = {
  entrance: {
    fade: {
      duration: 500,
      easing: easings.easeOutQuad
    },
    slide: {
      duration: 800,
      easing: easings.easeOutElastic
    },
    zoom: {
      duration: 600,
      easing: easings.easeOutCubic,
      scale: 1.2
    }
  },
  
  attention: {
    pulse: {
      duration: 300,
      easing: easings.easeInOutQuad,
      yoyo: true,
      repeat: 2
    },
    shake: {
      duration: 400,
      easing: easings.easeOutElastic,
      intensity: 0.5
    },
    bounce: {
      duration: 800,
      easing: easings.easeOutElastic,
      yoyo: true
    }
  },
  
  flow: {
    wave: {
      duration: 2000,
      easing: easings.easeInOutQuad,
      repeat: Infinity
    },
    ripple: {
      duration: 1500,
      easing: easings.easeOutCubic,
      repeat: Infinity,
      speed: 0.8
    }
  },
  
  matrix: {
    duration: 3000,
    easing: easings.linear,
    repeat: Infinity,
    color: '#00ff00'
  },
  
  rainbowPulse: {
    duration: 1000,
    easing: easings.easeInOutQuad,
    repeat: Infinity,
    yoyo: true
  },
  
  glitchTransition: {
    duration: 400,
    easing: easings.easeOutQuad,
    intensity: 0.7
  }
} as const;

// Export individual presets for convenience
export const { entrance, attention, flow, matrix, rainbowPulse, glitchTransition } = presets;
