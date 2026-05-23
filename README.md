# ProfSidekick - AI Teaching Assistant MVP

ProfSidekick is an AI teaching assistant that allows teachers to upload presentations and deliver interactive voice-based lessons. The AI guides students through slides, explains content, and handles Q&A using OpenAI's Realtime API.

## Features

### Core MVP Functionality
- **Class Creation**: Upload presentations (PDF, PPT, PPTX) with basic class configuration
- **Interactive Teaching**: AI-powered voice assistant that teaches through your slides
- **Voice Navigation**: Students can ask the AI to navigate through slides
- **Real-time Interaction**: Voice-based Q&A with the AI teaching assistant

### Technical Implementation
- 2-page React application with clean, modern UI
- OpenAI Realtime API integration for voice interaction
- File upload processing with presentation content extraction
- Split-screen teaching interface (70% slides, 30% AI assistant)
- Basic backend integration for content processing

## Getting Started

### Prerequisites
- Node.js 18+ 
- OpenAI API key with Realtime API access
- Backend server running at localhost:8000 (see backend documentation)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd profsidekick
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.sample .env
```
Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

**Important**: Make sure your backend server is running at `http://localhost:8000` before using the application.

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating a Class

1. **Upload Presentation**: Drag and drop or select a PDF, PPT, or PPTX file
2. **Configure Class Details**:
   - Class Name (required)
   - Course Name (required) 
   - Course Code (required)
   - Description (optional)
   - Duration (30, 45, 60, or 90 minutes)
3. **Create Interactive Class**: Click to process and start teaching

### Teaching Interface

1. **Slide Viewer**: Left side shows the current slide with navigation controls
2. **AI Assistant**: Right side provides voice interaction with the teaching assistant
3. **Voice Controls**: 
   - Connect/Disconnect to start voice interaction
   - Start/Stop speaking to interact with the AI
   - Mute/unmute audio output
4. **Navigation**: Use Previous/Next buttons or ask the AI to navigate slides

## API Endpoints

### Backend Integration
ProfSidekick frontend connects to your backend server at `http://localhost:8000` for the following endpoints:

### Authentication
```
POST http://localhost:8000/api/auth/register
POST http://localhost:8000/api/auth/login  
GET http://localhost:8000/api/auth/verify
POST http://localhost:8000/api/auth/refresh
POST http://localhost:8000/api/auth/logout
```

### Class Creation
```
POST http://localhost:8000/api/sessions/create
```
Accepts multipart form data with presentation file and class details.
**Requires**: `Authorization: Bearer <jwt_token>`

### Session Management  
```
GET http://localhost:8000/api/session/ephemeral
```
Returns ephemeral token for OpenAI Realtime API connection.

```
GET http://localhost:8000/api/sessions
```
Returns paginated list of user's sessions with optional filtering.
**Requires**: `Authorization: Bearer <jwt_token>`
**Query Parameters**: `page`, `limit`, `status`, `sort`

```
GET http://localhost:8000/api/sessions/{sessionId}
```
Returns specific session details for authenticated user.
**Requires**: `Authorization: Bearer <jwt_token>`

```
GET http://localhost:8000/api/sessions/{sessionId}/runs
```
Returns list of teaching session runs for a specific session.
**Requires**: `Authorization: Bearer <jwt_token>`
**Response**: Array of session runs with feedback, duration, and status

### Slide Data
```
GET http://localhost:8000/api/sessions/{sessionId}/slides  
```
Returns slide data for a specific session.

## Architecture

### Frontend
- **Next.js 15** with React 19
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons

### AI Integration
- **OpenAI Realtime API** for voice interaction
- **WebRTC** for real-time audio communication
- **Custom function calling** for slide navigation

### State Management
- React Context for transcript and event management
- Local state for teaching interface
- Session-based class data storage

## MVP Limitations

This is an MVP focused on core functionality:

- Mock backend for file processing (production would need real presentation parsing)
- Basic error handling and validation
- No user authentication or session persistence
- Simplified UI without advanced features
- No analytics or usage tracking

## Development

### Project Structure
```
src/
├── app/
│   ├── api/                    # API endpoints
│   ├── components/             # React components
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utilities
│   ├── agentConfigs/          # AI agent configurations
│   └── types.ts               # TypeScript types
```

### Key Components
- `ClassCreation.tsx` - File upload and class configuration
- `TeachingInterface.tsx` - Split-screen teaching interface
- `App.tsx` - Main routing and state management

### Customization
- Modify `src/app/agentConfigs/teachingAssistant.ts` to change AI behavior
- Update presentation processing logic in `/api/classes/create`
- Customize UI styling in component files

## Deployment

```bash
npm run build
npm start
```

For production deployment, ensure:
- Environment variables are properly set
- OpenAI API key has Realtime API access
- File upload limits are configured appropriately

## Contributing

This is an MVP for concept validation. Future enhancements could include:
- Real presentation processing (PDF/PPT parsing)
- User authentication and session management
- Advanced slide navigation and annotations
- Analytics and learning insights
- Multi-language support
- Improved error handling and recovery

## License

MIT License - see LICENSE file for details
