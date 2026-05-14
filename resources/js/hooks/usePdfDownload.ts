import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const usePdfDownload = () => {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const downloadPDF = async (element: HTMLElement, filename: string) => {
        if (!element) return;

        setIsGeneratingPDF(true);
        try {
            const styleOverride = document.createElement('style');
            styleOverride.textContent = `
                button { display: none !important; }
                .fixed { position: static !important; }
                svg { display: none !important; }
            `;
            document.head.appendChild(styleOverride);

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                ignoreElements: (el) => {
                    const tag = el.tagName;
                    const className = el.className;
                    return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'BUTTON' || tag === 'SVG' || (typeof className === 'string' && className.includes('fixed'));
                }
            });

            document.head.removeChild(styleOverride);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 10;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 5, position + 5, imgWidth, imgHeight);
            heightLeft -= pageHeight - 10;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 5, position + 5, imgWidth, imgHeight);
                heightLeft -= pageHeight - 10;
            }

            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return { downloadPDF, isGeneratingPDF };
};
