const fs = require('fs');

const content = fs.readFileSync('server.js', 'utf8');

let stack = [];
let inString = false;
let stringChar = null;
let inTemplate = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i-1] : null;
    
    // Line/col tracking
    let line = 1, col = 1;
    // Just for logging if needed, or we can compute it later
    
    if (inString) {
        if (char === stringChar && prevChar !== '\\') {
            inString = false;
        }
        continue;
    }
    
    if (inTemplate) {
        if (char === '`' && prevChar !== '\\') {
            inTemplate = false;
        } else if (char === '$' && content[i+1] === '{' && prevChar !== '\\') {
            stack.push({ type: '${', index: i });
            i++; // skip {
        }
        continue;
    }
    
    if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
        continue;
    }
    
    if (char === '`') {
        inTemplate = true;
        continue;
    }
    
    // Ignore line comments
    if (char === '/' && content[i+1] === '/') {
        // fast forward to newline
        while (i < content.length && content[i] !== '\n') i++;
        continue;
    }
    
    if (char === '{' || char === '(' || char === '[') {
        stack.push({ type: char, index: i });
    } else if (char === '}' || char === ')' || char === ']') {
        const matching = char === '}' ? '{' : (char === ')' ? '(' : '[');
        // Special check for template literal interpolation end
        if (char === '}' && stack.length > 0 && stack[stack.length - 1].type === '${') {
            stack.pop();
            inTemplate = true; // resume template string
            continue;
        }
        
        if (stack.length === 0) {
            console.log(`Unmatched closing ${char} at index ${i}`);
        } else {
            const last = stack.pop();
            if (last.type !== matching) {
                console.log(`Mismatch! Expected closing for ${last.type} (from index ${last.index}), but got ${char} at index ${i}`);
            }
        }
    }
}

if (inString) console.log(`Unclosed string starting with ${stringChar}`);
if (inTemplate) console.log(`Unclosed template literal`);

if (stack.length > 0) {
    console.log('Unclosed tokens:');
    stack.forEach(s => {
        // compute line and col
        const sub = content.substring(0, s.index);
        const lines = sub.split('\n');
        console.log(`Token ${s.type} at line ${lines.length}, col ${lines[lines.length - 1].length + 1}`);
    });
} else {
    console.log('All matched.');
}

