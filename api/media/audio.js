import { Readable } from "node:stream";

const DRIVE_HOST_WHITELIST = ["drive.google.com", "docs.google.com", "drive.usercontent.google.com", "drive.googleusercontent.com"];

function buildDriveDownloadUrl(id) {
  return `https://drive.google.com/uc?id=${id}&export=download`;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { id, url } = request.query ?? {};
  const targetUrl = id ? buildDriveDownloadUrl(id) : url;

  if (!targetUrl) {
    response.status(400).json({ error: "Informe o parâmetro id ou url." });
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    response.status(400).json({ error: "URL inválida." });
    return;
  }

  const isAllowedHost = DRIVE_HOST_WHITELIST.some((host) => parsedUrl.hostname.includes(host));
  if (!isAllowedHost) {
    response.status(400).json({ error: "Host não autorizado para proxy." });
    return;
  }

  try {
    const headers = {
      "User-Agent": "MeuShapeMediaProxy/1.0",
    };

    if (request.headers.range) {
      headers.Range = request.headers.range;
    }

    const upstream = await fetch(parsedUrl, { headers });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      response.status(upstream.status).send(text || "Falha ao obter o áudio solicitado.");
      return;
    }

    const passthroughHeaders = [
      "content-type",
      "content-length",
      "accept-ranges",
      "content-range",
      "cache-control",
      "content-disposition",
    ];

    passthroughHeaders.forEach((header) => {
      const value = upstream.headers.get(header);
      if (value) {
        response.setHeader(header, value);
      }
    });

    response.setHeader("Cache-Control", "public, max-age=3600");
    response.status(upstream.status);
    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    console.error("[media/audio] erro ao proxyar áudio:", error);
    response.status(500).json({ error: "Não foi possível carregar o áudio no momento." });
  }
}
