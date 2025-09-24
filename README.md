# PDF Text Editor

A modern, browser-based PDF text editor that allows you to add text overlays to PDF documents with real-time preview.

## Features

- 📄 **PDF Loading**: Automatically loads PDFs when selected
- ✏️ **Text Addition**: Add text at specific coordinates with customizable font size
- 🔍 **Real-time Preview**: Live preview with zoom controls and page navigation
- 💾 **Text History**: Persistent storage of all text entries with edit/delete functionality
- 📤 **Export/Import**: JSON-based backup and restore of text configurations
- ✅ **Special Characters**: Supports checkmarks (converts "true" to check images)
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/pdf-text-editor)

Or manually:

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to deploy your application

## Usage

1. **Select a PDF**: Click "Choose PDF File" to select and automatically load a PDF
2. **Add Text**: 
   - Enter your text content
   - Set X/Y coordinates for positioning
   - Adjust font size as needed
   - Click "Add Text"
3. **Navigate**: Use page controls and zoom to navigate your document
4. **Manage History**: View, edit, or delete previously added text entries
5. **Save**: Download your modified PDF with all text additions

## Technical Details

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **PDF Processing**: PDF-lib for manipulation, PDF.js for rendering
- **Styling**: Modern CSS with gradients and animations
- **Storage**: LocalStorage for text history persistence
- **Deployment**: Optimized for Vercel static hosting

## Browser Compatibility

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+

## License

MIT License - see LICENSE file for details