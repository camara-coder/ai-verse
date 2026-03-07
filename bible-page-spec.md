# Daily Bible Message — Complete Technical Specification
> Hand this entire document to Claude Code. It contains everything needed to build the project in one shot.

---

## 1. What We Are Building

A single-page web app that displays a unique, AI-generated devotional Bible message every time someone visits. The message is tailored to the **current date, day of the week, and time of day** (morning / afternoon / evening / night). The experience is full-screen, beautiful, distraction-free — just the message, centered on screen, with subtle animations.

---

## 2. Project Structure

```
project-root/
├── index.html                  # The entire frontend (HTML + CSS + JS in one file)
├── netlify/
│   └── functions/
│       └── getMessage.js       # Serverless function — proxies Anthropic API call
├── netlify.toml                # Netlify config (redirects API calls to the function)
├── .env                        # Local dev only — stores ANTHROPIC_API_KEY (never committed)
├── .env.example                # Shows required env var format, safe to commit
├── .gitignore                  # Must include .env and node_modules
└── package.json                # Anthropic SDK dependency
```

> **For Vercel instead of Netlify:** replace `netlify/functions/getMessage.js` with `api/getMessage.js` and skip `netlify.toml`. Everything else is identical.

---

## 3. Serverless Function — `netlify/functions/getMessage.js`

This function runs on the server. It receives context (date, time of day, day name) from the frontend and calls the Anthropic API. The API key never touches the browser.

```javascript
const Anthropic = require("@anthropic-ai/sdk");

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

  const { dayName, date, timeOfDay } = context;

  const client = new Anthropic(); // Reads ANTHROPIC_API_KEY from environment automatically

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 220,
    messages: [
      {
        role: "user",
        content: `You are a gentle, wise pastor delivering a short daily devotional.

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw })
  };
};
```

**Environment variable required:**
- Key: `ANTHROPIC_API_KEY`
- Set in Netlify dashboard → Site Settings → Environment Variables
- Also create a local `.env` file for `netlify dev`:
  ```
  ANTHROPIC_API_KEY=sk-ant-...
  ```

---

## 4. `package.json`

```json
{
  "name": "daily-bible-message",
  "version": "1.0.0",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.0"
  }
}
```

---

## 5. `netlify.toml`

```toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/api/getMessage"
  to = "/.netlify/functions/getMessage"
  status = 200
```

---

## 6. Frontend — `index.html`

Everything is in one self-contained HTML file. No frameworks, no build step, no external JS libraries.

### 6.1 Full HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daily Word</title>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400&display=swap" rel="stylesheet" />
  <style>
    /* === ALL CSS HERE === */
  </style>
</head>
<body>
  <div id="bg"></div>

  <main id="card">

    <!-- Loading state -->
    <div id="loading">
      <div class="cross">
        <div class="cross-h"></div>
        <div class="cross-v"></div>
      </div>
    </div>

    <!-- Message content -->
    <div id="content" class="hidden">
      <p id="verse-ref"></p>
      <div class="divider"></div>
      <p id="message"></p>
      <button id="refresh-btn" aria-label="Load new message">&#8635; New Message</button>
    </div>

    <!-- Error state -->
    <div id="error" class="hidden">
      <p class="error-text">Could not load today's message.</p>
      <button id="retry-btn">Try Again</button>
    </div>

  </main>

  <script>
    /* === ALL JS HERE === */
  </script>
</body>
</html>
```

---

### 6.2 CSS Specification

```css
/* ---- Reset & Base ---- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
}

/* ---- Animated Background ---- */
/* The background color changes based on time of day.
   JS sets a data attribute on <body>: data-time="morning|afternoon|evening|night"
   CSS picks the gradient accordingly. */

#bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-size: 400% 400%;
  animation: gradientShift 14s ease infinite;
}

body[data-time="morning"]   #bg { background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460, #1a1a2e); }
body[data-time="afternoon"] #bg { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e, #0f0c29); }
body[data-time="evening"]   #bg { background: linear-gradient(135deg, #1a1a2e, #2d1b69, #11998e, #1a1a2e); }
body[data-time="night"]     #bg { background: linear-gradient(135deg, #0a0a0a, #1a1a2e, #0d0d0d, #0a0a0a); }

@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ---- Subtle floating particles (pure CSS) ---- */
#bg::before, #bg::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.03);
  animation: float 18s ease-in-out infinite;
}
#bg::before { width: 300px; height: 300px; top: 10%; left: 5%; animation-delay: 0s; }
#bg::after  { width: 200px; height: 200px; bottom: 15%; right: 8%; animation-delay: -9s; }

@keyframes float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-30px) scale(1.05); }
}

/* ---- Card ---- */
#card {
  position: relative;
  z-index: 1;
  max-width: 640px;
  width: 100%;
  padding: 48px 40px;
  text-align: center;
}

@media (max-width: 600px) {
  #card { padding: 32px 24px; }
}

/* ---- Loading Cross ---- */
#loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
}

.cross {
  position: relative;
  width: 36px;
  height: 36px;
  animation: pulse 2s ease-in-out infinite;
}

.cross-h, .cross-v {
  position: absolute;
  background: rgba(255,255,255,0.5);
  border-radius: 2px;
}
.cross-h { width: 100%; height: 6px; top: 50%; transform: translateY(-50%); }
.cross-v { width: 6px; height: 100%; left: 50%; transform: translateX(-50%); }

@keyframes pulse {
  0%, 100% { opacity: 0.25; transform: scale(0.95); }
  50%       { opacity: 0.85; transform: scale(1.05); }
}

/* ---- Content ---- */
#content {
  opacity: 0;
}

#content.animate {
  animation: fadeUp 1.2s ease forwards;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Verse reference line */
#verse-ref {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  font-weight: 300;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.04em;
  font-style: italic;
  margin-bottom: 0;
}

/* Gold divider */
.divider {
  width: 36px;
  height: 1px;
  background: rgba(212, 175, 55, 0.45);
  margin: 1.4rem auto;
}

/* Main devotional message */
#message {
  font-family: 'Lora', serif;
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: 700;
  color: #ffffff;
  line-height: 1.7;
  letter-spacing: 0.01em;
  text-shadow: 0 2px 20px rgba(0,0,0,0.3);
}

/* Refresh button */
#refresh-btn {
  margin-top: 2.8rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.4);
  border-radius: 999px;
  padding: 9px 22px;
  font-size: 0.78rem;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

#refresh-btn:hover {
  color: rgba(255,255,255,0.9);
  border-color: rgba(212,175,55,0.5);
  box-shadow: 0 0 14px rgba(212,175,55,0.2);
}

/* Error state */
#error { text-align: center; }
.error-text {
  color: rgba(255,255,255,0.4);
  font-size: 0.9rem;
  margin-bottom: 1.2rem;
}
#retry-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.5);
  border-radius: 999px;
  padding: 9px 22px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.3s ease;
}
#retry-btn:hover { color: white; border-color: rgba(255,255,255,0.5); }

/* Utility */
.hidden { display: none !important; }
```

---

### 6.3 JavaScript Specification

```javascript
// ---- Time context ----
function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  const days    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months  = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"];

  let timeOfDay;
  if      (hour >= 5  && hour < 12) timeOfDay = "morning";
  else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
  else if (hour >= 17 && hour < 21) timeOfDay = "evening";
  else                               timeOfDay = "night";

  return {
    dayName: days[now.getDay()],
    date: `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`,
    timeOfDay
  };
}

// ---- Set background theme based on time ----
function setTimeTheme(timeOfDay) {
  document.body.setAttribute("data-time", timeOfDay);
}

// ---- UI state helpers ----
function showLoading() {
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("content").classList.add("hidden");
  document.getElementById("error").classList.add("hidden");
}

function showError() {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("content").classList.add("hidden");
  document.getElementById("error").classList.remove("hidden");
}

function showContent(verse, message) {
  document.getElementById("verse-ref").textContent = verse;
  document.getElementById("message").textContent = message;

  const content = document.getElementById("content");
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("error").classList.add("hidden");
  content.classList.remove("hidden");

  // Re-trigger animation
  content.classList.remove("animate");
  void content.offsetWidth; // force reflow to restart animation
  content.classList.add("animate");
}

// ---- Fetch message from serverless function ----
async function fetchMessage() {
  showLoading();
  const context = getTimeContext();
  setTimeTheme(context.timeOfDay);

  try {
    const res = await fetch("/api/getMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const raw = data.raw || "";

    const verseMatch   = raw.match(/VERSE:\s*(.+)/);
    const messageMatch = raw.match(/MESSAGE:\s*([\s\S]+)/);

    const verse   = verseMatch?.[1]?.trim()   ?? "";
    const message = messageMatch?.[1]?.trim() ?? raw.trim();

    showContent(verse, message);
  } catch (err) {
    console.error("Failed to fetch message:", err);
    showError();
  }
}

// ---- Event listeners ----
document.getElementById("refresh-btn").addEventListener("click", fetchMessage);
document.getElementById("retry-btn").addEventListener("click", fetchMessage);

// ---- Init ----
fetchMessage();
```

---

## 7. `.gitignore`

```
.env
node_modules/
.netlify/
```

---

## 8. `.env.example`

```
ANTHROPIC_API_KEY=your_key_here
```

---

## 9. Deployment Instructions

1. Run `npm install` in the project root (installs Anthropic SDK for the function)
2. Copy `.env.example` to `.env` and paste your `ANTHROPIC_API_KEY`
3. Test locally: `netlify dev` (requires Netlify CLI: `npm install -g netlify-cli`)
4. Push repo to GitHub
5. Connect GitHub repo to Netlify
6. In Netlify dashboard → Site Settings → Environment Variables → add `ANTHROPIC_API_KEY`
7. Deploy — done

---

## 10. Summary of Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| API key security | Serverless function proxy | Key never exposed in browser |
| Message uniqueness | Day name + date + time of day sent to Claude | Every visit feels personal to the moment |
| Caching | None — fresh API call every visit | Guarantees a unique message each time |
| Animations | CSS only, no JS animation libraries | Fast, smooth, zero extra dependencies |
| Font | Lora (serif, bold) for the message | Warm, devotional, classic feel |
| Background | Time-aware animated CSS gradient | Calming, immersive, changes with the day |
| Layout | Full viewport, single centered block | Nothing distracts from the message |
| Refresh | Button re-calls API without page reload | Smooth, seamless UX |
