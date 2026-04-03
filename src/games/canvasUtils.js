const backdropCache = new Map();

export function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

export function drawBackdrop(context, width, height) {
  const cacheKey = `${width}x${height}`;
  let cachedCanvas = backdropCache.get(cacheKey);

  if (!cachedCanvas) {
    // Rendering the static grid once avoids re-drawing dozens of lines every frame.
    cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = width;
    cachedCanvas.height = height;
    const cachedContext = cachedCanvas.getContext('2d');
    const background = cachedContext.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#0a0620');
    background.addColorStop(1, '#050710');
    cachedContext.fillStyle = background;
    cachedContext.fillRect(0, 0, width, height);

    const glow = cachedContext.createRadialGradient(
      width * 0.75,
      height * 0.15,
      20,
      width * 0.75,
      height * 0.15,
      260,
    );
    glow.addColorStop(0, 'rgba(60,242,255,0.18)');
    glow.addColorStop(1, 'rgba(60,242,255,0)');
    cachedContext.fillStyle = glow;
    cachedContext.fillRect(0, 0, width, height);

    cachedContext.strokeStyle = 'rgba(77,124,255,0.12)';
    cachedContext.lineWidth = 1;

    for (let x = 0; x <= width; x += 42) {
      cachedContext.beginPath();
      cachedContext.moveTo(x, 0);
      cachedContext.lineTo(x, height);
      cachedContext.stroke();
    }

    for (let y = 0; y <= height; y += 42) {
      cachedContext.beginPath();
      cachedContext.moveTo(0, y);
      cachedContext.lineTo(width, y);
      cachedContext.stroke();
    }

    cachedContext.fillStyle = 'rgba(255,255,255,0.03)';

    for (let line = 0; line < height; line += 6) {
      cachedContext.fillRect(0, line, width, 1);
    }

    backdropCache.set(cacheKey, cachedCanvas);
  }

  context.drawImage(cachedCanvas, 0, 0);
}

export function drawGlowText(context, text, x, y, color = '#ffffff', align = 'left', size = 18) {
  context.save();
  context.font = `600 ${size}px "Trebuchet MS", sans-serif`;
  context.textAlign = align;
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 10;
  context.fillText(text, x, y);
  context.restore();
}
