// Seznam témat v pořadí jako v Moodlu. Každé téma je modul js/topics/temaNN.js
// s výchozím exportem { id, title, order, theory, types } (vzorem bude js/topics/tema02.js).
import tema01 from './tema01.js';
import tema02 from './tema02.js';
import tema03 from './tema03.js';
import tema04 from './tema04.js';
import tema05 from './tema05.js';
import tema06 from './tema06.js';
import tema07 from './tema07.js';
import tema08 from './tema08.js';
import tema09 from './tema09.js';
import tema10 from './tema10.js';
import tema11 from './tema11.js';

export const topics = [
  tema01,
  tema02,
  tema03,
  tema04,
  tema05,
  tema06,
  tema07,
  tema08,
  tema09,
  tema10,
  tema11,
];
export default topics;

export function sortTopics(list) {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
