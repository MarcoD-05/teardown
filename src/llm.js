// src/llm.js
// Thin wrapper around the OpenAI API. Every persona will call this one function.

import OpenAI from 'openai'

// Create the OpenAI client once, reading the key from the environment.
// (dotenv is already loaded by server.js before this file runs.)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Read the model name from env, with a sensible fallback.
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'

/**
 * askLLM — send a system prompt + conversation to the model, get text back.
 * @param {Object}   args
 * @param {string}   args.system    - the persona's instructions (who the model should be)
 * @param {Array}    args.messages  - the conversation so far: [{ role, content }, ...]
 * @returns {Promise<string>} the model's reply text
 */
export async function askLLM({ system, messages }) {
  // Build the full message list: the system prompt first, then the conversation.
  const fullMessages = [
    { role: 'system', content: system },
    ...messages,
  ]

  // Make the API call. `await` pauses here until OpenAI responds.
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: fullMessages,
  })

  // Dig the text out of the response object and return just that.
  return completion.choices[0].message.content
}