import { GoogleGenAI } from '@google/genai';
import { DifficultyLevel, ImageData } from '../types';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Fetches an explanation for an academic doubt.
 * Supports text and optional image input.
 */
export const fetchExplanation = async (
  doubtText: string,
  image: ImageData | null,
  difficulty: DifficultyLevel
): Promise<string> => {
  const ai = getClient();
  
  const systemInstruction = `You are LearnLab AI, an expert, safe, and encouraging academic tutor for school students.
Your goal is to provide clear, context-based explanations for academic doubts.
Tailor your explanation strictly to a ${difficulty} comprehension level.
If the student provides an image, carefully analyze it to provide relevant context to their question.
Use clear headings, bullet points, and highlight key terms. Be educational and maintain integrity (don't just give answers to homework, explain how to solve it).`;

  let promptText = `Please explain the following doubt at a ${difficulty} level: "${doubtText}"`;
  if (image) {
    promptText += `\nI have attached an image for context.`;
  }

  const parts: any[] = [{ text: promptText }];
  
  if (image) {
    parts.push({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Pro is better for complex academic doubts + multimodal
      contents: { parts },
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 2048 }, // Give it some room to reason about the doubt
      },
    });

    if (response.text) {
      return response.text;
    }
    throw new Error('No text returned from the model.');
  } catch (error: any) {
    console.error('Error fetching explanation:', error);
    throw new Error(`Failed to generate explanation: ${error.message}`);
  }
};

/**
 * Generates a practice quiz based on the doubt to reinforce learning.
 */
export const fetchQuiz = async (
  doubtText: string,
  difficulty: DifficultyLevel
): Promise<string> => {
  const ai = getClient();
  
  const systemInstruction = `You are LearnLab AI, an expert educational assessor.
Create a short, targeted quiz to help a student practice the concepts related to their recent doubt.
The difficulty must be strictly tailored to a ${difficulty} level.`;

  const prompt = `Based on the academic topic related to this doubt: "${doubtText}", 
generate a 3-question multiple-choice quiz suitable for a ${difficulty} level student.
Format it clearly. Provide the questions first, then a section at the very end with the correct answers and a brief reason why.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Flash is fast enough for generating a simple quiz
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    if (response.text) {
      return response.text;
    }
    throw new Error('No text returned from the model.');
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
};

/**
 * Generates a text-based mindmap representation of the concept.
 */
export const fetchMindmap = async (
  doubtText: string,
  difficulty: DifficultyLevel
): Promise<string> => {
  const ai = getClient();
  
  const systemInstruction = `You are LearnLab AI, an expert at breaking down complex topics into clear visual hierarchies.
Your goal is to construct a detailed textual mindmap using Markdown nested lists.
Use emojis for visual flair and bold text for key nodes. Ensure it matches a ${difficulty} comprehension level.`;

  const prompt = `Analyze the topic related to this doubt: "${doubtText}".
Create a comprehensive text-based mindmap. 
Start with the core concept as the root node, then branch out into 3-4 main sub-topics, and add 2-3 specific details under each sub-topic. Use a standard markdown nested list format.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    if (response.text) {
      return response.text;
    }
    throw new Error('No text returned from the model.');
  } catch (error: any) {
    console.error('Error fetching mindmap:', error);
    throw new Error(`Failed to generate mindmap: ${error.message}`);
  }
};