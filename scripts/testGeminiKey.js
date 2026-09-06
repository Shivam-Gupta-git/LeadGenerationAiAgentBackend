import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root or apps/api
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const apiKey = process.env.GEMINI_API_KEY;

console.log('\n======================================================');
console.log('      🔍 GEMINI API KEY DIAGNOSTIC VERIFIER           ');
console.log('======================================================\n');

if (!apiKey || apiKey.includes('YOUR_') || apiKey.trim() === '') {
  console.error('❌ ERROR: GEMINI_API_KEY is not configured in your .env file!');
  console.log('\n👉 How to fix:');
  console.log('1. Open file: agent backend/.env');
  console.log('2. Add line:  GEMINI_API_KEY=AIzaSy...');
  console.log('3. Get free key from: https://aistudio.google.com/app/apikey\n');
  process.exit(1);
}

const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '***';
console.log(`🔑 Key Found: ${maskedKey}`);
console.log('📡 Testing Google Gemini endpoints...\n');

// 1. First test ListModels endpoint
const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
try {
  const listRes = await fetch(listUrl);
  const listData = await listRes.json();
  if (listRes.ok && listData.models) {
    const generateModels = listData.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
    console.log(`📋 Available Models for your Key: ${generateModels.slice(0, 6).join(', ')}`);
  }
} catch (e) {
  // Ignore list error
}

// 2. Try generation models in priority order
const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro'];
let success = false;

for (const model of candidateModels) {
  const startTime = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: 'Write a 1-sentence personalized pitch subject line for a dental clinic in Austin, TX.' }] }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.candidates && data.candidates.length > 0) {
      const text = data.candidates[0].content.parts[0].text.trim();
      console.log(`\n======================================================`);
      console.log(`✅ SUCCESS: Your GEMINI_API_KEY is 100% VALID & WORKING!`);
      console.log(`⏱️ Response Time: ${duration} ms`);
      console.log(`⚡ Active Model: ${model}`);
      console.log(`\n🤖 Sample Generated Pitch:\n"${text}"`);
      console.log(`======================================================\n`);
      success = true;
      break;
    } else {
      console.log(`⚠️ Model '${model}' test response (HTTP ${response.status}):`, data.error?.message || data.error?.status || 'Unknown error');
    }
  } catch (err) {
    // Continue to next candidate model
  }
}

if (!success) {
  console.log('\n❌ Could not generate content with candidate models. Please verify API key permissions at https://aistudio.google.com\n');
}
