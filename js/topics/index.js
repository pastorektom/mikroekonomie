// Seznam témat v pořadí jako v Moodlu. Každé téma je modul js/topics/temaNN.js
// s výchozím exportem { id, title, order, theory, types } (vzorem bude js/topics/tema02.js).
// Dokud téma není hotové, má prázdný výklad i typy a aplikace ukáže „připravuje se“.
import tema02 from './tema02.js';
import tema03 from './tema03.js';
import tema04 from './tema04.js';
import tema05 from './tema05.js';
import tema06 from './tema06.js';

const stub = (order, id, title) => ({ id, title, order, theory: [], types: [] });

export const topics = [
  stub(1, 'uvod', 'Úvod do ekonomického studia'),
  tema02,
  tema03,
  tema04,
  tema05,
  tema06,
  stub(7, 'faktory', 'Trhy výrobních faktorů'),
  stub(8, 'prace', 'Trh práce'),
  stub(9, 'kapital', 'Trh kapitálu a přerozdělování důchodů'),
  stub(10, 'rovnovaha', 'Celková rovnováha a tržní efektivnost'),
  stub(11, 'selhani', 'Tržní selhání a mikroekonomická politika státu'),
];
export default topics;

export function sortTopics(list) {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
