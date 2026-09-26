// Abre o index.html num Chromium sem interface, com relógio e fuso fixos,
// para que os horários do exemplo (relativos a "agora") sejam sempre os mesmos.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const URL_APP = pathToFileURL(path.join(raiz, 'index.html')).href;

// 10/03/2026 10:10 no horário de Brasília (sem horário de verão).
export const AGORA = new Date('2026-03-10T10:10:00-03:00');

export async function abrirApp() {
  const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
  const navegador = await chromium.launch({ executablePath });
  const contexto = await navegador.newContext({ timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });
  // Bloqueia rede (Google Fonts): os testes não dependem de internet.
  await contexto.route(/^https?:/, (r) => r.abort());
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e));
  await pagina.clock.setFixedTime(AGORA);
  await pagina.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  return { navegador, pagina, erros };
}

export async function abrirAba(pagina, aba) {
  await pagina.click(`#tab-${aba}`);
  return {
    saida: await pagina.locator(`#out-${aba}`).innerText(),
    resumo: await pagina.locator('#summary').inputValue(),
  };
}
