// Active regression gate through V7.5. Behavioral and security gates remain.
import {spawnSync} from 'node:child_process';
const suites=['test-importer.mjs','test-v3-planning.mjs','test-v42-security.mjs','test-v421-reader.mjs','test-v45.mjs','test-v6121.mjs','test-v72-import.mjs','test-v72-database.mjs','test-v72-reader-pwa.mjs','test-v73-covers.mjs','test-v74-revisions.mjs','test-v75.mjs','test-v75-cleanup.mjs'];
for(const suite of suites){const result=spawnSync(process.execPath,[`scripts/${suite}`],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log(`PASS: ${suites.length} active regression suites. Run npm run test:browser separately for browser integration.`);
