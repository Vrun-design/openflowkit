export const NODE_DEFAULTS: Record<string, { color: string; icon: string; shape: string }> = {
  start: { color: 'emerald', icon: 'none', shape: 'capsule' },
  end: { color: 'red', icon: 'none', shape: 'capsule' },
  decision: { color: 'amber', icon: 'none', shape: 'diamond' },
  custom: { color: 'white', icon: 'none', shape: 'rounded' },
  process: { color: 'white', icon: 'none', shape: 'rounded' },
};

export const getDefaultColor = (type: string): string => NODE_DEFAULTS[type]?.color || 'white';
