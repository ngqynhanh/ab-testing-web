import {existsSync} from 'node:fs';
// Never override variables provided by Netlify or the invoking shell.
// Local overrides win over .env, matching Neon's .env.local default.
for (const file of ['.env.local', '.env']) {
 if(existsSync(file)) process.loadEnvFile(file);
}
