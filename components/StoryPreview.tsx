import React, { useState, useRef, useCallback } from 'react';
import { StoryPage } from '../types';
import { generatePdf } from '../utils/pdfGenerator';
import { generateVideo } from '../utils/videoGenerator';
import { BookIcon, VideoIcon, BackIcon, PrevIcon, NextIcon, DownloadIcon } from './Icons';

type StoryPreviewProps = {
  pages: StoryPage[];
  onReset: () => void;
  onWatchVideo: () => void;
  isGenerating: boolean;
  progressMessage: string;
  totalPages: number;
  storyTitle: string;
};

export const StoryPreview: React.FC<StoryPreviewProps> = ({ pages, onReset, onWatchVideo, isGenerating, progressMessage, totalPages, storyTitle }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleGeneratePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    setPdfProgress('');
    try {
      await generatePdf(pages, (message) => setPdfProgress(message));
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [pages]);
  
  const handleGenerateVideo = useCallback(async () => {
    setIsGeneratingVideo(true);
    setVideoProgress('');
    try {
      await generateVideo(pages, (message) => setVideoProgress(message));
    } catch (error) {
        console.error("Video generation failed:", error);
        alert(`Could not generate video. Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsGeneratingVideo(false);
    }
  }, [pages]);

  const displayTitle = storyTitle || (pages.length > 0 ? pages[0].text : 'Your Story');

  return (
    <div className="animate-fade-in" ref={previewRef}>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8">
            <h2 className="text-3xl font-bold font-title text-slate-800 text-center mb-6">{displayTitle}</h2>
        </div>
        <div className="relative aspect-[4/3] bg-slate-100">
          {pages.map((page, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ${index === currentPage ? 'opacity-100' : 'opacity-0'}`}
            >
              <img src={page.imageUrl} alt={`Story page ${index + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
           {isGenerating && pages.length < totalPages && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 bg-opacity-80">
                <div className="w-12 h-12 border-4 border-t-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <div className="p-6 md:p-8 bg-slate-50">
            <p className="text-slate-600 text-lg leading-relaxed h-24 text-center flex items-center justify-center">
                {pages[currentPage] ? (currentPage > 0 ? pages[currentPage].text : "The beginning of your magical journey...") : "Loading page..."}
            </p>
        </div>
        
        <div className="flex justify-between items-center p-4 border-t border-slate-200">
            <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="p-3 rounded-full hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <PrevIcon className="h-6 w-6 text-slate-600" />
            </button>
            <span className="text-slate-600 font-medium">Page {currentPage + 1} of {totalPages || pages.length}</span>
            <button
                onClick={handleNextPage}
                disabled={currentPage === pages.length - 1}
                className="p-3 rounded-full hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <NextIcon className="h-6 w-6 text-slate-600" />
            </button>
        </div>

      </div>
      
       {isGenerating && (
        <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-slate-600">
                <div className="w-5 h-5 border-2 border-t-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <span>{progressMessage}</span>
            </div>
        </div>
    )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-6 py-3 text-lg font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 transition-all transform hover:scale-105"
        >
          <BackIcon className="h-5 w-5" />
          Start Over
        </button>
        <button
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf || isGenerating}
          className="flex items-center justify-center gap-2 px-6 py-3 text-lg font-semibold text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-300 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:scale-105"
        >
          <BookIcon className="h-6 w-6" />
          {isGeneratingPdf ? pdfProgress || 'Creating PDF...' : 'Download PDF'}
        </button>
         <button
          onClick={handleGenerateVideo}
          disabled={isGeneratingVideo || isGenerating}
          className="flex items-center justify-center gap-2 px-6 py-3 text-lg font-semibold text-white bg-teal-500 rounded-full hover:bg-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-300 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:scale-105"
        >
          <DownloadIcon className="h-6 w-6" />
          {isGeneratingVideo ? videoProgress || 'Creating Video...' : 'Download Video'}
        </button>
        <button
          onClick={onWatchVideo}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-6 py-3 text-lg font-semibold text-white bg-purple-500 rounded-full hover:bg-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:scale-105"
        >
          <VideoIcon className="h-6 w-6" />
          Watch Slideshow
        </button>
      </div>

      {/* Hidden container for PDF generation */}
      <div className="absolute -z-10 -left-[9999px] opacity-0">
        {pages.map((page, index) => (
          <div
            key={`pdf-${index}`}
            id={`pdf-page-${index}`}
            className="w-[842px] h-[595px] bg-white flex flex-col"
          >
            <div className="w-full h-[400px] bg-slate-100">
                <img src={page.imageUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous"/>
            </div>
            <div className="flex-grow flex items-center justify-center p-4">
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', textAlign: 'center' }}>{page.text}</p>
            </div>
             <div className="text-right p-2 text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {index > 0 ? `Page ${index}`: ''}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};