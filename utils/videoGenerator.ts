import { StoryPage } from '../types';

const PAGE_DURATION_MS = 10000; // Each page's cycle is 10 seconds
const TRANSITION_DURATION_MS = 1500; // 1.5 second cross-fade
const TEXT_FADE_DURATION_MS = 500; // 0.5 second fade for text
const MUSIC_URL = "https://archive.org/download/GoodNightLullabye/Good_Night_Lullabye.mp3"; 

// Helper to wrap text in the canvas
const wrapText = (ctx: CanvasRenderingContext2D, textToWrap: string, startX: number, startY: number, maxWidth: number, lineHeight: number) => {
    const words = textToWrap.split(' ');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    
    const totalTextHeight = (lines.length -1) * lineHeight;
    let currentY = startY - (totalTextHeight / 2);

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), startX, currentY);
        currentY += lineHeight;
    }
};

// Helper to draw an image centered with letterboxing
const drawImageWithLetterbox = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, image: HTMLImageElement) => {
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = image.width / image.height;
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let x = 0;
    let y = 0;

    if (imageAspect > canvasAspect) {
        drawHeight = canvas.width / imageAspect;
        y = (canvas.height - drawHeight) / 2;
    } else {
        drawWidth = canvas.height * imageAspect;
        x = (canvas.width - drawWidth) / 2;
    }
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
};

// Helper to draw the text overlay with fade animation
const drawTextOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, text: string, opacity: number) => {
    if (opacity <= 0.01) return; // Don't draw if invisible

    const textBgHeight = canvas.height * 0.25;
    
    // Draw text background
    ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * opacity})`;
    ctx.fillRect(0, canvas.height - textBgHeight, canvas.width, textBgHeight);

    // Draw text
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    const fontSize = Math.max(18, canvas.height / 30);
    ctx.font = `${fontSize}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineHeight = fontSize * 1.2;
    wrapText(ctx, text, canvas.width / 2, canvas.height - textBgHeight / 2, canvas.width - 40, lineHeight);
};


export const generateVideo = async (pages: StoryPage[], onProgress: (message: string) => void): Promise<void> => {
    onProgress('Initializing video tools...');
    
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Cannot create canvas context');

    onProgress('Loading illustrations...');
    const images = await Promise.all(
        pages.map(page => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image for page: ${page.text.substring(0, 20)}...`));
            img.src = page.imageUrl;
        }))
    );
    
    onProgress('Loading music...');
    const audioContext = new AudioContext();
    const audioBuffer = await fetch(MUSIC_URL)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Failed to fetch audio: ${res.status} ${res.statusText}`);
            }
            return res.arrayBuffer();
        })
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .catch(err => {
             console.error("Audio loading/decoding failed:", err);
             throw new Error('Failed to load or decode audio. Please check your network connection.');
        });
        
    const audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.loop = true;

    const dest = audioContext.createMediaStreamDestination();
    audioSource.connect(dest);

    const videoStream = canvas.captureStream(30); // 30 FPS
    const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

    const recorder = new MediaRecorder(combinedStream, { 
        mimeType: 'video/webm',
        videoBitsPerSecond: 8000000, // High bitrate for 1080p
     });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
        let animationFrameId: number;

        recorder.onstop = () => {
            onProgress('Finalizing video...');
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bedtime-story.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            onProgress('Video ready!');
            cancelAnimationFrame(animationFrameId);
            audioContext.close();
            resolve();
        };

        recorder.onerror = (e) => {
            cancelAnimationFrame(animationFrameId);
            audioContext.close();
            reject(new Error('MediaRecorder error: ' + e));
        };

        recorder.start();
        audioSource.start(0);

        const totalVideoDuration = pages.length * PAGE_DURATION_MS;
        let startTime: number | null = null;
        let lastProgressSecond = -1;

        const render = (timestamp: number) => {
            if (!startTime) {
                startTime = timestamp;
            }
            const elapsedTime = timestamp - startTime;

            if (elapsedTime >= totalVideoDuration) {
                if (recorder.state === 'recording') {
                    recorder.stop();
                }
                return;
            }

            const pageIndex = Math.floor(elapsedTime / PAGE_DURATION_MS);
            const timeIntoPage = elapsedTime % PAGE_DURATION_MS;
            
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const currentImage = images[pageIndex];
            drawImageWithLetterbox(ctx, canvas, currentImage);
            
            const transitionPoint = PAGE_DURATION_MS - TRANSITION_DURATION_MS;
            let textOpacity = 1;

            // Handle cross-fade transition
            if (timeIntoPage > transitionPoint && pageIndex < pages.length - 1) {
                const transitionProgress = (timeIntoPage - transitionPoint) / TRANSITION_DURATION_MS;
                const nextImage = images[pageIndex + 1];
                
                ctx.globalAlpha = transitionProgress;
                drawImageWithLetterbox(ctx, canvas, nextImage);
                ctx.globalAlpha = 1.0;
                
                // Fade out current text during transition
                textOpacity = 1 - transitionProgress;
            } else {
                // Handle normal text fade in/out
                if (timeIntoPage < TEXT_FADE_DURATION_MS) {
                    textOpacity = timeIntoPage / TEXT_FADE_DURATION_MS;
                } else if (timeIntoPage > transitionPoint - TEXT_FADE_DURATION_MS && pageIndex < pages.length - 1) {
                    textOpacity = (transitionPoint - timeIntoPage) / TEXT_FADE_DURATION_MS;
                }
            }
            
            const currentText = pages[pageIndex].text;
            drawTextOverlay(ctx, canvas, currentText, textOpacity);

            const currentSecond = Math.floor(elapsedTime / 1000);
            if(currentSecond > lastProgressSecond) {
                onProgress(`Encoding: ${currentSecond}s / ${Math.ceil(totalVideoDuration / 1000)}s`);
                lastProgressSecond = currentSecond;
            }
            
            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
    });
};
