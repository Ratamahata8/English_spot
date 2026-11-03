// Offline build-time fallback. No synthesizer is shipped to the browser.
import ESpeakNg from 'espeak-ng';
import {readFileSync,writeFileSync} from 'node:fs';
const [text,target]=process.argv.slice(2);
if(!text||!target)throw Error('Usage: node scripts/synthesize_local.mjs TEXT OUTPUT.wav');
const engine=await ESpeakNg({arguments:['-v','en-gb','-s','140','-w','speech.wav',text],wasmBinary:readFileSync(new URL('../node_modules/espeak-ng/dist/espeak-ng.wasm',import.meta.url))});
writeFileSync(target,engine.FS.readFile('speech.wav'));
