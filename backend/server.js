// ~/VerbumTechnologies/voronoi1/backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings, ChatOpenAI } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

// Load environment variables
dotenv.config();

// Import routes
const embeddingsRoutes = require('./routes/embeddings');
const documentsRoutes = require('./routes/documents');
const qaRoutes = require('./routes/qa');

const app = express();
const PORT = process.env.PORT || 5001; // Changed from 5000 to 5001

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com' 
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// Initialize OpenAI components
let embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
  stripNewLines: true
});

let model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo",
  temperature: 0
});

// Middleware to extract OpenAI API key from Authorization header
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.split(' ')[1];
    // Override the environment variable for this request
    process.env.OPENAI_API_KEY = apiKey;
    
    // Reinitialize OpenAI components with the new API key
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: "text-embedding-3-small",
      stripNewLines: true
    });

    model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "gpt-3.5-turbo",
      temperature: 0
    });
  }
  next();
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

// Test connections endpoint
app.get('/api/test-connections', async (req, res) => {
  try {
    const results = {
      openai: { success: false, error: null },
      pinecone: { success: false, error: null }
    };

    // Test OpenAI
    try {
      // Test both embeddings and chat model
      await Promise.all([
        embeddings.embedQuery("test"),
        model.call([
          new SystemMessage("You are a helpful assistant."),
          new HumanMessage("Say 'test successful'")
        ])
      ]);
      results.openai.success = true;
    } catch (error) {
      results.openai.error = error.message;
      console.error('OpenAI test failed:', error);
    }

    // Test Pinecone
    try {
      const index = pinecone.index(process.env.PINECONE_INDEX);
      await index.describeIndexStats();
      results.pinecone.success = true;
    } catch (error) {
      results.pinecone.error = error.message;
      console.error('Pinecone test failed:', error);
    }

    // Overall success if both services are working
    const success = results.openai.success && results.pinecone.success;
    
    res.json({ 
      success,
      results,
      message: success ? "All connections working" : "Some connections failed"
    });
  } catch (error) {
    console.error("Connection test failed:", error);
    res.status(500).json({ 
      success: false, 
      message: "Connection test failed", 
      error: error.message 
    });
  }
});

// Process document endpoint
app.post('/api/process-document', async (req, res) => {
  try {
    const { rawDocument, documentId } = req.body;
    
    if (!rawDocument || !documentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: rawDocument or documentId"
      });
    }

    console.log(`Processing document ${documentId} with length ${rawDocument.length}`);
    
    // Split into chunks
    const chunks = await textSplitter.createDocuments([rawDocument], [{ documentId }]);
    console.log(`Created ${chunks.length} chunks`);
    
    // Generate embeddings for each chunk
    console.log('Generating embeddings...');
    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => {
        try {
          const embedding = await embeddings.embedQuery(chunk.pageContent);
          // Truncate the embedding to match Pinecone index dimensions (1024)
          const truncatedEmbedding = embedding.slice(0, 1024);
          console.log(`Original embedding length: ${embedding.length}, truncated to: ${truncatedEmbedding.length}`);
          
          return {
            id: `${documentId}-${i}`,
            values: truncatedEmbedding,
            metadata: {
              text: chunk.pageContent,
              documentId,
              chunkIndex: i
            }
          };
        } catch (error) {
          console.error(`Error generating embedding for chunk ${i}:`, error);
          throw error;
        }
      })
    );
    console.log(`Generated ${vectors.length} embeddings`);

    // Store vectors in Pinecone
    console.log('Storing vectors in Pinecone...');
    const index = pinecone.index(process.env.PINECONE_INDEX);
    
    // Format vectors for Pinecone upsert
    const pineconeVectors = vectors.map(vector => ({
      id: vector.id,
      values: vector.values,
      metadata: vector.metadata
    }));
    
    console.log(`Upserting ${pineconeVectors.length} vectors to Pinecone`);
    await index.upsert(pineconeVectors);
    console.log('Vectors stored successfully');

    res.json({
      success: true,
      processedChunks: chunks.length,
      vectorsStored: vectors.length
    });
  } catch (error) {
    console.error("Document processing failed:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process document", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Query document endpoint
app.post('/api/query-document', async (req, res) => {
  try {
    const { question, documentId } = req.body;
    
    console.log(`Querying document ${documentId} with question: ${question}`);
    
    // Generate embedding for the question
    const queryEmbedding = await embeddings.embedQuery(question);
    // Truncate the query embedding to match Pinecone index dimensions (1024)
    const truncatedQueryEmbedding = queryEmbedding.slice(0, 1024);
    console.log(`Query embedding truncated from ${queryEmbedding.length} to ${truncatedQueryEmbedding.length} dimensions`);
    
    // Query Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX);
    
    // Query without namespace to debug
    console.log('Querying Pinecone...');
    const queryResponse = await index.query({
      vector: truncatedQueryEmbedding,
      topK: 3,
      includeMetadata: true
    });
    
    console.log(`Query returned ${queryResponse.matches.length} matches`);

    // Get the relevant chunks
    const relevantChunks = queryResponse.matches.length > 0 
      ? queryResponse.matches.map(match => match.metadata.text).join("\n\n")
      : "No relevant context found for this question.";
    
    // Generate answer using OpenAI
    const answer = await model.call([
      new SystemMessage("You are a helpful assistant that answers questions based on the provided context."),
      new HumanMessage(`Based on the following context, answer this question: "${question}"\n\nContext:\n${relevantChunks}`)
    ]);

    res.json({
      success: true,
      answer: answer.content
    });
  } catch (error) {
    console.error("Query failed:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to query document", 
      error: error.message 
    });
  }
});

// Delete document endpoint
app.delete('/api/delete-document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Delete vectors from Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX);
    
    // Filter by document ID instead of namespace
    const deleteFilter = {
      filter: {
        documentId: documentId
      }
    };
    
    console.log(`Deleting vectors for document ${documentId}`);
    await index.deleteMany(deleteFilter);
    console.log(`Document ${documentId} vectors deleted successfully`);

    res.json({
      success: true,
      message: `Document ${documentId} deleted successfully`
    });
  } catch (error) {
    console.error("Document deletion failed:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete document", 
      error: error.message 
    });
  }
});

// API routes
app.use('/api/embeddings', embeddingsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ask', qaRoutes);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});