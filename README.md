# LLM Function Calls Prototype

This branch is an experimental desktop AI assistant prototype built around one core idea:

> Let a language model understand a natural-language request, decide whether a real-world action is needed, and route that request into an actual JavaScript function.

Instead of only returning chat text, the assistant is designed to listen through the microphone, transcribe speech, reason over the request, choose an action phrase, run a matching local function, and respond back with generated audio.

This is not a polished production app. It is a research/prototype branch for exploring LLM-driven function calling, local automation, audio I/O, file parsing, and smart-device control.

---

## What this prototype is trying to do

The goal is to build a personal desktop assistant that can eventually behave like a lightweight local operating layer:

- Listen to the user through a microphone
- Transcribe spoken input into text
- Send the message to an LLM
- Ask the LLM whether a real action is required
- Detect an action phrase in the model output
- Route that phrase to a JavaScript function
- Perform the requested action locally
- Speak the result back to the user

Example target flow:

```text
User speaks
   ↓
Microphone audio is recorded
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
Assistant responds with generated voice
```

---

## Current capabilities explored in this branch

This branch experiments with several function-call-style actions:

### Voice input

The prototype uses SoX/audio recording logic to continuously listen for microphone input, split it into chunks, detect speech, write temporary WAV files, and send those files for transcription.

### Speech transcription

Audio is transcribed using OpenAI Whisper. The resulting text is then passed into the main assistant flow.

### LLM action routing

The assistant sends a system prompt describing action phrases the model can include in its response. Those phrases are then used as a routing layer.

Current action phrase examples include:

```text
SIGN_IN_TO_TWITTER
NO_ACTION_REQUIRED
PROCESS_ATTACHMENT_1
OPENGAME
SHELLY_STATUS
SHELLY_ON
SHELLY_OFF
```

### Local file processing

The branch includes logic for reading files from a local folder and parsing PDFs. The intent is for the assistant to read local attachments/documents and then summarize or respond to them.

### Program launching

The `OPENGAME` action explores launching a local executable from a configured path.

### Shelly smart-device control

The `SHELLY_STATUS`, `SHELLY_ON`, and `SHELLY_OFF` actions explore controlling a Shelly smart device over the local network.

### Voice response

The assistant uses ElevenLabs text-to-speech logic to generate spoken responses from model output.

### Electron desktop shell

The branch includes an Electron entry point for turning the assistant into a desktop application window.

---

## Main files

```text
Functions/hugging-face-api.js
```

Main experimental assistant logic. Despite the name, this file currently focuses heavily on OpenAI/Whisper, action phrase routing, local automation, smart-device control, and audio response handling.

```text
Functions/audio.js
Functions/audio.ts
```

Text-to-speech helper logic for generating spoken responses.

```text
Functions/database.js
```

Early conversation-history/database experiment.

```text
index.js
```

Electron shell entry point.

```text
index.html
```

Frontend entry point for the Electron window.

---

## Architecture concept

The current version uses a simple phrase-based protocol:

1. The system prompt explains available actions to the model.
2. The model replies with normal text plus one or more action phrases.
3. JavaScript checks the phrase.
4. A `switch` statement runs the matching function.

This is an early version of tool/function calling.

A more reliable future version should replace phrase detection with strict structured output, such as JSON:

```json
{
  "action": "SHELLY_ON",
  "arguments": {
    "device": "desk_light"
  },
  "spokenResponse": "Turning the desk light on."
}
```

That would make the assistant less fragile than searching for raw phrases inside a natural-language response.

---

## Setup notes

This branch is experimental and will require local configuration before it can run correctly.

### 1. Install dependencies

```bash
npm install
```

### 2. Install SoX

The microphone recording flow expects SoX to be available from the command line.

On Windows, install SoX and make sure `sox` is available in your PATH.

### 3. Create a `.env` file

API keys should not be hardcoded. A cleaned-up version of this branch should use environment variables:

```env
OPENAI_API_KEY=your_openai_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
SHELLY_IP=192.168.0.xxx
```

### 4. Configure local paths

Several paths are currently hardcoded for local testing, such as attachment folders or executable paths. These should eventually move into a config file.

Example future config shape:

```json
{
  "attachmentFolder": "C:/Users/YourName/Desktop/New folder",
  "apps": {
    "bluestacks": "C:/Program Files (x86)/BlueStacks X/BlueStacks X.exe"
  },
  "devices": {
    "shelly": "192.168.0.xxx"
  }
}
```

---

## Known prototype issues

This branch is not merge-ready as-is. It is mainly a proof-of-concept branch.

Important cleanup items:

- Remove committed `node_modules/`
- Add `node_modules/` to `.gitignore`
- Remove hardcoded API keys
- Rotate any exposed keys immediately
- Move secrets into `.env`
- Move local device paths/IPs into config
- Replace phrase matching with structured JSON/function calls
- Separate audio input, model routing, actions, and speech output into modules
- Add validation before executing any local/system action
- Add logging around action decisions
- Add a safe allowlist for executable launches
- Fix browser-vs-Node/Electron context issues around audio playback

---

## Suggested next rebuild direction

The strongest version of this project would be split into clear layers:

```text
src/
  audio/
    recorder.js
    transcriber.js
    speaker.js

  llm/
    router.js
    schemas.js
    promptBuilder.js

  actions/
    shelly.js
    files.js
    apps.js
    browser.js

  memory/
    database.js

  config/
    devices.json
    apps.json

  main.js
```

Recommended execution model:

```text
Transcription
   → Intent router
   → Strict JSON action object
   → Validate action
   → Execute action
   → Generate final spoken response
```

The most important upgrade is to make the LLM output deterministic and constrained. The assistant should not be trusted to freely write action phrases inside normal text. It should return a validated object, and the app should reject anything outside the allowed schema.

---

## Why this branch matters

This branch is an early attempt at something bigger than a chatbot:

A local assistant that can hear, understand, decide, act, and respond.

The implementation is rough, but the core direction is valuable. It explores the foundation for a natural-language control layer over desktop apps, files, voice, and smart-home devices.

In other words, this branch is the first sketch of a personal AI agent that can actually do things.
