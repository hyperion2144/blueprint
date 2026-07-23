/**
 * ts-parser — TS/JS AST parser using @babel/parser.
 * Extracts exports (including default/re-export), imports, and responsibility.
 */

import { parse } from '@babel/parser';
import type { LanguageParser } from './parser-base.js';

export const tsParser: LanguageParser = {
  language: 'typescript',
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

  parseFile(content: string, _filePath: string) {
    const exports: string[] = [];
    const imports: string[] = [];
    let responsibility = '';

    try {
      const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });

      for (const node of ast.program.body) {
        // Exports
        if (node.type === 'ExportNamedDeclaration') {
          if (node.declaration) {
            const d = node.declaration;
            if (d.type === 'FunctionDeclaration' && d.id) exports.push(d.id.name);
            else if (d.type === 'ClassDeclaration' && d.id) exports.push(d.id.name);
            else if (d.type === 'VariableDeclaration') {
              for (const decl of d.declarations) {
                if (decl.id.type === 'Identifier') exports.push(decl.id.name);
              }
            } else if ('id' in d && d.id && typeof d.id === 'object' && 'name' in d.id) {
              exports.push(d.id.name); // interface/type/enum
            }
          } else if (node.specifiers) {
            for (const s of node.specifiers) {
              if ('exported' in s && s.exported && s.exported.type === 'Identifier') exports.push(s.exported.name);
            }
          }
        } else if (node.type === 'ExportDefaultDeclaration') {
          exports.push('default');
        }

        // Imports
        if (node.type === 'ImportDeclaration') {
          imports.push(node.source.value);
        }
      }
    } catch {
      // parse error — return what we have
    }

    // Responsibility from first line comment or @module JSDoc
    const firstLine = content.split('\n')[0] || '';
    if (firstLine.startsWith('//')) {
      responsibility = firstLine.replace(/^\/\/\s*/, '').trim();
    } else if (firstLine.startsWith('/*')) {
      const moduleMatch = content.match(/@module\s+(.+?)[\s*]/);
      if (moduleMatch) responsibility = moduleMatch[1].trim();
      else {
        // First block comment first line
        const blockMatch = content.match(/\/\*\s*\n?\s*\*?\s*(.+?)\n/);
        if (blockMatch) responsibility = blockMatch[1].trim();
      }
    }

    return { exports, imports, responsibility };
  },
};
