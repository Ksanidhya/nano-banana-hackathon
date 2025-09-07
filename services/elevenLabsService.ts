const getAudioDuration = (url: string): Promise<number> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.onloadedmetadata = () => resolve(audio.duration);
        audio.onerror = () => resolve(0); // Resolve with 0 if there's an error
        audio.src = url;
    });
};

export async function generateNarration(text: string, apiKey: string, voiceId: string): Promise<{ audioUrl: string; duration: number }> {
  if (!apiKey) {
    throw new Error("Narration failed: ElevenLabs API Key was not provided.");
  }

  try {
    const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js');
    const client = new ElevenLabsClient({ apiKey });

    const audioStream = await client.textToSpeech.convert(voiceId, {
      text: text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });

    // Convert the ReadableStream from the API into a Blob
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
        chunks.push(chunk);
    }
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    
    // Calculate the duration of the created audio blob
    const duration = await getAudioDuration(audioUrl);

    if (duration === 0) {
        URL.revokeObjectURL(audioUrl);
        throw new Error("Generated audio has zero duration. This could be due to an API error.");
    }

    return { audioUrl, duration };

  } catch (error) {
    console.error("ElevenLabs API error:", error);
    if (error instanceof Error && (error.message.includes("API Key") || error.message.includes("Forbidden"))) {
        throw new Error("Narration failed: The provided ElevenLabs API Key is invalid or has insufficient credits.");
    }
    throw new Error("Failed to generate narration. Please check your ElevenLabs API key and plan.");
  }
}
