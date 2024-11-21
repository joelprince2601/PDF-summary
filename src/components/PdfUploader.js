import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/webpack';

// Ensure the worker file is correctly set
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const PdfUploader = () => {
  const [summary, setSummary] = useState([]);
  const pdfCanvasRef = useRef(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      readPdf(file);
      setPdfUploaded(true); // Set the flag to show PDF preview
    } else {
      alert('Please upload a valid PDF file');
      setPdfUploaded(false);
    }
  };

  const readPdf = async (file) => {
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const typedArray = new Uint8Array(fileReader.result);
      try {
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const numPages = pdf.numPages;
        let fullText = [];

        for (let pageNum = 1; pageNum <= numPages && pageNum <= 10; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => {
            const { str, fontName } = item;
            let formattedText = str;

            // Check if the font is bold or italic
            if (fontName.includes("Bold")) {
              formattedText = `<span class="bold-text">${formattedText}</span>`;
            } else if (fontName.includes("Italic")) {
              formattedText = `<span class="italic-text">${formattedText}</span>`;
            }

            return formattedText;
          }).join(' ');

          fullText.push({ pageNum, text: pageText });

          if (pageNum <= 10) {
            renderPdfPage(page, pageNum);
          }
        }

        const summarizedText = fullText.map(page => ({
          pageNum: page.pageNum,
          summary: summarizeText(page.text),
        }));

        setSummary(summarizedText);
      } catch (error) {
        console.error('Error reading PDF:', error);
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  const renderPdfPage = async (page, pageNum) => {
    const pdfContainer = document.querySelector('.pdf-container'); // Get the pdf container div
    if (!pdfContainer || pageNum > 10) return; // Only render up to 10 pages

    // Create a new canvas element for each page
    const canvas = document.createElement('canvas');
    pdfContainer.appendChild(canvas);

    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 1 });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
  };

  const summarizeText = (text) => {
    const sentences = text.split('. ');
    const summary = sentences.slice(0, 3).join('. ') + '.';
    return summary;
  };

  return (
    <div className="App">
      <div className="summary">
        <h1 className="App-header">PDF Summarizer</h1>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        {summary.length > 0 && (
          <div>
            {summary.map((page) => (
              <div key={page.pageNum}>
                <div className="page-title">Summary of Page {page.pageNum}</div>
                <div
                  className="page-summary"
                  dangerouslySetInnerHTML={{ __html: page.summary }}
                ></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pdfUploaded && (
        <div className="pdf-container">
          <canvas ref={pdfCanvasRef}></canvas>
        </div>
      )}
    </div>
  );
};

export default PdfUploader;
