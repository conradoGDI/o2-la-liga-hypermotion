const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || 3000;
const API_TOKEN = "59f9f42bdfc44d7291db82bc9d7685ec";
const API_BASE_URL = "https://api.football-data.org/v4/matches";
const htmlPath = path.join(__dirname, "generate-json", "index.html");

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(payload));
}

function serveHtml(response) {
  fs.readFile(htmlPath, "utf8", (error, html) => {
    if (error) {
      sendJson(response, 500, { error: "No se pudo cargar el HTML." });
      return;
    }

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
  });
}

async function proxyMatches(response, requestUrl) {
  try {
    const upstreamUrl = new URL(API_BASE_URL);

    for (const [key, value] of requestUrl.searchParams.entries()) {
      upstreamUrl.searchParams.set(key, value);
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "X-Auth-Token": API_TOKEN,
        Accept: "application/json",
      },
    });

    const text = await upstreamResponse.text();

    response.writeHead(upstreamResponse.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    response.end(text);
  } catch (error) {
    sendJson(response, 502, {
      error: "No se pudo consultar la API externa.",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

const server = http.createServer((request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "Petición inválida." });
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/matches") {
    proxyMatches(response, requestUrl);
    return;
  }

  if (
    request.method === "GET" &&
    (requestUrl.pathname === "/" ||
      requestUrl.pathname === "/generate-json" ||
      requestUrl.pathname === "/generate-json/")
  ) {
    serveHtml(response);
    return;
  }

  sendJson(response, 404, { error: "Ruta no encontrada." });
});

server.listen(PORT, () => {
  console.log(`Servidor disponible en http://localhost:${PORT}/generate-json/`);
});