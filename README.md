# LLM Function Calls Prototype

This is an experimental desktop AI assistant prototype built around one core idea:

> Let a language model understand a natural-language request, decide whether a real-world action is needed, and route that request into an actual JavaScript function.

Instead of only returning chat text, the assistant listens through the microphone, transcribes speech, reasons over the request, chooses an action phrase, runs a matching local function, and responds back with generated audio.

This is not a polished production app. It is a research/prototype for exploring LLM-driven function calling, local automation, audio I/O, file parsing, and smart-device control.

---

## What this prototype does

```text
User speaks
   ↓
Microphone audio is recorded (SoX)
   ↓
Whisper transcribes speech to text
   ↓
GPT analyzes the request
   ↓
Assistant chooses an action phrase
   ↓
JavaScript switch statement calls the matching function
   ↓
Local app, file, or smart device action runs
   ↓
Assistant responds with generated voice (ElevenLabs)
```

---

## Current action phrases

| Phrase | What it does |
|---|---|
| `NO_ACTION_REQUIRED` | Chat-only response, no side effect |
| `SIGN_IN_TO_TWITTER` | Stub for Twitter login flow |
| `PROCESS_ATTACHMENT_1` | Reads PDFs from `ATTACHMENT_FOLDER_PATH` and summarizes them |
| `OPENGAME` | Launches the executable at `BLUESTACKS_EXE_PATH` |
| `SHELLY_STATUS` | Polls the Shelly smart plug at `SHELLY_IP` |
| `SHELLY_ON` | Turns the Shelly smart plug on |
| `SHELLY_OFF` | Turns the Shelly smart plug off |

---

## File overview

```
index.js                      Electron main process entry point
index.html                    Renderer UI (chat box + script loader)
preload.js                    Electron preload stub (contextBridge path documented inside)
.env.example                  Template for all required environment variables

Functions/
  hugging-face-api.js         Core logic: audio loop, Whisper transcription, GPT routing, action dispatch
  audio.js                    ElevenLabs TTS helper (compiled from audio.ts)
  audio.ts                    TypeScript source for ElevenLabs TTS helper
  database.js                 MongoDB conversation history (optional, currently disabled)
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install SoX

The microphone recording loop requires SoX on the system PATH.

- **Windows**: download from [sourceforge.net/projects/sox](https://sourceforge.net/projects/sox/) and add to PATH
- **macOS**: `brew install sox`
- **Linux**: `sudo apt install sox`

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your values. The app will throw a clear error on startup if any required variable is missing.

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (Whisper + GPT-4) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (TTS) |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID (defaults to the value in `.env.example`) |
| `MONGODB_URI` | MongoDB Atlas connection string (only needed if conversation history is re-enabled) |
| `SHELLY_IP` | Local IP of your Shelly smart plug (defaults to `192.168.0.1`) |
| `ATTACHMENT_FOLDER_PATH` | Folder to read PDFs from for `PROCESS_ATTACHMENT_1` |
| `BLUESTACKS_EXE_PATH` | Full path to the executable for `OPENGAME` |

**Never commit `.env`.** It is listed in `.gitignore`.

### 4. Run

```bash
npm start
```

---

## Known issues / remaining cleanup

These are the open items before this prototype could be considered production-quality:

- **Phrase matching is fragile.** The LLM is asked to embed action words inside natural-language text. This should be replaced with structured JSON output (see Architecture section below).
- **Electron security.** `nodeIntegration: true` is currently required because renderer scripts use `require()` directly. The path to fixing this is documented in `preload.js` — expose only what's needed via `contextBridge`, then disable `nodeIntegration`.
- **Audio context in Node.** `window.AudioContext` in `hugging-face-api.js` only works inside the Electron renderer, not the Node main process. Audio playback logic should be split clearly into renderer-only code.
- **No MongoDB connection pooling.** `connectToDatabase()` opens a new connection on every call. Use a cached singleton connection.
- **No executable allowlist.** `turnOnExe()` launches whatever path `BLUESTACKS_EXE_PATH` points to without validation. Add an allowlist of approved executables.
- **Rotate any previously exposed keys.** If this repo's git history was ever pushed publicly with secrets in it, those keys should be rotated regardless of the current state of the code.

---

## Architecture — suggested next direction

Replace the phrase-based protocol with strict structured output from the LLM:

```json
{
  "action": "SHELLY_ON",
  "arguments": { "device": "desk_light" },
  "spokenResponse": "Turning the desk light on."
}
```

Split the codebase into clear layers:

```
src/
  audio/
    recorder.js       continuous mic capture + VAD
    transcriber.js    Whisper API
    speaker.js        ElevenLabs TTS

  llm/
    router.js         send message, parse structured JSON response
    promptBuilder.js  build system prompt from action schema

  actions/
    shelly.js
    files.js
    apps.js

  memory/
    database.js       singleton MongoDB connection

  config/
    devices.json      Shelly IPs and names
    apps.json         allowed executable paths

  main.js
```
