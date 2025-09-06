import { StoryPage } from '../types';

const PAGE_DURATION_SECONDS = 10;
const MUSIC_URL = "https://cdn.pixabay.com/download/audio/2021/11/23/audio_831b18d227.mp3"; 

// Helper function to draw a single page frame on the canvas
const drawFrame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, image: HTMLImageElement, text: string) => {
    ctx.fillStyle = 'black'; // Black background for letterboxing
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate image dimensions to fit canvas while maintaining aspect ratio
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

    // Draw text overlay, similar to VideoPlayer
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const textBgHeight = canvas.height * 0.25; // 25% of height for text box
    ctx.fillRect(0, canvas.height - textBgHeight, canvas.width, textBgHeight);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Simple text wrapping logic
    const wrapText = (context: CanvasRenderingContext2D, textToWrap: string, startX: number, startY: number, maxWidth: number, lineHeight: number) => {
        const words = textToWrap.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
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
            context.fillText(lines[i].trim(), startX, currentY);
            currentY += lineHeight;
        }
    };

    const fontSize = Math.max(18, canvas.height / 30); // Responsive font size
    ctx.font = `${fontSize}px Poppins, sans-serif`;
    const lineHeight = fontSize * 1.2;
    wrapText(ctx, text, canvas.width / 2, canvas.height - textBgHeight / 2, canvas.width - 40, lineHeight);
};

export const generateVideo = async (pages: StoryPage[], onProgress: (message: string) => void): Promise<void> => {
    onProgress('Initializing video tools...');
    
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
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
    const audio = new Audio(MUSIC_URL);
    audio.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error('Failed to load audio.'));
        audio.load();
    });

    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audio);
    const dest = audioContext.createMediaStreamDestination();
    source.connect(dest);

    const videoStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
        recorder.onstop = () => {
            onProgress('Finalizing video...');
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bedtime-story.webm';
            a.click();
            URL.revokeObjectURL(url);
            onProgress('Video ready!');
            audioContext.close();
            resolve();
        };

        recorder.onerror = (e) => {
            audioContext.close();
            reject(new Error('MediaRecorder error: ' + e));
        };

        (async () => {
            recorder.start();
            audio.play();
    
            for (let i = 0; i < pages.length; i++) {
                onProgress(`Encoding page ${i + 1}/${pages.length}...`);
                drawFrame(ctx, canvas, images[i], pages[i].text);
                await new Promise(resolve => setTimeout(resolve, PAGE_DURATION_SECONDS * 1000));
            }
            
            recorder.stop();
            audio.pause();
        })().catch(err => {
            if (recorder.state === 'recording') recorder.stop();
            audio.pause();
            audioContext.close();
            reject(err);
        });
    });
};