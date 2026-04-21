import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "profanity.txt");

const raw = fs.readFileSync(filePath, "utf-8");

// ─────────────────────────────────────────────
// Clean + normalize word list
// ─────────────────────────────────────────────
const words = raw
    .split(/\r?\n/)
    .map((w) => w.replace(/\uFEFF/g, "")) // remove BOM
    .map((w) => w.trim().toLowerCase()) // trim + lowercase
    .filter((w) => w.length > 1); // remove junk

// remove duplicates + sort longest first
const uniqueWords = [...new Set(words)].sort((a, b) => b.length - a.length);

// ─────────────────────────────────────────────
// Regex helpers
// ─────────────────────────────────────────────
function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Split into:
// 1. normal words (letters only)
// 2. special words (numbers/symbols)
const normalWords = uniqueWords.filter((w) => /^[a-z]+$/.test(w));
const specialWords = uniqueWords.filter((w) => !/^[a-z]+$/.test(w));

const normalRegex = new RegExp(`\\b(${normalWords.map(escapeRegex).join("|")})\\b`, "gi");

const specialRegex = new RegExp(specialWords.map(escapeRegex).join("|"), "gi");

// Optional whitelist (prevents false positives)
const whitelist = ["class", "pass", "assistant"];

// ─────────────────────────────────────────────
// Main filter
// ─────────────────────────────────────────────
export function censorMessage(message: string) {
    let foundWords: string[] = [];
    let result = message;

    // Skip whitelist
    for (const word of whitelist) {
        const safe = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
        result = result.replace(safe, (match) => `__WHITELIST__${match}__`);
    }

    // Normal words (with boundaries)
    result = result.replace(normalRegex, (match) => {
        foundWords.push(match);
        return "*".repeat(match.length);
    });

    // Special words (no boundaries)
    result = result.replace(specialRegex, (match) => {
        foundWords.push(match);
        return "*".repeat(match.length);
    });

    // Restore whitelist
    result = result.replace(/__WHITELIST__(.*?)__/g, "$1");

    // ─────────────────────────────────────────────
    // Logging
    // ─────────────────────────────────────────────
    if (foundWords.length > 0) {
        console.log(chalk.red(`[PROFANITY DETECTED] Words: [${[...new Set(foundWords)].join(", ")}] | Message: "${message}"`));
    } else {
        console.log(chalk.gray(`[CLEAN] ${message}`));
    }

    return result;
}
