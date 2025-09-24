class PDFEditor {
    constructor() {
        this.pdfDoc = null;
        this.pdfBytes = null;
        this.currentPage = 1;
        this.scale = 1.0;
        this.pendingRender = null;
        this.textEntries = []; // Array to store text entries
        this.selectedTextId = null;
        this.font = null; // Embedded font
        this.customFontBytes = null;
        this.checkImage = null; // Embedded check image
        this.originalPdfUrl = null; // URL of the original PDF
        
        // Initialize elements
        this.initElements();
        // Bind event listeners
        this.bindEvents();
        // Load text history from local storage
        this.loadTextHistory();
    }

    initElements() {
        this.fileInput = document.getElementById('pdfFile');
        this.loadButton = document.getElementById('loadPdfBtn');
        this.editSection = document.getElementById('editSection');
        this.errorContainer = document.getElementById('errorContainer');
        this.textContent = document.getElementById('textContent');
        this.keyName = document.getElementById('keyName');
        this.xCoord = document.getElementById('xCoord');
        this.yCoord = document.getElementById('yCoord');
        this.fontSize = document.getElementById('fontSize');
        this.pageNumber = document.getElementById('pageNumber');
        this.pageCount = document.getElementById('pageCount');
        this.prevPage = document.getElementById('prevPage');
        this.nextPage = document.getElementById('nextPage');
        this.addTextButton = document.getElementById('addTextBtn');
        this.saveButton = document.getElementById('saveBtn');
        this.reloadButton = document.getElementById('reloadBtn');
        this.canvas = document.getElementById('pdfPreview');
        this.overlay = document.getElementById('previewOverlay');
        this.zoomIn = document.getElementById('zoomIn');
        this.zoomOut = document.getElementById('zoomOut');
        this.zoomLevel = document.getElementById('zoomLevel');
        this.clearAllButton = document.getElementById('clearAllBtn');
        this.exportJsonButton = document.getElementById('exportJson');
        this.importJsonInput = document.getElementById('importJson');
        
        // Initialize text history container
        this.textHistoryContainer = document.getElementById('textHistoryContainer');
        this.textHistoryList = document.getElementById('textHistory');
        
        if (!this.textHistoryContainer || !this.textHistoryList) {
            this.showError('Text history elements not found, creating them');
            this.createTextHistoryElements();
        }
    }

    showError(message, isError = true) {
        if (!this.errorContainer) return;
        
        this.errorContainer.textContent = message;
        this.errorContainer.className = 'error-container ' + (isError ? 'show' : 'success');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.errorContainer.className = 'error-container';
        }, 5000);
    }

    clearError() {
        if (this.errorContainer) {
            this.errorContainer.className = 'error-container';
        }
    }

    createTextHistoryElements() {
        // Create container if it doesn't exist
        if (!this.textHistoryContainer) {
            this.textHistoryContainer = document.createElement('div');
            this.textHistoryContainer.id = 'textHistoryContainer';
            this.textHistoryContainer.className = 'text-history-container';
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'text-history-header';
            
            const heading = document.createElement('h3');
            heading.textContent = 'Text History';
            
            const clearAllBtn = document.createElement('button');
            clearAllBtn.textContent = 'Clear All';
            clearAllBtn.className = 'clear-all-btn';
            clearAllBtn.addEventListener('click', () => this.clearAllTexts());
            
            headerDiv.appendChild(heading);
            headerDiv.appendChild(clearAllBtn);
            this.textHistoryContainer.appendChild(headerDiv);
            
            this.textHistoryList = document.createElement('div');
            this.textHistoryList.id = 'textHistory';
            this.textHistoryList.className = 'text-history';
            this.textHistoryContainer.appendChild(this.textHistoryList);
            
            // Add container after edit section
            if (this.editSection) {
                this.editSection.appendChild(this.textHistoryContainer);
            } else {
                document.body.appendChild(this.textHistoryContainer);
            }
        }
    }

    loadTextHistory() {
        const savedHistory = localStorage.getItem('pdfTextHistory');
        if (savedHistory) {
            this.textEntries = JSON.parse(savedHistory);
            this.renderTextHistory();
        }
    }

    saveTextHistory() {
        localStorage.setItem('pdfTextHistory', JSON.stringify(this.textEntries));
    }

    renderTextHistory() {
        this.textHistoryList.innerHTML = '';
        this.textEntries.forEach((entry) => {
            const entryElement = document.createElement('div');
            entryElement.className = 'text-entry';
            entryElement.dataset.id = entry.id;
            entryElement.innerHTML = `
                <div class="text-entry-content">
                    <div class="text-entry-details">
                        <strong class="text-entry-text">${entry.text}</strong> ${entry.keyName ? `Key: ${entry.keyName} | ` : ''}Page ${entry.page} | Position: (${entry.x}, ${entry.y}) | Size: ${entry.size}px
                    </div>
                </div>
                <div class="text-entry-actions">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;

            // Add click event for editing
            const editBtn = entryElement.querySelector('.edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop event from bubbling up
                this.editText(entry);
            });

            // Add click event for deleting
            const deleteBtn = entryElement.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop event from bubbling up
                this.deleteText(entry.id);
            });

            this.textHistoryList.appendChild(entryElement);
        });
    }

    async loadCustomFont() {
        try {
            const response = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-all-400-normal.woff');
            const fontBytes = await response.arrayBuffer();
            this.customFontBytes = fontBytes;
        } catch (error) {
            console.error('Error loading custom font:', error);
            this.showError('Error loading custom font. Some special characters might not display correctly.');
        }
    }

    async embedCustomFont() {
        if (!this.pdfDoc || !this.customFontBytes) return null;
        try {
            return await this.pdfDoc.embedFont(this.customFontBytes);
        } catch (error) {
            console.error('Error embedding custom font:', error);
            // Fallback to a standard font
            return await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        }
    }

    async embedCheckImage() {
        if (!this.checkImage) {
            try {
                // Fetch the check.png image
                const response = await fetch('/customerconsent/static/check.png');
                const imageBytes = await response.arrayBuffer();
                this.checkImage = await this.pdfDoc.embedPng(imageBytes);
            } catch (error) {
                console.error('Error loading check image:', error);
                return null;
            }
        }
        return this.checkImage;
    }

    async addText() {
        if (!this.pdfDoc) {
            this.showError('Please load a PDF first.');
            return;
        }

        try {
            const text = this.textContent.value;
            if (!text.trim()) {
                this.showError('Please enter some text to add.');
                return;
            }

            const x = parseInt(this.xCoord.value);
            const y = parseInt(this.yCoord.value);
            const size = parseInt(this.fontSize.value);
            const pageIndex = parseInt(this.pageNumber.value) - 1;
            const keyName = this.keyName.value.trim();

            // Get the page
            const page = this.pdfDoc.getPages()[pageIndex];
            
            // Try to use custom font, fallback to standard if needed
            let font;
            try {
                font = await this.embedCustomFont();
            } catch (error) {
                console.error('Error loading custom font:', error);
                font = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            }

            if (!font) {
                font = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            }
            this.checkImage = await this.embedCheckImage();
            
            // Add text to the page
            if (text.toLowerCase() === 'true') {
                // Draw check image for true values
                const imgSize = size || 12;
                page.drawImage(this.checkImage, {
                    x,
                    y: page.getHeight() - y - imgSize, // Adjust y position for image height
                    width: imgSize,
                    height: imgSize
                });
            } else {
                page.drawText(text, {
                    x,
                    y: page.getHeight() - y,
                    size,
                    font
                });
            }

            // Add to text entries
            this.textEntries.push({
                id: Date.now().toString(),
                text,
                keyName,
                x,
                y,
                size,
                page: pageIndex + 1
            });

            // Clear input fields
            this.textContent.value = '';
            this.keyName.value = '';

            // Save to local storage
            this.saveTextHistory();

            // Update text history display
            this.renderTextHistory();

            // Re-render the page
            await this.previewPage(pageIndex + 1);

        } catch (error) {
            console.error('Error adding text:', error);
            this.showError('Error adding text. Please try again.');
        }
        this.renderTextHistory();
    }

    async reapplyTexts() {
        if (!this.pdfDoc) return;

        try {
            // Get default font ready
            const defaultFont = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            // Try to load custom font
            let customFont;
            try {
                customFont = await this.embedCustomFont();
            } catch (error) {
                console.error('Error loading custom font for reapply:', error);
            }

            // Get check image ready
            const checkImage = await this.embedCheckImage();

            // Clear all pages first
            const pages = this.pdfDoc.getPages();
            pages.forEach(page => {
                // Clear page content if needed
            });

            // Reapply all texts
            for (const entry of this.textEntries) {
                const page = this.pdfDoc.getPages()[entry.page - 1];
                
                // Use custom font if available, otherwise use default
                const font = customFont || defaultFont;
                
                if (entry.text.toLowerCase() === 'true' && checkImage) {
                    // Draw check image for true values
                    const imgSize = entry.size || 12;
                    page.drawImage(checkImage, {
                        x: entry.x,
                        y: page.getHeight() - entry.y - imgSize, // Adjust y position for image height
                        width: imgSize,
                        height: imgSize
                    });
                } else {
                    page.drawText(entry.text, {
                        x: entry.x,
                        y: page.getHeight() - entry.y,
                        size: entry.size,
                        font
                    });
                }
            }

            // Re-render current page
            const currentPage = parseInt(this.pageNumber.value);
            await this.previewPage(currentPage);
        } catch (error) {
            console.error('Error reapplying texts:', error);
            this.showError('Error updating PDF. Please try again.');
        }
    }

    async deleteText(id, bypassConfirm) {
        if (!bypassConfirm && !confirm('Are you sure you want to delete this text?')) {
            return;
        }
        try {
            // Remove the entry from our history
            this.textEntries = this.textEntries.filter(entry => entry.id !== id);
            this.saveTextHistory();
            this.renderTextHistory();
            
            // Recreate the PDF without the deleted text
            await this.recreatePDFWithCurrentTexts();
            this.showMessage('Text deleted successfully!');
        } catch (error) {
            console.error('Error deleting text:', error);
            this.showError('Error deleting text. Please try again.');
        }
    }

    async clearAllTexts() {
        if (confirm('Are you sure you want to delete all text entries?')) {
            try {
                // Clear the text entries array
                this.textEntries = [];
                
                // Save empty history to local storage
                this.saveTextHistory();
                
                // Clear the history display
                this.renderTextHistory();
                
                // Recreate PDF without any texts
                if (this.pdfDoc) {
                    await this.recreatePDFWithCurrentTexts();
                }
                
                this.showMessage('All text entries cleared successfully!');
            } catch (error) {
                console.error('Error clearing texts:', error);
                this.showError('Error clearing text entries. Please try again.');
            }
        }
    }

    async recreatePDFWithCurrentTexts() {
        if (!this.pdfDoc || !this.pdfBytes) return;

        try {
            // Load a fresh copy of the PDF from the original bytes
            this.pdfDoc = await PDFLib.PDFDocument.load(this.pdfBytes);
            
            // Apply all remaining texts from history
            for (const entry of this.textEntries) {
                const page = this.pdfDoc.getPages()[entry.page - 1];
                if (!page) continue;

                // Try to use custom font, fallback to standard if needed
                let font;
                try {
                    font = await this.embedCustomFont();
                } catch (error) {
                    console.error('Error loading custom font:', error);
                    font = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                }

                if (!font) {
                    font = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                }

                // Get check image ready if needed
                let checkImage = null;
                if (entry.text.toLowerCase() === 'true') {
                    checkImage = await this.embedCheckImage();
                }
                
                try {
                    console.log('entry.text:', entry.text);
                    if (entry.text.toLowerCase() === 'true' && checkImage) {
                        // Draw check image for true values
                        const imgSize = entry.size || 12;
                        page.drawImage(checkImage, {
                            x: entry.x,
                            y: page.getHeight() - entry.y - imgSize, // Adjust y position for image height
                            width: imgSize,
                            height: imgSize
                        });
                    } else {
                        page.drawText(entry.text, {
                            x: entry.x,
                            y: page.getHeight() - entry.y,
                            size: entry.size,
                            font
                        });
                    }
                } catch (error) {
                    console.error('Error drawing content:', error);
                    // Fallback to text if image fails
                    const fallbackFont = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                    page.drawText(entry.text, {
                        x: entry.x,
                        y: page.getHeight() - entry.y,
                        size: entry.size,
                        font: fallbackFont
                    });
                }
            }

            // Update the preview
            await this.previewPage(this.currentPage);
        } catch (error) {
            console.error('Error recreating PDF:', error);
            this.showError('Error updating PDF after deleting text. Please try again.');
            throw error;
        }
    }

    sanitizeText(text) {
        // Replace special characters with their closest ASCII equivalents
        const specialCharMap = {
            '✔': '√',
            '✓': '√',
            '→': '->',
            '←': '<-',
            '⇒': '=>',
            '⇐': '<=',
            '≈': '~',
            '≠': '!=',
            '≤': '<=',
            '≥': '>=',
            '…': '...',
            '•': '*',
            '·': '.',
            '™': '(TM)',
            '®': '(R)',
            '©': '(C)',
        };
        
        return text.replace(/[^\x00-\x7F]/g, char => specialCharMap[char] || '?');
    }

    async loadPDF() {
        const file = this.fileInput.files[0];
        if (!file) {
            this.showError('Please select a PDF file first.');
            return;
        }

        try {
            this.clearError();
            // Read the file
            const arrayBuffer = await file.arrayBuffer();
            // Store the original PDF bytes
            this.pdfBytes = arrayBuffer;
            // Load the PDF
            this.pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Update page count
            const pageCount = this.pdfDoc.getPageCount();
            this.pageCount.textContent = pageCount;
            
            // Enable editing section
            this.editSection.style.display = 'block';
            
            // Show first page
            await this.previewPage(1);
            
            // Reapply any existing text entries
            if (this.textEntries.length > 0) {
                await this.recreatePDFWithCurrentTexts();
            }
            
            this.showMessage('PDF loaded successfully!');
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Error loading PDF. Please try again.');
        }
    }

    bindEvents() {
        this.loadButton.addEventListener('click', () => this.loadPDF());
        this.addTextButton.addEventListener('click', () => this.addText());
        this.saveButton.addEventListener('click', () => this.savePDF());
        this.prevPage.addEventListener('click', () => this.changePage(-1));
        this.nextPage.addEventListener('click', () => this.changePage(1));
        this.zoomIn.addEventListener('click', () => this.zoom(0.1));
        this.zoomOut.addEventListener('click', () => this.zoom(-0.1));
        this.clearAllButton.addEventListener('click', () => this.clearAllTexts());
        this.reloadButton.addEventListener('click', async () => {
            try {
                await this.reloadPDF();
                this.showMessage('PDF reloaded successfully!');
            } catch (error) {
                console.error('Error reloading PDF:', error);
                this.showError('Error reloading PDF. Please try again.');
            }
        });
        
        // Live preview events
        this.textContent.addEventListener('input', () => this.updatePreview());
        this.xCoord.addEventListener('input', () => this.updatePreview());
        this.yCoord.addEventListener('input', () => this.updatePreview());
        this.fontSize.addEventListener('input', () => this.updatePreview());
        this.pageNumber.addEventListener('change', () => this.goToPage());
        
        // Add JSON export/import handlers
        if (this.exportJsonButton) {
            this.exportJsonButton.addEventListener('click', () => this.exportTextHistory());
        }

        if (this.importJsonInput) {
            this.importJsonInput.addEventListener('change', (e) => this.importTextHistory(e));
        }
    }

    async updatePreview() {
        if (!this.pdfDoc) return;

        // Get current page
        const pageIndex = parseInt(this.pageNumber.value) - 1;
        if (pageIndex < 0 || pageIndex >= this.pdfDoc.getPageCount()) return;

        const text = this.textContent.value;
        if (!text.trim()) {
            this.overlay.style.display = 'none';
            return;
        }

        const x = parseInt(this.xCoord.value);
        const y = parseInt(this.yCoord.value);
        const size = parseInt(this.fontSize.value);

        // Get the current page's dimensions
        const page = this.pdfDoc.getPages()[pageIndex];
        const { width, height } = page.getSize();
        
        // Calculate the scale factor between PDF and canvas
        const canvasWidth = this.canvas.width;
        const scaleFactor = canvasWidth / width;
        
        // Adjust coordinates for preview
        const adjustedY = y - (size / 1); // Subtract half the font size
        
        // Position the overlay
        this.overlay.style.display = 'block';
        this.overlay.style.left = `${x * scaleFactor}px`;
        this.overlay.style.top = `${adjustedY * scaleFactor}px`;
        this.overlay.style.fontSize = `${size * scaleFactor}px`;
        this.overlay.textContent = text;
    }

    async previewPage(pageNumber) {
        if (this.pendingRender) {
            this.pendingRender.cancelled = true;
        }

        const renderTask = { cancelled: false };
        this.pendingRender = renderTask;

        try {
            // Create a temporary PDF with just the current page
            const tempPdf = await PDFLib.PDFDocument.create();
            const [tempPage] = await tempPdf.copyPages(this.pdfDoc, [pageNumber - 1]);
            tempPdf.addPage(tempPage);

            // Save the temporary PDF
            const tempBytes = await tempPdf.save();

            if (renderTask.cancelled) return;

            // Convert to blob URL
            const blob = new Blob([tempBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // Load the PDF into PDF.js for preview
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);

            // Prepare canvas for rendering
            const viewport = page.getViewport({ scale: this.scale });
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            this.overlay.style.width = `${viewport.width}px`;
            this.overlay.style.height = `${viewport.height}px`;

            // Render PDF page to canvas
            const renderContext = {
                canvasContext: this.canvas.getContext('2d'),
                viewport: viewport
            };
            await page.render(renderContext).promise;

            // Clean up
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error previewing PDF:', error);
        }
    }

    async changePage(delta) {
        const newPage = this.currentPage + delta;
        if (newPage >= 1 && newPage <= this.pdfDoc.getPageCount()) {
            this.currentPage = newPage;
            this.pageNumber.value = newPage;
            await this.previewPage(newPage);
        }
    }

    async goToPage() {
        const pageNum = parseInt(this.pageNumber.value);
        if (pageNum >= 1 && pageNum <= this.pdfDoc.getPageCount()) {
            this.currentPage = pageNum;
            await this.previewPage(pageNum);
        }
    }

    zoom(delta) {
        this.scale = Math.max(0.1, Math.min(3.0, this.scale + delta));
        this.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
        this.previewPage(this.currentPage);
    }

    async savePDF() {
        if (!this.pdfDoc) {
            this.showError('No PDF loaded to save.');
            return;
        }

        try {
            const pdfBytes = await this.pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'edited-document.pdf';
            link.click();
            URL.revokeObjectURL(url);
            this.showMessage('PDF saved successfully!');
        } catch (error) {
            console.error('Error saving PDF:', error);
            this.showError('Error saving PDF. Please try again.');
        }
    }

    async editText(entry) {
        const index = this.textEntries.findIndex(e => e.id === entry.id);
        if (index === -1) return;

        // Fill the form with the entry's data
        this.textContent.value = entry.text;
        this.keyName.value = entry.keyName || '';
        this.xCoord.value = entry.x;
        this.yCoord.value = entry.y;
        this.fontSize.value = entry.size;
        this.pageNumber.value = entry.page;

        // Remove the text from PDF
        await this.deleteText(entry.id, true);

        // Update the preview
        await this.previewPage(entry.page);

        // Highlight the form fields briefly to indicate they've been filled
        const formFields = [this.textContent, this.keyName, this.xCoord, this.yCoord, this.fontSize];
        formFields.forEach(field => {
            field.classList.add('highlight-field');
            setTimeout(() => field.classList.remove('highlight-field'), 1000);
        });

        // Update the Add Text button to indicate edit mode
        this.addTextButton.textContent = 'Update Text';
        setTimeout(() => {
            this.addTextButton.textContent = 'Add Text';
        }, 3000);
    }

    exportTextHistory() {
        try {
            const jsonData = JSON.stringify(this.textEntries, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pdf_text_history.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting text history:', error);
            this.showError('Error exporting text history');
        }
    }

    async importTextHistory(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // Validate the imported data
                    if (!Array.isArray(importedData)) {
                        throw new Error('Invalid JSON format');
                    }

                    // Store the current page
                    const currentPage = this.currentPage;

                    // Clear existing entries
                    this.textEntries = [];
                    
                    // Add imported entries
                    this.textEntries = importedData;

                    // Save to local storage
                    this.saveTextHistory();

                    // Reapply texts to PDF
                    await this.reapplyTexts();

                    // Update the display
                    this.renderTextHistory();
                    
                    // Show success message
                    this.showMessage('Text history imported successfully!');
                    
                    // Reset the input
                    event.target.value = '';
                } catch (error) {
                    console.error('Error parsing imported data:', error);
                    this.showError('Error importing text history. Invalid JSON format.');
                    event.target.value = '';
                }
            };
            
            reader.readAsText(file);
        } catch (error) {
            console.error('Error importing text history:', error);
            this.showError('Error importing text history');
            event.target.value = '';
        }
    }

    async reloadPDF() {
        if (!this.pdfDoc) {
            this.showError('No PDF loaded. Please load a PDF first.');
            return;
        }

        try {
            // Reapply texts to PDF
            await this.reapplyTexts();

            // Update the display
            this.renderTextHistory();
            
        } catch (error) {
            console.error('Error reloading PDF:', error);
            throw error;
        }
    }

    showMessage(message) {
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            errorContainer.style.backgroundColor = '#4CAF50';
            errorContainer.style.color = 'white';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize PDF editor when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.pdfEditor = new PDFEditor();
});
