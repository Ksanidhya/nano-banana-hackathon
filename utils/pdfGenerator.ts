
import type { jsPDF } from 'jspdf';
import { StoryPage } from '../types';

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

export const generatePdf = async (pages: StoryPage[], onProgress: (message: string) => void): Promise<void> => {
  onProgress('Preparing your storybook...');
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    onProgress(`Adding page ${i + 1} of ${pages.length} to the PDF...`);
    const pageElement = document.getElementById(`pdf-page-${i}`);
    if (pageElement) {
      const canvas = await window.html2canvas(pageElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL('image/png');
      
      if (i > 0) {
        doc.addPage();
      }
      
      doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    }
  }

  onProgress('Saving your PDF...');
  doc.save('bedtime-story.pdf');
  onProgress('Done!');
};
