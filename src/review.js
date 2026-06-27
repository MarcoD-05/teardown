// src/review.js
import { reviewers, chair } from './reviewers.js'
import { askLLM } from './llm.js'
import { modes, DEFAULT_MODE } from './modes.js'
import { strictnessLevels, DEFAULT_STRICTNESS } from './strictness.js'

export async function runReview(
  document,
  modeId = DEFAULT_MODE,
  strictnessId = DEFAULT_STRICTNESS  // new third parameter
) {
  
  // Look up the mode; fall back to the default if it's unknown.
  const mode = modes[modeId] || modes[DEFAULT_MODE]

  // Resolve strictness, falling back to standard if an unknown id arrives.
  const strictness = strictnessLevels[strictnessId] || strictnessLevels[DEFAULT_STRICTNESS]

  // Select only the reviewers this mode calls for.
  const activeReviewers = mode.reviewerIds
    .map((id) => reviewers.find((r) => r.id === id))
    .filter(Boolean) // drop any id that didn't match a reviewer

  const transcript = [
    { role: 'user', content: `Design document under review:\n\n${document}` },
  ]
  const findings = []

  for (const reviewer of activeReviewers) {
    const reply = await askLLM({
      system: `${reviewer.systemPrompt}\n\n${strictness.reviewerGuidance}`,
      messages: transcript,
    })
    findings.push({ id: reviewer.id, name: reviewer.name, review: reply })
    transcript.push({
      role: 'assistant',
      content: `${reviewer.name} findings:\n${reply}`,
    })
  }

  // Give the Chair the mode's extra framing, appended to its base prompt.
  const chairSystem = mode.chairFocus
    ? `${chair.systemPrompt}\n\nMODE INSTRUCTION: ${mode.chairFocus}`
    : chair.systemPrompt

  const chairRaw = await askLLM({
    system: `${chairSystem}\n\n${strictness.chairGuidance}`,
    messages: transcript,
    json: true,
  })

  let verdict
  try {
    verdict = JSON.parse(chairRaw)
  } catch (err) {
    verdict = { error: 'Chair did not return valid JSON', raw: chairRaw }
  }

  return { mode: modeId, findings, verdict }
}