// Allows the app to run in different configurable ways. 
// Pick a mode and it swaps which reviewers are in the room & how the chair frames things.

// src/modes.js
// A mode = which reviewers run + how the Chair frames its output.
// It selects from the reviewers you already defined; it doesn't add new ones.

export const modes = {
  'design-review': {
    name: 'Full Design Review',
    description: 'The whole panel reviews a design doc.',
    reviewerIds: ['engineer', 'security', 'sre', 'cost'],
    chairFocus: '',
  },
  'security-only': {
    name: 'Security Sweep',
    description: 'Just the security reviewer, for a focused security pass.',
    reviewerIds: ['security'],
    chairFocus: 'Focus the verdict on security posture only.',
  },
  'pre-mortem': {
    name: 'Pre-mortem',
    description: 'Assume this shipped and failed — how? Reliability + engineering lens.',
    reviewerIds: ['sre', 'engineer'],
    chairFocus: 'Frame findings as failure modes: what breaks first, and what is the blast radius.',
  },
  'ship-readiness': {
    name: 'Ship Readiness',
    description: 'Reliability + security + cost — the "are we production-ready?" check.',
    reviewerIds: ['sre', 'security', 'cost'],
    chairFocus: 'Judge strictly on production-readiness.',
  },
}

// A safe default if no mode is given.
export const DEFAULT_MODE = 'design-review'