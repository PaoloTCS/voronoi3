const arxivService = require('../services/arxivService');
const { HumanMessage } = require('@langchain/core/messages'); // Import HumanMessage

async function getArxivPapers(req, res) {
    try {
        // Get the model instance from the request object (attached by middleware)
        const model = req.model;
        if (!model) {
            // This should ideally not happen if middleware is set up correctly
            console.error('OpenAI model instance not found on request object.');
            return res.status(500).json({ message: 'Server configuration error: OpenAI model not available.'});
        }

        const { context, keywords, startDate, endDate, maxResults } = req.query;
        let searchKeywords = [];

        if (context) {
            console.log(`Generating keywords for context: "${context}"`);
            try {
                const prompt = new HumanMessage(
                    `Based on the research topic "${context}", generate ONLY the single most relevant keyword OR arXiv category (like cat:cs.AI) suitable for searching the arXiv database. Output ONLY the single term, with no introduction or explanation.`
                );
                const llmResponse = await model.call([prompt]);
                const generatedKeywordsRaw = llmResponse.content;

                console.log(`LLM raw response for keywords: "${generatedKeywordsRaw}"`);

                const generatedKeywords = generatedKeywordsRaw.split(',')
                                            .map(kw => kw.trim())
                                            .filter(kw => kw.length > 0);

                if (generatedKeywords.length === 0) {
                    console.warn('LLM did not return usable keywords for context:', context);
                    // Optional: Fallback to basic splitting if LLM fails?
                    // searchKeywords = context.split(/[>\s,]+/).map(kw => kw.trim()).filter(kw => kw.length > 0);
                } else {
                     searchKeywords = generatedKeywords;
                     console.log('Using LLM-generated keywords:', searchKeywords);
                }

            } catch (llmError) {
                console.error('Error calling LLM for keyword generation:', llmError);
                // Decide how to handle LLM errors: fail the request or fallback?
                // For now, let's return an error.
                return res.status(500).json({ message: 'Failed to generate search keywords using LLM.', error: llmError.message });
            }

            // If user also provided keywords, use them to refine (add them)
            if (keywords) {
                 const userKeywords = keywords.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
                 searchKeywords = [...new Set([...searchKeywords, ...userKeywords])]; // Combine and deduplicate
            }

        } else if (keywords) {
            // Fallback to using only user-provided keywords if no context
            searchKeywords = keywords.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
        } else {
            // Require either context or keywords
            return res.status(400).json({ message: 'Query parameter \'context\' or \'keywords\' is required.' });
        }

        if (searchKeywords.length === 0) {
             return res.status(400).json({ message: 'Could not derive valid keywords from context or input.' });
        }

        // Validate date formats if provided (YYYYMMDD)
        const dateRegex = /^\d{8}$/;
        if (startDate && !dateRegex.test(startDate)) {
            return res.status(400).json({ message: 'Invalid startDate format. Use YYYYMMDD.' });
        }
        if (endDate && !dateRegex.test(endDate)) {
            return res.status(400).json({ message: 'Invalid endDate format. Use YYYYMMDD.' });
        }

        const options = {
            keywords: searchKeywords,
            startDate,
            endDate,
            maxResults: maxResults ? parseInt(maxResults, 10) : undefined
        };

        console.log('Fetching papers with options:', options);
        const papers = await arxivService.fetchPapers(options);

        res.status(200).json(papers);
    } catch (error) {
        // Make sure LLM errors caught earlier don't fall through to the generic 500
        if (res.headersSent) return; // If response already sent (e.g., by LLM error handling), do nothing

        console.error('Error in getArxivPapers controller:', error);
        if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('derive valid keywords')) {
             res.status(400).json({ message: error.message });
        } else {
             // Avoid sending duplicate response if LLM error was already handled
             if (!error.message.includes('LLM')) { // Simple check
                res.status(500).json({ message: 'Failed to fetch papers from arXiv.', error: error.message });
             }
        }
    }
}

module.exports = {
    getArxivPapers
}; 