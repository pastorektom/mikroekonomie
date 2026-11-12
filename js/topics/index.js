// Seznam témat v pořadí jako v Moodlu. Každé téma je modul js/topics/temaNN.js
// s výchozím exportem { id, title, order, theory, types } (vzorem bude js/topics/tema02.js).
// Dokud téma není hotové, má prázdný výklad i typy a aplikace ukáže „připravuje se“.
import tema02 from './tema02.js';

const stub = (order, id, title) => ({ id, title, order, theory: [], types: [] });

export const topics = [
  stub(1, 'uvod', 'Úvod do ekonomického studia'),
  tema02,
  stub(3, 'spotrebitel', 'Chování spotřebitele a formování poptávky'),
  stub(4, 'nabidka', 'Nabídka na trhu výrobků a služeb'),
  stub(5, 'dokonala-konkurence', 'Firma v podmínkách dokonalé konkurence'),
  stub(6, 'nedokonala-konkurence', 'Nedokonalá konkurence'),
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
