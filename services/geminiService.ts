
import { GoogleGenAI, Operation, Video } from "@google/genai";

const EXTENSION_PROMPT = "Make the video longer, continuing the story in a seamless way.";

export const generateVideo = async (
    prompt: string,
    segments: number,
    onProgress: (message: string) => void
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key not found. Please select an API key.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let video: Video | undefined = undefined;
    let operation: Operation | undefined = undefined;

    for (let i = 0; i < segments; i++) {
        const isFirstSegment = i === 0;
        const currentPrompt = isFirstSegment ? prompt : EXTENSION_PROMPT;
        onProgress(`Generating segment ${i + 1} of ${segments}...`);

        try {
            // FIX: Use 'veo-3.1-generate-preview' for extending videos as per API guidelines,
            // and remove redundant logic.
            const model = isFirstSegment ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';

            const generateVideosParams = {
                model,
                prompt: currentPrompt,
                ...(video && { video: video }),
                config: {
                    numberOfVideos: 1,
                    resolution: '720p' as const,
                    aspectRatio: '16:9' as const,
                }
            };

            operation = await ai.models.generateVideos(generateVideosParams);
            
            onProgress(`Processing segment ${i + 1}... This can take a few minutes.`);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation });
            }

            if (!operation.response?.generatedVideos?.[0]?.video) {
                throw new Error(`Video generation failed at segment ${i + 1}.`);
            }
            
            video = operation.response.generatedVideos[0].video;
        } catch (error) {
            console.error("Error during video generation segment:", error);
            if (error instanceof Error && error.message.includes("Requested entity was not found")) {
                throw new Error("API_KEY_INVALID");
            }
            throw new Error(`Failed during segment ${i+1} generation. Please try again.`);
        }
    }

    if (!video?.uri) {
        throw new Error("Final video URI is not available.");
    }
    
    onProgress('Downloading final video...');
    
    const downloadLink = `${video.uri}&key=${process.env.API_KEY}`;
    const response = await fetch(downloadLink);

    if (!response.ok) {
        if (response.status === 404) {
             throw new Error("API_KEY_INVALID");
        }
        throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};
