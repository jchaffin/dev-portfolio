import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/projects/featured — returns featured projects from DB for the carousel */
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: { featured: true },
      orderBy: { updatedAt: 'desc' },
      include: { sources: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json(projects);
  } catch (e) {
    console.error('Featured projects error:', e);
    return NextResponse.json({ error: 'Failed to fetch featured projects' }, { status: 500 });
  }
}
