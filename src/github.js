// src/github.js
// Fetch a GitHub Pull Request and turn it into a reviewable text document.

const GITHUB_API = 'https://api.github.com'

function parsePrUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!match) {
    throw new Error('Not a valid GitHub PR URL (expected .../owner/repo/pull/123)')
  }
  return { owner: match[1], repo: match[2], number: match[3] }
}

async function gh(path, { raw = false } = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: raw ? 'application/vnd.github.v3.diff' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'teardown-pr-reviewer',
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
  }
  return raw ? res.text() : res.json()
}

export async function fetchPrAsDocument(prUrl) {
  const { owner, repo, number } = parsePrUrl(prUrl)

  const pr = await gh(`/repos/${owner}/${repo}/pulls/${number}`)
  let diff = await gh(`/repos/${owner}/${repo}/pulls/${number}`, { raw: true })

  const MAX_DIFF_CHARS = 12000
  let truncatedNote = ''
  if (diff.length > MAX_DIFF_CHARS) {
    diff = diff.slice(0, MAX_DIFF_CHARS)
    truncatedNote = '\n\n[diff truncated for length]'
  }

  const document = `Pull Request: ${pr.title}

Author: ${pr.user?.login ?? 'unknown'}
Repository: ${owner}/${repo}
Changes: +${pr.additions} / -${pr.deletions} across ${pr.changed_files} files

--- DESCRIPTION ---
${pr.body || '(no description provided)'}

--- CODE DIFF ---
${diff}${truncatedNote}`

  return { title: pr.title, document }
}
