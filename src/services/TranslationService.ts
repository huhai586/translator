import axios from 'axios';

interface TranslationResult {
  translatedText: string;
  provider: 'openai' | 'gemini';
  responseTime: number;
}

class TranslationService {
  private openaiApiKey: string = '';
  private geminiApiKey: string = '';
  private preferredModel: string = 'gpt-3.5-turbo';
  private sourceLanguage: string = 'zh';
  private targetLanguage: string = 'en';
  private lastProvider: 'openai' | 'gemini' | null = null;
  private responseTimesOpenAI: number[] = [];
  private responseTimesGemini: number[] = [];

  // Load settings from electron store
  async loadSettings() {
    try {
      this.openaiApiKey = await window.electron.getSetting('openaiApiKey') || '';
      this.geminiApiKey = await window.electron.getSetting('geminiApiKey') || '';
      this.preferredModel = await window.electron.getSetting('preferredModel') || 'gpt-3.5-turbo';
      this.sourceLanguage = await window.electron.getSetting('sourceLanguage') || 'zh';
      this.targetLanguage = await window.electron.getSetting('targetLanguage') || 'en';
      
      console.log('TranslationService: Settings loaded', { 
        hasOpenAI: !!this.openaiApiKey, 
        hasGemini: !!this.geminiApiKey,
        preferredModel: this.preferredModel
      });
    } catch (error) {
      console.error('Error loading translation settings:', error);
    }
  }

  // Force reload settings and return availability
  async reloadSettings(): Promise<boolean> {
    await this.loadSettings();
    return this.canTranslate();
  }

  // Check if translation is possible
  canTranslate(): boolean {
    return !!(this.openaiApiKey || this.geminiApiKey);
  }

  // Get available API providers
  getAvailableProviders(): ('openai' | 'gemini')[] {
    const providers: ('openai' | 'gemini')[] = [];
    if (this.openaiApiKey) providers.push('openai');
    if (this.geminiApiKey) providers.push('gemini');
    return providers;
  }

  // Decide which provider to use based on response times and availability
  private selectProvider(): 'openai' | 'gemini' {
    const providers = this.getAvailableProviders();
    
    if (providers.length === 0) {
      throw new Error('No translation providers available. Please add API keys in settings.');
    }
    
    if (providers.length === 1) {
      return providers[0];
    }
    
    // If we have response time data, use the faster one with 80% probability
    if (this.responseTimesOpenAI.length > 0 && this.responseTimesGemini.length > 0) {
      const avgOpenAI = this.responseTimesOpenAI.reduce((a, b) => a + b, 0) / this.responseTimesOpenAI.length;
      const avgGemini = this.responseTimesGemini.reduce((a, b) => a + b, 0) / this.responseTimesGemini.length;
      
      // 80% of the time use the faster one, 20% try the other to keep response times updated
      if (Math.random() < 0.8) {
        return avgOpenAI < avgGemini ? 'openai' : 'gemini';
      } else {
        return avgOpenAI < avgGemini ? 'gemini' : 'openai';
      }
    }
    
    // If one failed last time, try the other
    if (this.lastProvider === 'openai') {
      return 'gemini';
    } else if (this.lastProvider === 'gemini') {
      return 'openai';
    }
    
    // Default to preferred model
    if (this.preferredModel.startsWith('gpt') && providers.includes('openai')) {
      return 'openai';
    } else if (this.preferredModel.startsWith('gemini') && providers.includes('gemini')) {
      return 'gemini';
    }
    
    // Random choice as fallback
    return providers[Math.floor(Math.random() * providers.length)];
  }

  // Update response time tracking
  private updateResponseTime(provider: 'openai' | 'gemini', responseTime: number) {
    // Keep only the last 5 response times
    if (provider === 'openai') {
      this.responseTimesOpenAI.push(responseTime);
      if (this.responseTimesOpenAI.length > 5) {
        this.responseTimesOpenAI.shift();
      }
    } else {
      this.responseTimesGemini.push(responseTime);
      if (this.responseTimesGemini.length > 5) {
        this.responseTimesGemini.shift();
      }
    }
  }

  // Translate using OpenAI
  private async translateWithOpenAI(text: string): Promise<TranslationResult> {
    const startTime = Date.now();
    this.lastProvider = 'openai';
    
    try {
      console.log('Starting OpenAI translation request');
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.preferredModel === 'gpt-4' ? 'gpt-4' : 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a translation assistant. Translate the user's text from ${
                this.sourceLanguage === 'auto' ? 'the detected language' : this.sourceLanguage
              } to ${this.targetLanguage}. Provide only the translated text without explanations or notes.`
            },
            { role: 'user', content: text }
          ],
          temperature: 0.3,
          max_tokens: 2048
        },
        {
          timeout: 30000, // 30秒超时
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          }
        }
      );
      
      console.log('OpenAI translation response received', response.status);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      this.updateResponseTime('openai', responseTime);
      
      if (response.data && response.data.choices && 
          response.data.choices[0] && 
          response.data.choices[0].message &&
          response.data.choices[0].message.content) {
        return {
          translatedText: response.data.choices[0].message.content.trim(),
          provider: 'openai',
          responseTime
        };
      } else {
        console.error('Unexpected OpenAI response format:', response.data);
        throw new Error('Unexpected response format from OpenAI API');
      }
    } catch (error: any) {
      console.error('OpenAI translation error:', error);
      
      // 提供更详细的错误信息
      if (error.response) {
        // 服务器响应了，但状态码不是2xx
        console.error('OpenAI API error response:', {
          status: error.response.status,
          data: error.response.data
        });
        throw new Error(`OpenAI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // 请求已发送但没有收到响应
        console.error('No response received from OpenAI API:', error.request);
        throw new Error('No response received from OpenAI API. Please check your internet connection.');
      } else {
        // 设置请求时发生了错误
        console.error('Error setting up OpenAI request:', error.message);
        throw new Error(`OpenAI API request error: ${error.message}`);
      }
    }
  }

  // Translate using Gemini
  private async translateWithGemini(text: string): Promise<TranslationResult> {
    const startTime = Date.now();
    this.lastProvider = 'gemini';
    
    try {
      // 添加超时和详细日志
      console.log('Starting Gemini translation request');
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `Translate the following text from ${
                    this.sourceLanguage === 'auto' ? 'the detected language' : this.sourceLanguage
                  } to ${this.targetLanguage}. Only provide the translated text without explanations:\n\n${text}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048
          }
        },
        {
          timeout: 30000, // 30秒超时
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Gemini translation response received', response.status);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      this.updateResponseTime('gemini', responseTime);
      
      // Extract translated text from Gemini response
      if (response.data && response.data.candidates && 
          response.data.candidates[0] && 
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts &&
          response.data.candidates[0].content.parts[0]) {
        const translatedText = response.data.candidates[0].content.parts[0].text.trim();
        
        return {
          translatedText,
          provider: 'gemini',
          responseTime
        };
      } else {
        console.error('Unexpected Gemini response format:', response.data);
        throw new Error('Unexpected response format from Gemini API');
      }
    } catch (error: any) {
      console.error('Gemini translation error:', error);
      
      // 提供更详细的错误信息
      if (error.response) {
        // 服务器响应了，但状态码不是2xx
        console.error('Gemini API error response:', {
          status: error.response.status,
          data: error.response.data
        });
        throw new Error(`Gemini API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // 请求已发送但没有收到响应
        console.error('No response received from Gemini API:', error.request);
        throw new Error('No response received from Gemini API. Please check your internet connection.');
      } else {
        // 设置请求时发生了错误
        console.error('Error setting up Gemini request:', error.message);
        throw new Error(`Gemini API request error: ${error.message}`);
      }
    }
  }

  // 翻译文本
  async translate(text: string): Promise<TranslationResult> {
    const startTime = Date.now();

    try {
      // 每次翻译前重新加载设置
      await this.loadSettings();
      
      if (!this.canTranslate()) {
        throw new Error('No translation API keys configured.');
      }
      
      try {
        // Select the provider to use
        const provider = this.selectProvider();
        
        // Try with selected provider
        try {
          if (provider === 'openai') {
            return await this.translateWithOpenAI(text);
          } else {
            return await this.translateWithGemini(text);
          }
        } catch (error) {
          console.error(`Error with ${provider} translation, trying fallback:`, error);
          
          // Try with the other provider if available
          const fallbackProviders = this.getAvailableProviders().filter(p => p !== provider);
          
          if (fallbackProviders.length > 0) {
            if (fallbackProviders[0] === 'openai') {
              return await this.translateWithOpenAI(text);
            } else {
              return await this.translateWithGemini(text);
            }
          } else {
            throw error; // No fallback available
          }
        }
      } catch (error) {
        console.error('Translation failed with all providers:', error);
        throw new Error('Translation failed. Please check your API keys and connection.');
      }
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const translationService = new TranslationService();

export default translationService; 