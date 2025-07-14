import { NextResponse } from 'next/server'

interface Project {
  id: number
  title: string
  description: string
  tech: string[]
  github: string
  live: string
  featured: boolean
  category: string
  image?: string
}

const projects: Project[] = [
  {
    id: 1,
    title: 'E-commerce Platform',
    description: 'Full-stack e-commerce solution with payment integration, inventory management, and admin dashboard.',
    tech: ['Next.js', 'Prisma', 'PostgreSQL', 'Stripe', 'Tailwind'],
    github: 'https://github.com/yourusername/ecommerce',
    live: 'https://ecommerce-demo.vercel.app',
    featured: true,
    category: 'fullstack',
    image: '/images/ecommerce-preview.jpg'
  },
  {
    id: 2,
    title: 'Real-time Chat Application',
    description: 'WebSocket-based chat app with rooms, file sharing, and message encryption.',
    tech: ['React', 'Socket.io', 'Express', 'MongoDB', 'JWT'],
    github: 'https://github.com/yourusername/chat-app',
    live: 'https://chat-app-demo.vercel.app',
    featured: true,
    category: 'fullstack',
    image: '/images/chat-preview.jpg'
  },
  {
    id: 3,
    title: 'Task Management API',
    description: 'RESTful API with authentication, CRUD operations, and comprehensive testing.',
    tech: ['Node.js', 'Express', 'PostgreSQL', 'Jest', 'Swagger'],
    github: 'https://github.com/yourusername/task-api',
    live: 'https://task-api-docs.vercel.app',
    featured: false,
    category: 'backend',
    image: '/images/api-preview.jpg'
  },
  {
    id: 4,
    title: 'Weather Dashboard',
    description: 'Dynamic weather app with location services, forecasts, and data visualization.',
    tech: ['React', 'Chart.js', 'OpenWeather API', 'Geolocation'],
    github: 'https://github.com/yourusername/weather-dashboard',
    live: 'https://weather-dashboard-demo.vercel.app',
    featured: false,
    category: 'frontend',
    image: '/images/weather-preview.jpg'
  },
  {
    id: 5,
    title: 'Blog CMS',
    description: 'Content management system with markdown support, SEO optimization, and analytics.',
    tech: ['Next.js', 'MDX', 'Prisma', 'NextAuth', 'Vercel'],
    github: 'https://github.com/yourusername/blog-cms',
    live: 'https://blog-cms-demo.vercel.app',
    featured: false,
    category: 'fullstack',
    image: '/images/blog-preview.jpg'
  }
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const featured = searchParams.get('featured')

  let filteredProjects = projects

  if (category && category !== 'all') {
    filteredProjects = filteredProjects.filter(project => 
      project.category === category
    )
  }

  if (featured === 'true') {
    filteredProjects = filteredProjects.filter(project => 
      project.featured === true
    )
  }

  return NextResponse.json({
    projects: filteredProjects,
    total: filteredProjects.length
  })
}

export async function POST(request: Request) {
  try {
    const projectData = await request.json()
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'tech', 'github', 'category']
    for (const field of requiredFields) {
      if (!projectData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // In a real app, you'd save to a database
    const newProject: Project = {
      id: projects.length + 1,
      title: projectData.title,
      description: projectData.description,
      tech: projectData.tech,
      github: projectData.github,
      live: projectData.live || '',
      featured: projectData.featured || false,
      category: projectData.category,
      image: projectData.image || ''
    }

    projects.push(newProject)

    return NextResponse.json(
      { message: 'Project created successfully', project: newProject },
      { status: 201 }
    )
  } catch (error) {
    console.error('Project creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}