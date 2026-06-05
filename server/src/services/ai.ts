import { config } from '../config';

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
]

const MAX_TOKENS: Record<string, number> = {
  'llama-3.3-70b-versatile': 4096,
  'llama-3.1-8b-instant': 4096,
  'meta-llama/llama-4-scout-17b-16e-instruct': 4096,
  'qwen/qwen3-32b': 4096,
}

async function callGroq(initialModel: string, messages: { role: string; content: string }[]): Promise<string> {
  const modelsToTry = [initialModel, ...FALLBACK_MODELS.filter(m => m !== initialModel)]

  for (const model of modelsToTry) {
    const msgs = messages.map(m => ({
      ...m,
      content: m.content.length > 25000 ? m.content.slice(0, 25000) : m.content,
    }))

    const res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({ model, messages: msgs, temperature: 0.7, max_tokens: MAX_TOKENS[model] || 2048 }),
    });

    if (res.ok) {
      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content || '';
    }

    const errText = await res.text();
    if (res.status === 429 || res.status === 413) {
      console.warn(`Groq model ${model} limited (${res.status}), trying fallback...`)
      continue
    }
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  throw Object.assign(new Error('Groq rate limit reached on all models. Try again later or switch to Gemini.'), { statusCode: 429, rateLimited: true });
}

async function callGemini(messages: { role: string; content: string }[]): Promise<string> {
  const model = 'gemini-2.0-flash'
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${config.geminiApiKey}`

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 429) {
      throw Object.assign(new Error('Gemini rate limit reached. Try again later.'), { statusCode: 429, rateLimited: true });
    }
    throw new Error(`Gemini API error (${res.status}): ${errText}`)
  }

  const data: any = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  if (config.aiProvider === 'gemini' && config.geminiApiKey) {
    try {
      return await callGemini(messages)
    } catch (err: any) {
      if (err.rateLimited || !config.groqApiKey) throw err
      console.warn('Gemini failed, falling back to Groq:', err.message)
    }
  }
  if (config.groqApiKey) {
    return await callGroq('llama-3.3-70b-versatile', messages)
  }
  return JSON.stringify({ error: 'No AI API key configured. Set GROQ_API_KEY or GEMINI_API_KEY in .env', fallback: true })
}

function parseJSON(text: string): any {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function getAIService() {
  return { callAI, parseJSON };
}

export class AIService {
  static async solveProblem(prompt: string, mode: string, language: string = 'C++'): Promise<any> {
    const systemPrompt = mode === 'code'
      ? `You are a coding expert in ${language}. Solve the problem step by step. Return JSON with:
{
  "answer": "final answer or code in ${language}",
  "steps": [{ "title": "step name", "content": "explanation", "code": "optional code in ${language}" }],
  "confidence": "high|medium|low"
}
If unsure, set confidence to "low" and answer to "I'm not confident I can solve this correctly."`
      : `You are a math/physics expert. Solve the problem step by step. Return JSON with:
{
  "answer": "final answer first",
  "steps": [{ "title": "step name", "content": "explanation with math notation" }],
  "confidence": "high|medium|low"
}
If unsure, set confidence to "low" and answer to "I'm not confident I can solve this correctly."`;

    const text = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Problem: ${prompt}` },
    ]);

    return parseJSON(text) || { answer: text, steps: [], confidence: 'medium' };
  }

  static async generateFlashcards(topic: string): Promise<any> {
    const prompt = `Generate 10 flashcards for studying "${topic}". Return ONLY valid JSON:
{
  "flashcards": [{ "id": "1", "front": "question/term", "back": "answer/definition" }]
}`;

    const text = await callAI([
      { role: 'user', content: prompt },
    ]);

    return parseJSON(text) || { flashcards: [{ id: '1', front: 'Error', back: 'Could not parse response' }] };
  }

  static async extractFlashcards(text: string): Promise<any> {
    const prompt = `Extract key concepts and definitions from this content into flashcards. Return JSON:
{
  "flashcards": [{ "id": "1", "front": "term", "back": "definition" }]
}

Content: ${text.substring(0, 5000)}`;

    const result = await callAI([
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { flashcards: [{ id: '1', front: 'Error', back: 'Could not extract' }] };
  }

  static async generateQuiz(text: string, type: string, language?: string): Promise<any> {
    const isExam = type === 'exam';
    const prompt = isExam
      ? `You are a professor creating a practice exam. Analyze the uploaded exam below and generate a NEW exam that matches it EXACTLY in:
- Subject matter and topic coverage
- Difficulty and rigor (university level)
- Question types and format (multiple choice, true/false, short answer, word problem, diagram-based, etc.)
- Style of wording and presentation
- Number of questions per section

IMPORTANT RULES:
- Keep every question's concept and structure identical, ONLY change the numbers, data values, and variable names.
- If the original includes diagrams, figures, or equation sheets, mention them in a "diagrams" field and describe what they show.
- Generate questions at the SAME difficulty level as the original.
- Each question must have a "type" field matching the original.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "1",
      "type": "multiple-choice|true-false|short-answer|word-problem",
      "prompt": "question text with [DIAGRAM: description] if applicable",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "...",
      "explanation": "step by step solution",
      "points": 1,
      "diagrams": "description of any diagram or figure if present in the original"
    }
  ],
  "equationSheet": "any equations provided in the original",
  "instructions": "any special instructions from the original"
}

ORIGINAL EXAM:
${text.substring(0, 8000)}`
      : `Generate a quiz based on this material. Include multiple choice, true/false, and short answer. Return ONLY valid JSON:
{
  "questions": [{ "id": "1", "type": "multiple-choice|true-false|short-answer", "prompt": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "...", "points": 1 }]
}

Content: ${text.substring(0, 5000)}`;

    const result = await callAI([
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { questions: [] };
  }

  static async generateExam(text: string): Promise<any> {
    return this.generateQuiz(text, 'exam');
  }

  static async generateInterviewChallenges(params: {
    topic?: string;
    position?: string;
    syllabusText?: string;
    language: string;
  }): Promise<any> {
    const context = [
      params.position && `Position: ${params.position}`,
      params.topic && `Topic: ${params.topic}`,
      params.syllabusText && `Course material: ${params.syllabusText.substring(0, 3000)}`,
    ].filter(Boolean).join('\n');

    const prompt = `You are a technical interviewer at a top tech company (Google, Meta, Amazon). Based on the following context, generate 4 well-known LeetCode-style coding challenge titles that are commonly asked in real interviews for this position. Each title should be recognizable (like "Two Sum", "Merge K Sorted Lists", "LRU Cache") and directly relevant to the context. Return ONLY valid JSON:
{
  "challenges": [
    { "id": "1", "title": "problem title", "difficulty": "Easy|Medium|Hard", "topics": ["topic1", "topic2"], "leetcodeSlug": "two-sum" }
  ]
}

The "leetcodeSlug" should be the URL slug for this problem on LeetCode if it exists (e.g. "two-sum", "reverse-linked-list"), or empty string if not.

Context:
${context || 'General software engineering interview'}
Programming language: ${params.language}`;

    const result = await callAI([
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { challenges: [] };
  }

  static async getInterviewChallenge(params: {
    title: string;
    language: string;
    position?: string;
    topic?: string;
  }): Promise<any> {
    const prompt = `You are a technical interviewer at a top tech company. Generate a complete LeetCode-style coding challenge for "${params.title}" in ${params.language}. 

The problem must include:
1. A clear, detailed problem description explaining the background and what to implement
2. 2-3 concrete examples with input and expected output (formatted like LeetCode)
3. Specific constraints on input sizes, values, and edge cases
4. A starter code template/skeleton in ${params.language} with the function signature
5. Time and space complexity requirements
6. Difficulty rating

Make the problem realistic for a ${params.position || 'software engineering'} interview. Return ONLY valid JSON:

{
  "id": "1",
  "title": "${params.title}",
  "difficulty": "Easy|Medium|Hard",
  "description": "A clear multi sentence problem description explaining the task, input format, and output format. Include the problem background.",
  "examples": [
    { "input": "Input: nums = [2,7,11,15], target = 9", "output": "Output: [0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]." }
  ],
  "constraints": [
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9",
    "-10^9 <= target <= 10^9"
  ],
  "starterCode": "function signature and skeleton in ${params.language}",
  "followUp": "Optional follow up question about optimization",
  "hint": "optional hint (base64 encoded or plain text)",
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(n)",
  "topics": ["Array", "Hash Table"]
}`;

    const result = await callAI([
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { error: 'Could not generate challenge' };
  }

  static async evaluateInterviewAnswer(params: {
    problemTitle: string;
    problemDescription: string;
    userAnswer: string;
    language: string;
  }): Promise<any> {
    const prompt = `You are a technical interviewer evaluating a candidate's solution.

Problem: ${params.problemTitle}
Description: ${params.problemDescription}

Candidate's solution (${params.language}):
${params.userAnswer}

Evaluate the solution. Return ONLY valid JSON:
{
  "correct": true|false,
  "score": 0-100,
  "feedback": "detailed feedback on correctness, efficiency, and style",
  "suggestions": ["improvement 1", "improvement 2"],
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)"
}`;

    const result = await callAI([
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { correct: false, score: 0, feedback: 'Could not evaluate' };
  }

  static async generateLanguageQuiz(language: string, mode: string, level: string, context: string): Promise<any> {
    let prompt: string;

    if (mode === 'syllabus' && context) {
      prompt = `You are a language teacher for ${language}. Based on the following study material, generate 2-3 short paragraphs in ${language} (each 3-5 sentences) at the appropriate level. Then create 10-15 total questions (multiple choice or short answer) about these texts, distributed across the texts. Include romanization for non-Latin scripts. Return ONLY valid JSON:
{
  "texts": [{ "id": "t1", "foreign": "paragraph in ${language}", "romanized": "pronunciation guide", "native": "English translation" }],
  "questions": [{ "id": "q1", "textBlockId": "t1", "prompt": "question text", "options": ["option1", "option2", "option3", "option4"], "correctAnswer": "correct option", "explanation": "why this is correct" }]
}

Study material: ${context.substring(0, 3000)}`;
    } else if (mode === 'level' && level) {
      prompt = `You are a language teacher for ${language}. Generate 2-3 short paragraphs in ${language} (each 3-5 sentences) appropriate for a student at level "${level}". Then create 10-15 total questions (multiple choice or short answer) about these texts. Include romanization for non-Latin scripts. Return ONLY valid JSON:
{
  "texts": [{ "id": "t1", "foreign": "paragraph in ${language}", "romanized": "pronunciation guide", "native": "English translation" }],
  "questions": [{ "id": "q1", "textBlockId": "t1", "prompt": "question text", "options": ["option1", "option2", "option3", "option4"], "correctAnswer": "correct option", "explanation": "why this is correct" }]
}`;
    } else {
      prompt = `You are a language teacher for ${language}. Generate 2-3 short paragraphs in ${language} (each 3-5 sentences) suitable for beginners. Then create 10-15 total questions (multiple choice or short answer) about these texts. Include romanization for non-Latin scripts. Return ONLY valid JSON:
{
  "texts": [{ "id": "t1", "foreign": "paragraph in ${language}", "romanized": "pronunciation guide", "native": "English translation" }],
  "questions": [{ "id": "q1", "textBlockId": "t1", "prompt": "question text", "options": ["option1", "option2", "option3", "option4"], "correctAnswer": "correct option", "explanation": "why this is correct" }]
}`;
    }

    const result = await callAI([
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { texts: [], questions: [] };
  }

  static async generateLanguageCards(language: string, mode: string, level: string, context: string): Promise<any> {
    let prompt: string;

    if (mode === 'syllabus' && context) {
      prompt = `You are a language teacher for ${language}. Based on the following study material, generate 10 vocabulary cards (words or short phrases) that match the content. Include romanization where applicable. Return ONLY valid JSON:
{
  "cards": [{ "id": "1", "foreign": "word in ${language}", "romanized": "pronunciation guide", "native": "English translation" }]
}

Study material: ${context.substring(0, 3000)}`;
    } else if (mode === 'level' && level) {
      prompt = `You are a language teacher for ${language}. Generate 10 vocabulary cards appropriate for a student at level "${level}". Include romanization where applicable. Return ONLY valid JSON:
{
  "cards": [{ "id": "1", "foreign": "word in ${language}", "romanized": "pronunciation guide", "native": "English translation" }]
}`;
    } else {
      prompt = `You are a language teacher for ${language}. Generate 10 common, useful vocabulary cards for a beginner learner of ${language}. Include romanization where applicable. Return ONLY valid JSON:
{
  "cards": [{ "id": "1", "foreign": "word in ${language}", "romanized": "pronunciation guide", "native": "English translation" }]
}`;
    }

    const result = await callAI([
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { cards: [] };
  }
}
