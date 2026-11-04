import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const repoSchema = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Use owner/repository format");

export async function GET(request: NextRequest) {
  const parsed = repoSchema.safeParse(request.nextUrl.searchParams.get("repo"));
  if (!parsed.success) return NextResponse.json({ error: "A public repository must use owner/repository format." }, { status: 400 });
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "Kernova-local-demo" };
  try {
    const [repositoryResponse, commitsResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${parsed.data}`, { headers, next: { revalidate: 60 } }),
      fetch(`https://api.github.com/repos/${parsed.data}/commits?per_page=3`, { headers, next: { revalidate: 60 } }),
    ]);
    if (!repositoryResponse.ok || !commitsResponse.ok) return NextResponse.json({ error: "GitHub could not provide this public repository." }, { status: repositoryResponse.status === 404 ? 404 : 502 });
    const repository: unknown = await repositoryResponse.json(); const commits: unknown = await commitsResponse.json();
    const repositoryData = z.object({ full_name: z.string(), description: z.string().nullable(), open_issues_count: z.number().int().nonnegative() }).parse(repository);
    const commitData = z.array(z.object({ sha: z.string(), commit: z.object({ message: z.string() }) })).parse(commits);
    return NextResponse.json({ repo: repositoryData.full_name, description: repositoryData.description, issues: repositoryData.open_issues_count, commits: commitData.map(item => ({ sha: item.sha, message: item.commit.message.split("\n")[0] })) });
  } catch {
    return NextResponse.json({ error: "GitHub lookup is temporarily unavailable." }, { status: 502 });
  }
}
