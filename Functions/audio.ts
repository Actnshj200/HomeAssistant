import { Readable } from 'stream';
import * as path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { ElevenLabsClient } = require("elevenlabs");

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) { throw new Error('ELEVENLABS_API_KEY environment variable is not set.'); }
const voiceId = process.env.ELEVENLABS_VOICE_ID || '7oj6OS5ga3IxvikkhBn1';


const Elvenclient = new ElevenLabsClient({
    apiKey: apiKey,
});

interface GenerateOptions {
  voice: string;
  optimizeStreamingLatency: string;
  outputFormat: string;
  text: string;
  model_id: string;
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };
}

export async function HandleAudio(text: string): Promise<Readable> {
  try {
    const options: GenerateOptions = {
      voice: voiceId,
      optimizeStreamingLatency: '0',
      outputFormat: 'mp3_22050_32',
      text: text,
      model_id: 'eleven_turbo_v2',
      voiceSettings: {
        stability: 0.0,
        similarityBoost: 1.0,
        style: 0.0,
        useSpeakerBoost: true,
      },
    };

      const response = await Elvenclient.generate(options);
      console.log(response);
    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}