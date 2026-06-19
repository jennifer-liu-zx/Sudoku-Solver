// ──────────────────────────────────────────────
//  SOLVER LOGIC — ported from main.py
// ──────────────────────────────────────────────

function deepCopyValues(obj) {
  const out = {};
  for (let k = 0; k < 81; k++) out[k] = obj[k];
  return out;
}

function deepCopyPoss(obj) {
  const out = {};
  for (let k = 0; k < 81; k++) out[k] = [...obj[k]];
  return out;
}

function removePossibilitiesStraight(poss, vals) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const k = i * 9 + j;
      if (vals[k] !== 0) {
        const v = vals[k];
        for (let a = 0; a < 9; a++) {
          const ri = i * 9 + a;
          const ci = a * 9 + j;
          const idxR = poss[ri].indexOf(v);
          if (idxR !== -1) poss[ri].splice(idxR, 1);
          const idxC = poss[ci].indexOf(v);
          if (idxC !== -1) poss[ci].splice(idxC, 1);
        }
      }
    }
  }
  return poss;
}

const START_BOXES = [0, 3, 6, 27, 30, 33, 54, 57, 60];

function sortBoxes(flat) {
  const grouped = [];
  for (let g = 0; g < 9; g++) {
    const s = START_BOXES[g];
    grouped.push([
      flat[s],    flat[s+1],  flat[s+2],
      flat[s+9],  flat[s+10], flat[s+11],
      flat[s+18], flat[s+19], flat[s+20]
    ]);
  }
  return grouped;
}

function unsortBoxes(sorted) {
  const compiled = {};
  for (let a = 0; a < 9; a++)
    for (let b = 0; b < 9; b++)
      compiled[a * 9 + b] = sorted[a][b];

  const ORDER = [
    0,1,2,9,10,11,18,19,20,
    3,4,5,12,13,14,21,22,23,
    6,7,8,15,16,17,24,25,26,
    27,28,29,36,37,38,45,46,47,
    30,31,32,39,40,41,48,49,50,
    33,34,35,42,43,44,51,52,53,
    54,55,56,63,64,65,72,73,74,
    57,58,59,66,67,68,75,76,77,
    60,61,62,69,70,71,78,79,80
  ];
  const out = {};
  for (let x = 0; x < 81; x++) out[x] = compiled[ORDER[x]];
  return out;
}

function removePossibilitiesBoxed(poss, vals) {
  const sortedPoss = sortBoxes(poss);
  const sortedVals = sortBoxes(vals);
  for (let g = 0; g < 9; g++) {
    for (let o = 0; o < 9; o++) {
      const v = sortedVals[g][o];
      if (v !== 0) {
        for (let a = 0; a < 9; a++) {
          const idx = sortedPoss[g][a].indexOf(v);
          if (idx !== -1) sortedPoss[g][a].splice(idx, 1);
        }
      }
    }
  }
  return unsortBoxes(sortedPoss);
}

function confirmValue(poss, x, vals) {
  if (vals[x] === 0 && poss[x].length === 1) vals[x] = poss[x][0];
  return vals[x];
}

function groupValues(vals) {
  const boxes = sortBoxes(vals);
  const rows = [], cols = [];
  for (let i = 0; i < 9; i++) {
    rows.push([]);
    cols.push([]);
    for (let j = 0; j < 9; j++) {
      rows[i].push(vals[i * 9 + j]);
      cols[i].push(vals[j * 9 + i]);
    }
  }
  return { rows, cols, boxes };
}

function done(vals) {
  const target = [1,2,3,4,5,6,7,8,9];
  const { rows, cols, boxes } = groupValues(vals);
  for (let i = 0; i < 9; i++) {
    if ([...rows[i]].sort((a,b)=>a-b).join() !== target.join()) return false;
    if ([...cols[i]].sort((a,b)=>a-b).join() !== target.join()) return false;
    if ([...boxes[i]].sort((a,b)=>a-b).join() !== target.join()) return false;
  }
  return true;
}

function wrongAssumption(vals, poss) {
  const { rows, cols, boxes } = groupValues(vals);
  for (const grouping of [rows, cols, boxes]) {
    for (const group of grouping) {
      for (const v of group) {
        if (v !== 0 && group.filter(x => x === v).length > 1) return true;
      }
    }
  }
  for (let i = 0; i < 81; i++) {
    if (vals[i] === 0 && poss[i].length === 0) return true;
  }
  return false;
}

function boxToAssume(vals) {
  for (let i = 0; i < 81; i++) if (vals[i] === 0) return i;
  return null;
}

function chooseAssumption(vals, poss) {
  const cv = deepCopyValues(vals);
  const cp = deepCopyPoss(poss);
  const pos = boxToAssume(vals);
  if (pos !== null && poss[pos].length > 0) {
    const assumption = cp[pos][0];
    cp[pos].splice(0, 1);
    poss[pos].splice(0, 1);
    cv[pos] = assumption;
  }
  return { cv, cp };
}

function solve(vals, poss) {
  poss = removePossibilitiesStraight(poss, vals);
  poss = removePossibilitiesBoxed(poss, vals);
  for (let k = 0; k < 81; k++) vals[k] = confirmValue(poss, k, vals);
  return { vals, poss };
}

function sudokuSolver(valInput, possInput) {
  let vals = {}, poss = {};
  for (let k = 0; k < 81; k++) {
    poss[k] = possInput ? [...possInput[k]] : [1,2,3,4,5,6,7,8,9];
    vals[k] = valInput[k];
  }

  let outerRounds = 0;
  while (outerRounds < 15) {
    let r = 0;
    while (r < 15) {
      ({ vals, poss } = solve(vals, poss));
      r++;
    }
    if (done(vals)) return { vals, poss };

    r = 0;
    while (r < 15) {
      if (wrongAssumption(vals, poss)) break;
      const { cv, cp } = chooseAssumption(vals, poss);
      const result = sudokuSolver(cv, cp);
      if (done(result.vals)) return result;
      r++;
    }
    if (wrongAssumption(vals, poss)) break;
    outerRounds++;
  }
  return { vals, poss };
}

// ──────────────────────────────────────────────
//  EXAMPLE PUZZLES
// ──────────────────────────────────────────────
const EXAMPLES = [
  // easy
  [0,0,0,9,1,0,4,0,7,
   3,0,4,6,8,0,0,1,0,
   0,7,9,0,5,0,6,0,3,
   9,0,2,0,0,0,8,0,1,
   0,1,5,0,0,6,3,4,0,
   0,3,0,0,9,0,0,5,0,
   2,0,0,5,3,0,7,0,0,
   0,0,3,1,0,0,0,9,0,
   6,0,0,4,7,0,1,3,0],
  // intermediate
  [5,0,0,0,0,0,0,7,0,
   0,0,7,9,0,8,0,6,0,
   0,0,2,0,0,0,0,0,0,
   0,0,5,2,4,0,9,0,3,
   0,0,3,0,9,5,0,8,7,
   0,0,1,0,0,0,2,0,0,
   6,0,0,7,0,0,3,4,0,
   3,7,0,0,2,0,0,9,0,
   1,0,8,0,0,0,0,2,0],
  // hard
  [0,4,7,0,1,3,0,2,0,
   0,0,0,0,6,0,0,0,5,
   1,0,0,0,0,0,0,0,0,
   2,0,0,0,0,1,0,0,0,
   8,0,0,0,0,0,0,9,0,
   0,9,1,0,3,0,6,0,0,
   0,8,0,0,0,0,0,0,0,
   0,0,0,4,0,0,2,0,0,
   0,3,9,0,0,7,0,4,0]
  ];
let exampleIdx = 0;

// ──────────────────────────────────────────────
//  UI
// ──────────────────────────────────────────────
const grid = document.getElementById('grid');
const status = document.getElementById('status');
const cells = [];

for (let i = 0; i < 81; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.maxLength = 1;
  input.setAttribute('aria-label', `Cell ${Math.floor(i/9)+1},${i%9+1}`);

  input.addEventListener('keydown', e => {
    if (e.key === 'Backspace' || e.key === 'Delete') return;
    if (e.key.length === 1 && !/^[1-9]$/.test(e.key)) e.preventDefault();
    const dirs = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 9, ArrowUp: -9 };
    if (dirs[e.key] !== undefined) {
      e.preventDefault();
      const next = i + dirs[e.key];
      if (next >= 0 && next < 81) cells[next].input.focus();
    }
  });

  input.addEventListener('input', () => {
    const v = input.value;
    if (!/^[1-9]?$/.test(v)) input.value = v.replace(/[^1-9]/g, '').slice(-1);
    cell.classList.remove('solved', 'error');
    setStatus('');
  });

  cell.appendChild(input);
  grid.appendChild(cell);
  cells.push({ cell, input });
}

function setStatus(msg, type = '') {
  status.textContent = msg;
  status.className = type;
}

function readBoard() {
  const vals = {};
  for (let k = 0; k < 81; k++) {
    const v = parseInt(cells[k].input.value) || 0;
    vals[k] = v;
  }
  return vals;
}

function markGivens() {
  for (let k = 0; k < 81; k++) {
    const v = cells[k].input.value;
    cells[k].cell.classList.remove('given', 'solved', 'error');
    if (v && v !== '0') cells[k].cell.classList.add('given');
  }
}

function loadValues(arr) {
  for (let k = 0; k < 81; k++) {
    cells[k].input.value = arr[k] ? arr[k] : '';
    cells[k].cell.classList.remove('given', 'solved', 'error');
    if (arr[k]) cells[k].cell.classList.add('given');
  }
}

document.getElementById('btn-solve').addEventListener('click', () => {
  markGivens();
  const valInput = readBoard();
  setStatus('Solving…', '');

  setTimeout(() => {
    try {
      const { vals } = sudokuSolver(valInput);

      if (done(vals)) {
        let delay = 0;
        for (let k = 0; k < 81; k++) {
          if (!valInput[k]) {
            const { cell, input } = cells[k];
            ;(function(c, inp, v, d) {
              setTimeout(() => {
                inp.value = v;
                c.classList.remove('error');
                c.classList.add('solved');
              }, d);
            })(cell, input, vals[k], delay);
            delay += 6;
          }
        }
        setTimeout(() => setStatus('Solved', 'success'), delay + 50);
      } else {
        setStatus('No solution found', 'fail');
        for (let k = 0; k < 81; k++) {
          if (!valInput[k]) cells[k].cell.classList.add('error');
        }
      }
    } catch(e) {
      setStatus('Error during solve', 'fail');
    }
  }, 20);
});

document.getElementById('btn-clear').addEventListener('click', () => {
  for (let k = 0; k < 81; k++) {
    cells[k].input.value = '';
    cells[k].cell.classList.remove('given', 'solved', 'error');
  }
  setStatus('');
  cells[0].input.focus();
});

document.getElementById('btn-example').addEventListener('click', () => {
  loadValues(EXAMPLES[exampleIdx % EXAMPLES.length]);
  exampleIdx++;
  setStatus('');
});

cells[0].input.focus();
