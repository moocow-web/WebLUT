const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const PIXELS_PER_CHUNK = 50000;
let jsZipPromise;

function loadJSZip() {
    if (window.JSZip) {
        return Promise.resolve(window.JSZip);
    }
    if (!jsZipPromise) {
        jsZipPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = JSZIP_URL;
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => {
                jsZipPromise = null;
                reject(new Error('Could not load the ZIP library.'));
            };
            document.head.appendChild(script);
        });
    }
    return jsZipPromise;
}

function processImage(file, colorTransform) {
    return createImageBitmap(file).then(async image => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            image.close();
            throw new Error(`Could not process ${file.name}.`);
        }

        context.drawImage(image, 0, 0);
        image.close();
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        for (let start = 0; start < pixels.length; start += PIXELS_PER_CHUNK * 4) {
            const end = Math.min(start + PIXELS_PER_CHUNK * 4, pixels.length);
            for (let offset = start; offset < end; offset += 4) {
                const adjusted = colorTransform(
                    pixels[offset] / 255,
                    pixels[offset + 1] / 255,
                    pixels[offset + 2] / 255
                );
                pixels[offset] = Math.round(Math.max(0, Math.min(1, adjusted[0])) * 255);
                pixels[offset + 1] = Math.round(Math.max(0, Math.min(1, adjusted[1])) * 255);
                pixels[offset + 2] = Math.round(Math.max(0, Math.min(1, adjusted[2])) * 255);
            }
            if (end < pixels.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        context.putImageData(imageData, 0, 0);
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error(`Could not encode ${file.name}.`));
                }
            }, 'image/png');
        });
    });
}

function getOutputLink() {
    let link = document.getElementById('outputLink');
    if (!link) {
        link = document.createElement('a');
        link.id = 'outputLink';
        link.textContent = 'Download processed images';
        document.body.appendChild(link);
    }
    return link;
}

async function processOne() {
    const fileInput = document.getElementById('imageInput');
    const processButton = document.getElementById('applyLut');
    const preview = document.getElementById('previewContainer');
    const file = fileInput?.files[0];

    if (!file) {
        alert('Please select an image.');
        return;
    }
    if (typeof createSiteColorTransform !== 'function') {
        alert('The LUT controls are not available.');
        return;
    }
    if (!preview) {
        alert('The image preview is not available.');
        return;
    }

    if (processButton) {
        processButton.disabled = true;
    }

    try {
        const imageBlob = await processImage(file, createSiteColorTransform());
        const objectUrl = URL.createObjectURL(imageBlob);
        const img = document.createElement('img');
        img.alt = `Processed ${file.name}`;
        img.src = objectUrl;

        if (preview.dataset.objectUrl) {
            URL.revokeObjectURL(preview.dataset.objectUrl);
        }
        preview.dataset.objectUrl = objectUrl;
        preview.replaceChildren(img);
    } catch (error) {
        console.error('Error processing image:', error);
        alert(error.message || 'An error occurred while processing the image.');
    } finally {
        if (processButton) {
            processButton.disabled = false;
        }
    }
}

async function processAll() {
    const fileInput = document.getElementById('imageInput');
    const processButton = document.getElementById('processAll');
    if (!fileInput || !fileInput.files.length) {
        alert('Please select at least one image.');
        return;
    }
    if (typeof createSiteColorTransform !== 'function') {
        alert('The LUT controls are not available.');
        return;
    }

    if (processButton) {
        processButton.disabled = true;
    }

    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        const colorTransform = createSiteColorTransform();

        for (const [index, file] of Array.from(fileInput.files).entries()) {
            const imageBlob = await processImage(file, colorTransform);
            const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[\\/\0]/g, '_');
            zip.file(`${String(index + 1).padStart(3, '0')}-${baseName}.png`, imageBlob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = getOutputLink();
        if (link.dataset.objectUrl) {
            URL.revokeObjectURL(link.dataset.objectUrl);
        }
        link.dataset.objectUrl = URL.createObjectURL(zipBlob);
        link.href = link.dataset.objectUrl;
        link.download = 'processed_images.zip';
        link.style.display = 'inline';
        link.click();
    } catch (error) {
        console.error('Error processing images:', error);
        alert(error.message || 'An error occurred while processing images.');
    } finally {
        if (processButton) {
            processButton.disabled = false;
        }
    }
}

function batchProcess() {
    return processAll();
}
