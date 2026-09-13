import {spawn} from 'node:child_process';
const allowed=/^(path|pathext|systemroot|windir|comspec|temp|tmp|userprofile|appdata|localappdata|homedrive|homepath|programfiles|programfiles\(x86\)|programdata|processor_architecture|number_of_processors)$/i;
const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>allowed.test(k))),WRANGLER_SEND_METRICS:'false'};
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','wrangler.free-local.jsonc','--ip','127.0.0.1','--port','8793','--persist-to','.integration/free-runtime'],{env,stdio:'inherit'});
child.on('exit',code=>process.exitCode=code??1);
