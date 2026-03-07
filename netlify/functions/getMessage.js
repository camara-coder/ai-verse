const _anthropicModule = require("@anthropic-ai/sdk");
const Anthropic = _anthropicModule.default ?? _anthropicModule;

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let context;
  try {
    context = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { dayName, date, timeOfDay, language } = context;

  if (!dayName || !date || !timeOfDay) {
    return { statusCode: 400, body: "Missing required fields: dayName, date, timeOfDay" };
  }

  const isSpanish = language === "es";
  const languageInstruction = isSpanish
    ? "Respond entirely in Latin American Spanish. Use a Bible verse from the Reina-Valera translation."
    : "";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 220,
      messages: [
        {
          role: "user",
          content: `You are a gentle, wise pastor delivering a short daily devotional.${isSpanish ? " " + languageInstruction : ""}

Today is ${dayName}, ${date}. It is ${timeOfDay}.

Write a short, powerful devotional message tied to a fitting Bible verse for this specific moment — consider the day of the week and the time of day (${timeOfDay}) when choosing the verse and framing the message.

Respond in EXACTLY this format, nothing else before or after:

VERSE: [Book Chapter:Verse] — "[exact verse text]"
MESSAGE: [2 to 3 sentences. Warm, hopeful, grounding. Under 65 words total. No filler. Speak directly to the reader's heart.]`
        }
      ]
    });

    const raw = message.content[0].text;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ raw })
    };
  } catch (err) {
    console.error("Anthropic API error:", err);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to generate message. Please try again." })
    };
  }
};
