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

  const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const slowedDownText = text.replace(/([.?!])\s*(?=[A-Z])/g, '$1 ... ');
  
  const MAX_RETRIES = 3;
  let delay = 1000; // Initial delay of 1 second

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: slowedDownText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.75,
          },
        }),
      });

      if (response.ok) {
        const audioData = await response.arrayBuffer();

        if (!audioData || audioData.byteLength === 0) {
          throw new Error("No audio response received from ElevenLabs API");
        }

        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        const duration = await getAudioDuration(audioUrl);

        if (duration === 0) {
            URL.revokeObjectURL(audioUrl);
            throw new Error("Generated audio has zero duration. This could be due to an API error.");
        }

        return { audioUrl, duration }; // Success!
      }

      // Handle non-OK responses
      if (response.status === 401) {
          throw new Error("Narration failed: The provided ElevenLabs API Key is invalid or has insufficient credits.");
      }
      
      if (response.status === 429) {
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`ElevenLabs API rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue; // Next attempt
        } else {
          throw new Error("Narration failed: ElevenLabs API is currently experiencing heavy traffic. Please try again in a few moments.");
        }
      }

      // For other HTTP errors, try to get details from the body
      let errorDetails = "An unknown error occurred with the narration service.";
      try {
        const errorData = await response.json();
        console.error("ElevenLabs API error:", errorData);
        if (errorData.detail?.message) {
            errorDetails = errorData.detail.message;
        } else if (typeof errorData.detail === 'string') {
            errorDetails = errorData.detail;
        }
      } catch (e) {
        errorDetails = await response.text();
        console.error("ElevenLabs API non-JSON error response:", errorDetails);
      }
      throw new Error(`Narration failed: ${errorDetails}`);

    } catch (error) {
      console.error(`Error on attempt ${attempt + 1} for generateNarration:`, error);
      if (attempt < MAX_RETRIES - 1) {
        // This could be a network error, so we can retry
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        // Last attempt failed, rethrow the error
        if (error instanceof Error) {
            // Re-throw specific errors for API keys to be handled upstream
            if (error.message.includes("API Key")) {
                throw error;
            }
            throw new Error(`Failed to generate narration after several attempts. Please check your network connection or try again later. Details: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating narration after several attempts.");
      }
    }
  }
  // This line should be unreachable if the loop logic is correct, but it satisfies TypeScript's need for a return path.
  throw new Error("Failed to generate narration after all retries.");
}
