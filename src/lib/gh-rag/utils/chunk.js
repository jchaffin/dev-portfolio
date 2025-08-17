"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkByLines = chunkByLines;
function chunkByLines(text, maxLines = 120, overlap = 30) {
    const lines = text.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length;) {
        const j = Math.min(lines.length, i + maxLines);
        out.push({ start: i + 1, end: j, text: lines.slice(i, j).join("\n") });
        if (j === lines.length)
            break;
        i = Math.max(j - overlap, j);
    }
    return out;
}
