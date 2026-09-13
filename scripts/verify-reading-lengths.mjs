// Mock fixtures verify contracts and length only; they are not expert interpretation samples.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {database,seed} from '../tests/support/database.ts';
import {products} from '../server/payments/catalog.ts';
import {purchaseContexts} from '../server/fortune/charts.ts';
import {analyze} from '../server/fortune/analysis.ts';
import {productManifest} from '../server/fortune/product-manifest.ts';
import {readingPolicies} from '../server/fortune/reading-policy.ts';
import {MockChapterProvider} from '../server/providers/chapter.ts';
import {bodyCharacterCount} from '../server/fortune/reading-quality.ts';
const results=[];
for(const product of products){
 const {db,sqlite}=database();seed(sqlite,product.domain);
 const {contexts}=await purchaseContexts(db,'alice','p',product.domain,product.fishId,{});
 const analysis=analyze(contexts),bodies=[],chapters=[];
 for(const chapter of productManifest(product)){
  const body=await new MockChapterProvider().generateChapter({chapter,analysis,previous:bodies});
  bodies.push(body);chapters.push({title:chapter.title,minimum:chapter.minimumChars,actual:bodyCharacterCount(body)});
 }
 const actual=chapters.reduce((n,c)=>n+c.actual,0),minimum=readingPolicies[product.fishId].minimum;
 assert.ok(actual>=minimum,product.id);results.push({productId:product.id,tier:product.fishId,minimum,actual,chapters});sqlite.close();
}
await fs.writeFile('docs/reading-v4-length-verification.json',JSON.stringify({mock:true,liveLLMCalls:0,results},null,2)+'\n');
console.log(JSON.stringify(results.map(({productId,minimum,actual})=>({productId,minimum,actual}))));
// The vendored Swiss engine may retain its local ephemeris server after calculation.
process.exit(0);
