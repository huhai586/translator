# CrossLingua - Intelligent Real-time Translation Tool

CrossLingua is a desktop application that provides real-time AI-powered translation capabilities using both OpenAI GPT and Google Gemini models.

![CrossLingua Screenshot](screenshot.png)

## Features

- Real-time AI-powered translation with dual-panel interface
- Triple-click copy detection for instant translation
- System tray integration for quick access
- Support for multiple language models (GPT-3.5, GPT-4, and Gemini Pro)
- Dynamic load balancing between translation providers
- Light/dark mode support
- Downloadable translation results

## Installation

### Prerequisites

- Node.js 14.x or higher
- npm 7.x or higher
- OpenAI API key and/or Google Gemini API key

### Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/crosslingua.git
   cd crosslingua
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

### Building for Production

Build for the current platform:
```
npm run build
```

The packaged application will be available in the `dist` folder.

## API Keys Configuration

CrossLingua requires at least one of the following API keys to function:

- **OpenAI API Key**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Google Gemini API Key**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

You can configure these keys in the Settings dialog within the application.

## Usage

### Triple-click Copy Detection

1. Triple-click to select text in any application
2. The text will be automatically captured and sent to CrossLingua for translation
3. CrossLingua window will appear with the translated result

### Direct Input

1. Type or paste text into the source panel
2. Click the "Translate" button
3. View the translation result in the right panel

### Keyboard Shortcuts

- `Ctrl+Shift+T` (Windows) / `Cmd+Shift+T` (macOS): Show/hide CrossLingua window

## Privacy

All translations are processed directly through the API services. Your API keys and text content are stored locally on your device and are never sent to our servers.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 