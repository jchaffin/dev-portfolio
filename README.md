# Developer Portfolio with Voice AI

A modern, interactive developer portfolio built with Next.js 15, featuring advanced Voice AI capabilities powered by OpenAI's Realtime API and ElevenLabs voice synthesis.

## Features

### Core Portfolio
- **Responsive Design**: Modern, mobile-first design with smooth animations
- **Interactive Sections**: Hero, About, Skills, Projects, Resume, and Contact sections
- **Dark/Light Theme**: Toggle between themes with persistent preferences
- **Smooth Scrolling**: Navigation with scroll spy functionality
- **PDF Resume Viewer**: Integrated PDF viewer for resume display

### Voice AI Integration
- **Real-time Voice Conversations**: Interactive AI assistant using OpenAI's Realtime API
- **Voice Synthesis**: Natural-sounding voice responses via ElevenLabs
- **Multiple Codec Support**: Opus, PCM, and other audio codecs
- **Session Management**: Persistent conversation history and session handling
- **Audio Recording**: Built-in audio recording and download capabilities
- **Transcript Display**: Real-time conversation transcript with markdown support

### Technical Features
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Utility-first styling with custom design system
- **Motion Animations**: Smooth page transitions and micro-interactions
- **API Integration**: GitHub projects, contact form, and external services
- **Environment Configuration**: Secure API key management

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Motion** - Animation library
- **Lucide React** - Icon library

### Voice AI & APIs
- **OpenAI Realtime API** - Real-time voice conversations
- **ElevenLabs** - Voice synthesis and cloning
- **OpenAI Agents** - AI agent framework

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Vercel** - Deployment platform

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dev-portfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key_here
   
   # ElevenLabs
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   
   # GitHub (optional)
   GITHUB_TOKEN=your_github_token_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server with Turbo
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run dev:webpack` - Start development server with webpack

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── agentConfigs/      # AI agent configurations
│   ├── api/              # API routes
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   └── ...              # Section components
├── contexts/            # React contexts
├── data/               # Portfolio data
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── types/              # TypeScript type definitions
```

## Key Components

### Voice AI Section
The portfolio features an interactive Voice AI section that allows visitors to:
- Have real-time voice conversations with an AI assistant
- Ask questions about the developer's experience and projects
- Get natural voice responses synthesized by ElevenLabs
- View conversation transcripts in real-time

### Portfolio Sections
- **Hero Section**: Animated introduction with gradient text effects
- **About Section**: Professional background and expertise
- **Skills Section**: Interactive skill visualization with categories
- **Projects Section**: Featured projects with GitHub integration
- **Resume Section**: PDF viewer with downloadable resume
- **Contact Section**: Contact form with email integration

## Deployment

This project is optimized for deployment on Vercel:

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on push to main branch

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [OpenAI](https://openai.com/) for the Realtime API
- [ElevenLabs](https://elevenlabs.io/) for voice synthesis
- [Tailwind CSS](https://tailwindcss.com/) for the styling framework
- [Vercel](https://vercel.com/) for hosting and deployment

---

Built with Next.js and modern web technologies.
