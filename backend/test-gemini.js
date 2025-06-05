const axios = require('axios');
require('dotenv').config();

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API with direct HTTP...');
    console.log('API Key:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set');

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set in environment variables');
      return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "Hello, this is a test. Please respond with 'API is working correctly'."
            }
          ]
        }
      ]
    };

    console.log('Sending test request...');
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const content = response.data.candidates[0].content;
      if (content && content.parts && content.parts[0]) {
        const text = content.parts[0].text;
        console.log('✅ API Response:', text);
        console.log('✅ Gemini API is working correctly!');
      }
    }
    
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    
    if (error.message.includes('API key not valid')) {
      console.error('🔑 The API key is invalid. Please check your GEMINI_API_KEY in the .env file.');
      console.error('📝 Get a valid API key from: https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('models/gemini-1.5-flash is not found')) {
      console.error('🤖 The model name might be incorrect. Trying alternative models...');
      
      // Try alternative model names
      const alternativeModels = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.0-pro'];
      
      for (const modelName of alternativeModels) {
        try {
          console.log(`Trying model: ${modelName}`);
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const altModel = genAI.getGenerativeModel({ model: modelName });
          const result = await altModel.generateContent("Test");
          const response = result.response;
          console.log(`✅ Model ${modelName} works!`);
          break;
        } catch (altError) {
          console.log(`❌ Model ${modelName} failed: ${altError.message}`);
        }
      }
    }
  }
}

testGeminiAPI();
