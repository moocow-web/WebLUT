const isolationHeaders = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp'
};

module.exports = {
    server: {
        headers: isolationHeaders
    },
    preview: {
        headers: isolationHeaders
    }
};