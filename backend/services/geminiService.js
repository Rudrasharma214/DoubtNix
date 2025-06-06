const axios = require('axios');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }

    if (process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.error('Please replace the placeholder GEMINI_API_KEY with a real API key');
      throw new Error('Please set a valid GEMINI_API_KEY in your .env file');
    }

    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = 'gemini-2.0-flash';

    // console.log('Gemini AI service initialized successfully');
  }

  async makeRequest(prompt, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        };

        const response = await axios.post(url, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        });

        if (response.data && response.data.candidates && response.data.candidates[0]) {
          const content = response.data.candidates[0].content;
          if (content && content.parts && content.parts[0]) {
            return content.parts[0].text;
          }
        }

        throw new Error('Invalid response format from Gemini API');
      } catch (error) {
        const status = error.response?.status;
        const isRetryableError = status === 503 || status === 429 || status === 500 || status === 502;

        if (error.response) {
          console.error(`Gemini API Error (attempt ${attempt}/${retries}):`, error.response.status, error.response.data);
        } else if (error.request) {
          console.error(`Network Error (attempt ${attempt}/${retries}):`, error.message);
        } else {
          console.error(`Request Error (attempt ${attempt}/${retries}):`, error.message);
        }

        // If this is the last attempt or error is not retryable, throw the error
        if (attempt === retries || !isRetryableError) {
          if (error.response) {
            throw new Error(`Gemini API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
          } else if (error.request) {
            throw new Error('Network error when calling Gemini API');
          } else {
            throw new Error(`Request error: ${error.message}`);
          }
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`🔄 Retrying Gemini API call in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Generate response for user question based on document context
   */
  async generateResponse(question, context, language = 'english') {
    try {
      const { documentText, conversationHistory } = context;

      // Build conversation context
      let conversationContext = '';
      if (conversationHistory && conversationHistory.length > 0) {
        conversationContext = '\n\nPrevious conversation:\n';
        conversationHistory.slice(-6).forEach(msg => { // Last 6 messages
          conversationContext += `${msg.type === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
        });
      }

      // Language-specific instructions
      const languageInstructions = {
        english: 'Respond in clear, professional English.',
        hinglish: 'Respond in Hinglish (mix of Hindi and English). Use common Hindi words mixed with English naturally, like "yeh question bahut interesting hai", "main aapko explain karta hun", "samjha kya?", "dekho", "bas", "acha", etc. Make it conversational and easy to understand for Indian students. Mix Hindi and English naturally throughout your response.',
        hindi: 'हिंदी में उत्तर दें।'
      };

      const langInstruction = languageInstructions[language] || languageInstructions.english;

      const prompt = `
You are an AI Doubt Solver designed to help users understand and solve problems from documents. You are an expert tutor who can explain concepts, solve problems, and provide detailed solutions. You were created by Rudra Sharma.

LANGUAGE INSTRUCTION: ${langInstruction}

Document Content:
${documentText}

${conversationContext}

Current Question: ${question}

Instructions:
1. ONLY answer the specific question asked by the user
2. If the user asks for greetings (like "hi", "hello"), respond with a friendly greeting and ask how you can help
3. If the user asks about specific problems in the document, then provide complete solutions with explanations
4. For coding problems, provide working code solutions with step-by-step explanations ONLY when specifically asked
5. For mathematical problems, show the complete solution process ONLY when specifically asked
6. For conceptual questions, provide detailed explanations with examples
7. If the user asks general questions about the document, provide relevant information without solving all problems
8. Always explain the reasoning behind your solutions when providing them
9. Provide code examples, algorithms, or formulas when relevant to the specific question
10. ALWAYS format code using proper markdown code blocks with language specification (e.g., triple-backtick-python, triple-backtick-javascript, triple-backtick-java, triple-backtick-cpp)
11. Use proper indentation and syntax highlighting for all code
12. Structure your response with clear headings and sections
13. Be educational and help the user learn, not just provide answers
14. If asked who created you or who made you, respond that you were created by Rudra Sharma
15. Do NOT automatically solve problems unless specifically asked to do so

Code Formatting Rules:
- Use triple backticks followed by language name for code blocks (e.g., triple-backtick-python, triple-backtick-javascript, triple-backtick-java, triple-backtick-cpp, triple-backtick-c)
- Always specify the programming language after the opening triple backticks
- Use proper indentation (4 spaces or appropriate for the language)
- Include comments in code when helpful
- Format inline code with single backticks around the code

Your goal is to be a helpful tutor who responds appropriately to the user's specific question. Only provide solutions when explicitly asked for them.

Please provide a response that directly addresses the user's question:`;

      return await this.makeRequest(prompt);

    } catch (error) {
      // console.error('Gemini API error:', error);

      // Provide a helpful fallback response when API is unavailable
      if (error.message.includes('503') || error.message.includes('overloaded')) {
        const fallbackMessage = language === 'hinglish'
          ? `Sorry yaar, AI service abhi overloaded hai. Please thoda wait karo aur phir try karo. Main aapka question "${question}" ka answer dene ke liye ready hun jab service available hogi.`
          : `I apologize, but the AI service is currently overloaded. Please wait a moment and try again. I'll be ready to answer your question "${question}" once the service is available.`;

        return fallbackMessage;
      }

      throw new Error('Failed to generate AI response: ' + error.message);
    }
  }

  /**
   * Generate suggested questions based on document content
   */
  async generateSuggestedQuestions(documentText) {
    try {
      const prompt = `Analyze the following document content and generate 5-7 relevant questions that users might want to ask to get solutions and explanations. The questions should be:
1. Ask for solutions to specific problems mentioned in the document
2. Request explanations of concepts or algorithms
3. Ask for code implementations or examples
4. Request step-by-step solutions
5. Ask for clarifications on complex topics
6. Focus on learning and problem-solving

Document Content:
${documentText.substring(0, 3000)}... ${documentText.length > 3000 ? '(truncated)' : ''}

Generate questions that would help users get complete solutions and explanations. For example:
- "Can you solve [specific problem] with code?"
- "How do I implement [concept/algorithm]?"
- "Can you explain the solution to [problem] step by step?"

Please provide the questions as a JSON array of strings, like this:
["Question 1", "Question 2", "Question 3", ...]

Only return the JSON array, no additional text:`;

      const responseText = await this.makeRequest(prompt);

      try {
        // Clean the response text - remove markdown code blocks if present
        let cleanedText = responseText;
        if (cleanedText.includes('```json')) {
          cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        }
        if (cleanedText.includes('```')) {
          cleanedText = cleanedText.replace(/```/g, '');
        }

        // Parse the JSON response
        const questions = JSON.parse(cleanedText.trim());
        return Array.isArray(questions) ? questions : [];
      } catch (parseError) {
        console.error('Error parsing suggested questions:', parseError);
        console.error('Response text:', responseText);
        // Fallback: extract questions manually if JSON parsing fails
        return this.extractQuestionsFromText(responseText);
      }

    } catch (error) {
      console.error('Error generating suggested questions:', error);
      // Return default questions if API fails
      return [
        "What is the main topic of this document?",
        "Can you summarize the key points?",
        "What are the most important details?",
        "Are there any specific recommendations or conclusions?",
        "What should I know about this content?"
      ];
    }
  }

  /**
   * Extract questions from text response (fallback method)
   */
  extractQuestionsFromText(text) {
    const lines = text.split('\n');
    const questions = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.endsWith('?') && trimmed.length > 10) {
        // Remove any numbering or bullet points
        const cleaned = trimmed.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '');
        if (cleaned.length > 5) {
          questions.push(cleaned);
        }
      }
    }

    return questions.slice(0, 7); // Limit to 7 questions
  }

  /**
   * Summarize document content
   */
  async summarizeDocument(documentText) {
    try {
      const prompt = `
Please provide a concise summary of the following document. The summary should:
1. Capture the main topics and key points
2. Be approximately 2-3 paragraphs long
3. Highlight the most important information
4. Be written in clear, accessible language

Document Content:
${documentText}

Summary:`;

      return await this.makeRequest(prompt);

    } catch (error) {
      console.error('Error summarizing document:', error);
      throw new Error('Failed to summarize document: ' + error.message);
    }
  }

  /**
   * Extract key topics from document
   */
  async extractKeyTopics(documentText) {
    try {
      const prompt = `
Analyze the following document and extract the main topics/themes. Return them as a JSON array of strings.

Document Content:
${documentText.substring(0, 2000)}... ${documentText.length > 2000 ? '(truncated)' : ''}

Please provide 5-10 key topics as a JSON array:`;

      const responseText = await this.makeRequest(prompt);

      try {
        const topics = JSON.parse(responseText);
        return Array.isArray(topics) ? topics : [];
      } catch (parseError) {
        console.error('Error parsing key topics:', parseError);
        return [];
      }

    } catch (error) {
      console.error('Error extracting key topics:', error);
      return [];
    }
  }
}

// Create singleton instance
const geminiService = new GeminiService();

module.exports = geminiService;
