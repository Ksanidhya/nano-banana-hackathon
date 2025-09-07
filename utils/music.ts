export interface MusicTrack {
  name: string;
  mood: string;
  url: string;
}

export const musicTracks: MusicTrack[] = [
    {
    name: "Enchanted Lullaby",
    mood: "magical, gentle, dreamy, whimsical, sleepy, calm, soothing",
    url: "https://cdn.pixabay.com/download/audio/2025/08/12/audio_69862e2bf1.mp3?filename=lullaby-baby-sleep-music-388567.mp3",
  },
  {
    name: "Joyful Day",
    mood: "happy, cheerful, upbeat, playful, joyful, bright, fun",
    url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_1e760b4ae7.mp3?filename=twinkle-like-a-star-8026.mp3",
  },
  {
    name: "Funny Frolic",
    mood: "funny, quirky, silly, comical, playful, bouncy",
    url: "https://cdn.pixabay.com/download/audio/2025/06/26/audio_20abff189b.mp3?filename=lullaby-bells-baby-music-loop-366300.mp3",
  },
  {
    name: "Mysterious Meadow",
    mood: "mysterious, curious, wondrous, suspenseful, intriguing, thoughtful",
    url: "https://cdn.pixabay.com/download/audio/2025/08/29/audio_34f03dbf89.mp3?filename=lullaby-berceuse-du-petit-prince-et-de-la-princesse-french-393576.mp",
  },
];