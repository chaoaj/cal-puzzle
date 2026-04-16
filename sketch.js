// Calendar puzzle - month tiles
// Tiles are p5-rendered, moveable, flippable, rotatable, and have transparent "hole" regions.

const TILE_COUNT = 6;
const TILE_W = 140;
const TILE_H = 200;

let tiles = [];
let selected = null;
let targetMonth = '';
let targetSlots = [];
let touchState = {
  startX: 0,
  startY: 0,
  startTime: 0,
  lastTapTime: 0,
  lastTapX: 0,
  lastTapY: 0,
  moved: false
};

// image assets (try to load images/1.png .. images/6.png and images/1b.png .. 6b)
let imagesFront = [];
let imagesBack = [];

// layout constants for title / instruction rows and spacing
const TITLE_Y = 30;
const INSTR_Y = 52;
const GAP_BELOW_TEXT = 30; // increased to push target area lower

function preload() {
  for (let i = 0; i < TILE_COUNT; i++) {
    const idx = i + 1;
    // front: images/1.png
    try {
      imagesFront[i] = loadImage(`images/${idx}.png`, () => {}, () => { imagesFront[i] = null; });
    } catch (e) {
      imagesFront[i] = null;
    }
    // back: images/1b.png
    try {
      imagesBack[i] = loadImage(`images/${idx}b.png`, () => {}, () => { imagesBack[i] = null; });
    } catch (e) {
      imagesBack[i] = null;
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  // Example letters (will be replaced visually by images when available)
  const letters = ['J', 'A', 'N', 'F', 'E', 'B'];
  const margin = 18;

  // create tile objects, preferring loaded image assets when available
  for (let i = 0; i < TILE_COUNT; i++) {
    const id = i + 1;
    // force procedural front for tile 1..6 so they match coded shapes
    const frontImg = (id === 1 || id === 2 || id === 3 || id === 4 || id === 5 || id === 6) ? buildFrontGraphic(letters[i], TILE_W, TILE_H, id)
           : ((imagesFront[i] && imagesFront[i].width) ? imagesFront[i] : buildFrontGraphic(letters[i], TILE_W, TILE_H, id));
    // force procedural back for tile 1..6 so flipped faces match coded shapes
    const backImg = (id === 1 || id === 2 || id === 3 || id === 4 || id === 5 || id === 6) ? buildBackGraphic(TILE_W, TILE_H, id)
         : ((imagesBack[i] && imagesBack[i].width) ? imagesBack[i] : buildBackGraphic(TILE_W, TILE_H, id));
    const t = new Tile(frontImg, backImg, letters[i], id);
    tiles.push(t);
  }

  // ensure loaded images have their pixel buffers ready for alpha sampling
  for (let i = 0; i < TILE_COUNT; i++) {
    const f = imagesFront[i];
    const b = imagesBack[i];
    if (f && f.width) {
      try { f.loadPixels(); } catch (e) {}
    }
    if (b && b.width) {
      try { b.loadPixels(); } catch (e) {}
    }
  }


  // target month
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  targetMonth = months[new Date().getMonth()];

  // build target slot positions so we can snap tiles to them
  targetSlots = [];
  layoutTiles();
}

function layoutTiles() {
  const margin = 18;
  // compute target and tile positions relative to title/instructions
  const targetCenterY = INSTR_Y + GAP_BELOW_TEXT + TILE_H / 2; // center for target slots
  const tilesY = targetCenterY + TILE_H / 2 + 30; // tiles sit below the target area

  // target month and slots
  const cols = targetMonth.length || 3;
  const marginSlots = 18;
  const totalWSlots = cols * (TILE_W + marginSlots) - marginSlots;
  const startXSlots = (width - totalWSlots) / 2 + TILE_W / 2;
  targetSlots = [];
  for (let i = 0; i < cols; i++) {
    const sx = startXSlots + i * (TILE_W + marginSlots);
    targetSlots.push({ x: sx, y: targetCenterY, w: TILE_W, h: TILE_H });
  }

  // layout tiles in one row; position them below the target area
  const totalW = TILE_COUNT * (TILE_W + margin) - margin;
  let startX = (width - totalW) / 2 + TILE_W / 2;
  for (let i = 0; i < tiles.length; i++) {
    tiles[i].x = startX + i * (TILE_W + margin);
    tiles[i].y = tilesY;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutTiles();
}

function draw() {
  background(30, 130, 200);
  drawUI();

  // draw tiles (z-order last = top)
  for (let t of tiles) t.draw();
}

function drawUI() {
  fill(255);
  textSize(28);
  text('Calendar Puzzle - Month Tiles', width/2, 30);
  textSize(16);
  fill(240);
  text('Drag tiles to the lower target area. Double-click or press F to flip. Q/E rotate.', width/2, 52);

  // target area
  // draw target area using precomputed targetSlots
  let cols = targetSlots.length || targetMonth.length;
  let totalW = cols * (TILE_W + 18) - 18;
  const y = (targetSlots.length > 0) ? targetSlots[0].y : (INSTR_Y + GAP_BELOW_TEXT + TILE_H / 2);

  push();
  noStroke();
  // make the target area background grey
  fill(120, 120, 120, 220);
  rectMode(CENTER);
  rect(width/2, y, totalW + 20, TILE_H + 30, 10);

  // draw each target slot as a black rect (swap colors)
  fill(0);
  stroke(120);
  for (let i = 0; i < cols; i++) {
    const slot = targetSlots[i] || { x: (width - totalW) / 2 + TILE_W / 2 + i * (TILE_W + 18), y };
    rect(slot.x, slot.y, TILE_W, TILE_H, 8);
  }
  noStroke();
  pop();
}

function mousePressed() {
  selected = null;
  // find topmost tile under mouse
  for (let i = tiles.length - 1; i >= 0; i--) {
    if (tiles[i].hitTest(mouseX, mouseY)) {
      selected = tiles.splice(i, 1)[0];
      tiles.push(selected);
      selected.startDrag(mouseX, mouseY);
      break;
    }
  }
}

function touchStarted() {
  // use first touch
  const tx = touches && touches.length ? touches[0].x : mouseX;
  const ty = touches && touches.length ? touches[0].y : mouseY;
  const t = millis();

  // detect double-tap
  if (t - touchState.lastTapTime < 350 && dist(tx, ty, touchState.lastTapX, touchState.lastTapY) < 30) {
    // double tap: flip topmost tile under touch
    for (let i = tiles.length - 1; i >= 0; i--) {
      if (tiles[i].hitTest(tx, ty)) {
        tiles[i].flip();
        break;
      }
    }
    touchState.lastTapTime = 0;
    touchState.moved = false;
    return false; // prevent emulated mouse
  }

  touchState.lastTapTime = t;
  touchState.lastTapX = tx;
  touchState.lastTapY = ty;
  touchState.startX = tx;
  touchState.startY = ty;
  touchState.startTime = t;
  touchState.moved = false;

  // select topmost tile under touch (like mousePressed)
  selected = null;
  for (let i = tiles.length - 1; i >= 0; i--) {
    if (tiles[i].hitTest(tx, ty)) {
      selected = tiles.splice(i, 1)[0];
      tiles.push(selected);
      selected.startDrag(tx, ty);
      break;
    }
  }
  return false;
}

function touchMoved() {
  touchState.moved = true;
  const tx = touches && touches.length ? touches[0].x : mouseX;
  const ty = touches && touches.length ? touches[0].y : mouseY;
  if (selected) selected.drag(tx, ty);
  return false;
}

function touchEnded() {
  const tx = (touches && touches.length) ? touches[0].x : mouseX;
  const ty = (touches && touches.length) ? touches[0].y : mouseY;
  const t = millis();

  // If a tile was selected and a swipe occurred, rotate accordingly
  if (selected && touchState.moved) {
    const dx = tx - touchState.startX;
    const dy = ty - touchState.startY;
    const slen = sqrt(dx*dx + dy*dy);
    if (slen > 40) {
      // determine dominant direction
      if (abs(dx) > abs(dy)) {
        // horizontal swipe: right -> clockwise, left -> counter
        if (dx > 0) selected.rotateBy(PI/2);
        else selected.rotateBy(-PI/2);
      } else {
        // vertical swipe: down -> clockwise, up -> counter
        if (dy > 0) selected.rotateBy(PI/2);
        else selected.rotateBy(-PI/2);
      }
    }
  }

  // stop dragging selection on touch end
  if (selected) selected.stopDrag();
  touchState.moved = false;
  return false;
}

function mouseReleased() {
  if (selected) {
    // snap to any target slot the tile center is released over
    for (let slot of targetSlots) {
      if (selected.x > slot.x - slot.w/2 && selected.x < slot.x + slot.w/2 &&
          selected.y > slot.y - slot.h/2 && selected.y < slot.y + slot.h/2) {
        selected.x = slot.x;
        selected.y = slot.y;
        // normalize rotation when snapping
        selected.rotation = 0;
        break;
      }
    }
    selected.stopDrag();
  }
}

function mouseDragged() {
  if (selected) selected.drag(mouseX, mouseY);
}

function doubleClicked() {
  if (selected) selected.flip();
}

function keyPressed() {
  if (!selected) return;
  if (key === 'f' || key === 'F' || key === ' ') selected.flip();
  if (key === 'q' || key === 'Q') selected.rotateBy(-PI/2);
  if (key === 'e' || key === 'E') selected.rotateBy(PI/2);
  if (key === 'r' || key === 'R') selected.rotateBy(PI);
  // send selected tile behind overlapping tiles when holding it and pressing 'b'
  if ((key === 'b' || key === 'B') && selected && selected.dragging) {
    // find indices of tiles that overlap selected
    const overlaps = [];
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      if (t === selected) continue;
      const dx = abs(t.x - selected.x);
      const dy = abs(t.y - selected.y);
      if (dx < (t.w/2 + selected.w/2) && dy < (t.h/2 + selected.h/2)) {
        overlaps.push(i);
      }
    }
    if (overlaps.length > 0) {
      const minIdx = Math.min(...overlaps);
      const selIdx = tiles.indexOf(selected);
      if (selIdx !== -1) {
        tiles.splice(selIdx, 1);
        tiles.splice(minIdx, 0, selected);
      }
    }
  }
}

class Tile {
  constructor(frontImg, backImg, letter, id) {
    this.front = frontImg;
    this.back = backImg;
    this.letter = letter;
    this.id = id || 0;
    this.x = width/2;
    this.y = height/2;
    this.w = TILE_W;
    this.h = TILE_H;
    this.showBack = false;
    this.dragging = false;
    this.offset = {x:0,y:0};
    this.rotation = 0; // radians
  }

  startDrag(mx, my) {
    this.dragging = true;
    this.offset.x = mx - this.x;
    this.offset.y = my - this.y;
  }
  drag(mx, my) {
    if (!this.dragging) return;
    this.x = mx - this.offset.x;
    this.y = my - this.offset.y;
  }
  stopDrag() { this.dragging = false; }

  flip() { this.showBack = !this.showBack; }
  rotateBy(a) { this.rotation = (this.rotation + a) % (TWO_PI); }

  hitTest(px, py) {
    // rotate point into local space
    const dx = px - this.x;
    const dy = py - this.y;
    const ca = cos(-this.rotation);
    const sa = sin(-this.rotation);
    const lx = dx * ca - dy * sa;
    const ly = dx * sa + dy * ca;
    // quick bbox test
    if (!(lx > -this.w/2 && lx < this.w/2 && ly > -this.h/2 && ly < this.h/2)) return false;

    // If we have a face image, respect its alpha (holes are click-through)
    const faceImg = this.showBack ? this.back : this.front;
    if (faceImg && faceImg.width) {
      // map local coordinates to image pixels
      const ix = floor(map(lx, -this.w/2, this.w/2, 0, faceImg.width));
      const iy = floor(map(ly, -this.h/2, this.h/2, 0, faceImg.height));
      // clamp
      const cx = constrain(ix, 0, faceImg.width - 1);
      const cy = constrain(iy, 0, faceImg.height - 1);
      // ensure pixels are loaded and then sample alpha
      try {
        if (faceImg.pixels && faceImg.pixels.length > 0) {
          const idx = 4 * (cy * faceImg.width + cx);
          const a = faceImg.pixels[idx + 3];
          return a > 10; // visible
        } else {
          // fallback to get() which returns [r,g,b,a]
          const col = faceImg.get(cx, cy);
          if (Array.isArray(col) && col.length >= 4) return col[3] > 10;
        }
      } catch (e) {
        return true;
      }
    }

    return true;
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    imageMode(CENTER);
    if (this.showBack) image(this.back, 0, 0, this.w, this.h);
    else image(this.front, 0, 0, this.w, this.h);

    if (this === selected) {
      noFill();
      stroke(255, 220, 40);
      strokeWeight(3);
      rectMode(CENTER);
      rect(0, 0, this.w + 6, this.h + 6, 10);
      rectMode(CORNER);
    }
    pop();
  }
}

// helpers: build front/back graphics and make white transparent
function buildFrontGraphic(letter, w, h, id=0) {
  const g = createGraphics(w, h);
  g.clear();
  g.noStroke();
  // base green background
  g.fill(90,160,60);
  g.rect(0,0,w,h,12);
  // If id is 5, render only a capital 'L' (left vertical + bottom horizontal)
  if (id === 5) {
    g.fill(0);
    const segTh = Math.floor(min(w,h) * 0.12);
    const segLen = Math.floor(w * 0.56);
    const cx = w/2;
    const cy = h/2;
    const dY = h * 0.82;
    const leftX = w * 0.22;
    const aY = h * 0.18;
    const rightX = w * 0.78;

    function drawH(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.rect(x, y, len, th, th/2);
      g.pop();
    }
    function drawV(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.translate(x, y);
      g.rect(0, 0, th, len, th/2);
      g.pop();
    }

    // vertical stroke (left side)
    drawV(leftX, cy, h * 0.6, segTh);
    // bottom horizontal
    drawH(cx, dY, segLen, segTh);

    // add two transparent (erased) segments: one upper horizontal
    // and one on the right outside edge (vertical notch).
    // Make them match the widths/lengths of the opposing black segments.
    g.push();
    g.erase();
    // upper horizontal: match the bottom horizontal segment length
    drawH(cx, aY, segLen, segTh);
    // right outside vertical notch: match the left vertical stroke length
    drawV(rightX, cy, h * 0.6, segTh);
    g.noErase();
    g.pop();

    return makeWhiteTransparent(g);
  }

  // If id is 6, draw an 'H' without the middle segment (draw verticals only)
  if (id === 6) {
    g.fill(0);
    const segTh = Math.floor(min(w,h) * 0.12);
    const segLen = Math.floor(w * 0.56);
    const cx = w/2;
    const cy = h/2;
    const aY = h * 0.18;
    const gY = cy;
    const dY = h * 0.82;
    const leftX = w * 0.22;
    const rightX = w * 0.78;
    const topVertY = h * 0.32;
    const botVertY = h * 0.68;

    function drawH(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.rect(x, y, len, th, th/2);
      g.pop();
    }
    function drawV(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.translate(x, y);
      g.rect(0, 0, th, len, th/2);
      g.pop();
    }

    // draw the four vertical segments (top/bottom left and right), omit the middle horizontal
    drawV(leftX, topVertY, h * 0.28, segTh);
    drawV(leftX, botVertY, h * 0.28, segTh);
    drawV(rightX, topVertY, h * 0.28, segTh);
    drawV(rightX, botVertY, h * 0.28, segTh);

    // Draw transparent regions that correspond to the back's angled erases,
    // mirrored horizontally as if the back shapes are coming through when flipped.
    g.push();
    g.erase();
    // compute the same angled segment as used on the back (upper-right),
    // then mirror it across the vertical center to place it on the front
    const cornerX = cx + segLen / 2; // right end of top segment
    const inset = segTh * 1.2;
    let startX = cornerX - 5 - inset; // inset from the corner
    let startY = aY + inset * 0.2;
    let baseTargetX = cx + segLen / 2 - segLen * (1 / 3);
    let targetX = baseTargetX - inset; // move inward from middle point
    let targetY = gY - inset * 0.2;

    // apply the same rightward shift used on the original
    startX += 10;
    targetX += 10;

    // shorten both ends by 10px as done on the back
    let dx = targetX - startX;
    let dy = targetY - startY;
    let segLenPix = sqrt(dx * dx + dy * dy);
    if (segLenPix > 20) {
      const nx = dx / segLenPix;
      const ny = dy / segLenPix;
      startX += nx * 10;
      startY += ny * 10;
      targetX -= nx * 10;
      targetY -= ny * 10;
    }

    // mirror across vertical center for front-side placement
    const sX = w - startX;
    const sY = startY;
    const tX = w - targetX;
    const tY = targetY;

    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    g.stroke(255);
    g.line(sX, sY, tX, tY);

    // also mirror the lower-right mirrored erase (mirror across horizontal then vertical)
    let startX2 = startX;
    let startY2 = cy * 2 - startY;
    let targetX2 = targetX;
    let targetY2 = cy * 2 - targetY;
    const sX2 = w - startX2;
    const sY2 = startY2;
    const tX2 = w - targetX2;
    const tY2 = targetY2;

    g.line(sX2, sY2, tX2, tY2);
    g.noErase();
    g.pop();

    // draw a black angled segment that is the horizontal mirror of the
    // transparent lower-left segment (place on the opposite side)
    (function(){
      const blackStartX = w - sX2;
      const blackStartY = sY2;
      const blackTargetX = w - tX2;
      const blackTargetY = tY2;
      g.push();
      g.stroke(0);
      g.strokeWeight(segTh);
      g.strokeCap(ROUND);
      g.line(blackStartX, blackStartY, blackTargetX, blackTargetY);
      g.pop();
    })();

    return makeWhiteTransparent(g);
  }

  // draw 7-seg style segments to approximate the tile images
  const segTh = Math.floor(min(w,h) * 0.12);
  const segLen = Math.floor(w * 0.56);
  const shortLen = Math.max(0, segLen - 20); // shorten by 10px per side when needed
  const cx = w/2;
  const cy = h/2;
  const aY = h * 0.18;
  const gY = cy;
  const dY = h * 0.82;
  const leftX = w * 0.22;
  const rightX = w * 0.78;
  const topVertY = h * 0.32;
  const botVertY = h * 0.68;

  g.fill(0); // black segments

  function drawH(x, y, len, th) {
    g.push();
    g.rectMode(CENTER);
    g.rect(x, y, len, th, th/2);
    g.pop();
  }
  function drawV(x, y, len, th) {
    g.push();
    g.rectMode(CENTER);
    g.translate(x, y);
    g.rect(0, 0, th, len, th/2);
    g.pop();
  }

  // default: draw all segments, then selectively clear for specific tiles
  // segments: a, b, c, d, e, f, g
  // draw a (top) unless tile 3 which draws split top halves later
  if (id !== 3) drawH(cx, aY, segLen, segTh);
  // draw g (middle) - shortened for tile 3
  drawH(cx, gY, (id === 3) ? shortLen : segLen, segTh);
  // draw d (bottom) - shortened for tile 3 and omitted for tile 2 and tile 4 (keep green background)
  if (id !== 2 && id !== 4) drawH(cx, dY, (id === 3) ? shortLen : segLen, segTh);
  // draw verticals f (top-left), b (top-right), e (bot-left), c (bot-right)
  // omit left/right side segments for tile 3
  if (id !== 3) drawV(leftX, topVertY, h*0.28, segTh);
  // skip drawing the upper-right vertical for tile 1 (we'll erase and shape it) and skip for tile 3
  if (id !== 1 && id !== 3) drawV(rightX, topVertY, h*0.28, segTh);
  if (id !== 3) drawV(leftX, botVertY, h*0.28, segTh);
  // bottom-right vertical omitted for tile 2, tile 3, or tile 4 so background green shows through
  if (id !== 2 && id !== 3 && id !== 4) drawV(rightX, botVertY, h*0.28, segTh);

  // tile-specific adjustments
  if (id === 1) {
    // Tile 1: erase bottom horizontal (d) and bottom-left vertical (e)
    // and create an angled erased cut replacing the upper-right segment
    g.push();
    // use erase mode so pixels are removed cleanly without stroke artifacts
    g.erase();
    // clear bottom horizontal (d) using standard segment thickness
    drawH(cx, dY, segLen + 2, segTh);
    // clear bottom-left vertical (e) using standard thickness
    drawV(leftX, botVertY, h*0.32, segTh);

    // angled erase: draw a rounded erased stroke from just before the
    // top-right corner down to the middle segment (~1/3 from right)
    const cornerX = cx + segLen/2; // right end of top segment
    // increase inset so the erased stroke stays visibly inside the black segments
    const inset = segTh * 1.2;
    let startX = cornerX - 5 - inset; // inset from the corner
    let startY = aY + inset * 0.2;
    let baseTargetX = cx + segLen/2 - segLen * (1/3);
    let targetX = baseTargetX - inset; // move inward from middle point
    let targetY = gY - inset * 0.2;

    // move the whole segment 10 pixels to the right
    startX += 10;
    targetX += 10;

    // shorten both ends by 10 pixels along the segment direction
    const dx = targetX - startX;
    const dy = targetY - startY;
    const segLenPix = sqrt(dx*dx + dy*dy);
    if (segLenPix > 20) {
      const nx = dx / segLenPix;
      const ny = dy / segLenPix;
      // shorten both ends by 10px (previously 5px, user requested another 5px)
      startX += nx * 10;
      startY += ny * 10;
      targetX -= nx * 10;
      targetY -= ny * 10;
    }

    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    g.stroke(255);
    g.line(startX, startY, targetX, targetY);

    g.noErase();
    g.pop();
  }

  if (id === 2) {
    // Tile 2: make a 'P' where the mid segment is transparent and add
    // an angled erased stroke from the left-bottom toward the middle segment.
    g.push();
    g.erase();
    // erase middle horizontal (g)
    drawH(cx, gY, segLen + 2, segTh);

    // keep bottom and bottom-right visible (make them green) — do NOT erase here

    // angled erase from lower-left area toward the middle
    const startX = leftX - 6; // slightly left of the left vertical
    const startY = dY - segTh * 0.2; // near bottom horizontal
    const targetX = cx - segLen * 0.15; // a bit left of center
    const targetY = gY - segTh * 0.1; // slightly above middle
    // move angled segment right 20px (previously +50, now moved back by 30px)
    let adjStartX = startX + 20;
    let adjTargetX = targetX + 20;

    // compute direction and shorten ends by 10px for consistency
    let dx2 = adjTargetX - adjStartX;
    let dy2 = targetY - startY;
    let segLenPix2 = sqrt(dx2 * dx2 + dy2 * dy2);
    let sX = adjStartX, sY = startY, tX = adjTargetX, tY = targetY;
    if (segLenPix2 > 20) {
      const nx2 = dx2 / segLenPix2;
      const ny2 = dy2 / segLenPix2;
      sX += nx2 * 10;
      sY += ny2 * 10;
      tX -= nx2 * 10;
      tY -= ny2 * 10;
    }

    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    g.stroke(255);
    g.line(sX, sY, tX, tY);

    g.noErase();
    g.pop();
  }

  if (id === 3) {
    // Tile 3: draw a 'T' with the top segment separated (gap in center)
    // and make the middle and bottom segments transparent.
    g.push();
    // clear the top segment entirely first
    g.erase();
    drawH(cx, aY, segLen + 2, segTh);
    // also clear middle and bottom to make them transparent
    drawH(cx, gY, segLen + 2, segTh);
    drawH(cx, dY, segLen + 2, segTh);
    g.noErase();

    // draw the T: top split into two halves with a center gap
    const gap = Math.max(8, Math.floor(segTh * 0.9));
    const halfLen = (segLen - gap) / 2;
    const leftTopX = cx - (gap/2) - (halfLen/2);
    const rightTopX = cx + (gap/2) + (halfLen/2);
    g.fill(0);
    drawH(leftTopX, aY, halfLen, segTh);
    drawH(rightTopX, aY, halfLen, segTh);

    // draw a short vertical stem centered under the top
    drawV(cx, aY + (segTh + (h*0.18))/2, h * 0.32, Math.floor(segTh * 0.9));

    // add a mid-bottom vertical segment centered near the lower area
    drawV(cx, botVertY, h * 0.22, segTh);

    g.pop();
  }

  if (id === 4) {
    // Tile 4 front: add a mirrored angled erase on the right half (like tile 2 but mirrored)
    g.push();
    g.erase();
    // angled erase from lower-right area toward the middle-right segment
    const startX4 = rightX + 6; // slightly right of the right vertical
    const startY4 = dY - segTh * 0.2; // near bottom horizontal
    const targetX4 = cx + segLen * 0.15; // a bit right of center
    const targetY4 = gY - segTh * 0.1; // slightly above middle
    // move the whole angled segment left by 20px (mirror of tile2's right-shift)
    let adjStartX4 = startX4 - 20;
    let adjTargetX4 = targetX4 - 20;

    // compute direction and shorten ends by 10px for consistency
    let dx4 = adjTargetX4 - adjStartX4;
    let dy4 = targetY4 - startY4;
    let segLenPix4 = sqrt(dx4 * dx4 + dy4 * dy4);
    let sX4 = adjStartX4, sY4 = startY4, tX4 = adjTargetX4, tY4 = targetY4;
    if (segLenPix4 > 20) {
      const nx4 = dx4 / segLenPix4;
      const ny4 = dy4 / segLenPix4;
      sX4 += nx4 * 10;
      sY4 += ny4 * 10;
      tX4 -= nx4 * 10;
      tY4 -= ny4 * 10;
    }

    // further shorten the top end by 15px to meet the requested trim
    const dxF = tX4 - sX4;
    const dyF = tY4 - sY4;
    const segLenF = sqrt(dxF * dxF + dyF * dyF);
    if (segLenF > 15) {
      const nxF = dxF / segLenF;
      const nyF = dyF / segLenF;
      tX4 -= nxF * 15;
      tY4 -= nyF * 15;
    }

    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    g.stroke(255);
    g.line(sX4, sY4, tX4, tY4);

    g.noErase();
    g.pop();
  }



  // optional: show letter overlay faintly for debugging (skip for tile 1..4)
  if (id !== 1 && id !== 2 && id !== 3 && id !== 4) {
    g.fill(255, 30);
    g.textAlign(CENTER, CENTER);
    g.textSize(w * 0.2);
    g.text(letter, w/2, h - 20);
  }

  return makeWhiteTransparent(g);
}

function buildBackGraphic(w, h, id) {
  const g = createGraphics(w, h);
  g.clear();
  g.noStroke();

  // base back color (slightly different from front)
  g.fill(120, 120, 140);
  g.rect(0, 0, w, h, 12);

  // If tile 1, build a procedural "backwards C" that mirrors the angled piece
  if (id === 1) {
    // make back background match the front green
    g.fill(90, 160, 60);
    g.rect(0, 0, w, h, 12);

    // draw a reduced set of dark segments: keep top and upper-right only
    const segTh = Math.floor(min(w, h) * 0.12);
    const segLen = Math.floor(w * 0.56);
    const cx = w / 2;
    const cy = h / 2;
    const aY = h * 0.18;
    const dY = h * 0.82;
    const rightX = w * 0.78;
    const topVertY = h * 0.32;

    function drawH(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.rect(x, y, len, th, th / 2);
      g.pop();
    }
    function drawV(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.translate(x, y);
      g.rect(0, 0, th, len, th / 2);
      g.pop();
    }

    // draw top horizontal only (no mid segment)
    g.fill(0);
    drawH(cx, aY, segLen, segTh);
    // draw upper-right vertical only (omit left two segments)
    drawV(rightX, topVertY, h * 0.28, segTh);

    // erase bottom-right vertical (c) and bottom horizontal (d) to make them transparent
    g.push();
    g.erase();
    drawV(rightX, h * 0.68, h * 0.32, segTh);
    drawH(cx, dY, segLen + 2, segTh);

    // keep a mirrored angled erase stroke for the flipped match, positioned accordingly
    const cornerX = cx - segLen / 2; // left end of top segment
    const inset = segTh * 1.2;
    let startX = cornerX + 5 + inset; // inset from the corner
    let startY = aY + inset * 0.2;
    let baseTargetX = cx - segLen / 2 + segLen * (1 / 3);
    let targetX = baseTargetX + inset;
    let targetY = cy - inset * 0.2 * 1;

    startX -= 10;
    targetX -= 10;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const segLenPix = sqrt(dx * dx + dy * dy);
    if (segLenPix > 20) {
      const nx = dx / segLenPix;
      const ny = dy / segLenPix;
      startX += nx * 10;
      startY += ny * 10;
      targetX -= nx * 10;
      targetY -= ny * 10;
    }

    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    g.stroke(255);
    g.line(startX, startY, targetX, targetY);

    g.noErase();
    g.pop();

    return makeWhiteTransparent(g);
  }
  if (id === 4) {
    // Tile 4 back: produce only the transparent regions of the front,
    // mirrored across the vertical axis (flip over vertically).
    // Start with green background and erase the mirrored transparent shapes.
    g.fill(90, 160, 60);
    g.rect(0, 0, w, h, 12);

    const segTh = Math.floor(min(w, h) * 0.12);
    const segLen = Math.floor(w * 0.56);
    const cx = w / 2;
    const cy = h / 2;
    const aY = h * 0.18;
    const gY = cy;
    const dY = h * 0.82;
    const leftX = w * 0.22;
    const rightX = w * 0.78;
    const topVertY = h * 0.32;
    const botVertY = h * 0.68;

    function drawH(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.rect(x, y, len, th, th / 2);
      g.pop();
    }
    function drawV(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.translate(x, y);
      g.rect(0, 0, th, len, th / 2);
      g.pop();
    }

    // draw left-bottom vertical as a black piece (keep it filled)
    g.fill(0);
    drawV(leftX, botVertY, h * 0.32, segTh);

    // mirrored angled erase: mirror the front's right-half angled stroke across center
    g.push();
    g.erase();
    // erase a vertical segment on the left-top half to create the transparent piece
    drawV(leftX, topVertY, h * 0.28, segTh);

    const frontStartX = rightX + 6;
    const frontStartY = dY - segTh * 0.2;
    const frontTargetX = cx + segLen * 0.15;
    const frontTargetY = gY - segTh * 0.1;
    // front had a left shift of 20 when drawn; mirror that transform here
    let adjFrontStartX = frontStartX - 20;
    let adjFrontTargetX = frontTargetX - 20;

    // mirror across vertical center
    let sX = w - adjFrontStartX;
    let sY = frontStartY;
    let tX = w - adjFrontTargetX;
    let tY = frontTargetY;

    // shorten both ends by 10px
    let dx = tX - sX;
    let dy = tY - sY;
    let segLenPix = sqrt(dx * dx + dy * dy);
    if (segLenPix > 20) {
      const nx = dx / segLenPix;
      const ny = dy / segLenPix;
      sX += nx * 10;
      sY += ny * 10;
      tX -= nx * 10;
      tY -= ny * 10;
    }

    // apply the same additional top-end shortening (15px) that the front used
    const dxF = tX - sX;
    const dyF = tY - sY;
    const segLenF = sqrt(dxF * dxF + dyF * dyF);
    if (segLenF > 15) {
      const nxF = dxF / segLenF;
      const nyF = dyF / segLenF;
      tX -= nxF * 15;
      tY -= nyF * 15;
    }

    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    g.stroke(255);
    g.line(sX, sY, tX, tY);

    // stop erasing and draw a black continuation that extends the angled transparent
    // right-side arm of the V up toward the top-right
    g.noErase();
    g.push();
    g.stroke(0);
    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    const dxExt = tX - sX;
    const dyExt = tY - sY;
    const segExtL = sqrt(dxExt * dxExt + dyExt * dyExt);
    if (segExtL > 0.001) {
      const nxExt = dxExt / segExtL;
      const nyExt = dyExt / segExtL;
      // base extension length
      let extLen = w * 0.6;
      // shorten the extension by 30px as requested earlier
      const shortenBy = 30;
      if (extLen > shortenBy) extLen -= shortenBy;

      // compute desired top Y to align with the top of the left-top segment
      const desiredTopY = topVertY - (h * 0.28) / 2;
      // compute length needed so the extension's end Y equals desiredTopY
      let L = extLen;
      if (Math.abs(nyExt) > 1e-6) {
        const needed = (desiredTopY - tY) / nyExt;
        // clamp needed to a reasonable range to avoid extreme shifts
        L = constrain(needed, -w * 0.9, w * 0.9);
      }

      // trim 20px from both the start and end of the drawn continuation
      const trim = 20;
      // original end point
      const origEndX = tX + nxExt * L;
      const origEndY = tY + nyExt * L;
      // compute trimmed start and end along the direction vector
      const startBX = tX + nxExt * trim;
      const startBY = tY + nyExt * trim;
      const endBX = origEndX - nxExt * trim;
      const endBY = origEndY - nyExt * trim;

      // only draw if trimmed length is positive
      const dxTrim = endBX - startBX;
      const dyTrim = endBY - startBY;
      const lenTrim = sqrt(dxTrim * dxTrim + dyTrim * dyTrim);
      if (lenTrim > 1) {
        g.line(startBX, startBY, endBX, endBY);
      }
    }
    g.pop();
    g.pop();

    return makeWhiteTransparent(g);
  }

  if (id === 5) {
    // Tile 5 back: draw an uppercase 'F' and include the same upper-right
    // angled piece as tile4 back. Make top, left-above-middle, and
    // right-below-middle portions of the F transparent.
    g.fill(90, 160, 60);
    g.rect(0, 0, w, h, 12);

    const segTh = Math.floor(min(w, h) * 0.12);
    const segLen = Math.floor(w * 0.56);
    const cx = w / 2;
    const cy = h / 2;
    const aY = h * 0.18;
    const gY = cy;
    const dY = h * 0.82;
    const leftX = w * 0.22;
    const rightX = w * 0.78;
    const topVertY = h * 0.32;
    const botVertY = h * 0.68;

    function drawH(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.rect(x, y, len, th, th / 2);
      g.pop();
    }
    function drawV(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.translate(x, y);
      g.rect(0, 0, th, len, th / 2);
      g.pop();
    }

    // draw an 'F' by drawing horizontals and erasing the left-side verticals
    g.fill(0);
    drawH(cx, aY, segLen, segTh); // top horizontal
    drawH(cx, gY, segLen * 0.9, segTh); // middle horizontal

    // erase parts to form the F: extend top-left transparent region and
    // add a lower-left vertical transparent portion
    g.push();
    g.erase();
    // erase the left side at the top to extend the top-left transparent area
    drawV(leftX, topVertY, h * 0.28, segTh);
    // erase top horizontal (wider)
    drawH(cx, aY, segLen + 2, segTh);
    // erase left vertical above the middle (existing)
    drawV(leftX, (topVertY + gY) / 2, (gY - topVertY) * 0.9, segTh);
    // erase lower-left vertical to create the F's lower-left transparent portion
    // extend to full bottom segment height like other 7-seg letters
    drawV(leftX, botVertY, h * 0.32, segTh);
    g.noErase();
    g.pop();

    // draw a black angled segment on this back that matches the
    // upper-right angled transparent segment from tile 1 front
    // (placement and length match tile1's pattern)
    (function() {
      const cornerX = cx + segLen / 2; // right end of top segment
      const inset = segTh * 1.2;
      let startX = cornerX - 5 - inset; // inset from the corner
      let startY = aY + inset * 0.2;
      let baseTargetX = cx + segLen / 2 - segLen * (1/3);
      let targetX = baseTargetX - inset; // move inward from middle point
      let targetY = gY - inset * 0.2;

      // move the whole segment 10 pixels to the right (same shift used on tile1)
      startX += 10;
      targetX += 10;

      // shorten both ends by 10 pixels along the segment direction (match tile1)
      let dx = targetX - startX;
      let dy = targetY - startY;
      let segLenPix = sqrt(dx * dx + dy * dy);
      if (segLenPix > 20) {
        const nx = dx / segLenPix;
        const ny = dy / segLenPix;
        startX += nx * 10;
        startY += ny * 10;
        targetX -= nx * 10;
        targetY -= ny * 10;
      }

      g.push();
      g.stroke(0);
      g.strokeWeight(segTh);
      g.strokeCap(ROUND);
      g.line(startX, startY, targetX, targetY);
      g.pop();
    })();

    return makeWhiteTransparent(g);
  }

  if (id === 6) {
    // Tile 6 back: draw an 'E' using 7-seg style sections
    g.fill(90, 160, 60);
    g.rect(0, 0, w, h, 12);

    const segTh = Math.floor(min(w, h) * 0.12);
    const segLen = Math.floor(w * 0.56);
    const cx = w / 2;
    const cy = h / 2;
    const aY = h * 0.18;
    const gY = cy;
    const dY = h * 0.82;
    const leftX = w * 0.22;
    const rightX = w * 0.78;
    const topVertY = h * 0.32;
    const botVertY = h * 0.68;

    function drawH(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.rect(x, y, len, th, th / 2);
      g.pop();
    }
    function drawV(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.translate(x, y);
      g.rect(0, 0, th, len, th / 2);
      g.pop();
    }

    g.fill(0);
    // E: top, upper-left, middle, lower-left, bottom
    drawH(cx, aY, segLen, segTh);
    drawV(leftX, topVertY, h * 0.28, segTh);
    drawH(cx, gY, segLen, segTh);
    drawV(leftX, botVertY, h * 0.28, segTh);
    drawH(cx, dY, segLen, segTh);

    // add the same upper-right transparent angled segment as tile 1 front
    g.push();
    g.erase();
    const cornerX = cx + segLen / 2; // right end of top segment
    const inset = segTh * 1.2;
    let startX = cornerX - 5 - inset; // inset from the corner
    let startY = aY + inset * 0.2;
    let baseTargetX = cx + segLen / 2 - segLen * (1 / 3);
    let targetX = baseTargetX - inset; // move inward from middle point
    let targetY = gY - inset * 0.2;

    // move the whole segment 10 pixels to the right
    startX += 10;
    targetX += 10;

    // shorten both ends by 10 pixels along the segment direction
    let dx = targetX - startX;
    let dy = targetY - startY;
    let segLenPix = sqrt(dx * dx + dy * dy);
    if (segLenPix > 20) {
      const nx = dx / segLenPix;
      const ny = dy / segLenPix;
      startX += nx * 10;
      startY += ny * 10;
      targetX -= nx * 10;
      targetY -= ny * 10;
    }

    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    g.stroke(255);
    g.line(startX, startY, targetX, targetY);
    g.noErase();
    g.pop();
    // also draw a horizontal-mirrored (vertical flip) copy of that erase in lower-right
    g.push();
    g.erase();
    // mirror across horizontal center
    let startX2 = startX;
    let startY2 = cy * 2 - startY;
    let targetX2 = targetX;
    let targetY2 = cy * 2 - targetY;

    // compute direction and normalize
    let dx2 = targetX2 - startX2;
    let dy2 = targetY2 - startY2;
    let segLenPix2 = sqrt(dx2 * dx2 + dy2 * dy2);
    if (segLenPix2 > 1e-6) {
      const nx2 = dx2 / segLenPix2;
      const ny2 = dy2 / segLenPix2;
      // set the mirrored segment to exact length of the top horizontal segment,
      // but shorten it by 20px on each side as requested
      const sideTrim = 20;
      const desiredLen = Math.max(0, segLen - sideTrim * 2);
      const midX = (startX2 + targetX2) / 2;
      const midY = (startY2 + targetY2) / 2;
      const half = desiredLen / 2;
      const newStartX = midX - nx2 * half;
      const newStartY = midY - ny2 * half;
      const newTargetX = midX + nx2 * half;
      const newTargetY = midY + ny2 * half;

      g.strokeWeight(segTh);
      g.strokeCap(ROUND);
      g.stroke(255);
      g.line(newStartX, newStartY, newTargetX, newTargetY);
    }
    g.noErase();
    g.pop();

    return makeWhiteTransparent(g);
  }

  // If tile 3, draw an '8' but make middle and bottom-mid sections transparent
  if (id === 3) {
    // match front green background
    g.fill(90, 160, 60);
    g.rect(0, 0, w, h, 12);

    const segTh = Math.floor(min(w, h) * 0.12);
    const segLen = Math.floor(w * 0.56);
    const cx = w / 2;
    const cy = h / 2;
    const aY = h * 0.18;
    const gY = cy;
    const dY = h * 0.82;
    const leftX = w * 0.22;
    const rightX = w * 0.78;
    const topVertY = h * 0.32;
    const botVertY = h * 0.68;

    function drawH(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.rect(x, y, len, th, th / 2);
      g.pop();
    }
    function drawV(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.translate(x, y);
      g.rect(0, 0, th, len, th / 2);
      g.pop();
    }

    g.fill(0);
    // draw full 8 (all segments)
    drawH(cx, aY, segLen, segTh);
    drawH(cx, gY, segLen, segTh);
    // bottom horizontal left out so the background green shows through
    drawV(leftX, topVertY, h * 0.28, segTh);
    drawV(rightX, topVertY, h * 0.28, segTh);
    drawV(leftX, botVertY, h * 0.28, segTh);
    drawV(rightX, botVertY, h * 0.28, segTh);

    // erase middle horizontal entirely and erase only the center portion of the bottom horizontal
    // (leave bottom-left and bottom-right verticals intact)
    g.push();
    g.erase();
    // full middle horizontal
    drawH(cx, gY, segLen + 2, segTh);
    // erase the center portion of bottom horizontal (bottom-mid section only)
    // widen by 20px on each side (total +40px)
    const centerClearW = segLen * 0.5 + 40;
    drawH(cx, dY, centerClearW, segTh);
    g.noErase();
    g.pop();

    return makeWhiteTransparent(g);
  }

  // If tile 2, build a procedural 'B' that keeps the mid segment transparent
  if (id === 2) {
    // make back background match the front green
    g.fill(90, 160, 60);
    g.rect(0, 0, w, h, 12);

    const segTh = Math.floor(min(w, h) * 0.12);
    const segLen = Math.floor(w * 0.56);
    const cx = w / 2;
    const cy = h / 2;
    const aY = h * 0.18;
    const gY = cy;
    const dY = h * 0.82;
    const leftX = w * 0.22;
    const rightX = w * 0.78;
    const topVertY = h * 0.32;
    const botVertY = h * 0.68;

    function drawH(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.rect(x, y, len, th, th / 2);
      g.pop();
    }
    function drawV(x, y, len, th) {
      g.push();
      g.rectMode(CENTER);
      g.translate(x, y);
      g.rect(0, 0, th, len, th / 2);
      g.pop();
    }

    // draw B-like shape: left vertical and top/bottom horizontals and right bulges
    g.fill(0);
    // left vertical
    drawV(leftX, cy, h * 0.8, segTh);
    // top and bottom horizontals
    drawH(cx, aY, segLen, segTh);
    drawH(cx, dY, segLen, segTh);
    // right-side bulges (upper and lower)
    drawV(rightX, topVertY, h * 0.28, segTh);
    drawV(rightX, botVertY, h * 0.28, segTh);

    // erase mid horizontal to make it transparent (mid segment removed)
    g.push();
    g.erase();
    drawH(cx, gY, segLen + 2, segTh);

    // add mirrored angled erase: mirror front's angled stroke horizontally
    // front's angled (before adjustments) used startX = leftX - 6 and targetX = cx - segLen*0.15
    const frontStartX = leftX - 6;
    const frontStartY = dY - segTh * 0.2;
    const frontTargetX = cx - segLen * 0.15;
    const frontTargetY = gY - segTh * 0.1;
    // front had +20 net shift (adj) and then shortened by 10px each end in current code
    const adjFrontStartX = frontStartX + 20;
    const adjFrontTargetX = frontTargetX + 20;

    // mirror across center: x_back = w - x_front
    let sX = w - adjFrontStartX;
    let sY = frontStartY;
    let tX = w - adjFrontTargetX;
    let tY = frontTargetY;

    // shorten both ends by 10px for consistency
    let dx = tX - sX;
    let dy = tY - sY;
    let segL = sqrt(dx * dx + dy * dy);
    if (segL > 20) {
      const nx = dx / segL;
      const ny = dy / segL;
      sX += nx * 10;
      sY += ny * 10;
      tX -= nx * 10;
      tY -= ny * 10;
    }

    g.strokeWeight(segTh);
    g.strokeCap(ROUND);
    g.stroke(255);
    g.line(sX, sY, tX, tY);

    g.noErase();
    g.pop();

    return makeWhiteTransparent(g);
  }

  // default back for other tiles
  g.fill(255);
  g.textAlign(CENTER, CENTER);
  g.textSize(16);
  g.text('BACK', w / 2, h - 20);
  return makeWhiteTransparent(g);
}

function makeWhiteTransparent(gfx) {
  const img = gfx.get();
  img.loadPixels();
  for (let y=0; y<img.height; y++) {
    for (let x=0; x<img.width; x++) {
      const idx = 4*(y*img.width + x);
      const r = img.pixels[idx];
      const gg = img.pixels[idx+1];
      const b = img.pixels[idx+2];
      if (r>240 && gg>240 && b>240) {
        img.pixels[idx+3] = 0;
      }
    }
  }
  img.updatePixels();
  return img;
}
