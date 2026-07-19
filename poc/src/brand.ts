const ACCENTS = ["#6C5CE7", "#00B894", "#0984E3", "#E17055", "#FD79A8", "#FDCB6E"];

export type Brand = {
  name: string;
  domain: string;
  accent: string;
};

export const brandFromUrl = (raw: string): Brand => {
  let hostname: string;
  try {
    hostname = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
  } catch {
    hostname = raw;
  }
  const domain = hostname.replace(/^www\./, "");
  const name = domain.split(".")[0] || "your startup";

  let hash = 0;
  for (const char of domain) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  const accent = ACCENTS[Math.abs(hash) % ACCENTS.length];

  return { name, domain, accent };
};
