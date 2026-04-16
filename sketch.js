// Calendar puzzle - month tiles
// Tiles are p5-rendered, moveable, flippable, rotatable, and have transparent "hole" regions.

const TILE_COUNT = 6;
const TILE_W = 140;
const TILE_H = 200;

let tiles = [];
let selected = null;
let targetMonth = '';
let targetSlots = [];

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
  createCanvas(1000, 600);
  textAlign(CENTER, CENTER);

  // Example letters (will be replaced visually by images when available)
  const letters = ['J', 'A', 'N', 'F', 'E', 'B'];
  const margin = 18;

  // create tile objects, preferring loaded image assets when available
  for (let i = 0; i < TILE_COUNT; i++) {
    const id = i + 1;
    // force procedural front for tile 1 and 2 so they match coded shapes
    const frontImg = (id === 1 || id === 2) ? buildFrontGraphic(letters[i], TILE_W, TILE_H, id)
                         : ((imagesFront[i] && imagesFront[i].width) ? imagesFront[i] : buildFrontGraphic(letters[i], TILE_W, TILE_H, id));
    // force procedural back for tile 1 and tile 2 so flipped faces match coded shapes
    const backImg = (id === 1 || id === 2) ? buildBackGraphic(TILE_W, TILE_H, id)
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


  // layout tiles in one row; position them below the target area
  const totalW = TILE_COUNT * (TILE_W + margin) - margin;
  let startX = (width - totalW) / 2 + TILE_W / 2;
  // compute target and tile positions relative to title/instructions
  const targetCenterY = INSTR_Y + GAP_BELOW_TEXT + TILE_H / 2; // center for target slots
  const tilesY = targetCenterY + TILE_H / 2 + 30; // tiles sit below the target area

  for (let i = 0; i < tiles.length; i++) {
    tiles[i].x = startX + i * (TILE_W + margin);
    tiles[i].y = tilesY;
  }

  // target month
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  targetMonth = months[new Date().getMonth()];

  // build target slot positions so we can snap tiles to them
  targetSlots = [];
  const cols = targetMonth.length;
  const marginSlots = 18;
  const totalWSlots = cols * (TILE_W + marginSlots) - marginSlots;
  const startXSlots = (width - totalWSlots) / 2 + TILE_W / 2;
  for (let i = 0; i < cols; i++) {
    const sx = startXSlots + i * (TILE_W + marginSlots);
    targetSlots.push({ x: sx, y: targetCenterY, w: TILE_W, h: TILE_H });
  }
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

  // draw 7-seg style segments to approximate the tile images
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
  // draw a
  drawH(cx, aY, segLen, segTh);
  // draw g
  drawH(cx, gY, segLen, segTh);
  // draw d
  // draw bottom horizontal only for tiles other than tile 2
  if (id !== 2) drawH(cx, dY, segLen, segTh);
  // draw verticals f (top-left), b (top-right), e (bot-left), c (bot-right)
  drawV(leftX, topVertY, h*0.28, segTh);
  // skip drawing the upper-right vertical for tile 1 (we'll erase and shape it)
  if (id !== 1) drawV(rightX, topVertY, h*0.28, segTh);
  drawV(leftX, botVertY, h*0.28, segTh);
  // bottom-right vertical omitted for tile 2 so background green shows through
  if (id !== 2) drawV(rightX, botVertY, h*0.28, segTh);

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

  // optional: show letter overlay faintly for debugging (skip for tile 1 and tile 2)
  if (id !== 1 && id !== 2) {
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
