import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: [
      "https://codeengine-wss0.onrender.com",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

const JUDGE0_URL = process.env.JUDGE0_URL;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/run", async (req, res) => {
  const { language, code, input } = req.body;

  let langId;

  if (language === "cpp") {
    langId = 54;
  } else if (language === "java") {
    langId = 62;
  } else if (language === "python") {
    langId = 71;
  } else {
    return res.status(400).json({
      error: "Unsupported language",
    });
  }

  try {
    const response = await axios.post(
      `${JUDGE0_URL}?base64_encoded=false&wait=true`,
      {
        source_code: code,
        stdin: input,
        language_id: langId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          "X-RapidAPI-Key": RAPIDAPI_KEY,
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Execution Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Execution failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
