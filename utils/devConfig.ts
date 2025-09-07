export const DEV_CONFIG = {
    // Set this to true to use local sample images instead of generating new ones
    USE_SAMPLE_IMAGES: process.env.USE_SAMPLE_IMAGES === 'true',
    
    // Sample assets for development/testing
    sampleAssets: {
        images: [
            '/sample-assets/page1.jpg',
            '/sample-assets/page2.jpg',
            '/sample-assets/page3.jpg',
            '/sample-assets/page4.jpg',
            '/sample-assets/page5.jpg',
            '/sample-assets/page6.jpg',
            '/sample-assets/title.jpg',
        ]
    }
};
