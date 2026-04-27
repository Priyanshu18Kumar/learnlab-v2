export enum DifficultyLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum LearningStyle {
  GENERAL = 'General',
  VISUAL = 'Visual',
  KINESTHETIC = 'Kinesthetic',
  AUDITORY = 'Auditory',
}

export interface GenerationState {
  isLoading: boolean;
  data: string | null;
  error: string | null;
}

export interface AppState {
  doubtText: string;
  difficulty: DifficultyLevel;
  explanation: GenerationState;
  quiz: GenerationState;
  mindmap: GenerationState;
}

export interface ImageData {
  base64: string;
  mimeType: string;
}