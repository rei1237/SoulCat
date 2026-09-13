import fs from 'node:fs';import ts from 'typescript';
const source=fs.readFileSync('D:/Development/code-destiny/lib/tarot/numerology-tarot.mjs','utf8');
const ast=ts.createSourceFile('n.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['NUMEROLOGY_DATA','toText','normalizeBirthDate','reduceToSingleDigit','calculateLifePath','calculatePersonalDay'];
const statements=ast.statements.filter(s=>ts.isFunctionDeclaration(s)?names.includes(s.name?.text):ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>names.includes(d.name.getText(ast))));
fs.writeFileSync('server/fortune/free/numerology.mjs','// Extracted from Code Destiny lib/tarot/numerology-tarot.mjs; formulas unchanged.\n'+statements.map(s=>s.getText(ast)).join('\n\n')+'\nexport {NUMEROLOGY_DATA,calculateLifePath,calculatePersonalDay};\n');
