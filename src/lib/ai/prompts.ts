/**
 * Centralized prompt templates for all AI features.
 *
 * Prompts are defined here so they can be tuned in one place.
 * Plans 04-06 will expand these as features are built.
 */

/**
 * Generate a 2-3 sentence genre/scene vibe description prompt.
 * Used by the genre detail page (Layer 3 AI content).
 * Temperature 0.6 — descriptive but not too creative.
 */
export function genreSummary(
	genreName: string,
	inceptionYear: number | null,
	originCity: string | null
): string {
	const context = [
		inceptionYear ? `emerged around ${inceptionYear}` : null,
		originCity ? `originating in ${originCity}` : null
	]
		.filter(Boolean)
		.join(', ');

	return `Write a 2-3 sentence description of the ${genreName} music genre/scene${context ? ` (${context})` : ''}.
Capture the vibe, sound, and cultural feeling. Write like a knowledgeable friend describing it, not like Wikipedia.
Be specific and evocative. Keep it punchy — people skim.`;
}

export const PROMPTS = {
	artistSummary: (artistName: string, tags: string, country: string) =>
		`Write a concise 2-3 sentence description of the musical artist "${artistName}". ${tags ? `Their music is tagged as: ${tags}.` : ''} ${country ? `They are from ${country}.` : ''} Focus on their sound, genre, and significance. Be factual — do not speculate or fabricate details you are unsure about.`,

	nlExplore: (query: string) =>
		`You are a knowledgeable music guide with deep expertise across all genres, eras, and scenes. The user is looking for music recommendations based on their query. Respond with a numbered list of 5-8 artist recommendations. For each entry, use this exact format: "N. **Artist Name** — Brief description of their sound and why they fit the query." Only recommend real artists that exist in music databases like MusicBrainz or Discogs. Be specific about sound rather than generic. User query: "${query}"`,

	nlRefine: (originalQuery: string, previousResults: string, refinement: string) =>
		`You are a knowledgeable music guide. The user originally asked: "${originalQuery}". You previously suggested:\n${previousResults}\n\nThe user wants to adjust these recommendations: "${refinement}". Provide an updated numbered list of 5-8 recommendations in the same format: "N. **Artist Name** — Brief description." Take the refinement seriously — shift the recommendations to match what the user is asking for while keeping the quality high. Only recommend real artists.`,

	nlExploreWithTaste: (query: string, tasteTags: string) =>
		`You are a knowledgeable music guide with deep expertise across all genres, eras, and scenes. The user tends to enjoy ${tasteTags}. Use this as background context but don't limit suggestions to these genres — the user may be exploring outside their comfort zone. Respond with a numbered list of 5-8 artist recommendations. For each entry, use this exact format: "N. **Artist Name** — Brief description of their sound and why they fit the query." Only recommend real artists that exist in music databases like MusicBrainz or Discogs. Be specific about sound rather than generic. User query: "${query}"`,

	recommendation: (artistName: string, userTasteTags: string) =>
		`Suggest 5 artists similar to "${artistName}" for someone whose taste includes: ${userTasteTags}. Return ONLY artist names, one per line. No numbering, no descriptions, no extra text. Focus on real artists that exist in music databases.`
};
