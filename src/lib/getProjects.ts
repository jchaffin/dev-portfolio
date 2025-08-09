export type Project = {
  title: string;
  description: string;
  tech: string[];
  github: string;
  live: string;
};

interface GitHubRepo {
  pushed_at: string;
  name: string;
  description: string | null;
  html_url: string;
  topics: string[];
  stargazers_count: number;
  language: string | null;
  vercel_deployment?: {
    url: string;
  };
  homepage?: string;
}

export async function getProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects', {
    // cache: 'no-store' // Uncomment if you want to always fetch fresh
  });
  if (!res.ok) return [];
  const repos = await res.json();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return repos
    .filter((repo: GitHubRepo) => new Date(repo.pushed_at) > oneYearAgo)
    .sort((a: GitHubRepo, b: GitHubRepo) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .map((repo: GitHubRepo): Project => ({
      title: repo.name,
      description: repo.description || '',
      tech: Array.isArray(repo.topics) ? repo.topics : [],
      github: repo.html_url,
      live: repo.vercel_deployment?.url || repo.homepage || '',
    }));
} 