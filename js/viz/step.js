// Grafika jednoho kroku krokovače: řádky na tabuli (step.board) a/nebo grafická pomůcka (step.viz).
// Mají-li krok oba údaje, pomůcka se vykreslí pod řádky ve stejném rámu tabule. Nepovede-li se
// pomůcka, zůstanou řádky; nepovede-li se tabule, vykreslí se pomůcka sama.
import { drawBoard, boardForStep, disposeBoard } from './board.js';
import { drawViz, disposeViz } from './index.js';

export function stepVisual(target, step, index, steps) {
  const b = boardForStep(steps, index);
  const boardDrawn = b ? drawBoard(target, b.lines, b.upTo) > 0 : false;
  if (step && step.viz) {
    if (!boardDrawn) disposeBoard(target);
    const vizDrawn = drawViz(target, step.viz, { join: boardDrawn });
    return boardDrawn || vizDrawn;
  }
  return boardDrawn;
}

// Uvolní vše, co stepVisual nakreslil (tabuli i pomůcku), ať šlo o jedno, druhé, nebo obojí.
export function disposeStepVisual(target) {
  disposeBoard(target);
  disposeViz(target);
}
