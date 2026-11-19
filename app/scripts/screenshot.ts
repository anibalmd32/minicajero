import { openChromePage, sleep } from "./chrome";

function sessionCookieParts(setCookie: string): { name: string; value: string } {
  const [pair = ""] = setCookie.split(";");
  const separator = pair.indexOf("=");
  return { name: pair.slice(0, separator).trim(), value: pair.slice(separator + 1).trim() };
}

/**
 * Captura una URL emulando un viewport real (incluido móvil < 500px) vía Chrome DevTools Protocol.
 * Uso: bun scripts/screenshot.ts <url> <salida.png> [ancho=375] [alto=812] [--full] [--wait=ms] [--eval=js] [--insecure]
 * Con `--insecure` acepta certificados no reconocidos (el autofirmado del servidor del teléfono).
 * Con `--login=usuario:contraseña` entra en la app antes de capturar (para las páginas que exigen sesión).
 * Imprime en consola los errores de JS de la página y si hay desborde horizontal.
 */
const [url, output, widthArg, heightArg, ...flags] = process.argv.slice(2);
if (!url || !output) {
  console.error(
    "Uso: bun scripts/screenshot.ts <url> <salida.png> [ancho] [alto] [--full] [--wait=ms] [--eval=js] [--init=js] [--insecure] [--login=usuario:clave]",
  );
  process.exit(1);
}
const width = Number(widthArg ?? 375);
const height = Number(heightArg ?? 812);
const fullPage = flags.includes("--full");
const waitMs = Number(flags.find((flag) => flag.startsWith("--wait="))?.slice(7) ?? 1500);
const evalScript = flags.find((flag) => flag.startsWith("--eval="))?.slice(7);
const initScript = flags.find((flag) => flag.startsWith("--init="))?.slice(7);
const login = flags.find((flag) => flag.startsWith("--login="))?.slice(8);

const page = await openChromePage({ ignoreCertificateErrors: flags.includes("--insecure") });
try {
  await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  if (initScript) await page.send("Page.addScriptToEvaluateOnNewDocument", { source: initScript });
  if (login) {
    const origin = new URL(url).origin;
    const separator = login.indexOf(":");
    const username = separator === -1 ? login : login.slice(0, separator);
    const password = separator === -1 ? "" : login.slice(separator + 1);
    const response = await fetch(`${origin}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      console.error(`No se pudo iniciar sesión: ${response.status} ${await response.text()}`);
      process.exit(1);
    }
    const cookie = response.headers.get("set-cookie");
    if (!cookie) {
      console.error("La respuesta de inicio de sesión no trae cookie de sesión");
      process.exit(1);
    }
    await page.send("Network.enable", {});
    await page.send("Network.setCookie", {
      ...sessionCookieParts(cookie),
      domain: new URL(origin).hostname,
      path: "/",
    });
  }
  await page.send("Page.navigate", { url });
  await sleep(waitMs);
  if (evalScript) {
    await page.send("Runtime.evaluate", { expression: evalScript, awaitPromise: true });
    await sleep(waitMs);
  }
  const overflow = await page.send("Runtime.evaluate", {
    expression: "JSON.stringify({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth })",
    returnByValue: true,
  });
  const metrics = JSON.parse(overflow.result.value);
  let clip: { x: number; y: number; width: number; height: number; scale: number } | undefined;
  if (fullPage) {
    const layout = await page.send("Page.getLayoutMetrics");
    clip = { x: 0, y: 0, width, height: Math.ceil(layout.cssContentSize.height), scale: 1 };
  }
  const shot = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: fullPage,
    ...(clip ? { clip } : {}),
  });
  await Bun.write(output, Buffer.from(shot.data, "base64"));
  console.log(
    `OK ${output} viewport=${metrics.viewport} scrollWidth=${metrics.scrollWidth}${metrics.scrollWidth > metrics.viewport ? " DESBORDE HORIZONTAL" : ""}`,
  );
  for (const error of page.errors) console.log(`ERROR JS: ${error}`);
} finally {
  await page.close();
}
