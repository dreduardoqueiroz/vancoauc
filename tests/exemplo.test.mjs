// Testes de regressão com o EXEMPLO que já vem preenchido no app
// (homem, 58 anos, 72 kg, 170 cm, creatinina 1,1 mg/dL, AUC-alvo 480).
//
// Se algum destes testes falhar, algum resultado clínico mudou.
// Só atualize os valores esperados quando a mudança for intencional e
// tiver sido avisada e aprovada explicitamente (ver CLAUDE.md).
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, abrirAba } from './app.mjs';

let navegador, pagina, erros;
before(async () => ({ navegador, pagina, erros } = await abrirApp()));
after(async () => {
  await navegador?.close();
});

// Confere que o texto contém cada trecho esperado, apontando qual faltou.
function contem(texto, trechos) {
  for (const t of trechos) assert.ok(texto.includes(t), `Trecho esperado não encontrado: "${t}"\n--- texto ---\n${texto}`);
}

// Tolerância para os valores numéricos brutos do motor farmacocinético.
function perto(obtido, esperado, nome, tol = 1e-6) {
  assert.ok(Math.abs(obtido - esperado) <= tol * Math.max(1, Math.abs(esperado)), `${nome}: esperado ${esperado}, obtido ${obtido}`);
}

describe('Exemplo pré-preenchido', () => {
  test('entradas do exemplo não mudaram', async () => {
    const v = await pagina.evaluate(() =>
      Object.fromEntries(
        ['target', 'age', 'sex', 'wt', 'ht', 'scr', 'clm', 'mDose', 'mTau', 'mTinf', 'nPrev', 'ldDose', 'ldTinf',
          'c1', 'c2', 'ciInd', 'eff', 'ciConc', 'ciDaily', 'ciCss', 'ciHours', 'ciLd', 'hdGap', 'hdCur', 'hdLevel']
          .map((id) => [id, document.getElementById(id).value]),
      ),
    );
    assert.deepEqual(v, {
      target: '480', age: '58', sex: 'M', wt: '72', ht: '170', scr: '1.1', clm: '',
      mDose: '1000', mTau: '12', mTinf: '60', nPrev: '2', ldDose: '1750', ldTinf: '120',
      c1: '33.8', c2: '18.9', ciInd: 'crrt', eff: '25', ciConc: '5', ciDaily: '1500', ciCss: '15.2',
      ciHours: '24', ciLd: '1750', hdGap: '48', hdCur: '750', hdLevel: '12.4',
    });
    const chk = await pagina.evaluate(() => [document.getElementById('steady').checked, document.getElementById('aki').checked]);
    assert.deepEqual(chk, [false, false], 'Estado de equilíbrio e LRA devem vir desmarcados');
  });

  test('dados do paciente (ClCr, pesos, IMC)', async () => {
    const txt = await pagina.locator('#ptOut').innerText();
    contem(txt, ['68 mL/min', '65,9 kg · ideal', '24,9 kg/m²']);
    assert.equal((await pagina.locator('#ptFlags').innerText()).trim(), '', 'Não deve haver sinalizadores para o exemplo');
  });

  test('aba 1 · Início: ataque, manutenção, AUC e aprazamento', async () => {
    const { saida, resumo } = await abrirAba(pagina, 't1');
    contem(saida, [
      '1.750', 'mg em 120 min · 25 mg/kg de peso real',
      '750 mg a cada 12 h',
      'Infundir em 60 min. Primeira dose 12 h após o início do ataque. AUC24 estimada 493 mg·h/L (alvo 480).',
      '3,04 L/h', '50 L', '11,5 h', '1.500 mg · 20,8 mg/kg',
      'a cada 8 h\t500 mg\t493\t25,1\t16,5',
      'a cada 12 h\t750 mg\t493\t28,0\t14,4',
      'a cada 24 h\t1.500 mg\t493\t36,6\t9,7',
      'Ataque: 10/03 10:30 (fim 10/03 12:30)',
      '1ª manutenção: 10/03 22:30, depois a cada 12 h',
      'Pico: 11/03 12:30 (1 h após o fim da 2ª manutenção)',
      'Vale: 11/03 22:00 (antes da dose de 11/03 22:30)',
    ]);
    contem(resumo, [
      'Paciente: M, 58 a, 72 kg, 170 cm, IMC 24,9; Cr 1.1 mg/dL; ClCr 68 mL/min (Cockcroft-Gault, peso ideal).',
      'Ataque: 1750 mg IV em 120 min (25 mg/kg peso real).',
      'Manutenção empírica: 750 mg a cada 12 h (infusão 60 min); AUC24 estimada 493 (modelo populacional).',
      'Alvo AUC24: 480 mg·h/L.',
    ]);
  });

  test('aba 2 · Pico e vale: AUC atual e conduta', async () => {
    const { saida, resumo } = await abrirAba(pagina, 't2');
    contem(saida, [
      '634', 'Acima do alvo',
      'Reduzir para 750 mg a cada 12 h',
      'Infundir em 60 min. AUC24 prevista 476 · pico 27,1 · vale 13,8 mg/L.',
      'Começar na próxima dose aprazada: 10/03 10:00.',
      '0,061 h⁻¹', '11,3 h', '51,5 L · 0,72 L/kg', '3,15 L/h', '36,2 mg/L', '18,5 mg/L',
      'a cada 8 h\t500 mg\t60 min\t476\t24,3\t15,8',
      'a cada 12 h\t750 mg\t60 min\t476\t27,1\t13,8',
      'a cada 24 h\t1.500 mg\t120 min\t476\t35,6\t9,3',
      'a cada 48 h\t3.000 mg\t210 min\t476\t55,3\t3,6',
    ]);
    assert.equal(await pagina.locator('#out-t2 .alert').count(), 0, 'O exemplo não deve gerar alertas');
    contem(resumo, [
      'Pico 33.8 mg/L às 10/03 00:00; vale 18.9 mg/L às 10/03 09:30.',
      'ke 0,061 h-1; t1/2 11,3 h; V 51,5 L; CL 3,15 L/h.',
      'AUC24 regime atual: 634 mg·h/L (Acima do alvo).',
      'Conduta sugerida: Reduzir para 750 mg a cada 12 h; AUC24 prevista 476; início 10/03 10:00.',
    ]);
  });

  test('aba 3 · Infusão contínua: ataque, dose diária, AUC em platô e conduta', async () => {
    const { saida, resumo } = await abrirAba(pagina, 't3');
    contem(saida, [
      '1.750', 'mg em 120 min; iniciar a infusão ao fim do ataque',
      '1.000', 'mg/24 h · 8,3 mL/h a 5 mg/mL',
      'CRRT com efluente 25 mL/kg/h → 15 mg/kg/dia',
      'Alvo de Css 20,0 mg/L (AUC24 480)',
      '312', 'Css medida 15,2 → platô previsto 13,0 mg/L', 'Abaixo do alvo',
      'Aumentar para 2.250 mg/24 h',
      '18,8 mL/h a 5 mg/mL. Nova Css em 24 h.',
      '4,81 L/h', '50 L', '7,3 h',
    ]);
    contem(resumo, [
      'Ataque 1750 mg em 120 min; manutenção inicial 1000 mg/24 h (8,3 mL/h a 5 mg/mL).',
      'platô previsto 13,0 mg/L, AUC24 312. Conduta: Aumentar para 2.250 mg/24 h.',
    ]);
  });

  test('aba 4 · Hemodiálise: ataque, manutenção por sessão e conduta', async () => {
    const { saida, resumo } = await abrirAba(pagina, 't4');
    contem(saida, [
      '1.750', 'mg em 120 min · 25 mg/kg',
      '750', 'mg · 10 mg/kg',
      '12,4', 'Abaixo do alvo',
      'Aumentar para 1.000 mg nesta sessão',
    ]);
    contem(resumo, [
      'Ataque 1750 mg; manutenção inicial 750 mg por sessão.',
      'Nível pré-diálise 12.4 mg/L com 750 mg/sessão. Conduta: Aumentar para 1.000 mg nesta sessão.',
    ]);
  });

  test('sem erros de JavaScript na página', () => {
    assert.deepEqual(erros.map(String), []);
  });
});

// Valores brutos (sem arredondamento de tela) do motor com as entradas do exemplo.
// Pegam mudanças pequenas que o arredondamento da interface esconderia.
describe('Motor farmacocinético (valores brutos do exemplo)', () => {
  let r;
  before(async () => {
    r = await pagina.evaluate(() => {
      const cg = VE.cockcroftGault(58, 'M', 72, 170, 1.1);
      const CL = VE.popCL(cg.clcr), V = VE.popV(72, 170), ke = CL / V;
      const doses = VE.buildDoses({ monStart: 0, dose: 1000, tau: 12, tinf: 1, nPrev: 2, steady: false, ldDose: 1750, ldStart: -36, ldTinf: 2 });
      const tl = VE.twoLevel({ doses, c1: 33.8, t1: 2, c2: 18.9, t2: 11.5 });
      return {
        cg, CL, V, ld: VE.loadingDose(72),
        inicio: VE.regimen(480, ke, V, 12),
        tl: { ke: tl.ke, V: tl.V, CL: tl.CL, th: tl.th, warn: tl.warn },
        novo: VE.regimen(480, tl.ke, tl.V, 12),
        ci: ciFit(15.2, 1500 / 24, 24, 1750, VE.popV(72, 170)),
      };
    });
  });

  test('Cockcroft-Gault e parâmetros populacionais', () => {
    perto(r.cg.clcr, 68.26811421299611, 'ClCr');
    perto(r.cg.weightUsed, 65.93700787401575, 'peso usado no CG');
    assert.equal(r.cg.weightKind, 'ideal');
    perto(r.CL, 3.0418038415652586, 'CL populacional');
    perto(r.V, 50.4, 'V populacional');
  });

  test('dose de ataque', () => {
    assert.deepEqual(r.ld, { dose: 1750, tinfMin: 120, capped: false });
  });

  test('manutenção empírica (aba 1)', () => {
    assert.equal(r.inicio.dose, 750);
    assert.equal(r.inicio.tau, 12);
    assert.equal(r.inicio.tinf, 1);
    assert.equal(r.inicio.capped, false);
    perto(r.inicio.auc24, 493.12844553057255, 'AUC24 empírica');
    perto(r.inicio.cmax, 28.023687840008087, 'pico ss empírico');
    perto(r.inicio.cmin, 14.427908017416701, 'vale ss empírico');
  });

  test('ajuste por pico e vale (aba 2)', () => {
    perto(r.tl.ke, 0.06118935583403962, 'ke');
    perto(r.tl.V, 51.54975369942558, 'V');
    perto(r.tl.CL, 3.154296222271252, 'CL');
    perto(r.tl.th, 11.327904520517075, 'meia-vida');
    perto(1000 * 24 / 12 / r.tl.CL, 634.0558587613878, 'AUC24 do regime atual');
    assert.deepEqual(r.tl.warn, []);
    assert.equal(r.novo.dose, 750);
    perto(r.novo.auc24, 475.5418940710408, 'AUC24 prevista do novo regime');
    perto(r.novo.cmax, 27.132543264445225, 'pico ss previsto');
    perto(r.novo.cmin, 13.841217994829382, 'vale ss previsto');
  });

  test('ajuste da infusão contínua (aba 3)', () => {
    perto(r.ci.ke, 0.09539701179032628, 'ke (infusão contínua)', 1e-4);
    perto(r.ci.CL, 4.808009394232444, 'CL (infusão contínua)', 1e-4);
    perto(r.ci.cssPlateau, 12.999142654540833, 'Css em platô', 1e-4);
  });
});
