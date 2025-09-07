import React, { useState, useCallback } from 'react';
import { StoryInputForm } from './components/StoryInputForm';
import { StoryPreview } from './components/StoryPreview';
import { Loader } from './components/Loader';
import { VideoPlayer } from './components/VideoPlayer';
import { generateStoryAndImages } from './services/geminiService';
import { AppState, StoryPage } from './types';
import { LogoIcon } from './components/Icons';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [showVideo, setShowVideo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [storyTitle, setStoryTitle] = useState('');
  const [musicUrl, setMusicUrl] = useState('');

  const handleStoryGeneration = useCallback(async (prompt: string, image: File | null, enableNarration: boolean, elevenLabsApiKey: string) => {
    setAppState(AppState.LOADING);
    setError(null);
    setStoryPages([]);
    setProgressMessage('Dreaming up a wonderful story...');
    setIsGenerating(true);
    setTotalPages(0);
    setStoryTitle('');
    setMusicUrl('');

    try {
      await generateStoryAndImages(
        prompt,
        image,
        enableNarration,
        elevenLabsApiKey,
        (progress) => setProgressMessage(progress),
        (page) => {
          setStoryPages(prevPages => [...prevPages, page]);
          if (appState !== AppState.PREVIEW) {
            setAppState(AppState.PREVIEW);
          }
        },
        (total, title, url) => {
            setTotalPages(total);
            setStoryTitle(title);
            setMusicUrl(url);
        }
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    } finally {
        setIsGenerating(false);
    }
  }, [appState]);

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setStoryPages([]);
    setError(null);
    setProgressMessage('');
    setShowVideo(false);
    setIsGenerating(false);
    setTotalPages(0);
    setStoryTitle('');
    setMusicUrl('');
  };
  
  const handleWatchVideo = () => {
    setShowVideo(true);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.LOADING:
        return <Loader message={progressMessage} />;
      case AppState.PREVIEW:
        return (
          <StoryPreview
            pages={storyPages}
            onReset={handleReset}
            onWatchVideo={handleWatchVideo}
            isGenerating={isGenerating}
            progressMessage={progressMessage}
            totalPages={totalPages}
            storyTitle={storyTitle}
            musicUrl={musicUrl}
          />
        );
      case AppState.ERROR:
        return (
          <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-2xl font-bold text-red-700 mb-4">Oops! Something went wrong.</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2 text-lg font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              Try Again
            </button>
          </div>
        );
      case AppState.IDLE:
      default:
        return <StoryInputForm onGenerate={handleStoryGeneration} />;
    }
  };

  return (
    <div className="bg-rose-50 min-h-screen">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-3 mb-2">
            <LogoIcon className="h-10 w-10 text-rose-500" />
            <h1 className="text-4xl md:text-5xl font-bold font-title text-slate-800">
              AI Bedtime Story Weaver
            </h1>
          </div>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Weave magical tales and illustrations for your little ones in seconds.
          </p>
        </header>
        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>
        {showVideo && (
          <VideoPlayer pages={storyPages} onClose={() => setShowVideo(false)} musicUrl={musicUrl} />
        )}
      </main>
    </div>
  );
}

export default App;
