// src/llm.js
// Thin wrapper around the OpenAI API. Every persona calls this one function.
import OpenAI from 'openai'

// Create the OpenAI client once, reading the key from the environment.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Read the model name from env, with a sensible fallback.
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'

export async function askLLM({ system, messages, json = false }) {
  const fullMessages = [
    { role: 'system', content: system },
    ...messages,
  ]

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: fullMessages,
    // When json is true, ask OpenAI to guarantee a valid JSON object.
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  })

  return completion.choices[0].message.content
}
