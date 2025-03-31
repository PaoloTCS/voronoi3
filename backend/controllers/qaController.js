// ~/VerbumTechnologies/voronoi1/backend/controllers/qaController.js
exports.askQuestion = async (req, res) => {
  try {
    const { question, documents } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'No documents provided' });
    }
    
    // This is a mock implementation that simulates document analysis
    // In a real implementation, we'd use LangChain and OpenAI
    
    // Generate a simple response based on the question and documents
    let answer = `I've analyzed your ${documents.length} document(s) regarding "${question}".`;
    
    // Look for keywords in the documents that match the question
    const keywords = question.toLowerCase().split(' ');
    const relevantPhrases = [];
    
    documents.forEach(doc => {
      const content = doc.toLowerCase();
      keywords.forEach(keyword => {
        if (keyword.length > 3 && content.includes(keyword)) {
          // Find sentences containing keywords
          const sentences = content.split(/[.!?]+/);
          sentences.forEach(sentence => {
            if (sentence.includes(keyword) && sentence.length > 10) {
              const cleanSentence = sentence.trim();
              if (cleanSentence && !relevantPhrases.includes(cleanSentence)) {
                relevantPhrases.push(cleanSentence);
              }
            }
          });
        }
      });
    });
    
    if (relevantPhrases.length > 0) {
      // Pick a random relevant phrase to include
      const randomPhrase = relevantPhrases[Math.floor(Math.random() * relevantPhrases.length)];
      answer += ` I found information related to your question: "${randomPhrase}..."`;
      answer += ` Based on the content, I can tell you that this relates to ${keywords.filter(k => k.length > 3).join(', ')}.`;
    } else {
      answer += " I couldn't find specific information directly related to your question in these documents.";
    }
    
    res.json({ answer });
  } catch (error) {
    console.error('Error in Q&A process:', error);
    res.status(500).json({
      error: 'Error processing question',
      message: error.message
    });
  }
};