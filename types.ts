
export interface StoryPage {
  text: string;
  imageUrl: string;
  textEffect: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface StoryStructure {
  title: string;
  pages: {
    scene: string;
    imagePrompt: string;
    textEffectPrompt: string;
  }[];
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PREVIEW = 'PREVIEW',
  ERROR = 'ERROR',
}