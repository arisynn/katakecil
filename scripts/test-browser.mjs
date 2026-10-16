import {spawnSync} from 'node:child_process';
for(const suite of ['test-v72-browser.mjs','test-v73-browser.mjs','test-v74-browser.mjs']){const result=spawnSync(process.execPath,[`scripts/${suite}`],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
