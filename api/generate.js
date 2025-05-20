import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generate(prompt) {
  const contents = [{ text: prompt }];

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  throw new Error("No Image generated.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { prompt } = req.body;

  try {
    const resultImageBase64 = await generate(prompt);
    res.status(200).json({ imageBase64: resultImageBase64 });
  } catch (err) {
    console.error("Image generation error:", err);
    res.status(500).json({ error: err.message });
  }
}
