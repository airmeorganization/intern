import { Env } from '../types';

export class AIService {
  private ai: any;

  constructor(env: Env) {
    this.ai = env.AI;
  }

  async extractProfileFromResume(text: string) {
    const prompt = `
      Extract the following information from the resume text provided below.
      Format the output as a valid JSON object with the following keys:
      - education: A short string summarizing the education (e.g. "B.S. Computer Science, University X")
      - skills: An array of strings representing technical skills and tools.
      - interests: An array of strings representing professional interests and domains.
      - preferred_domain: A short string (e.g. "Software Engineering", "Data Science").

      Only output the valid JSON object, no other text.

      Resume Text:
      ${text.substring(0, 4000)} // Truncate to fit model context
    `;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [{ role: 'user', content: prompt }]
      });

      // Try to parse the JSON output
      let result = response.response;
      // Strip markdown code blocks if any
      if (result.startsWith('```json')) {
        result = result.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (result.startsWith('```')) {
        result = result.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      return JSON.parse(result);
    } catch (e) {
      console.error('Error parsing resume:', e);
      throw new Error('Failed to parse resume');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.run('@cf/baai/bge-large-en-v1.5', {
      text: [text]
    });
    return response.data[0];
  }
}
