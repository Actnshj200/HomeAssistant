const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdf2json = require('pdf2json');
const Speaker = require('speaker');
const { spawn } = require('child_process');
//const { ElevenLabsClient } = require("elevenlabs");
const stream = require('stream'); // Add this line to import the 'stream' module
const { HandleAudio } = require('./audio.js');
const record = require('node-record-lpcm16');
const shellyIP = '192.168.0.d44'; // Replace with your Shelly device's IP
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: 'API-KEY',
    dangerouslyAllowBrowser: true// Replace with your OpenAI API key
});
const actionPhrases = [
    {
        phrase: 'SIGN_IN_TO_TWITTER',
        description: 'If the user\'s message requires signing in to Twitter',
    },
    {
        phrase: 'NO_ACTION_REQUIRED',
        description: 'If the user\'s message doesn\'t require any specific action',
    },
    {
        phrase: 'PROCESS_ATTACHMENT_1',
        description: 'the user has provided an attachment',
    },
    {
        phrase: 'OPENGAME',
        description: 'the user has provided an attachment',
    },
    {
        phrase: 'SHELLY_STATUS',
        description: 'If the user asks for the status of the Shelly device',
    },
    {
        phrase: 'SHELLY_ON',
        description: 'If the user wants to turn on the Shelly device',
    },
    {
        phrase: 'SHELLY_OFF',
        description: 'If the user wants to turn off the Shelly device',
    },
    // Add more phrases and descriptions as needed
];

//const apiKey = 'b49d5ead2c3870102d7287ba90fa4df9';
//const voiceId = '7oj6OS5ga3IxvikkhBn1';
//const {
//    //getConversationHistory,
//    //saveConversationHistory,
//    //closeDatabase,
//} = require('./database');



const getCookieValue = (cookieString, cookieName) => {
    const cookies = cookieString.split('; ');
    for (let i = 0; i < cookies.length; i++) {
        const [name, value] = cookies[i].split('=');
        if (name === cookieName) {
            return decodeURIComponent(value);
        }
    }
    return null;
};

async function getShellyStatus() {
    try {
        const response = await axios.get(`http://${shellyIP}/status`);
        return response.data;
    } catch (error) {
        console.error('Error getting Shelly status:', error);
        return null;
    }
}

async function controlShelly(turnOn) {
    try {
        const action = turnOn ? 'on' : 'off';
        await axios.get(`http://${shellyIP}/relay/0?turn=${action}`);
        return `Shelly turned ${action}`;
    } catch (error) {
        console.error('Error controlling Shelly:', error);
        return `Failed to turn Shelly ${turnOn ? 'on' : 'off'}`;
    }
}

async function readLocalFiles(folderPath) {
    try {
        const files = await fs.promises.readdir(folderPath);
        console.log("FolderPath: " + folderPath);
        const fileContents = [];

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const fileExtension = path.extname(filePath).toLowerCase();
            if (fileExtension === '.pdf') {
                const pdfParser = new pdf2json();
                const pdfData = await new Promise((resolve, reject) => {
                    pdfParser.on('pdfParser_dataError', errData => reject(errData.parserError));
                    pdfParser.on('pdfParser_dataReady', pdfData => resolve(pdfData));
                    pdfParser.loadPDF(filePath);
                });

                const textContent = pdfData.formImage.Pages.map(page =>
                    page.Texts.map(text => text.R.map(r => r.T).join('')).join(' ')
                ).join('\n');

                fileContents.push(`File: ${file}\nContent: ${textContent}`);
            }
        }

        return fileContents.join('\n\n');
    } catch (error) {
        console.error('Error reading local files:', error);
        return null;
    }
}

async function handleSpecificPhrases(phrases, sessionId) {
    for (const phrase of phrases) {
        switch (phrase) {
            case 'SIGN_IN_TO_TWITTER':
                await signInToTwitter();
                break;
            case 'NO_ACTION_REQUIRED':
                // Handle the case when no action is required
                console.log('No action required');
                break;
            case 'PROCESS_ATTACHMENT_1':
                console.log("process attachment 1");
                const folderPath = await getFolderPath(phrase);
                if (folderPath) {
                    const attachment = await processAttachment(folderPath);
                    const systemPrompt = `After your response determine if any specific actions need to be taken. ${actionPhrases.map(action => `If ${action.description}, include the phrase '${action.phrase}' in your response.`).join(' ')}`;
                    const Finish = "This is what is read through the files: ";
                    // Send the second request with the attachment
                    const messages2 = [
                        {
                            "role": "system",
                            "content": Finish + attachment,
                        },
                    ];

                    const response2 = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: "gpt-4",
                        messages: messages2,
                        temperature: 1,
                        max_tokens: 256,
                        top_p: 1,
                        frequency_penalty: 0,
                        presence_penalty: 0,
                    }, {
                        headers: {
                            'Authorization': `Bearer API-KEY`,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log("Second Response");
                    console.log(response2.data);
                    console.log(response2.data.choices[0].message.content);
                    HandleAudio(response2.data.choices[0].message.content);
                    let history = await getConversationHistory(sessionId);
                    history.messages.push({ user: `Here are the contents of the processed attachment:\n\n${attachment}`, bot: response2.data.choices[0].message.content });
                    await saveConversationHistory(history);
                    return response2.data.choices[0].message.content;
                    break;
                }
            case 'OPENGAME':
                console.log("open game");
                const folderPath2 = await getFolderPath(phrase);
                if (folderPath2) {
                    turnOnExe(folderPath2);
                    //const attachment = await processAttachment(folderPath2);
                    const systemPrompt = `After your response determine if any specific actions need to be taken. ${actionPhrases.map(action => `If ${action.description}, include the phrase '${action.phrase}' in your response.`).join(' ')}`;
                    // Send the second request with the attachment
                    const messages2 = [
                        {
                            "role": "system",
                            "content": systemPrompt,
                        },
                    ];

                    const response2 = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: "gpt-4",
                        messages: messages2,
                        temperature: 1,
                        max_tokens: 256,
                        top_p: 1,
                        frequency_penalty: 0,
                        presence_penalty: 0,
                    }, {
                        headers: {
                            'Authorization': `Bearer API-KEY`,
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log(response2.data);
                    console.log(response2.data.choices[0].message.content);
                    HandleAudio(response2.data.choices[0].message.content);
                    let history = await getConversationHistory(sessionId);
                    history.messages.push({ user: `If it was successful`, bot: response2.data.choices[0].message.content });
                    await saveConversationHistory(history);
                    return response2.data.choices[0].message.content;
                    break;
                }
                
            // Add more cases for additional phrases and corresponding functions
            case 'SHELLY_STATUS':
                const status = await getShellyStatus();
                if (status) {
                    return `Shelly device status: ${JSON.stringify(status)}`;
                } else {
                    return "Failed to get Shelly device status.";
                }
            case 'SHELLY_ON':
                return await controlShelly(true);
            case 'SHELLY_OFF':
                return await controlShelly(false);
        }
    }
}

function recordAndTranscribeAudio(sessionId) {
    const soxPath = 'sox';
    const soxArgs = ['-t', 'waveaudio', '-d', '-r', '16000', '-c', '1', '-b', '16', '-e', 'signed-integer', '-t', 'raw', '-'];

    const soxProcess = spawn(soxPath, soxArgs);

    console.log('Recording...');

    let buffer = Buffer.alloc(0);
    const CHUNK_SIZE = 32000; // 2 seconds of audio at 16kHz
    const SAMPLE_RATE = 16000;

    soxProcess.stdout.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);

        if (buffer.length >= CHUNK_SIZE) {
            const audioChunk = buffer.slice(0, CHUNK_SIZE);
            buffer = buffer.slice(CHUNK_SIZE);

            if (detectSpeech(audioChunk, SAMPLE_RATE)) {
                const tempFilePath = `temp_audio_${Date.now()}.wav`;
                
                // Convert raw audio to WAV
                const wavBuffer = Buffer.alloc(44 + audioChunk.length);
                writeWavHeader(wavBuffer, SAMPLE_RATE, 1, '16', audioChunk.length);
                audioChunk.copy(wavBuffer, 44);
                
                fs.writeFileSync(tempFilePath, wavBuffer);

                transcribeAudio(tempFilePath)
                    .then((transcription) => {
                        if (transcription && transcription.trim() !== '') {
                            console.log("Transcription: ", transcription);
                            huggingFaceAPI(transcription, sessionId);
                        }
                        fs.unlinkSync(tempFilePath);
                    })
                    .catch((error) => {
                        console.error("Error transcribing audio:", error);
                        fs.unlinkSync(tempFilePath);
                    });
            }
        }
    });

    soxProcess.stderr.on('data', (data) => {
        console.error(`SoX Error: ${data}`);
    });

    soxProcess.on('close', (code) => {
        console.log(`Recording stopped with code ${code}`);
        // Restart the recording process
        recordAndTranscribeAudio(sessionId);
    });
}

async function transcribeAudio(filePath) {
    const audioFile = fs.createReadStream(filePath);

    try {
        const response = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file: audioFile,
            response_format: "json"  // Use "text" if you only want the text response
        });

        console.log("Transcription: ", response.text);
        HandleAudio(response.text);

        //// Optionally, save the transcription to the conversation history
        //let history = await getConversationHistory(sessionId);
        //history.messages.push({ user: 'Recorded audio input', bot: response.data.text });
        //await saveConversationHistory(history);
        huggingFaceAPI(response.text, "TEST");
        return response.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw error;
    }
}

module.exports = {
    huggingFaceAPI,
    handleSpecificPhrases
};

// Start listening for microphone input immediately when the application starts
recordAndTranscribeAudio("initial-session-id");

// Function to handle signing in to Twitter
function signInToTwitter() {
    // Add your sign-in logic here
    console.log('Signing in to Twitter...');
    // Perform the necessary steps to sign in to Twitter
}

// Function to turn on an exe via a specified path
async function turnOnExe(exePath) {
    try {
        const { spawn } = require('child_process');
        spawn(exePath, [], { detached: true });
        console.log(`Turned on exe: ${exePath}`);
    } catch (error) {
        console.error('Error turning on exe:', error);
    }
}

async function getFolderPath(actionPhrase) {
    console.log(actionPhrase);
    switch (actionPhrase) {
        case 'PROCESS_ATTACHMENT_1':
            console.log("Entering processattachment Get Folder Path");
            const folderPath = 'C:/Users/hj/Desktop/New folder';
            return folderPath;
            break;
        case 'OPENGAME':
            console.log("Entering processattachment Get Folder Path");
            const folderPath2 = 'C:/Program Files (x86)/BlueStacks X/BlueStacks X.exe';
            return folderPath2;
            break;
        // Add more cases for additional action phrases and corresponding folder paths
        default:
            return null; // Return null if no matching action phrase is found
    }
}

async function processAttachment(folderPath) {
    try {
        const attachment = await readLocalFiles(folderPath);
        console.log("Attachment: " + attachment);
        return attachment;
    } catch (error) {
        console.error('Error processing attachment:', error);
        return null;
    }
}


async function huggingFaceAPI(message, sessionId) {
    try {
        const systemPrompt = `After your response determine if any specific actions need to be taken. ${actionPhrases.map(action => `If ${action.description}, include the phrase '${action.phrase}' in your response.`).join(' ')}`;

        const messages = [
            {
                "role": "system",
                "content": systemPrompt,
            },
            {
                "role": "user",
                "content": message, //+ "\n\nYou are sent the following files:\n\n" + attachment,
            }
        ];

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: messages,
            temperature: 1,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        }, {
            headers: {
                'Authorization': `Bearer API-KEY`,
                'Content-Type': 'application/json'
            }
        });

        console.log(response.data);
        console.log(response.data.choices[0].message.content);
        const audioGenerator = await HandleAudio(response.data.choices[0].message.content);
        console.log(audioGenerator);
        //const Sendstream = audioGenerator.pipeTo(new stream.PassThrough());
        // Create a reader to read the stream data
        const reader = audioGenerator.getReader();
        const chunks = [];

        // Read the stream
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        // Concatenate the chunks into a single buffer
        const audioBlob = new Blob(chunks);
        const audioArrayBuffer = await audioBlob.arrayBuffer();

        // Decode the audio data and play it
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);

        console.log('Audio playback started');

     

        return {
            botResponse: response.data.choices[0].message.content,
            audioBuffer: audioBuffer,
        };
        //let history = await getConversationHistory(sessionId);
        //history.messages.push({ user: message, bot: response.data.choices[0].message.content });
        //await saveConversationHistory(history);

        //await closeDatabase();

        return { botResponse: response.data.choices[0].message.content };
    } catch (error) {
        console.error('Error:', error);
        if (error.response) {
            console.error('Error Response:', error.response.data);
        } else {
            console.error('Error Message:', error.message);
        }
      //  await closeDatabase();
        throw error;
    }
}


