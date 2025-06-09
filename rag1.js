import { PlaywrightWebBaseLoader } from "@langchain/community/document_loaders/web/playwright";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const apiKey = "AIzaSyCV7Z5QzjAD5v7iNf6XdaQWkdZOm20eoYY";
const ai = new GoogleGenerativeAI(apiKey);
const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function summarizeContext(context) {
  return context.length > 500 ? context.slice(0, 500) + "..." : context;
}

export async function scrapeToText(url) {
  if (!validateUrl(url)) {
    throw new Error("Invalid URL provided.");
  }

  try {
    const loader = new PlaywrightWebBaseLoader(url);
    const docs = await loader.load();
    const $ = cheerio.load(docs[0].pageContent);
    const mainText = $("#mw-content-text").text() || $.text();
    return mainText.trim();
  } catch (err) {
    console.error("Scraping failed:", err);
    throw new Error("Failed to scrape the webpage.");
  }
}

export async function splitText(rawText) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  return await textSplitter.createDocuments([rawText]);
}

export async function storeAndSearch(splits, question) {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: "text-embedding-004",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Document title",
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings);
  const results = await vectorStore.similaritySearch(question);
  return results || [];
}

export async function buildPrompt(searches, question) {
  const currentContext = searches.map((doc) => doc.pageContent).join("\n\n");

  const memoryChunks = await prisma.contextMemory.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const memoryContext = memoryChunks.map((s, i) => `Memory #${i + 1}:\n${s.summary}`).join("\n\n");

  const chats = await prisma.chatHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const historyText = chats.map(({ userInput, botReply }) => `User: ${userInput}\nBot: ${botReply}`).reverse().join("\n");

  const prompt = ` You're an helpful assistant. You answer the question from the given context only and must do mathematical calculations
  to answer those questions that require mathematics.

Scraped context:
${currentContext || "[None]"}

Summarized memory context:
${memoryContext || "[None]"}

Conversation history:
${historyText || "[None]"}

New user question:
${question}`.trim();

  return { prompt, context: currentContext, memoryContext, historyText };
}

export async function generateAnswer(prompt, context, question, memoryContext, historyText) {
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: `
You are an AI assistant that strictly answers based on the given context. If the answer cannot be derived directly from the provided context, respond with: 'I do not have enough information to answer that. When applying reasoning, show the steps briefly in the reply, show your chain of thought.


Scraped context:
${context || "[None]"}

Summarized memory context:
${memoryContext || "[None]"}

Conversation history:
${historyText || "[None]"}
`.trim(),
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });

    const text = await result.response.text();

    await prisma.chatHistory.create({
      data: { userInput: question, botReply: text },
    });

    const summary = summarizeContext(context);
    await prisma.contextMemory.create({ data: { summary } });

    const all = await prisma.contextMemory.findMany({ orderBy: { createdAt: "desc" } });
    if (all.length > 5) {
      const toDelete = all.slice(5);
      await prisma.contextMemory.deleteMany({ where: { id: { in: toDelete.map(e => e.id) } } });
    }

    return text;
  } catch (err) {
    console.error("Gemini generation failed:", err);
    return "An error occurred while generating the answer.";
  }
}

export async function answerFromWeb(url, question) {
  try {
    const rawText = await scrapeToText(url);
    const splits = await splitText(rawText);
    const searches = await storeAndSearch(splits, question);

    if (searches.length === 0) {
      return "Sorry, this question cannot be answered from the given context.";
    }

    const { prompt, context, memoryContext, historyText } = await buildPrompt(searches, question);
    const answer = await generateAnswer(prompt, context, question, memoryContext, historyText);
    return answer;
  } catch (err) {
    console.error("Pipeline failed:", err);
    return "An unexpected error occurred during the RAG pipeline.";
  }
}