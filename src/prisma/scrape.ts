import * as cheerio from "cheerio";
import { fetch } from "undici";
import type { EvidenceDocument } from "./types.js";

const MAX_TEXT = 20000;

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function extractHtmlText(html: string): { title?: string; text: string } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer, header").remove();
  const title = normalizeWhitespace($("title").first().text()) || undefined;
  const text = normalizeWhitespace($("body").text()).slice(0, MAX_TEXT);
  return { title, text };
}

export async function scrapeUrl(url: string, timeoutMs = 20000): Promise<EvidenceDocument> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "prisma-analyser/0.1 (+local pi sdk script)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") ?? undefined;
    const finalUrl = response.url;

    if (!response.ok) {
      return { url, finalUrl, contentType, text: "", excerpt: "", error: `HTTP ${response.status}` };
    }

    const body = await response.text();

    if (contentType?.includes("html") || body.trim().startsWith("<")) {
      const { title, text } = extractHtmlText(body);
      return {
        url,
        finalUrl,
        title,
        contentType,
        text,
        excerpt: text.slice(0, 1000),
      };
    }

    const text = normalizeWhitespace(body).slice(0, MAX_TEXT);
    return { url, finalUrl, contentType, text, excerpt: text.slice(0, 1000) };
  } catch (error) {
    return {
      url,
      text: "",
      excerpt: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapeUrls(urls: string[]): Promise<EvidenceDocument[]> {
  const unique = [...new Set(urls.filter(Boolean))];
  const results: EvidenceDocument[] = [];
  for (const url of unique) {
    results.push(await scrapeUrl(url));
  }
  return results;
}
