// OCR MODULE — OpenCV.js grid detection + Tesseract.js digit recognition

function initOCR() {
  const uploadBtn   = document.getElementById('btn-upload');
  const fileInput   = document.getElementById('ocr-file-input');
  const modal       = document.getElementById('ocr-modal');
  const modalCanvas = document.getElementById('ocr-canvas');
  const btnConfirm  = document.getElementById('ocr-confirm');
  const btnCancel   = document.getElementById('ocr-cancel');
  const ocrStatus   = document.getElementById('ocr-status');
  const ctx         = modalCanvas.getContext('2d');

  let pendingValues = null;

  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) processImage(file);
    fileInput.value = '';
  });

  btnCancel.addEventListener('click', closeModal);
  btnConfirm.addEventListener('click', () => {
    if (pendingValues) {
      loadValues(pendingValues);
      setStatus('');
    }
    closeModal();
  });

  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  function closeModal() {
    modal.classList.remove('open');
    pendingValues = null;
    ocrStatus.textContent = '';
    btnConfirm.disabled = true;
  }

  // ── MAIN PIPELINE ──
  async function processImage(file) {
    if (!window._cvReady) {
      setOcrStatus('OpenCV still loading — try again in a moment.', 'fail');
      return;
    }

    setOcrStatus('Reading image…', 'loading');
    modal.classList.add('open');
    btnConfirm.disabled = true;
    pendingValues = null;

    const img = await loadImage(file);

    // Show original as preview
    const maxSize = 450;
    const previewScale = Math.min(maxSize / img.width, maxSize / img.height, 1);
    modalCanvas.width  = Math.round(img.width  * previewScale);
    modalCanvas.height = Math.round(img.height * previewScale);
    ctx.drawImage(img, 0, 0, modalCanvas.width, modalCanvas.height);

    try {
      setOcrStatus('Detecting grid…', 'loading');
      const result = extractGrid(img);
      if (!result) {
        setOcrStatus('Could not detect a sudoku grid. Try a clearer image.', 'fail');
        return;
      }

      // Scale detected corners from working-canvas space into preview-canvas space
      const { gridCanvas, corners: workCorners, workScale } = result;
      const ratio = previewScale / workScale;
      const previewCorners = workCorners.map(p => ({ x: p.x * ratio, y: p.y * ratio }));

      setOcrStatus('Recognising digits…', 'loading');
      const values = await recogniseDigits(gridCanvas);

      drawOverlay(values, previewCorners);

      pendingValues = values;
      btnConfirm.disabled = false;
      const filled = values.filter(v => v !== 0).length;
      setOcrStatus(`Detected ${filled} clues — look right? Click Confirm to load.`, 'success');

    } catch (err) {
      console.error('[OCR]', err);
      setOcrStatus('OCR failed: ' + err.message, 'fail');
    }
  }

  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = rej;
      img.src = url;
    });
  }

  // ── GRID EXTRACTION via OpenCV.js ──
  // Finds the largest 4-sided contour (the grid border), perspective-warps it
  // into a clean 630×630 canvas, and returns that canvas.
  function extractGrid(img) {
    const workSize = 900;
    const oc = document.createElement('canvas');
    const workScale = Math.min(workSize / img.width, workSize / img.height, 1);
    oc.width  = Math.round(img.width  * workScale);
    oc.height = Math.round(img.height * workScale);
    oc.getContext('2d').drawImage(img, 0, 0, oc.width, oc.height);

    let src       = cv.imread(oc);
    let gray      = new cv.Mat();
    let blurred   = new cv.Mat();
    let edges     = new cv.Mat();
    let contours  = new cv.MatVector();
    let hierarchy = new cv.Mat();

    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      cv.Canny(blurred, edges, 50, 150);

      // Dilate to close small gaps in the grid border lines
      const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
      cv.dilate(edges, edges, kernel);
      kernel.delete();

      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const minArea   = oc.width * oc.height * 0.1;
      let bestCorners = null;
      let bestArea    = 0;

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area    = cv.contourArea(contour);

        if (area >= minArea) {
          const peri   = cv.arcLength(contour, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(contour, approx, 0.02 * peri, true);

          if (approx.rows === 4 && area > bestArea) {
            bestArea = area;
            const pts = [];
            for (let j = 0; j < 4; j++) {
              pts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
            }
            bestCorners = orderCorners(pts);
          }
          approx.delete();
        }
        contour.delete();
      }

      if (!bestCorners) return null; // bestCorners are in working-canvas coordinates

      // Perspective-warp to 630×630 (= 70px per cell)
      const dstSize = 630;
      const srcArr  = bestCorners.flatMap(p => [p.x, p.y]);
      const dstArr  = [0, 0,  dstSize, 0,  dstSize, dstSize,  0, dstSize];

      const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, srcArr);
      const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, dstArr);
      const M      = cv.getPerspectiveTransform(srcPts, dstPts);
      const warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(dstSize, dstSize));

      const dest = document.createElement('canvas');
      dest.width = dest.height = dstSize;
      cv.imshow(dest, warped);

      srcPts.delete(); dstPts.delete(); M.delete(); warped.delete();
      return { gridCanvas: dest, corners: bestCorners, workScale };

    } finally {
      src.delete(); gray.delete(); blurred.delete();
      edges.delete(); contours.delete(); hierarchy.delete();
    }
  }

  // Sort 4 points into [top-left, top-right, bottom-right, bottom-left]
  function orderCorners(pts) {
    const byY    = pts.slice().sort((a, b) => a.y - b.y);
    const top    = byY.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = byY.slice(2, 4).sort((a, b) => a.x - b.x);
    return [top[0], top[1], bottom[1], bottom[0]];
  }

  // ── DIGIT RECOGNITION via Tesseract.js ──
  async function recogniseDigits(gridCanvas) {
    const gridSize = gridCanvas.width; // 630
    const cellSize = gridSize / 9;     // 70px
    const padding  = Math.floor(cellSize * 0.08);
    const outSize  = 100;
    const values   = new Array(81).fill(0);

    const worker = await Tesseract.createWorker('eng', 1, { logger: () => {} });
    await worker.setParameters({
      tessedit_char_whitelist: '123456789',
      tessedit_pageseg_mode: '6', // single uniform block — more forgiving than PSM 10
    });

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cx = col * cellSize + padding;
        const cy = row * cellSize + padding;
        const cw = cellSize - padding * 2;
        const ch = cellSize - padding * 2;

        const cellCanvas = document.createElement('canvas');
        cellCanvas.width = cellCanvas.height = outSize;
        const cctx = cellCanvas.getContext('2d');
        cctx.fillStyle = '#fff';
        cctx.fillRect(0, 0, outSize, outSize);
        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = 'high';
        cctx.drawImage(gridCanvas, cx, cy, cw, ch, 0, 0, outSize, outSize);

        preprocessCell(cctx, outSize);
        if (isCellEmpty(cellCanvas)) continue;

        // Try PSM 6 first; fall back to PSM 10 (single character) if no digit found
        let { data: { text } } = await worker.recognize(cellCanvas);
        let match = text.trim().match(/[1-9]/);
        if (!match) {
          await worker.setParameters({ tessedit_pageseg_mode: '10' });
          ({ data: { text } } = await worker.recognize(cellCanvas));
          match = text.trim().match(/[1-9]/);
          await worker.setParameters({ tessedit_pageseg_mode: '6' });
        }
        if (match) values[row * 9 + col] = parseInt(match[0]);
      }
    }

    await worker.terminate();
    return values;
  }

  // Contrast-stretch + hard binarise → clean black digit on white background
  function preprocessCell(cctx, size) {
    const id    = cctx.getImageData(0, 0, size, size);
    const d     = id.data;
    const lumas = new Float32Array(d.length / 4);

    for (let i = 0; i < lumas.length; i++) {
      lumas[i] = d[i*4] * 0.299 + d[i*4+1] * 0.587 + d[i*4+2] * 0.114;
    }

    let lo = 255, hi = 0;
    for (const l of lumas) {
      if (l < lo) lo = l;
      if (l > hi) hi = l;
    }

    // Uniform cell (empty) — fill white so isCellEmpty catches it cleanly
    if (hi - lo < 15) {
      cctx.fillStyle = '#fff';
      cctx.fillRect(0, 0, size, size);
      return;
    }

    const range = hi - lo;
    for (let i = 0; i < lumas.length; i++) {
      const bin = ((lumas[i] - lo) / range) * 255 > 110 ? 255 : 0;
      d[i*4] = d[i*4+1] = d[i*4+2] = bin;
      d[i*4+3] = 255;
    }
    cctx.putImageData(id, 0, 0);
  }

  function isCellEmpty(canvas) {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 128) dark++;
    }
    return dark / (data.length / 4) < 0.005;
  }

  // Draw detected digits over the preview canvas, aligned to the detected grid corners
  function drawOverlay(values, corners) {
    const [TL, TR, BR, BL] = corners;

    // Bilinear interpolation: map normalised (tx, ty) → pixel position in preview
    function bilerp(tx, ty) {
      return {
        x: (1-ty)*((1-tx)*TL.x + tx*TR.x) + ty*((1-tx)*BL.x + tx*BR.x),
        y: (1-ty)*((1-tx)*TL.y + tx*TR.y) + ty*((1-tx)*BL.y + tx*BR.y),
      };
    }

    // Scale font to actual cell size in the preview image
    const gridW  = Math.hypot(TR.x - TL.x, TR.y - TL.y);
    const gridH  = Math.hypot(BL.x - TL.x, BL.y - TL.y);
    const cellPx = Math.min(gridW, gridH) / 9;

    ctx.save();
    ctx.font         = `bold ${Math.max(8, Math.floor(cellPx * 0.65))}px DM Mono, monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 81; i++) {
      if (!values[i]) continue;
      const col = i % 9;
      const row = Math.floor(i / 9);

      const tx0 = col / 9, tx1 = (col + 1) / 9;
      const ty0 = row / 9, ty1 = (row + 1) / 9;

      const c00    = bilerp(tx0, ty0);
      const c10    = bilerp(tx1, ty0);
      const c11    = bilerp(tx1, ty1);
      const c01    = bilerp(tx0, ty1);
      const center = bilerp((tx0 + tx1) / 2, (ty0 + ty1) / 2);

      // Fill the cell quadrilateral (handles perspective skew)
      ctx.fillStyle = 'rgba(201,168,76,0.7)';
      ctx.beginPath();
      ctx.moveTo(c00.x, c00.y);
      ctx.lineTo(c10.x, c10.y);
      ctx.lineTo(c11.x, c11.y);
      ctx.lineTo(c01.x, c01.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0f0e0c';
      ctx.fillText(values[i], center.x, center.y);
    }
    ctx.restore();
  }

  function setOcrStatus(msg, type = '') {
    ocrStatus.textContent = msg;
    ocrStatus.className   = 'ocr-status ' + type;
  }
}
