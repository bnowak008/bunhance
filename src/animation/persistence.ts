import type { AnimationState, AnimationInstance, RGB, AnimationEffectOptions } from "../types";
import { debug } from "../utils/debug";

/**
 * Serializable animation state
 */
type SerializedAnimation = {
  id: string;
  text: string;
  color: RGB;
  options: Required<AnimationEffectOptions>;
  progress: number;
  state: AnimationState;
  timestamp: number;
};

// Storage configuration
const STORAGE_KEY = 'bunhance_animation_state';

/**
 * Saves current animation state
 */
export async function save(animations: Map<string, AnimationInstance>): Promise<void> {
  try {
    const serialized = Array.from(animations.values()).map(anim => ({
      id: anim.id,
      text: anim.text,
      color: anim.color,
      options: anim.options,
      progress: anim.progress,
      state: anim.state,
      timestamp: Date.now()
    }));
    
    // Use Bun's native file system API
    await Bun.write(
      STORAGE_KEY + '.json',
      JSON.stringify(serialized, null, 2)
    );
    
    debug.info('Animation state saved', { count: serialized.length });
  } catch (error) {
    debug.error('Failed to save animation state:', error);
  }
}

/**
 * Loads saved animation state
 */
export async function load(): Promise<SerializedAnimation[]> {
  try {
    const file = Bun.file(STORAGE_KEY + '.json');
    if (!await file.exists()) {
      return [];
    }
    
    const content = await file.text();
    const parsed = JSON.parse(content) as SerializedAnimation[];
    
    debug.info('Animation state loaded', { count: parsed.length });
    return parsed;
  } catch (error) {
    debug.error('Failed to load animation state:', error);
    return [];
  }
}

/**
 * Restores animations from saved state
 */
export async function restore(
  createAnimation: (saved: SerializedAnimation) => Promise<void>
): Promise<void> {
  const saved = await load();
  
  // Filter out stale animations (older than 1 hour)
  const fresh = saved.filter(anim => 
    Date.now() - anim.timestamp < 60 * 60 * 1000
  );
  
  // Restore animations in parallel
  await Promise.all(
    fresh.map(anim => createAnimation(anim))
  );
  
  debug.info('Animations restored', { 
    total: saved.length,
    restored: fresh.length 
  });
}

/**
 * Clears saved animation state
 */
export async function clear(): Promise<void> {
  try {
    const file = Bun.file(STORAGE_KEY + '.json');
    if (await file.exists()) {
      await Bun.write(file, '[]');
    }
    debug.info('Animation state cleared');
  } catch (error) {
    debug.error('Failed to clear animation state:', error);
  }
}

// Export persistence utilities
export const persistence = {
  save,
  load,
  restore,
  clear
}; 