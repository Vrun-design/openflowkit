import { foundation } from './tokens';
export type MotionIntent =
  | 'manipulate'
  | 'navigate'
  | 'reveal'
  | 'exit'
  | 'proposal-preview'
  | 'commit';
/** Presentation recipe only. Never delay a transaction or schedule document mutations. */
export function motionRecipe(intent: MotionIntent, reducedMotion: boolean, objectCount = 1) {
  const duration = {
    manipulate: foundation.motion.immediate,
    navigate: foundation.motion.navigation,
    reveal: foundation.motion.reveal,
    exit: foundation.motion.exit,
    'proposal-preview': foundation.motion.feedback,
    commit: foundation.motion.settle,
  }[intent];
  return {
    durationMs: reducedMotion ? 0 : duration,
    easing: foundation.easing,
    // Enter decelerates, exit accelerates and is shorter, moves use the standard curve.
    curve:
      intent === 'exit'
        ? foundation.curve.exit
        : intent === 'navigate'
          ? foundation.curve.standard
          : foundation.curve.enter,
    // Layered surfaces grow from their anchor, never from the screen center.
    transformOrigin: 'var(--ofk-origin, top left)',
    staggerMs: 0, // A 1000-object response must not become a 1000-step performance.
    animateGeometry: intent === 'navigate' && !reducedMotion,
    animateOpacity: intent !== 'manipulate' && !reducedMotion && objectCount <= 100,
    autoMoveCamera: false,
    interruptible: true,
  } as const;
}
