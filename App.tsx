
import React, { useState, useEffect, useCallback } from 'react';
import type { DurationOption } from './types';
import { DURATION_OPTIONS, LOADING_MESSAGES } from './constants';
import { generateVideo } from './services/geminiService';

// Helper Icon Components
const FilmIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

// Child Component: ApiKeyModal
interface ApiKeyModalProps {
    onKeySelected: () => void;
}
const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySelected }) => {
    const handleSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            onKeySelected();
        } catch (e) {
            console.error("Error opening API key selection:", e);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center transform transition-all duration-300 scale-100">
                <FilmIcon className="w-16 h-16 mx-auto text-pink-400" />
                <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-2">Welcome to Pastel Video Creator</h2>
                <p className="text-gray-600 mb-6">To start creating videos, please select a Gemini API key. This is required to use the Veo video generation model.</p>
                <button
                    onClick={handleSelectKey}
                    className="w-full bg-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-pink-600 focus:outline-none focus:ring-4 focus:ring-pink-300 transition-transform transform hover:scale-105"
                >
                    Select API Key
                </button>
                <p className="text-xs text-gray-500 mt-4">
                    By using this service, you agree to the associated costs. For details, please see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">billing documentation</a>.
                </p>
            </div>
        </div>
    );
};

// Child Component: Loader
interface LoaderProps {
    message: string;
}
const Loader: React.FC<LoaderProps> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-400"></div>
        <p className="text-lg font-semibold text-gray-700 mt-6 text-center">{message}</p>
    </div>
);

// Child Component: VideoResult
interface VideoResultProps {
    videoUrl: string;
    prompt: string;
}
const VideoResult: React.FC<VideoResultProps> = ({ videoUrl, prompt }) => (
    <div className="w-full max-w-2xl mx-auto mt-8">
        <h3 className="text-2xl font-bold text-center text-rose-800 mb-4">Your Masterpiece is Ready!</h3>
        <div className="aspect-w-16 aspect-h-9 rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
             <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover"></video>
        </div>
        <a
            href={videoUrl}
            download={`pastel-video-${prompt.slice(0, 20).replace(/\s/g, '_')}.mp4`}
            className="mt-6 w-full flex items-center justify-center gap-3 bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-300 transition-transform transform hover:scale-105"
        >
            <DownloadIcon className="w-6 h-6"/>
            Download Video
        </a>
    </div>
);

// Main App Component
export default function App() {
    const [isApiKeySelected, setIsApiKeySelected] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DURATION_OPTIONS[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkApiKey = useCallback(async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsApiKeySelected(hasKey);
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    useEffect(() => {
        let interval: number;
        if (isLoading) {
            setLoadingMessage(LOADING_MESSAGES[0]);
            let messageIndex = 1;
            interval = window.setInterval(() => {
                setLoadingMessage(LOADING_MESSAGES[messageIndex % LOADING_MESSAGES.length]);
                messageIndex++;
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [isLoading]);


    const handleGenerateVideo = async () => {
        if (!prompt.trim()) {
            setError("Please enter a caption for your video.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setVideoUrl(null);

        try {
            const url = await generateVideo(prompt, selectedDuration.value, (message) => {
                setLoadingMessage(message);
            });
            setVideoUrl(url);
        } catch (e) {
            const err = e as Error;
            if (err.message === "API_KEY_INVALID") {
                setError("Your API key seems to be invalid. Please re-select your key.");
                setIsApiKeySelected(false); 
            } else {
                setError(err.message || 'An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isApiKeySelected) {
        return <ApiKeyModal onKeySelected={() => {
             setIsApiKeySelected(true); 
             setError(null);
        }} />;
    }

    return (
        <div className="min-h-screen bg-rose-50 text-gray-800 font-sans p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <div className="w-full max-w-4xl mx-auto">
                <header className="text-center mb-8">
                     <div className="flex items-center justify-center gap-4">
                        <FilmIcon className="w-12 h-12 text-pink-400"/>
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-rose-800 tracking-tight">Pastel Video Creator</h1>
                    </div>
                    <p className="mt-2 text-lg text-rose-600">Bring your words to life with beautiful, AI-generated videos.</p>
                </header>
                
                <main className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                    {!isLoading && !videoUrl && (
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="prompt" className="block text-lg font-semibold text-gray-700 mb-2">1. Write your caption</label>
                                <textarea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., A fluffy pink cat floating through a galaxy of donuts"
                                    className="w-full h-32 p-4 border border-rose-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition"
                                />
                            </div>

                            <div>
                                <h3 className="block text-lg font-semibold text-gray-700 mb-2">2. Choose a duration</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {DURATION_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setSelectedDuration(option)}
                                            className={`p-4 rounded-lg text-center font-semibold transition-all duration-200 transform hover:scale-105 ${
                                                selectedDuration.value === option.value
                                                    ? 'bg-pink-500 text-white shadow-lg ring-2 ring-white'
                                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                            }`}
                                        >
                                            {option.label}
                                            <span className="block text-xs font-normal opacity-80">~{option.duration}s</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <button
                                onClick={handleGenerateVideo}
                                disabled={isLoading}
                                className="w-full bg-rose-500 text-white font-bold py-4 px-6 rounded-lg text-xl hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-300 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                ✨ Generate Video
                            </button>
                        </div>
                    )}
                    
                    {isLoading && <Loader message={loadingMessage} />}

                    {error && (
                        <div className="mt-4 text-center p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
                            <p className="font-bold">Oops! Something went wrong.</p>
                            <p>{error}</p>
                        </div>
                    )}

                    {videoUrl && !isLoading && (
                        <VideoResult videoUrl={videoUrl} prompt={prompt} />
                    )}
                </main>
                
                <footer className="text-center mt-8 text-rose-500 text-sm">
                    <p>Powered by Gemini. Videos are generated by AI and may be imperfect.</p>
                </footer>
            </div>
        </div>
    );
}
