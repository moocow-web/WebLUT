function initializeColorWheel(canvasId, colorDisplayId, colorTextId, label) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const colorDisplay = document.getElementById(colorDisplayId);
    const colorText = document.getElementById(colorTextId);

    for (let angle = 0; angle < 360; angle++) {
        const startAngle = (angle - 1) * Math.PI / 180;
        const endAngle = (angle + 1) * Math.PI / 180;

        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, startAngle, endAngle);
        ctx.closePath();

        const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        gradient.addColorStop(0, `hsl(${angle}, 0%, 100%)`);
        gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

        ctx.fillStyle = gradient;
        ctx.fill();
    }

    canvas.addEventListener('click', function(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const pixel = ctx.getImageData(x, y, 1, 1).data;

        if (pixel[3] > 0) {
            const rgbColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            colorDisplay.style.backgroundColor = rgbColor;
            colorText.textContent = `${rgbColor}\n${label}`;
        }
    });
}
function shadowSet() {
    const shadowR = document.getElementById('shadowR');
    const shadowG = document.getElementById('shadowG');
    const shadowB = document.getElementById('shadowB');
    const shadowsColorDisplay = document.getElementById('shadowsColorDisplay');
    const shadowsColorText = document.getElementById('shadowsColorText');
    const channels = [shadowR.valueAsNumber, shadowG.valueAsNumber, shadowB.valueAsNumber];

    if (!channels.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
        return;
    }

    const rgbColor = `rgb(${channels.join(', ')})`;
    shadowsColorDisplay.style.backgroundColor = rgbColor;
    shadowsColorText.textContent = `${rgbColor}\nShadows`;
}
function highlightSet() {
    const highlightR = document.getElementById('highlightR');
    const highlightG = document.getElementById('highlightG');
    const highlightB = document.getElementById('highlightB');
    const highlightsColorDisplay = document.getElementById('highlightsColorDisplay');
    const highlightsColorText = document.getElementById('highlightsColorText');
    const channels = [highlightR.valueAsNumber, highlightG.valueAsNumber, highlightB.valueAsNumber];

    if (!channels.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
        return;
    }

    const rgbColor = `rgb(${channels.join(', ')})`;
    highlightsColorDisplay.style.backgroundColor = rgbColor;
    highlightsColorText.textContent = `${rgbColor}\nHighlights`;
}


initializeColorWheel('shadowsColorCanvas', 'shadowsColorDisplay', 'shadowsColorText', 'Shadows');
initializeColorWheel('highlightsColorCanvas', 'highlightsColorDisplay', 'highlightsColorText', 'Highlights');