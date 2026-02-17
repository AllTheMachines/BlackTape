/**
 * Centralized prompt templates for all AI features.
 *
 * Prompts are defined here so they can be tuned in one place.
 * Plans 04-06 will expand these as features are built.
 */

export const PROMPTS = {
	artistSummary: (artistName: string, tags: string, country: string) =>
		`Write a concise, engaging 2-3 sentence description of the musical artist "${artistName}". ${tags ? `Their music is tagged as: ${tags}.` : ''} ${country ? `They are from ${country}.` : ''} Focus on their sound and significance. Do not speculate about things you don't know.`,

	nlExplore: (query: string) =>
		`You are a knowledgeable music guide. The user is looking for music recommendations. Respond with a numbered list of 5-8 artist recommendations. For each, include the artist name and a brief 1-sentence description of their sound. User query: "${query}"`,

	nlRefine: (originalQuery: string, previousResults: string, refinement: string) =>
		`You are a knowledgeable music guide. The user originally asked: "${originalQuery}". You previously suggested:\n${previousResults}\n\nThe user wants to refine: "${refinement}". Provide an updated numbered list of 5-8 recommendations.`,

	recommendation: (artistName: string, userTasteTags: string) =>
		`Based on someone who likes ${userTasteTags}, suggest 5 artists similar to "${artistName}". Return only artist names, one per line, no numbering or descriptions.`
};
