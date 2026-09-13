import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function sourceRelease(){
  const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
  const files=[...new Set(execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(f=>/^(server\/|src\/|functions\/|public\/|scripts\/|package(?:-lock)?\.json$|next\.config\.|tsconfig\.json$|wrangler.*\.jsonc$)/.test(f)))].sort();
  const hash=createHash('sha256');
  for(const path of files){hash.update(path+'\0');hash.update(readFileSync(path));hash.update('\0');}
  return {sha:git('rev-parse','HEAD'),sourceDigest:hash.digest('hex'),dirty:!!git('status','--porcelain')};
}
