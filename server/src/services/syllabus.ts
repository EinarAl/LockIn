import { callGroq } from './ai'

interface ParsedSyllabus {
  events: { date: string; title: string; type: string }[]
  gradeCategories: { name: string; weight: number }[]
}

export async function generateCalendarEvents(syllabusText: string, courseName: string): Promise<ParsedSyllabus> {
  const prompt = `You are parsing a college syllabus. Extract all important dates (exams, quizzes, assignments, projects) and the grade breakdown categories with their weights.

Syllabus text for "${courseName}":
${syllabusText.slice(0, 8000)}

Return JSON ONLY with this exact structure:
{
  "events": [
    { "date": "YYYY-MM-DD", "title": "Event name", "type": "exam|quiz|assignment|project|other" }
  ],
  "gradeCategories": [
    { "name": "Category name", "weight": 25 }
  ]
}

Make sure weights sum to 100. If you cannot determine a date precisely, skip that event. Include as many events as you can find.`

  const result = await callGroq('llama-3.3-70b-versatile', [
    { role: 'system', content: 'You are a syllabus parser. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ])

  try {
    const parsed = JSON.parse(result)
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      gradeCategories: Array.isArray(parsed.gradeCategories) ? parsed.gradeCategories : [],
    }
  } catch {
    return { events: [], gradeCategories: [] }
  }
}
