import { StoryPage } from '../types';

const PAGE_DURATION_MS = 10000; // Each page's cycle is 10 seconds for non-narrated
const TRANSITION_DURATION_MS = 1500; // 1.5 second cross-fade
const TEXT_FADE_DURATION_MS = 500; // 0.5 second fade for text

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

// Helper to draw the text overlay with fade and other effects
const drawTextOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, text: string, opacity: number, textEffect: string, elapsedTime: number) => {
    if (opacity <= 0.01) return; // Don't draw if invisible

    const textBgHeight = canvas.height * 0.25;
    
    // Draw text background
    ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * opacity})`;
    ctx.fillRect(0, canvas.height - textBgHeight, canvas.width, textBgHeight);

    // Apply styles based on prompt
    const p = textEffect.toLowerCase();
    let yOffset = 0;
    const fontSize = Math.max(22, canvas.height / 25);
    
    // Default styles
    ctx.font = `${fontSize}px 'Chewy', cursive`;
    ctx.fillStyle = `rgba(212, 175, 55, ${opacity})`; // Dark Golden color #D4AF37
    ctx.shadowColor = `rgba(0, 0, 0, ${0.7 * opacity})`;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    if (p.includes('sparkl') || p.includes('golden')) {
        const shimmer = Math.sin(elapsedTime / 300) * 5 + 10;
        ctx.shadowColor = `rgba(255, 215, 0, ${0.8 * opacity})`;
        ctx.shadowBlur = shimmer;
    }
    if (p.includes('float') || p.includes('gentle')) {
        yOffset = Math.sin(elapsedTime / 800) * (canvas.height / 250);
    }
    if (p.includes('handwritten') || p.includes('cursive')) {
        ctx.font = `${fontSize * 1.1}px 'Pacifico', cursive`;
    }
    if (p.includes('bold') || p.includes('adventurous') || p.includes('grand')) {
        ctx.font = `700 ${fontSize}px 'Chewy', cursive`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineHeight = fontSize * 1.2;
    const textYPosition = (canvas.height - textBgHeight / 2) + yOffset;
    wrapText(ctx, text, canvas.width / 2, textYPosition, canvas.width - 60, lineHeight);
    
    // Reset shadow for next draw operation
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};


export const generateVideo = async (pages: StoryPage[], musicUrl: string, onProgress: (message: string) => void): Promise<void> => {
    onProgress('Initializing video tools...');
    const hasNarration = !!pages[0]?.audioUrl;

    await document.fonts.load("48px 'Chewy'");
    await document.fonts.load("48px 'Pacifico'");
    
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
    
    if (images.length === 0) {
        throw new Error('No images available to generate video.');
    }
    
    // Dynamically set canvas size based on the first image's aspect ratio
    const firstImage = images[0];
    const canvas = document.createElement('canvas');
    const MAX_DIMENSION = 1920;
    const aspectRatio = firstImage.width / firstImage.height;

    if (aspectRatio >= 1) { // Landscape or square
        canvas.width = MAX_DIMENSION;
        canvas.height = MAX_DIMENSION / aspectRatio;
    } else { // Portrait
        canvas.height = MAX_DIMENSION;
        canvas.width = MAX_DIMENSION * aspectRatio;
    }
    // Ensure dimensions are even numbers for some encoders
    canvas.width = Math.round(canvas.width / 2) * 2;
    canvas.height = Math.round(canvas.height / 2) * 2;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Cannot create canvas context');

    onProgress('Preparing audio mix...');
    
    const pageTimings: {start: number; duration: number}[] = [];
    let cumulativeTime = 0;
    for(const page of pages) {
        const duration = hasNarration ? (page.audioDuration! * 1000) : PAGE_DURATION_MS;
        pageTimings.push({ start: cumulativeTime, duration: duration });
        cumulativeTime += duration;
    }
    const totalVideoDurationMs = cumulativeTime;
    
    // Use OfflineAudioContext to mix all audio tracks into one
    const audioRenderContext = new OfflineAudioContext(2, Math.ceil(totalVideoDurationMs * 44.1), 44100);

    // 1. Background Music Track
    const musicBuffer = await fetch(musicUrl).then(res => res.arrayBuffer()).then(buffer => audioRenderContext.decodeAudioData(buffer));
    const musicSource = audioRenderContext.createBufferSource();
    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    const musicGain = audioRenderContext.createGain();
    musicGain.gain.setValueAtTime(hasNarration ? 0.1 : 0.25, 0);
    musicSource.connect(musicGain);
    musicGain.connect(audioRenderContext.destination);

    // 2. Narration Tracks (if they exist)
    if (hasNarration) {
        onProgress('Mixing narration...');
        const narrationBuffers = await Promise.all(
            pages.map(page => fetch(page.audioUrl!).then(res => res.arrayBuffer()).then(buffer => audioRenderContext.decodeAudioData(buffer)))
        );
        narrationBuffers.forEach((buffer, index) => {
            const narrationSource = audioRenderContext.createBufferSource();
            narrationSource.buffer = buffer;
            narrationSource.connect(audioRenderContext.destination);
            narrationSource.start(pageTimings[index].start / 1000); // start time in seconds
        });
    }

    const mixedAudioBuffer = await audioRenderContext.startRendering();
    
    const finalAudioContext = new AudioContext();
    const audioDestination = finalAudioContext.createMediaStreamDestination();
    const finishedBufferSource = finalAudioContext.createBufferSource();
    finishedBufferSource.buffer = mixedAudioBuffer;
    finishedBufferSource.connect(audioDestination);

    const videoStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);

    const recorder = new MediaRecorder(combinedStream, { 
        mimeType: 'video/webm',
        videoBitsPerSecond: 8000000,
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
            finalAudioContext.close();
            resolve();
        };

        recorder.onerror = (e) => {
            cancelAnimationFrame(animationFrameId);
            finalAudioContext.close();
            reject(new Error('MediaRecorder error: ' + e));
        };

        recorder.start();
        musicSource.start(0);
        finishedBufferSource.start(0);
        
        let startTime: number | null = null;
        let lastProgressSecond = -1;

        const render = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsedTime = timestamp - startTime;

            if (elapsedTime >= totalVideoDurationMs) {
                if (recorder.state === 'recording') recorder.stop();
                return;
            }
            
            const pageIndex = pageTimings.findIndex((t, i) => {
                const nextStart = pageTimings[i+1]?.start ?? Infinity;
                return elapsedTime >= t.start && elapsedTime < nextStart;
            });

            if (pageIndex === -1) { // Should not happen if stop condition is correct
                if (recorder.state === 'recording') recorder.stop();
                return;
            }

            const timeIntoPage = elapsedTime - pageTimings[pageIndex].start;
            const pageDuration = pageTimings[pageIndex].duration;
            
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const currentImage = images[pageIndex];
            drawImageWithLetterbox(ctx, canvas, currentImage);
            
            const transitionPoint = pageDuration - TRANSITION_DURATION_MS;
            let textOpacity = 1.0;

            if (timeIntoPage > transitionPoint && pageIndex < pages.length - 1) {
                const transitionProgress = (timeIntoPage - transitionPoint) / TRANSITION_DURATION_MS;
                const nextImage = images[pageIndex + 1];
                
                ctx.globalAlpha = transitionProgress;
                drawImageWithLetterbox(ctx, canvas, nextImage);
                ctx.globalAlpha = 1.0;
                
                textOpacity = 1 - transitionProgress;
            } else if (timeIntoPage < TEXT_FADE_DURATION_MS) {
                textOpacity = timeIntoPage / TEXT_FADE_DURATION_MS;
            }
            
            const currentPageData = pages[pageIndex];
            drawTextOverlay(ctx, canvas, currentPageData.text, textOpacity, currentPageData.textEffect, elapsedTime);

            const currentSecond = Math.floor(elapsedTime / 1000);
            if(currentSecond > lastProgressSecond) {
                onProgress(`Encoding: ${currentSecond}s / ${Math.ceil(totalVideoDurationMs / 1000)}s`);
                lastProgressSecond = currentSecond;
            }
            
            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
    });
};