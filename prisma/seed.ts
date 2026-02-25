import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRESQL_URI ?? process.env.POSTGRES_URL;
if (!connectionString) throw new Error('DATABASE_URL, POSTGRESQL_URI, or POSTGRES_URL required');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type ResumeProject = {
  name: string;
  description?: string;
  website?: string;
  github?: string;
  images?: string;
  keywords?: string[];
  knowledgeCompany?: string;
  additionalSourceUrls?: string[];
};

function keyFromImages(images: string | undefined): string | null {
  if (!images) return null;
  const m = String(images).match(/\/projects\/([^/]+)/);
  return m ? m[1] : null;
}

function repoFromGithubUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!/github\.com$/i.test(u.hostname)) return null;
    const path = u.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    return path.length >= 2 ? `${path[0]}/${path[1]}` : null;
  } catch {
    return null;
  }
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const resume = require('../src/data/resume.json') as { projects?: ResumeProject[] };
  const projects = resume.projects ?? [];
  if (projects.length === 0) {
    console.log('No projects in resume.json');
    return;
  }

  for (const p of projects) {
    const key = keyFromImages(p.images);
    if (!key) {
      console.warn('Skip project (no key from images):', p.name);
      continue;
    }
    const project = await prisma.project.upsert({
      where: { key },
      create: {
        key,
        name: p.name,
        description: p.description ?? null,
        website: p.website ?? null,
        github: p.github ?? null,
        imagesPath: p.images ?? null,
        keywords: Array.isArray(p.keywords) ? p.keywords : [],
        featured: true,
        ...(Array.isArray(p.additionalSourceUrls) && {
          additionalSourceUrls: p.additionalSourceUrls.filter((u): u is string => typeof u === 'string' && u.startsWith('http')),
        }),
      } as Parameters<typeof prisma.project.upsert>[0]['create'],
      update: {
        name: p.name,
        description: p.description ?? null,
        website: p.website ?? null,
        github: p.github ?? null,
        imagesPath: p.images ?? null,
        keywords: Array.isArray(p.keywords) ? p.keywords : [],
        featured: true,
        ...(Array.isArray(p.additionalSourceUrls) && {
          additionalSourceUrls: p.additionalSourceUrls.filter((u): u is string => typeof u === 'string' && u.startsWith('http')),
        }),
      } as Parameters<typeof prisma.project.upsert>[0]['update'],
    });

    const existingSources = await prisma.projectSource.findMany({ where: { projectId: project.id } });

    if (p.knowledgeCompany && !existingSources.some((s) => s.type === 'KNOWLEDGE')) {
      await prisma.projectSource.create({
        data: {
          projectId: project.id,
          type: 'KNOWLEDGE',
          company: p.knowledgeCompany,
          sortOrder: 0,
        },
      });
    }
    const repo = p.github ? repoFromGithubUrl(p.github) : null;
    if (repo && !existingSources.some((s) => s.type === 'GITHUB' && s.repo === repo)) {
      await prisma.projectSource.create({
        data: {
          projectId: project.id,
          type: 'GITHUB',
          repo,
          sortOrder: 1,
        },
      });
    }
    // RAG source for deep-dive: Pinecone/gh-rag for these 4 featured projects only
    if (repo && !existingSources.some((s) => s.type === 'RAG' && s.repo === repo)) {
      await prisma.projectSource.create({
        data: {
          projectId: project.id,
          type: 'RAG',
          repo,
          sortOrder: 2,
        },
      });
    }
  }

  console.log('Seeded', projects.length, 'projects');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
