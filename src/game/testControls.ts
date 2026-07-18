// Shared mutable state for test mode. The TestPanel writes upgradeCounts here
// and the engine reads it each frame to live-apply class stats without needing
// to re-init the world.

export const testControls = {
  upgradeCounts: 0,
};
