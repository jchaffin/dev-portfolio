export type Project = {
  title: string;
  description: string;
  tech: string[];
  github: string;
  live: string;
};

export async function getProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects', {
    // cache: 'no-store' // Uncomment if you want to always fetch fresh
  });
  if (!res.ok) return [];
  const repos = await res.json();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return repos
    .filter((repo: any) => new Date(repo.pushed_at) > oneYearAgo)
    .sort((a: any, b: any) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .map((repo: any): Project => ({
      title: repo.name,
      description: repo.description || '',
      tech: Array.isArray(repo.topics) ? repo.topics : [],
      github: repo.html_url,
      live: repo.vercel_deployment?.url || repo.homepage || '',
    }));
} 