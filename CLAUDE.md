# Voronoi2 Project Guidelines

## Build Commands
- Install dependencies: `npm run install:all`
- Start development: `npm start` (runs both backend and frontend)
- Frontend only: `cd frontend && npm start`
- Backend only: `cd backend && npm run dev`
- Build production: `npm run build`
- Run tests: `cd frontend && npm test`
- Run single test: `cd frontend && npm test -- -t "test name"`

## Code Style Guidelines
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Imports**: CommonJS in backend, ES modules in frontend
- **Components**: Functional with hooks, props destructured in parameters
- **Error Handling**: try/catch for async, errorHandler middleware in backend
- **State Management**: React Context API for shared state
- **Code Organization**: 
  - Backend: MVC pattern (controllers, models, routes)
  - Frontend: Components, context, utils, styles
- **Formatting**: 2-space indentation, semicolons required
- **Comments**: JSDoc style for functions, inline for complex logic

## Development Workflow
- Create feature branches from main
- Keep commits atomic and focused
- Use concise, descriptive commit messages