// src/review.js
// Runs a "panel" of AI reviewers over a design document and returns a
// structured verdict. Flow: each reviewer reads the doc (plus what earlier
// reviewers said), then a "Chair" reads the whole discussion and produces
// the final JSON decision (SHIP / NEEDS WORK / BLOCKED).

import { reviewers, chair } from './reviewers.js'   // the reviewer personas + the Chair persona
import { askLLM } from './llm.js'                    // helper that sends a prompt to OpenAI and returns the reply text
import { modes, DEFAULT_MODE } from './modes.js'     // review modes: which reviewers run + extra Chair framing
import { strictnessLevels, DEFAULT_STRICTNESS } from './strictness.js' // how harshly to grade

// runReview is the main entry point. server.js calls it from both
// /review (pasted doc) and /review-pr (a GitHub PR turned into a doc).
// `async` because it does slow work (network calls to OpenAI), so it returns
// a Promise the caller `await`s.
export async function runReview(
  document,                            // the text to review (design doc or PR diff)
  modeId = DEFAULT_MODE,               // which review mode; uses the default if caller omits it
  strictnessId = DEFAULT_STRICTNESS,    // how strict to grade; defaults to 'standard'
  onEvent = () => {}       // Optional progress callback; no-op by default so /review unchanged             
) {

  // Look up the chosen mode object by its id. If the id isn't recognised,
  // fall back to the default so a bad value can't crash the function.
  const mode = modes[modeId] || modes[DEFAULT_MODE]

  // Same defensive lookup for strictness: resolve the id to its config object,
  // falling back to 'standard' if an unknown id arrives.
  const strictness = strictnessLevels[strictnessId] || strictnessLevels[DEFAULT_STRICTNESS]

  // A mode only wants certain reviewers (e.g. security-only = just the security
  // reviewer). Turn the mode's list of ids into the actual reviewer objects,
  // dropping any id that doesn't match a real reviewer.
  const activeReviewers = mode.reviewerIds
    .map((id) => reviewers.find((r) => r.id === id))  // id -> reviewer object (or undefined)
    .filter(Boolean)                                   // remove the undefineds

  // The "transcript" is the shared conversation every reviewer sees and adds to.
  // It starts with one user message holding the document; each reviewer's reply
  // gets pushed on, so later reviewers can react to earlier ones.
  const transcript = [
    { role: 'user', content: `Design document under review:\n\n${document}` },
  ]

  // Collect each reviewer's reply separately, to send back to the UI.
  const findings = []

  // Tell listener the pannel is starting & who's on it, UI can render roster imediately.
  onEvent({
    type: 'start',
    mode: modeId,
    strictness: strictnessId,
    reviewers: activeReviewers.map((r) => ({ id: r.id, name: r.name })),
  })

  // Run reviewers one at a time, in order. The `await` inside the loop makes
  // each reviewer finish before the next starts, so each one sees the growing
  // transcript — that's the shared-discussion effect.
  for (const reviewer of activeReviewers) {
    //Announce this reviewer is now thinking (UI can show a spinner on them).
    onEvent({ type: 'reviewer-start', id: reviewer.id, name: reviewer.name })
    const reply = await askLLM({
      // The reviewer's own persona prompt + the strictness guidance paragraph,
      // so its grading harshness matches the chosen level.
      system: `${reviewer.systemPrompt}\n\n${strictness.reviewerGuidance}`,
      messages: transcript,            // everything said so far
    })

    // Keep the raw reply for the response we send to the frontend.
    findings.push({ id: reviewer.id, name: reviewer.name, review: reply })

    // Announce this reviewer's reply so the UI can render it live.
    onEvent({ type: 'reviewer-done', id: reviewer.id, name: reviewer.name, review: reply })

    // Append this reviewer's turn to the shared transcript so the next reviewer
    // (and the Chair) can read it.
    transcript.push({
      role: 'assistant',
      content: `${reviewer.name} findings:\n${reply}`,
    })
  }

  // Build the Chair's system prompt. If the mode adds extra framing (chairFocus),
  // append it; otherwise use the Chair's base prompt alone.
  const chairSystem = mode.chairFocus
    ? `${chair.systemPrompt}\n\nMODE INSTRUCTION: ${mode.chairFocus}`
    : chair.systemPrompt

  // The Chair reads the full transcript and produces the final decision.
  // `json: true` tells askLLM to request a JSON object back (the structured verdict).
  //Announce chair is now sythesizing the final verdict.
  onEvent({ type: 'chair-start' })
  const chairRaw = await askLLM({
    system: `${chairSystem}\n\n${strictness.chairGuidance}`,  // mode framing + strictness, composed together
    messages: transcript,
    json: true,
  })

  // The Chair returns text; parse it into a real object. If it ever returns
  // malformed JSON, catch the error instead of crashing and hand back a
  // diagnostic object so the caller can see what went wrong.
  let verdict
  try {
    verdict = JSON.parse(chairRaw)
  } catch (err) {
    verdict = { error: 'Chair did not return valid JSON', raw: chairRaw }
  }

  // Return everything the caller needs: which mode ran, each reviewer's
  // findings, and the structured verdict.
  // Announce the final structured verdict (last event in the stream).
  onEvent({ type: 'verdict', verdict })

  return { mode: modeId, findings, verdict }
}