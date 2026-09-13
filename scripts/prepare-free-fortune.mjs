import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import crypto from 'node:crypto';
const root='D:/Development/code-destiny/app/fortune/prompt-hub/';
const source=fs.readFileSync(root+'PromptHubClient.tsx','utf8');
const ast=ts.createSourceFile('hub.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['RESPONSE_TONES','RESPONSE_DEPTHS','COMMON_FIELDS_COPY','BIRTH_PRIVACY_HINT','BIRTH_FIELDS_COPY','BIRTH_FIELDS_OPTIONAL_COPY','GENDER_FIELD_COPY','BIRTH_TIMEZONE_BY_LABEL','BIRTH_TIMEZONE_FIELD_COPY','TOOL_REGISTRY_COPY'];
const declarations=ast.statements.filter(s=>ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>names.includes(d.name.getText(ast)))).map(s=>s.getText(ast)).join('\n');
const js=ts.transpile(declarations+'\nglobalThis.registry = TOOL_REGISTRY_COPY;', {target:ts.ScriptTarget.ES2022});
const ctx={};vm.runInNewContext(js,ctx,{timeout:1000});
const registry=ctx.registry.map(({id,label,description,fields,role,principles,answerSections})=>({id,label,description,fields,role,principles,answerSections}));
fs.mkdirSync('src/data',{recursive:true});
fs.writeFileSync('src/data/free-fortune-hub.json',JSON.stringify(registry,null,2)+'\n');
fs.mkdirSync('server/fortune/free',{recursive:true});
for(const name of ['kusei-calc.ts','meihua-calc.ts']){
 let text=fs.readFileSync(root+name,'utf8').replaceAll('"@/lib/korean-calendar"','"../../vendor/code-destiny/lib/korean-calendar/index.js"').replaceAll('"@/constants/loadingMessages"','"./locale"');
 fs.writeFileSync('server/fortune/free/'+name,text);
}
const generated='C:/Users/user/.codex/generated_images/01a097e9-4ae1-7033-b33a-d4818b43180f/';
for(const [file,output,width] of [['exec-e2043713-f604-4c2b-afa0-87c5d3021dda.png','reaction-anchovy',640],['exec-174d98ea-6723-4537-82bf-3ed05d515111.png','anchovy',320]]){
 await sharp(generated+file).trim().resize({width}).webp({quality:88}).toFile('public/assets/fish/'+output+'.webp');
}
fs.writeFileSync('docs/free-fortune-provenance.json',JSON.stringify({source:root,hubSha256:crypto.createHash('sha256').update(source).digest('hex'),categories:registry.map(r=>r.id),generatedAssets:{tool:'built-in image_gen',character:'White Yeongnyangi matching expression-calm.webp, half-lowered violet eyes, subtle asymmetric mouth, holding one anchovy, underwhelmed but affectionate, transparent background.',anchovy:'Single silver dried anchovy, watercolor storybook inventory item, transparent background.',originals:['exec-e2043713-f604-4c2b-afa0-87c5d3021dda.png','exec-174d98ea-6723-4537-82bf-3ed05d515111.png']}},null,2)+'\n');
