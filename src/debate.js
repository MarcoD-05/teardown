// src/debate.js
// Architecture-Decision mode: two agents debate a decision across N rounds,
// then the Chair calls it.

import { debaters, chair } from './reviewers.js'
import { askLLM } from './llm.js'

/**
 * runDebate — Advocate vs Skeptic over a decision, for `rounds` exchanges.
 * @param {string} decision - the architecture decision to debate (e.g. "Use Postgres over MongoDB")
 * @param {number} rounds   - how many back-and-forth exchanges (default 3)
 * @returns {Promise<Object>} { decision, rounds, transcript, verdict }
 */
export async function runDebate(decision, rounds = 3) {
  // Shared transcript seeded with the decision under debate.
  const transcript = [
    { role: 'user', content: `Architecture decision under debate:\n\n${decision}` },
  ]

  // We record each turn separately so the UI can show the exchange.
  const exchange = []

  // The turn order: advocate, then skeptic, repeated for `rounds`.
  for (let round = 1; round <= rounds; round++) {
    for (const speaker of [debaters.advocate, debaters.skeptic]) {
      const reply = await askLLM({
        system: speaker.systemPrompt,
        messages: transcript,
      })

      exchange.push({ round, speaker: speaker.id, name: speaker.name, text: reply })

      // Append to the transcript so the NEXT speaker sees this argument.
      transcript.push({
        role: 'assistant',
        content: `${speaker.name} (round ${round}): ${reply}`,
      })
    }
  }

  // The Chair reads the whole debate and returns a structured verdict.
  const chairRaw = await askLLM({
    system: `${chair.systemPrompt}

This is an architecture-decision DEBATE, not a document review. Based on the arguments, return JSON in this shape:
{
  "verdict": "PROCEED | RECONSIDER | INSUFFICIENT",
  "summary": "one or two sentences giving the call and the deciding reason",
  "strongestFor": "the single strongest argument the Advocate made",
  "strongestAgainst": "the single strongest argument the Skeptic made",
  "decidingRisks": ["the risks that most affect the decision"]
}`,
    messages: transcript,
    json: true,
  })

  let verdict
  try {
    verdict = JSON.parse(chairRaw)
  } catch (err) {
    verdict = { error: 'Chair did not return valid JSON', raw: chairRaw }
  }

  return { decision, rounds, exchange, verdict }
}