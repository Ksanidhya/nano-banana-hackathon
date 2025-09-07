import React, { useState, useEffect, useRef } from 'react';
import { StoryPage } from '../types';
import { PauseIcon, PlayIcon } from './Icons';
import { getTextStyleFromPrompt } from './StoryPreview';

type VideoPlayerProps = {
  pages: StoryPage[];
  onClose: () => void;
  musicUrl: string;
};

const PAGE_DURATION = 10000; // 10 seconds per page for non-narrated stories

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ pages, onClose, musicUrl }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const narrationAudioRef = useRef<HTMLAudioElement>(null);
  const finalMusicUrl = musicUrl || "https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/soundtrack.mp3";
  const hasNarration = !!pages[0]?.audioUrl;

  // Combined effect for playback logic
  useEffect(() => {
    const music = musicAudioRef.current;
    const narration = narrationAudioRef.current;
    if (!music || !narration) return;

    // Manage playing/paused state for both audio elements
    if (isPlaying) {
      music.volume = hasNarration ? 0.15 : 0.3;
      music.play().catch(e => console.error("Music playback failed:", e));
      if (hasNarration) narration.play().catch(e => console.error("Narration playback failed:", e));
    } else {
      music.pause();
      if (hasNarration) narration.pause();
    }

    // Handle page transitions
    let timerId: number | undefined;

    const goToNextPage = () => {
      setCurrentPage(prevPage => {
        if (prevPage >= pages.length - 1) {
          setIsPlaying(false);
          setTimeout(onClose, 2000); // Wait on last slide
          return prevPage;
        }
        return prevPage + 1;
      });
    };

    if (isPlaying) {
      if (hasNarration) {
        narration.addEventListener('ended', goToNextPage);
      } else {
        timerId = window.setTimeout(goToNextPage, PAGE_DURATION);
      }
    }

    return () => {
      if (timerId) clearTimeout(timerId);
      narration.removeEventListener('ended', goToNextPage);
    };
  }, [pages, currentPage, isPlaying, hasNarration, onClose]);

  // Effect to update narration audio source when page changes
  useEffect(() => {
    if (hasNarration) {
      const narration = narrationAudioRef.current;
      if (narration) {
        narration.src = pages[currentPage].audioUrl!;
        if (isPlaying) {
          narration.play().catch(e => console.error("Narration playback failed on page change:", e));
        }
      }
    }
  }, [currentPage, pages, hasNarration, isPlaying]);


  const togglePlay = () => {
    // Prevent re-playing after the slideshow has finished.
    if (currentPage >= pages.length - 1 && !isPlaying) {
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const progress = ((currentPage + 1) / pages.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg shadow-2xl overflow-hidden group" onClick={(e) => e.stopPropagation()}>
        {pages.map((page, index) => {
          const { className: textEffectClass, style: textEffectStyle } = getTextStyleFromPrompt(page.textEffect || '');
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${currentPage === index ? 'opacity-100' : 'opacity-0'}`}
            >
              <img src={page.imageUrl} alt={`Page ${index + 1}`} className="w-full h-full object-contain" />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-4">
                <p 
                  className={`text-white text-center text-lg md:text-xl leading-tight font-chewy ${textEffectClass}`}
                  style={textEffectStyle}
                >
                  {page.text}
                </p>
              </div>
            </div>
          );
        })}
        
        {/* Play/Pause Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button 
                onClick={togglePlay} 
                className="text-white bg-black bg-opacity-30 rounded-full p-4 hover:bg-opacity-50 focus:bg-opacity-50 transition-all opacity-20 group-hover:opacity-100 focus:opacity-100 pointer-events-auto"
                aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
            >
                {isPlaying ? (
                    <PauseIcon className="h-10 w-10" />
                ) : (
                    <PlayIcon className="h-10 w-10" />
                )}
            </button>
        </div>

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
      <audio ref={musicAudioRef} src={finalMusicUrl} loop />
      <audio ref={narrationAudioRef} />
    </div>
  );
};