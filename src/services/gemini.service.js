const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const env = require("../config/env");
const logger = require("../config/logger");

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const MODERATION_PROMPT = `You are a content moderation classifier for an anonymous professional advice platform.
Analyze the text below and respond with ONLY a JSON object (no markdown, no commentary) matching this exact shape:
{"is_safe": boolean, "flags": string[], "confidence": number}

Flag categories to check for: "pii" (names, emails, phone numbers, company names that could identify someone),
"toxic" (harassment, hate speech, threats), "spam" (promotional content, links), "off_topic" (not a workplace/career matter).
confidence is a number between 0 and 1 representing your certainty.
is_safe should be false if ANY flag applies with confidence > 0.6.

Text to analyze:
"""
{{CONTENT}}
"""`;

const SUMMARY_PROMPT = `You are summarizing the best professional advice from a thread of anonymous replies to a workplace dilemma.
Write a concise, practical 2-sentence summary of the most actionable advice given. Do not mention usernames or attribute quotes.
Be direct and specific — this will be shown at the top of the thread to save readers time.

Original post:
"""
{{POST}}
"""

Replies (best first):
"""
{{REPLIES}}
"""

Respond with ONLY the 2-sentence summary text — no preamble, no markdown.`;

/**
 * Runs content through Gemini for safety classification before it's published.
 * Fails CLOSED: if the AI call errors out, we treat the content as unsafe
 * and route it to manual review rather than silently publishing unmoderated
 * content on an AI service outage.
 */
async function moderateContent(content) {
  try {
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODERATION_MODEL,
      safetySettings,
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    });

    const prompt = MODERATION_PROMPT.replace("{{CONTENT}}", content.slice(0, 8000));
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      isSafe: Boolean(parsed.is_safe),
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    };
  } catch (err) {
    logger.error({ err }, "Gemini moderation call failed — failing closed");
    return { isSafe: false, flags: ["moderation_unavailable"], confidence: 0 };
  }
}

/**
 * Generates a 2-sentence summary of the best replies on a post.
 * Returns null on failure rather than throwing — summarization is a
 * nice-to-have, never allowed to block the reply flow itself.
 */
async function summarizePost(postBody, topReplies) {
  try {
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_SUMMARY_MODEL,
      generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
    });

    const repliesText = topReplies
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r}`)
      .join("\n");

    const prompt = SUMMARY_PROMPT.replace("{{POST}}", postBody.slice(0, 4000)).replace(
      "{{REPLIES}}",
      repliesText.slice(0, 6000)
    );

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    logger.error({ err }, "Gemini summarization call failed");
    return null;
  }
}

module.exports = { moderateContent, summarizePost };
