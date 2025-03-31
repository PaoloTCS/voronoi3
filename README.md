# Voronoi3: Semantic Voronoi Tessellation Explorer

Voronoi3 is an enhanced version of the Semantic Voronoi Tessellation Explorer, building on the foundation of Voronoi2. This application creates interactive visualizations of knowledge domains based on semantic relationships.

## Features

- Interactive Voronoi diagram for visualizing knowledge domains
- Document management with semantic analysis
- Question answering based on uploaded documents
- Nested hierarchies of domains and subdomains
- Semantic relationship visualization between domains

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm
- OpenAI API key
- Pinecone account and API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/voronoi3.git
   cd voronoi3
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Create `.env.local` in the frontend directory
   - Create `.env` in the backend directory
   - Add your API keys and configuration

4. Start the application:
   ```
   npm start
   ```

## Usage

1. Begin by entering at least 3 domains/interests on the splash page
2. Navigate the Voronoi diagram by clicking on domains
3. Add subdomains to create hierarchical relationships
4. Upload documents to analyze within your domain context
5. Ask questions about your documents to get AI-powered answers

## Architecture

- Frontend: React.js
- Backend: Node.js with Express
- Vector Database: Pinecone
- Embeddings & AI: OpenAI

## Improvements in Voronoi3

- Enhanced document processing
- More robust error handling
- Improved vector embedding and retrieval
- Better CORS configuration
- Streamlined user interface

## License

This project is licensed under the MIT License - see the LICENSE file for details.