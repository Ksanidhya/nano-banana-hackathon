
import React, { useState, useRef } from 'react';
import { UploadIcon, SparklesIcon } from './Icons';

type StoryInputFormProps = {
  onGenerate: (prompt: string, image: File | null) => void;
};

export const StoryInputForm: React.FC<StoryInputFormProps> = ({ onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };
  
  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (prompt.trim() && !isGenerating) {
      setIsGenerating(true);
      onGenerate(prompt, imageFile);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 animate-fade-in">
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="story-prompt" className="block text-lg font-semibold text-slate-700 mb-2">
            What is your story about?
          </label>
          <p className="text-sm text-slate-500 mb-3">
            Give me an idea, some characters, or even a full story. Let your imagination run wild!
          </p>
          <textarea
            id="story-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A brave little bunny who wants to touch the moon"
            className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition"
            required
          />
        </div>

        <div className="mb-8">
          <label className="block text-lg font-semibold text-slate-700 mb-2">
            Add a reference image (optional)
          </label>
          <p className="text-sm text-slate-500 mb-3">
            This can help set the style or mood for the illustrations.
          </p>
          <label 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            htmlFor="image-upload" 
            className="group cursor-pointer flex justify-center w-full h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-md appearance-none hover:border-rose-400 focus:outline-none"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-full w-auto object-contain rounded-md p-1" />
            ) : (
              <span className="flex items-center space-x-2">
                <UploadIcon className="h-8 w-8 text-slate-400 group-hover:text-rose-500" />
                <span className="font-medium text-slate-500 group-hover:text-rose-600">
                  Drop an image here, or
                  <span className="text-rose-500 underline ml-1">browse</span>
                </span>
              </span>
            )}
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
        </div>
        
        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 text-xl font-bold text-white bg-rose-500 rounded-full hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-300 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:scale-105"
        >
          <SparklesIcon className="h-6 w-6" />
          Weave My Story
        </button>
      </form>
    </div>
  );
};
