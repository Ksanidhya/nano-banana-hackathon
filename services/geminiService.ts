import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { StoryPage, StoryStructure } from '../types';
import { fileToBase64 } from "../utils/fileUtils";
import { musicTracks } from '../utils/music';
import { generateNarration } from './elevenLabsService';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const storySchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A short, catchy title for the story."
    },
    pages: {
      type: Type.ARRAY,
      description: "An array of pages for the story, between 6 and 8 pages long.",
      items: {
        type: Type.OBJECT,
        properties: {
          scene: {
            type: Type.STRING,
            description: "One or two paragraphs of text for this page of the story."
          },
          imagePrompt: {
            type: Type.STRING,
            description: "A detailed, vibrant, and artistic prompt for an image generation model to create an illustration for this scene. The style should be 'enchanting children's book illustration, whimsical, soft pastel colors, storybook style'. Crucially, maintain a consistent style and character appearance throughout the story. If a main character is described, their key features must be included in each relevant prompt to ensure they look the same on every page."
          },
          textEffectPrompt: {
            type: Type.STRING,
            description: "A short, descriptive prompt for a stylistic text effect that matches the mood of the scene. Examples: 'sparkling golden text', 'gentle floating words', 'handwritten cursive', 'bold and adventurous font'."
          }
        },
        required: ["scene", "imagePrompt", "textEffectPrompt"]
      }
    }
  },
  required: ["title", "pages"]
};

const musicSelectionSchema = {
    type: Type.OBJECT,
    properties: {
        musicName: {
            type: Type.STRING,
            description: "The exact name of the chosen music track.",
        },
        reason: {
            type: Type.STRING,
            description: "A brief explanation for why this music was chosen.",
        }
    },
    required: ["musicName", "reason"]
}

async function selectMusicForStory(story: StoryStructure): Promise<string> {
  const storySummary = `Title: ${story.title}. Story pages: ${story.pages.map(p => p.scene).join(' ')}`;
  const musicOptions = musicTracks.map(track => `- ${track.name}: (Mood: ${track.mood})`).join('\n');
  
  const prompt = `Based on the following children's story summary, select the most fitting background music from the list provided. The music should match the overall tone and mood of the story.

**Story Summary:**
${storySummary.substring(0, 3000)}...

**Available Music Tracks:**
${musicOptions}

Please choose the single best track. Your response must be a JSON object that strictly follows the provided schema.
`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: musicSelectionSchema,
        },
    });

    const result = JSON.parse(response.text.trim());
    const chosenTrack = musicTracks.find(track => track.name === result.musicName);

    if (chosenTrack) {
        console.log(`Music chosen: ${chosenTrack.name}. Reason: ${result.reason}`);
        return chosenTrack.url;
    }
  } catch(e) {
    console.error("Failed to select music, using default.", e);
  }

  // Fallback to the default magical music
  return musicTracks[0].url;
}


async function generateStoryStructure(prompt: string, image: File | null): Promise<StoryStructure> {
    const fullPrompt = `You are a magical storyteller for children. Your task is to create a gentle, heartwarming bedtime story based on the user's idea. The story should be simple, positive, and have a happy ending.

**Instructions:**
1. Read the user's story idea below.
2. Structure the story into a JSON object that strictly follows the provided schema. The object must contain a 'title' (string) and an array of 'pages'.
3. The story must have between 6 and 8 pages.
4. For each page in the 'pages' array, create an object with three properties:
   - \`scene\`: One or two paragraphs of text for the story on that page.
   - \`imagePrompt\`: A detailed, artistic prompt for an image generation model. This prompt should describe the scene in a 'whimsical, enchanting children's book illustration' style with soft pastel colors.
   - \`textEffectPrompt\`: A short, descriptive prompt for a stylistic text effect that matches the mood of the scene (e.g., 'sparkling golden text', 'gentle floating words', 'handwritten cursive', 'bold and adventurous font').
5. **Crucially**, ensure that any characters are described consistently in every \`imagePrompt\` to maintain their appearance throughout the story's illustrations.

**User's Story Idea:**
"${prompt}"
`;

    const contentParts: any[] = [{ text: fullPrompt }];

    if (image) {
        const base64Image = await fileToBase64(image);
        contentParts.unshift({
            inlineData: {
                mimeType: image.type,
                data: base64Image,
            },
        });
        // Add explicit instruction to use the image
        contentParts.push({ text: "\n\n(Use the provided image as strong inspiration for the character style, mood, and artistic direction of the story's illustrations.)" });
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentParts },
        config: {
            // System instruction removed in favor of a more detailed user prompt
            responseMimeType: 'application/json',
            responseSchema: storySchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StoryStructure;
    } catch (e) {
        console.error("Failed to parse story JSON:", response.text);
        throw new Error("The AI failed to generate a valid story structure. Please try a different prompt.");
    }
}

async function generateImage(prompt: string): Promise<string> {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    }
    
    throw new Error("Image generation failed to produce an image.");
}

export async function generateStoryAndImages(
  prompt: string,
  image: File | null,
  enableNarration: boolean,
  elevenLabsApiKey: string,
  voiceId: string,
  onProgress: (message: string) => void,
  onPageGenerated: (page: StoryPage) => void,
  onStructureReady: (totalPages: number, title: string, musicUrl: string) => void
): Promise<void> {
  onProgress('Crafting the storyline...');
  const storyStructure = await generateStoryStructure(prompt, image);

  if (!storyStructure.pages || storyStructure.pages.length === 0) {
    throw new Error("The AI did not generate any story pages.");
  }
  
  onProgress('Choosing the perfect music...');
  const musicUrl = await selectMusicForStory(storyStructure);
  
  const totalPages = storyStructure.pages.length + 1;
  onStructureReady(totalPages, storyStructure.title, musicUrl);

  // Add title page
  const titlePageText = storyStructure.title;
  const titleImagePrompt = `A beautiful and enchanting title card for a children's story called '${storyStructure.title}'. The style should be whimsical, soft pastel colors, storybook style. Incorporate elements from the story, like: ${storyStructure.pages[0].imagePrompt}`;
  onProgress(`Painting the title page... (1 of ${totalPages})`);
  const titleImageUrl = await generateImage(titleImagePrompt);
  const titlePage: StoryPage = { text: titlePageText, imageUrl: titleImageUrl, textEffect: 'grand, magical title' };

  if (enableNarration) {
    onProgress(`Narrating title page...`);
    try {
        const { audioUrl, duration } = await generateNarration(titlePage.text, elevenLabsApiKey, voiceId);
        titlePage.audioUrl = audioUrl;
        titlePage.audioDuration = duration;
    } catch (e) {
        console.error(e);
        throw e;
    }
  }
  onPageGenerated(titlePage);

  for (let i = 0; i < storyStructure.pages.length; i++) {
    const page = storyStructure.pages[i];
    onProgress(`Painting page ${i + 1} of ${storyStructure.pages.length}... (${i + 2} of ${totalPages})`);
    const imageUrl = await generateImage(page.imagePrompt);
    const storyPage: StoryPage = { text: page.scene, imageUrl: imageUrl, textEffect: page.textEffectPrompt };
    
    if (enableNarration) {
        onProgress(`Narrating page ${i + 1}...`);
        try {
            const { audioUrl, duration } = await generateNarration(storyPage.text, elevenLabsApiKey, voiceId);
            storyPage.audioUrl = audioUrl;
            storyPage.audioDuration = duration;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
    onPageGenerated(storyPage);
  }

  onProgress('Your magical story is ready!');
}
