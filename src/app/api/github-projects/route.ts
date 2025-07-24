import { NextResponse } from 'next/server'


export async function GET() {
  try {
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'jchaffin';
    const githubRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=pushed&per_page=100`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` // Optional for higher rate limit
      }
    });
    
    if (!githubRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch from GitHub' }, { status: 500 });
    }
    
    const repos = await githubRes.json();
    return NextResponse.json(repos);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 