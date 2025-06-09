import express from "express";
import cors from "cors";
import { answerFromWeb } from "./rag1.js";

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

let currentUrl = "";

// Utility to validate URLs
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid or missing URL." });
  }

  try {
    currentUrl = url;
    console.log(`✅ URL set for scraping: ${url}`);
    res.json({ message: "Scraping URL set successfully." });
  } catch (err) {
    console.error("❌ Error setting URL:", err);
    res.status(500).json({ error: "Failed to process URL." });
  }
});

app.post("/ask", async (req, res) => {
  const { question } = req.body;

  if (!currentUrl) {
    return res.status(400).json({ error: "No URL has been scraped yet." });
  }

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Invalid or missing question." });
  }

  try {
    console.log(`Received question: ${question}`);
    const answer = await answerFromWeb(currentUrl, question);
    res.json({ answer });
  } catch (err) {
    console.error("Answer generation failed:", err.message);
    res.status(500).json({ error: "Answer generation failed.", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`API is running on http://localhost:${PORT}`);
});
