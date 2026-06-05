import { config } from '../config';

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

export async function callGroq(model: string, messages: { role: string; content: string }[]): Promise<string> {
  if (!config.groqApiKey) {
    return JSON.stringify({
      error: 'No API key configured. Set GROQ_API_KEY in .env',
      fallback: true,
    });
  }

  const res = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096 }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content || '';
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

    const text = await callGroq('llama-3.3-70b-versatile', [
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

    const text = await callGroq('llama-3.3-70b-versatile', [
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

    const result = await callGroq('llama-3.3-70b-versatile', [
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { flashcards: [{ id: '1', front: 'Error', back: 'Could not extract' }] };
  }

  static async generateQuiz(text: string, type: string): Promise<any> {
    const isExam = type === 'exam';
    const prompt = isExam
      ? `Analyze this practice exam and generate a similar exam with the same style and topics. Include word problems. Return JSON:
{
  "questions": [{ "id": "1", "type": "multiple-choice|true-false|short-answer|word-problem", "prompt": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "...", "points": 1 }]
}
If the original exam has an equation sheet, note it. Generated exam must have the same topics.

Content: ${text.substring(0, 5000)}`
      : `Generate a quiz based on this material. Include multiple choice, true/false, and short answer. Return JSON:
{
  "questions": [{ "id": "1", "type": "multiple-choice|true-false|short-answer", "prompt": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "...", "points": 1 }]
}

Content: ${text.substring(0, 5000)}`;

    const result = await callGroq('llama-3.3-70b-versatile', [
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

    const prompt = `You are a technical interviewer. Based on the following context, generate 4 coding challenge titles suitable for a mock technical interview. Each should be a real LeetCode-style problem title (like "Two Sum", "Reverse Linked List", etc.) relevant to the context. Return ONLY valid JSON:
{
  "challenges": [
    { "id": "1", "title": "problem title", "difficulty": "Easy|Medium|Hard", "topics": ["topic1", "topic2"] }
  ]
}

Context:
${context || 'General software engineering interview'}
Programming language: ${params.language}`;

    const result = await callGroq('llama-3.3-70b-versatile', [
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
    const prompt = `You are a technical interviewer. Generate a complete coding challenge for "${params.title}" in ${params.language}. Return ONLY valid JSON:
{
  "id": "1",
  "title": "${params.title}",
  "difficulty": "Easy|Medium|Hard",
  "description": "Full problem description with examples",
  "constraints": ["constraint 1", "constraint 2"],
  "examples": [{ "input": "...", "output": "..." }],
  "starterCode": "function stub in ${params.language}",
  "solution": "optimal solution explanation",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)"
}`;

    const result = await callGroq('llama-3.3-70b-versatile', [
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

    const result = await callGroq('llama-3.3-70b-versatile', [
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

    const result = await callGroq('llama-3.3-70b-versatile', [
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

    const result = await callGroq('llama-3.3-70b-versatile', [
      { role: 'user', content: prompt },
    ]);

    return parseJSON(result) || { cards: [] };
  }
}
