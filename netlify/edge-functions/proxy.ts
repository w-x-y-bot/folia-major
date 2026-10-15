import { Context } from "https://deno.land/x/netlify_edge@v1.0.0/mod.ts";

const ROUTE_MAP: Record<string, string> = {
  "netease": "https://music.163.com/api",
  "qq": "https://y.qq.com/api",
  "kugou": "https://api.kugou.com",
};

export default async (req: Request, ctx: Context) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // path: /proxy/netease/xxx
  if (pathParts.length < 2 || pathParts[0] !== "proxy") {
    return new Response("Not found", { status: 404 });
  }
  const provider = pathParts[1];
  const upstreamBase = ROUTE_MAP[provider];
  if (!upstreamBase) {
    return new Response("Unknown provider", { status: 400 });
  }

  // 拼接目标上游路径
  const targetPath = "/" + pathParts.slice(2).join("/") + url.search;
  const targetUrl = new URL(targetPath, upstreamBase);

  // 复制原始请求，转发
  const newReq = new Request(targetUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  try {
    const upstreamRes = await fetch(newReq);
    const headers = new Headers(upstreamRes.headers);
    // CORS 头，允许前端跨域
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

// 匹配所有 /proxy/* 请求
export const config = {
  path: "/proxy/*",
};
