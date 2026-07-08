import Groq from "groq-sdk";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export const groqConfigured = Boolean(process.env.GROQ_API_KEY);

export function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}
