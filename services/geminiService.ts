
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async optimizeRarity(traits: { name: string; currentRarity: number }[]) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Balance the rarity percentages for these car parts to create a professional distribution (Legendary, Rare, Common). 
                 Parts: ${JSON.stringify(traits)}. 
                 Return ONLY a JSON array of objects with 'name' and 'optimizedRarity' such that they sum exactly to 100.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              optimizedRarity: { type: Type.NUMBER }
            },
            required: ["name", "optimizedRarity"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text?.trim() || '[]');
    } catch (e) {
      console.error("Failed to parse rarity optimization", e);
      return traits.map(t => ({ name: t.name, optimizedRarity: t.currentRarity }));
    }
  },

  async suggestThemeMetadata(traits: string[]) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بناءً على هذه القطع: ${traits.join(", ")}, اقترح اسماً جذاباً ووصفاً إبداعياً لأسطول سيارات مخصص باللغة العربية. تأكد من أن يكون الاسم والوصف فخمين ومناسبين لورشة سيارات احترافية.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "description"]
        }
      }
    });
    return JSON.parse(response.text?.trim() || '{}');
  }
};
