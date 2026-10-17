import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const source=await readFile('assets/login.js','utf8');
function destination(next,canAccessApp=false){
 const element={addEventListener(){}};
 const context=vm.createContext({URL,URLSearchParams,document:{getElementById:()=>element},window:{location:{origin:'https://ai.muonnoi.org',search:'?next='+encodeURIComponent(next)},Auth:{getCurrentUser:async()=>{throw new Error('fixture anonymous');},canAccessApp:()=>canAccessApp}}});
 vm.runInContext(source,context);return vm.runInContext('resolveNext({})',context);
}
test('login return URL stays on the current origin, including protocol-relative and backslash inputs',()=>{
 for(const next of ['//example.invalid/landing','/\\example.invalid/landing','https://example.invalid','javascript:alert(1)','///example.invalid'])assert.equal(destination(next),'/profile/');
 assert.equal(destination('/offers/brief/?from=pilot#form'),'/offers/brief/?from=pilot#form');
 assert.equal(destination('/app/dashboard/'),'/profile/');assert.equal(destination('/app/dashboard/',true),'/app/dashboard/');
});
