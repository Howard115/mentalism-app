const express = require("express");
const cors = require("cors");
const { GoogleGenAI, Type, Schema } = require("@google/genai");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(".")); // Serve the index.html from current directory

// Initialize Gemini Client
// Requires GEMINI_API_KEY to be set in .env
const ai = new GoogleGenAI({});

app.post("/api/predict", async (req, res) => {
  try {
    const { history } = req.body;

    if (!history) {
      return res.status(400).json({ error: "History is required" });
    }

    const systemInstruction = `你是一個隱藏的專業魔術助手，負責在心靈魔術（Mentalism）中即時推斷觀眾的心思。
魔術師與觀眾正在對話，魔術師請觀眾自由想像或說出一個物品、人物或地點。
最後，魔術師會說出關鍵句（例如：「我的手機一直放在這邊沒有動」或「停止」）來結束流程。

你的任務是分析這段語音辨識紀錄，並精準找出觀眾最終決定的事物。

【推理邏輯與規則】
1. 鎖定關鍵範圍：觀眾最終的決定，通常發生在魔術師說出關鍵句的「前 2 到 3 句話」之中。請忽略早期對話中途改變主意或猶豫的部分。
2. 語音糾錯：這是語音辨識轉錄的文字，可能會有同音錯字（例如：「百事可樂」變成「白事可樂」）。請運用常理想像觀眾實際上說的是什麼。
3. 轉換為圖片搜尋關鍵字：為了讓預言效果更驚豔，請將觀眾決定的答案，轉換為「同義詞」或「高度相關、能在 Google 圖片搜出精準結果的字詞」。
   - 範例 A：觀眾說「哈士奇」 -> 搜尋關鍵字可轉為「Husky Dog」或「西伯利亞雪橇犬」。
   - 範例 B：觀眾說「鋼鐵人」 -> 搜尋關鍵字可轉為「Iron Man」。
   - 範例 C：觀眾說「蘋果」 -> 若對話語境是水果，可轉為「Red Apple」；若是手機，可轉為「iPhone」。`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        spectator_said: {
          type: Type.STRING,
          description: "你推斷觀眾實際說出口的原始詞彙",
        },
        reasoning: {
          type: Type.STRING,
          description: "簡短的推理過程(1句話)",
        },
        search_keyword: {
          type: Type.STRING,
          description: "最終用於 Google 圖片搜尋的精準/同義關鍵字",
        },
      },
      required: ["spectator_said", "reasoning", "search_keyword"],
    };

    const prompt = `以下是剛才的語音對話紀錄：\n「${history}」\n\n請給出 JSON 結果。`;
    console.log("\n=== LLM Input ===");
    console.log("Prompt: ", prompt);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for more deterministic output
      },
    });

    const resultText = response.text;
    console.log("\n=== LLM Output ===");
    console.log(resultText);
    console.log("==================\n");

    const resultJson = JSON.parse(resultText);

    res.json(resultJson);
  } catch (error) {
    console.error("Error during prediction:", error);
    res.status(500).json({ error: "Failed to process prediction" });
  }
});

app.listen(port, () => {
  console.log(`Magic app backend listening at http://localhost:${port}`);
  console.log("Ensure you have created a .env file with GEMINI_API_KEY=your_key_here");
});
