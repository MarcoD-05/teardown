// src/review.js
// The review loop — runs every reviewer over one doc with a SHARED transcript.
// We give the loop it's own file.
import { reviewers } from './reviewers.js'
import { askLLM } from './llm.js'

// for...of loops over reviewers array, giving you each reviewer object one at a time, in order.
// Order matters now - Engineer first means Security gets to see the Engineer's notes.

//await inside the loop makes reviewers run sequentially - each one finishes before the next starts. That's deliberate:
// It's the only way to give a later reviewer can see an earlier one's output. 
//Possible to run im parellel with promise.all for speed, but then
// none would see the others - they'd be back to reviewing in isolation.
// Sequential is the whole point.
// The two push es per loop are the heart of it. findings.push(...)
// Collects results to reurn caller. transcript.push(...)
// grows sahred conversation.
//Why role: 'assistant' for the appended findings: in the messages array, User is the human/the doc and assistant is 
// "prior turns in the conversation". Pushing reviewers.
//output as assistant makes the next reviewer treat it as established conversation history it's responding to.

/**
 * runReview — send a design doc through the whole panel.
 * @param {string} document - the design doc text to review
 * @returns {Promise<Array>} one entry per reviewer: { id, name, review }
 */
export async function runReview(document) {
  // The shared transcript starts with just the design doc, as a user message.
  const transcript = [
    { role: 'user', content: `Design document under review:\n\n${document}` },
  ]

  const findings = []

  // Run each reviewer in turn. `for...of` walks the array one item at a time.
  for (const reviewer of reviewers) {
    // This reviewer sees the doc + everything earlier reviewers added.
    const reply = await askLLM({
      system: reviewer.systemPrompt,
      messages: transcript,
    })

    // Save this reviewer's findings for the final response.
    findings.push({ id: reviewer.id, name: reviewer.name, review: reply })

    // Append it to the transcript so the NEXT reviewer can read it.
    transcript.push({
      role: 'assistant',
      content: `${reviewer.name} findings:\n${reply}`,
    })
  }
// --- The Chair: synthesise all findings into a structured verdict ---
  // It sees the doc + every reviewer's findings (the whole transcript),
  // and returns JSON instead of prose.

  const chairRaw = await askLLM({
    system: chair.systemPrompt,
    messages: transcript,
    json: true,
  })

  // Defensive parse: JSON mode is reliable, but never trust blindly.
  let verdict
  try {
    verdict = JSON.parse(chairRaw)

  } catch (err) {
    // If parsing fails, surface the raw text instead of crashing the whole review.
    verdict = { error: 'Chair did not return valid JSON', raw: chairRaw }

  }
  return findings
}