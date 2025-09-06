
export interface StoryPage {
  text: string;
  imageUrl: string;
}

export interface StoryStructure {
  title: string;
  pages: {
    scene: string;
    imagePrompt: string;
  }[];
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PREVIEW = 'PREVIEW',
  ERROR = 'ERROR',
}
