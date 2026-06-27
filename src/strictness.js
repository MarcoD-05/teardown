// src/strictness.js
// Strictness levels control how harshly the panel grades — independent of mode.
// Each level provides a paragraph that gets injected into the reviewer + chair prompts.

export const strictnessLevels = {
  lenient: {
    name: 'Lenient',
    description: 'Pragmatic. Flags only genuinely serious problems; tolerates rough edges.',
    // This text is appended to every reviewer's system prompt.
    reviewerGuidance:
      'Adopt a pragmatic, ship-oriented posture. Only raise issues that are genuinely ' +
      'serious or likely to cause real harm. Tolerate minor imperfections, style choices, ' +
      'and theoretical edge cases without flagging them. Prefer MINOR over MAJOR when unsure.',
    // This text is appended to the chair's system prompt.
    chairGuidance:
      'Grade generously. Reserve BLOCKED for issues that are clearly fatal. Lean toward ' +
      'SHIP or NEEDS WORK unless a blocker is unambiguous.',
  },
  standard: {
    name: 'Standard',
    description: 'Balanced. The default senior-engineer review bar.',
    reviewerGuidance:
      'Apply the judgement of an experienced senior engineer: surface real risks and ' +
      'meaningful gaps, but do not nitpick.',
    chairGuidance:
      'Grade with balanced, senior-engineer judgement.',
  },
  strict: {
    name: 'Strict',
    description: 'Demanding. Holds the work to a high bar; flags anything that could bite later.',
    reviewerGuidance:
      'Adopt a demanding, high-bar posture. Surface every plausible risk, gap, missing test, ' +
      'unhandled edge case, and operational concern, even smaller ones. Assume this will run ' +
      'at scale in production and that anything unaddressed will eventually cause an incident. ' +
      'Escalate severity when in doubt.',
    chairGuidance:
      'Grade rigorously. Do not award SHIP unless the work is genuinely production-ready with ' +
      'no significant gaps. Escalate to BLOCKED readily when serious issues are present.',
  },
}

export const DEFAULT_STRICTNESS = 'standard'