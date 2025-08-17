import { NextResponse } from "next/server";
import { envConfig } from "@/lib/envConfig";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  envConfig();
  try {
    const { GITHUB_USERNAME, GITHUB_TOKEN } = process.env;

    if (!GITHUB_USERNAME) {
      return NextResponse.json(
        { error: "GITHUB_USERNAME environment variable is not set" },
        { status: 500 },
      );
    }

    const githubRes = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=pushed&per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${GITHUB_TOKEN || ""}`, // Optional for higher rate limit
        },
      },
    );

    if (!githubRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from GitHub" },
        { status: 500 },
      );
    }

    const repos = await githubRes.json();
    return NextResponse.json(repos);
  } catch {
    return Response.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
