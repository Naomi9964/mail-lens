import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
await build({entryPoints:['src/importer.mjs'],bundle:true,format:'iife',globalName:'MailLensImport',platform:'browser',target:'es2020',outfile:'dist/importer.js',minify:true,legalComments:'eof'});
await copyFile('node_modules/postal-mime/LICENSE.txt','dist/postal-mime-LICENSE.txt');
console.log('Built local MIME importer.');

