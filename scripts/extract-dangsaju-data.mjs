import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
const source=fs.readFileSync('D:/Development/code-destiny/app/fortune/prompt-hub/dangsaju-calc.ts','utf8');
const ast=ts.createSourceFile('d.ts',source,ts.ScriptTarget.Latest,true);
const names=['DANGSAJU_BRANCH_TO_STAR','DANGSAJU_STAR_MEANINGS'];
const statements=ast.statements.filter(s=>ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>names.includes(d.name.getText(ast)))).map(s=>s.getText(ast).replace(/^export /,''));
const ctx={};vm.runInNewContext(ts.transpile(statements.join('\n')+'\nglobalThis.data={branches:DANGSAJU_BRANCH_TO_STAR,meanings:DANGSAJU_STAR_MEANINGS};'),ctx);
fs.writeFileSync('server/fortune/free/dangsaju-data.json',JSON.stringify(ctx.data,null,2)+'\n');
