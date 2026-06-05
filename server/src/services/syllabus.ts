import { callGroq } from './ai'

interface ParsedSyllabus {
  events: { date: string; title: string; type: string }[]
  gradeCategories: { name: string; weight: number }[]
}

export async function generateCalendarEvents(syllabusText: string, courseName: string): Promise<ParsedSyllabus> {
  const prompt = `You are parsing a college syllabus. Extract all important dates (exams, quizzes, assignments, projects) and the grade breakdown categories with their weights.

The current year is 2026. Typical US spring semesters start in early to mid January, fall semesters start in late August.

Syllabus text for "${courseName}":
${syllabusText.slice(0, 8000)}

Rules for date extraction:
- The syllabus may reference weeks (Week 1, Week 2, etc.) or specific dates.
- If the syllabus says "Spring 2026" with week numbers, assume the semester starts the second week of January 2026 (around Jan 12) and calculate dates accordingly.
- If the syllabus says "Fall 2026" with week numbers, assume the semester starts the last week of August 2026 (around Aug 24) and calculate dates accordingly.
- If a specific date IS given (e.g., "May 6th", "Wed. May 6th"), use that date.
- If you can determine a likely date from week numbers and context, include it. If you truly cannot determine any date, skip that event.
- For multi-week events (like "HW1 due in Week 3"), estimate the Friday or last day of that week.

Return JSON ONLY with this exact structure:
{
  "events": [
    { "date": "YYYY-MM-DD", "title": "Event name", "type": "exam|quiz|assignment|project|other" }
  ],
  "gradeCategories": [
    { "name": "Category name", "weight": 25 }
  ]
}

Make sure grade category weights sum to 100. Include as many events as you can find.`

  const result = await callGroq('llama-3.3-70b-versatile', [
    { role: 'system', content: 'You are a syllabus parser. Return only valid JSON. Use the current year 2026 for all dates.' },
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
