import type { Centavos } from './tipos';

export const VALOR_MAXIMO: Centavos = 100_000_000; // RN-42: R$ 1.000.000,00

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlInteiro = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Intl usa espaço não separável; usamos espaço comum para textos previsíveis.
const limpar = (s: string) => s.replace(/ | /g, ' ');

/** "R$ 1.234,56" */
export function formatarBRL(c: Centavos): string {
  return limpar(brl.format(c / 100));
}

/** "R$ 1.235" — reais inteiros, para chips e textos curtos. */
export function formatarBRLInteiro(c: Centavos): string {
  return limpar(brlInteiro.format(Math.round(c / 100)));
}

/** Inteiro se não houver centavos ("R$ 45"), senão com centavos ("R$ 45,90"). */
export function formatarBRLCompacto(c: Centavos): string {
  return c % 100 === 0 ? formatarBRLInteiro(c) : formatarBRL(c);
}

/** "−R$ 18" / "+R$ 44" */
export function formatarComSinal(c: Centavos): string {
  return (c < 0 ? '−' : '+') + formatarBRLInteiro(Math.abs(c));
}

/**
 * Converte texto digitado em centavos. Aceita "45,90", "45.90", "1.234,56", "R$ 10".
 * Retorna null se o texto não for um valor.
 */
export function parseValor(texto: string): Centavos | null {
  let s = texto.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const reais = Number(m[1]);
  const cent = Number((m[2] ?? '').padEnd(2, '0'));
  return reais * 100 + cent;
}

/** Centavos → texto para preencher um campo ("45,90"). */
export function centavosParaTexto(c: Centavos): string {
  const reais = Math.floor(c / 100);
  const cent = c % 100;
  return cent === 0 ? String(reais) : `${reais},${String(cent).padStart(2, '0')}`;
}
