function generateCubeLUT(size, colorTransformFn, title = "WebLUT") {
  if (!Number.isInteger(size) || size < 2 || size > 256) {
    throw new Error("LUT size must be an integer between 2 and 256.");
  }

  const cubeContent = ["# Made with WebLUT", `TITLE "${title}"`, `LUT_3D_SIZE ${size}`, ""];
  const clamp = value => Math.max(0, Math.min(1, value)).toFixed(6);

  for (let blue = 0; blue < size; blue++) {
    for (let green = 0; green < size; green++) {
      for (let red = 0; red < size; red++) {
        const input = [red, green, blue].map(channel => channel / (size - 1));
        const output = colorTransformFn(...input);
        cubeContent.push(output.map(clamp).join(" "));
      }
    }
  }

  return `${cubeContent.join("\n")}\n`;
}

function readLutValue(id) {
  const input = document.getElementById(id);
  const value = input && Number(input.value);
  if (!Number.isFinite(value)) {
    throw new Error(`Missing or invalid LUT control: ${id}`);
  }
  return value;
}

function readSelectedColor(id) {
  const display = document.getElementById(id);
  const channels = display && display.style.backgroundColor.match(/[\d.]+/g);
  if (!channels || channels.length < 3) {
    return null;
  }
  return channels.slice(0, 3).map(channel => Number(channel) / 255);
}

function createSiteColorTransform() {
  const settings = {
    intensity: readLutValue("lutIntensity") / 100,
    brightness: readLutValue("brightness") / 100,
    contrast: 1 + readLutValue("contrast") / 100,
    saturation: readLutValue("saturation") / 100,
    temperature: readLutValue("temperature"),
    tint: readLutValue("tint") / 100,
    shadows: readLutValue("shadows") / 100,
    highlights: readLutValue("highlights") / 100,
    shadowColor: readSelectedColor("shadowsColorDisplay"),
    highlightColor: readSelectedColor("highlightsColorDisplay")
  };

  return (red, green, blue) => {
    const original = [red, green, blue];
    const exposure = 1 + settings.brightness;
    red *= exposure;
    green *= exposure;
    blue *= exposure;

    red = (red - 0.5) * settings.contrast + 0.5;
    green = (green - 0.5) * settings.contrast + 0.5;
    blue = (blue - 0.5) * settings.contrast + 0.5;

    const temperatureShift = (6500 - settings.temperature) / 4500;
    red *= 1 + temperatureShift * 0.15 + settings.tint * 0.1;
    green *= 1 - settings.tint * 0.15;
    blue *= 1 - temperatureShift * 0.15 + settings.tint * 0.1;

    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const saturation = 1 + (settings.saturation - 1);
    red = luminance + (red - luminance) * saturation;
    green = luminance + (green - luminance) * saturation;
    blue = luminance + (blue - luminance) * saturation;

    const shadowWeight = (1 - luminance) ** 2;
    const highlightWeight = luminance ** 2;
    red += settings.shadows * shadowWeight * 0.25;
    green += settings.shadows * shadowWeight * 0.25;
    blue += settings.shadows * shadowWeight * 0.25;
    red += settings.highlights * highlightWeight * 0.25;
    green += settings.highlights * highlightWeight * 0.25;
    blue += settings.highlights * highlightWeight * 0.25;

    const shadowMix = Math.abs(settings.shadows) * shadowWeight * 0.2;
    const highlightMix = Math.abs(settings.highlights) * highlightWeight * 0.2;
    if (settings.shadowColor) {
      red = red * (1 - shadowMix) + settings.shadowColor[0] * shadowMix;
      green = green * (1 - shadowMix) + settings.shadowColor[1] * shadowMix;
      blue = blue * (1 - shadowMix) + settings.shadowColor[2] * shadowMix;
    }
    if (settings.highlightColor) {
      red = red * (1 - highlightMix) + settings.highlightColor[0] * highlightMix;
      green = green * (1 - highlightMix) + settings.highlightColor[1] * highlightMix;
      blue = blue * (1 - highlightMix) + settings.highlightColor[2] * highlightMix;
    }

    return [red, green, blue].map((channel, index) =>
      original[index] + (channel - original[index]) * settings.intensity
    );
  };
}

function downloadLUT() {
  const cubeContent = generateCubeLUT(33, createSiteColorTransform(), "WebLUT_Settings");
  const file = new Blob([cubeContent], { type: "text/plain" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "weblut.cube";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
