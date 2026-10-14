// V7.2 active regression gate. Obsolete snapshot/hash suites have been removed; active behavioral gates remain.
import {spawnSync} from 'node:child_process';
const suites=['test-importer.mjs','test-v3-planning.mjs','test-v42-security.mjs','test-v421-reader.mjs','test-v45.mjs','test-v6121.mjs','test-v72-import.mjs','test-v72-database.mjs','test-v72-reader-pwa.mjs','test-cover-fit.mjs'];
for(const suite of suites){const result=spawnSync(process.execPath,[`scripts/${suite}`],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log(`PASS: ${suites.length} active regression suites. Run npm run test:browser separately for browser integration.`);
