const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const OWNER = import.meta.env.VITE_GITHUB_OWNER;
const REPO  = import.meta.env.VITE_GITHUB_REPO;
const FILE  = "data.json";
const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/vnd.github+json",
};

export async function loadData() {
  const res = await fetch(API, { headers });
  if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
  const json = await res.json();
  // atob gives raw bytes as Latin-1; TextDecoder interprets them as UTF-8 correctly
  const bytes   = Uint8Array.from(atob(json.content.replace(/\n/g, "")), c => c.charCodeAt(0));
  const decoded = JSON.parse(new TextDecoder().decode(bytes));
  return { data: decoded, sha: json.sha };
}

export async function saveData(data, sha) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const res = await fetch(API, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "update data",
      content,
      sha,
    }),
  });
  if (!res.ok) throw new Error(`Failed to save data: ${res.status}`);
  const json = await res.json();
  return json.content.sha;
}