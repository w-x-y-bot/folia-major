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

  const newReq = new Request(targetUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  try {
    const upstreamRes = await fetch(newReq);
    const headers = new Headers(upstreamRes.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE");
    headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (err) {
    return new Response(`Proxy error: ${(err as Error).message}`, { status: 500 });
  }
};

export const config = {
  path: "/proxy/*",
};
