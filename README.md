# WebRAG: A RAG-based Web Question Answering System

This project implements a Retrieval-Augmented Generation (RAG) pipeline using the LangChain framework and Google Generative AI models. It allows users to input a URL and a question, automatically scrapes the webpage, embeds the content into a vector store, and generates an answer to the question based strictly on the provided context.

## Features

* Scrapes structured content from web pages using Playwright and Cheerio.
* Splits the content into manageable chunks for embedding.
* Uses Google Generative AI Embeddings for semantic search.
* Maintains a memory vector store to enhance retrieval accuracy.
* Provides controlled and explainable responses using Gemini Flash.
* Stores conversation history and context memory in a database (Prisma + SQLite/Postgres).
* Enforces strict system instructions to prevent hallucination or off-topic responses.

## Project Structure

* `rag1.js`: Core logic of the RAG pipeline.
* `api1.js`: Simple API interface to trigger the RAG pipeline.
* `index1.html`: Basic front-end interface to interact with the system.
* `package.json` and `package-lock.json`: Dependency definitions and versions.

## How It Works

1. **Scraping**
   The URL provided by the user is validated and scraped using PlaywrightWebBaseLoader. Cheerio extracts the main content area from the page.

2. **Text Splitting**
   The raw text is split into overlapping chunks using RecursiveCharacterTextSplitter to create semantically coherent documents.

3. **Embedding and Storage**
   Each document chunk is embedded using GoogleGenerativeAIEmbeddings and stored in a MemoryVectorStore for fast similarity search.

4. **Retrieval and Prompt Construction**
   Relevant chunks are retrieved based on the user’s question. A detailed prompt is constructed that includes:

   * The retrieved context
   * Summarized memory context
   * Recent conversation history

5. **Answer Generation**
   Gemini Flash is instructed via a system prompt to answer strictly using the given contexts, with reasoning steps shown when necessary.

6. **Persistence**

   * Each chat interaction is stored in `chatHistory` table.
   * Context summaries are stored in `contextMemory` table, maintaining up to the 5 most recent entries.

## Setup Instructions

1. Clone the repository:

```bash
git clone git@github.com:asmijit/web_Scraper_RAG.git
cd web_Scraper_RAG
```

2. Install dependencies:

```bash
npm install
```

3. Setup Prisma (example using SQLite):

```bash
npx prisma init
npx prisma migrate dev --name init
```

4. Configure your Google API key in `rag1.js`:

```javascript
const apiKey = "YOUR_API_KEY_HERE";
```

5. Run the API server:

```bash
node api1.js
```

6. Open `index1.html` in your browser to use the interface.

## Notes

* The assistant follows a strict system instruction to avoid hallucination and to only rely on available context.
* If no relevant information is found in the retrieved context, the system will explicitly respond with:
  *"Sorry, this question cannot be answered from the given context."*

## Future Improvements

* Implement persistent vector storage using a scalable database (e.g., Pinecone, Weaviate).
* Add multi-page crawling support.
* Improve front-end UI and add session tracking.
* Integrate feedback loop to improve memory summaries.

## License

This project is provided under the MIT License.
