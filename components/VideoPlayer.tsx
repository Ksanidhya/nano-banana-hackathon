import React, { useState, useEffect, useRef } from 'react';
import { StoryPage } from '../types';

type VideoPlayerProps = {
  pages: StoryPage[];
  onClose: () => void;
};

const MUSIC_URL = "https://cdn.pixabay.com/download/audio/2021/11/23/audio_831b18d227.mp3"; // Royalty-free soft lullaby
const PAGE_DURATION = 10000; // 10 seconds per page

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ pages, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if(audio) {
      audio.volume = 0.3;
      audio.play().catch(e => console.error("Audio playback failed:", e));
    }
    
    const interval = setInterval(() => {
      setCurrentPage((prevPage) => {
        if (prevPage >= pages.length - 1) {
          clearInterval(interval);
          setTimeout(onClose, PAGE_DURATION); // Wait on last slide before closing
          return prevPage;
        }
        return prevPage + 1;
      });
    }, PAGE_DURATION);

    return () => {
      clearInterval(interval);
      if(audio) audio.pause();
    };
  }, [pages, onClose]);

  const progress = ((currentPage + 1) / pages.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {pages.map((page, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${currentPage === index ? 'opacity-100' : 'opacity-0'}`}
          >
            <img src={page.imageUrl} alt={`Page ${index + 1}`} className="w-full h-full object-contain" />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-4">
              <p className="text-white text-center text-lg md:text-xl leading-tight">{page.text}</p>
            </div>
          </div>
        ))}
        
        <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white bg-opacity-20">
          <div 
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      <audio ref={audioRef} src={MUSIC_URL} loop />
    </div>
  );
};