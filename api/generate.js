import { GoogleGenAI, Modality } from "@google/genai";

// GoogleGenAI 인스턴스 생성 (환경변수에서 API 키 가져옴)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


// 프롬프트를 기반으로 텍스트와 이미지를 생성하는 함수
async function generate(prompt) {
  // 프롬프트를 모델 입력 형식에 맞게 배열로 구성
  const contents = [{ text: prompt }]; 

  // GenAI 모델 호출 -> 텍스트와 이미지를 동시 요청
  const response = await ai.models.generateContent({
    // 사용 모델
    model: "gemini-2.0-flash-exp-image-generation", 
    // 입력 데이터
    contents, 
    config: {
      // 텍스트와 이미지 응답 요청
      responseModalities: [Modality.TEXT, Modality.IMAGE], 
    },
  });

  // 모델의 응답에서 이미지(Base64) 데이터 추출
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      // 이미지가 포함되어 있으면 Base64 반환
      return part.inlineData.data; 
    }
  }

  // 이미지가 생성되지 않았을 경우 에러 발생
  throw new Error("No Image generated.");
}

// API 핸들러 함수 (Vercel serverless 함수용)
export default async function handler(req, res) {
  // POST 요청이 아닌 경우 405 에러 반환
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 요청 본문에서 프롬프트 추출
  const { prompt } = req.body; 

  try {
    // 함수 호출로 이미지 생성 시도
    const resultImageBase64 = await generate(prompt); 
    // 성공 시 결과 반환
    res.status(200).json({ imageBase64: resultImageBase64 }); 
  } catch (err) {
    // 콘솔에 에러 출력
    console.error("Image generation error:", err); 
    // 서버 에러 응답
    res.status(500).json({ error: err.message }); 
  }
}