// Normaliza un texto para buscar sin distinguir mayúsculas ni acentos.
export const normalizeText = (text = '') =>
  String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
