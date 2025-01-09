export type EasingFunction = (t: number) => number;

export type Frame = {
  content: string;
  timestamp: number;
};

export type AnimationStateMetrics = {
  frameCount: number;
  frameTime: number;
  frameDrops: number;
  lastFrameTime: number;
  totalDuration: number;
  currentTime: number;
  progress: number;
};

export type AnimationState = {
  frames: Frame[];
  currentFrame: number;
  isPlaying: boolean;
  isPaused: boolean;
  metrics: AnimationStateMetrics;
  loop: boolean;
  direction: 'forward' | 'reverse' | 'alternate';
  easing: EasingFunction;
  onComplete?: () => void;
  onFrame?: (frame: Frame) => void;
  onError?: (error: Error) => void;
  cleanup: () => void;
};

export type AnimationOptions = {
  fps?: number;
  duration?: number;
  loop?: boolean;
  direction?: 'forward' | 'reverse' | 'alternate';
  easing?: EasingFunction;
  onComplete?: () => void;
  onFrame?: (frame: Frame) => void;
};

export type Animation = {
  state: AnimationState;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export type CompositeAnimation = Animation & {
  animations: Animation[];
  type: 'sequence' | 'parallel';
}; 