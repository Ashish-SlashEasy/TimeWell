import QRCode from "qrcode";
import sharp from "sharp";

const LOGO_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="60" height="60" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="36.5159" y="36.516" width="36.5159" height="36.5159" transform="rotate(180 36.5159 36.516)" fill="#3F3F3F"/>
<g clip-path="url(#c)">
<path d="M19.3076 13.8959C18.9786 13.483 18.4852 13.2496 17.9607 13.2496C17.4362 13.2496 16.9428 13.4875 16.6139 13.8959L15.4493 15.3458L16.0716 16.1179L16.6939 16.89L17.9652 15.3099L26.3928 25.899L26.4017 25.908C26.4995 26.0292 26.4995 26.2043 26.4462 26.312C26.424 26.3569 26.3751 26.4646 26.1306 26.4646L9.79088 26.4646C9.61308 26.4646 9.51084 26.4063 9.44861 26.2761C9.38194 26.1369 9.39527 25.9619 9.47528 25.8586L13.7113 20.5932L13.089 19.8212L12.4667 19.0491L7.97733 24.6332C7.42615 25.32 7.31947 26.294 7.70619 27.1155C8.08845 27.928 8.87077 28.4172 9.79088 28.4172L26.1306 28.4172C27.0462 28.4127 27.8152 27.9414 28.1886 27.1514C28.5664 26.3434 28.4553 25.3783 27.9041 24.687L19.312 13.8959L19.3076 13.8959Z" fill="white"/>
<path d="M7.98662 11.2071L16.5787 21.9937C16.9077 22.4067 17.4011 22.6401 17.9256 22.6401C18.4501 22.6401 18.9435 22.4022 19.2724 21.9937L20.437 20.5439L19.8147 19.7718L19.1924 18.9997L17.9211 20.5798L9.48902 9.99067L9.48013 9.9817C9.38234 9.8605 9.38234 9.68544 9.43568 9.5777C9.45791 9.53282 9.5068 9.42508 9.75127 9.42508L26.0954 9.42508C26.2732 9.42508 26.3755 9.48344 26.4377 9.61361C26.5044 9.75276 26.491 9.92783 26.411 10.0311L22.175 15.2964L22.7973 16.0685L23.4196 16.8406L27.909 11.2565C28.4602 10.5697 28.5668 9.59566 28.1801 8.77421C27.7979 7.96173 27.0155 7.47245 26.0954 7.47245L9.75572 7.47245C8.84006 7.47245 8.07552 7.94378 7.70214 8.7383C7.32432 9.54628 7.43544 10.5114 7.98662 11.2027L7.98662 11.2071Z" fill="white"/>
</g>
<defs>
<clipPath id="c">
<rect width="20.9358" height="20.9358" fill="white" transform="translate(28.4105 28.4127) rotate(180)"/>
</clipPath>
</defs>
</svg>`;

export async function generateQrWithLogo(url: string): Promise<Buffer> {
  const qrSize = 400;
  const logoSize = 107;
  const inset = Math.round(qrSize * 0.05);
  const qrBuffer = await QRCode.toBuffer(url, { width: qrSize, margin: 2 });
  const logoPng = await sharp(Buffer.from(LOGO_SVG)).resize(logoSize, logoSize).png().toBuffer();

  const withLogo = await sharp(qrBuffer)
    .composite([{ input: logoPng, top: qrSize - logoSize - inset, left: qrSize - logoSize - inset }])
    .png()
    .toBuffer();

  return sharp(withLogo).rotate(270).png().toBuffer();
}

export async function generateQrDiamondBadge(qrBuffer: Buffer, outerSize: number): Promise<Buffer> {
  // Rotating a square of side d by 45° produces a bounding box of d*√2 × d*√2.
  // Size the QR so that after rotation it fills exactly outerSize × outerSize.
  const innerSize = Math.round(outerSize / Math.SQRT2);

  const qrRotated = await sharp(qrBuffer)
    .resize(innerSize, innerSize)
    .rotate(45, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .resize(outerSize, outerSize, { fit: "fill" })
    .png()
    .toBuffer();

  const half = outerSize / 2;
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerSize}" height="${outerSize}">
    <polygon points="${half},0 ${outerSize},${half} ${half},${outerSize} 0,${half}" fill="white"/>
  </svg>`;
  const maskBuf = await sharp(Buffer.from(maskSvg)).png().toBuffer();

  return sharp({
    create: { width: outerSize, height: outerSize, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } },
  })
    .composite([
      { input: qrRotated, top: 0, left: 0 },
      { input: maskBuf, blend: "dest-in" },
    ])
    .png()
    .toBuffer();
}

export async function composeCardImage(
  photoBuffer: Buffer,
  orientation: "landscape" | "portrait",
  qrBuffer: Buffer,
  variant: "web" | "thumb",
): Promise<Buffer> {
  const isPortrait = orientation === "portrait";
  let cardW: number, cardH: number, base: number;
  if (variant === "web") {
    [cardW, cardH] = isPortrait ? [640, 853] : [900, 675];
    base = isPortrait ? 320 : 600;
  } else {
    // thumb is landscape
    [cardW, cardH] = [267, 200];
    base = 320;
  }

  const s = cardW / base;
  const padSide = Math.round(20 * s);
  const padTop = padSide;
  const padBottom = Math.round(48 * s);
  const photoW = cardW - padSide * 2;
  const photoH = cardH - padTop - padBottom;

  const photo = await sharp(photoBuffer)
    .resize(photoW, photoH, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90 })
    .toBuffer();

  const qrOuter = Math.round(56 * 1.2 * 1.15 * s);
  const diamond = await generateQrDiamondBadge(qrBuffer, qrOuter);
  const qrLeft = Math.round((cardW - qrOuter) / 2);
  const qrTop = padTop + photoH - Math.round(qrOuter / 2);

  return sharp({
    create: { width: cardW, height: cardH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } },
  })
    .composite([
      { input: photo, top: padTop, left: padSide },
      { input: diamond, top: qrTop, left: qrLeft },
    ])
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: variant === "web" ? 90 : 82 })
    .toBuffer();
}
