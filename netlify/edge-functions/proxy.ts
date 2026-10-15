// netlify/edge-functions/proxy.ts
const ROUTE_MAP: Record<string, string> = {
  "netease": "https://music.163.com/api",
  "qq": "https://y.qq.com/api",
  "kugou": "https://api.kugou.com",
};

export default async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts.length < 2 || pathParts[0] !== "proxy") {
    return new Response("Not found", { status: 404 });
  }

  const provider = pathParts[1];
  const upstreamBase = ROUTE_MAP[provider];
  if (!upstreamBase) {
    return new Response("Unknown provider", { status: 400 });
  }

  const targetPath = "/" + pathParts.slice(2).join("/") + url.search;
  const targetUrl = new URL(targetPath, upstreamBase);

  // 复制原有headers，覆盖增加网易云需要的UA和Referer
  const headers = new Headers(req.headers);
  headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  headers.set("Referer", "https://music.163.com/");
  headers.delete("Origin");
  headers.delete("Sec-Fetch-Mode");

  const newReq = new Request(targetUrl.toString(), {
    method: req.method,
    headers,
    body: req.body,
  });

  try {
    const upstreamRes = await fetch(newReq);
    const resHeaders = new Headers(upstreamRes.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE");
    resHeaders.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    });
  } catch (err) {
    return new Response(`Proxy error: ${(err as Error).message}`, { status: 500 });
  }
};

export const config = {
  path: "/proxy/*",
};
