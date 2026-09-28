import JSZip from 'jszip';

const PIXELS_PER_CHUNK = 50000;
const RAW_EXTENSIONS = new Set([
    '3fr', 'ari', 'arw', 'bay', 'cap', 'cr2', 'cr3', 'dcs', 'dcr', 'dng', 'drf',
    'eip', 'erf', 'fff', 'gpr', 'iiq', 'k25', 'kdc', 'mdc', 'mef', 'mos', 'mrw',
    'nef', 'nrw', 'obm', 'orf', 'pef', 'ptx', 'pxn', 'r3d', 'raf', 'raw', 'rw2',
    'rwl', 'sr2', 'srf', 'srw', 'x3f'
]);

function getRawExtension(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    return RAW_EXTENSIONS.has(extension) ? extension : null;
}

async function decodeRawImage(file) {
    if (!window.LibRaw) {
        throw new Error('The RAW image decoder is still loading. Please try again.');
    }

    const decoder = new window.LibRaw();
    try {
        await decoder.open(new Uint8Array(await file.arrayBuffer()), {
            outputBps: 8,
            outputColor: 1,
            useCameraWb: true,
            useCameraMatrix: 1
        });
        const decoded = await decoder.imageData();
        if (!decoded || decoded.colors < 3) {
            throw new Error(`Could not decode ${file.name} into RGB pixels.`);
        }

        const rgba = new Uint8ClampedArray(decoded.width * decoded.height * 4);
        for (let source = 0, target = 0; source < decoded.data.length; source += decoded.colors, target += 4) {
            rgba[target] = decoded.data[source];
            rgba[target + 1] = decoded.data[source + 1];
            rgba[target + 2] = decoded.data[source + 2];
            rgba[target + 3] = decoded.colors > 3 ? decoded.data[source + 3] : 255;
        }

        return new ImageData(rgba, decoded.width, decoded.height);
    } catch {
        throw new Error(`Could not decode ${file.name}. This RAW file may use an unsupported format or compression.`);
    } finally {
        decoder.dispose();
    }
}

async function processImage(file, colorTransform) {
        let imageData;
        const rawExtension = getRawExtension(file);
        if (rawExtension) {
            imageData = await decodeRawImage(file);
        } else {
            let image;
            try {
                image = await createImageBitmap(file);
            } catch {
                throw new Error(`Could not open ${file.name}. Select a supported image or camera RAW file.`);
            }

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
            imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        }

        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            throw new Error(`Could not process ${file.name}.`);
        }

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
    if (typeof window.createSiteColorTransform !== 'function') {
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
        const imageBlob = await processImage(file, window.createSiteColorTransform());
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
    if (typeof window.createSiteColorTransform !== 'function') {
        alert('The LUT controls are not available.');
        return;
    }

    if (processButton) {
        processButton.disabled = true;
    }

    try {
        const zip = new JSZip();
        const colorTransform = window.createSiteColorTransform();

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


window.processOne = processOne;
window.processAll = processAll;
window.batchProcess = batchProcess;
