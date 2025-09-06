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

  const handleStoryGeneration = useCallback(async (prompt: string, image: File | null) => {
    setAppState(AppState.LOADING);
    setError(null);
    setStoryPages([]);
    setProgressMessage('Dreaming up a wonderful story...');
    setIsGenerating(true);
    setTotalPages(0);
    setStoryTitle('');

    try {
      await generateStoryAndImages(
        prompt,
        image,
        (progress) => setProgressMessage(progress),
        (page) => {
          setStoryPages(prevPages => [...prevPages, page]);
          if (appState !== AppState.PREVIEW) {
            setAppState(AppState.PREVIEW);
          }
        },
        (total, title) => {
            setTotalPages(total);
            setStoryTitle(title);
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
          />
        );
      case AppState.ERROR:
        return (
          <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-2xl font-bold text-red-700 mb-4">Oops! Something went wrong.</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-colors"
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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="py-6 px-4 sm:px-8 border-b border-slate-200">
        <div className="max-w-5xl mx-auto flex items-center justify-center sm:justify-start space-x-3">
          <LogoIcon className="h-10 w-10 text-rose-500" />
          <h1 className="font-title text-3xl text-slate-700">
            AI Bedtime Story Weaver
          </h1>
        </div>
      </header>
      <main className="py-10 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-slate-500 border-t border-slate-200">
        <p>Crafted with AI by a world-class senior frontend React engineer.</p>
      </footer>
      {showVideo && <VideoPlayer pages={storyPages} onClose={() => setShowVideo(false)} />}
    </div>
  );
}

export default App;
