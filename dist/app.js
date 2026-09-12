'use strict';
const $=id=>document.getElementById(id),fields=['sender','subject','body','headers','expected','attachments'];
const samples={phishing:{sender:'Account Security <security@account-check.example>',subject:'Urgent: account suspended within 24 hours',body:'Please enter your password and verification code immediately.\nDo not contact your normal support team.\n<a href="http://account-check.example/login">https://bank.example/login</a>\n\nTraining sample: reserved .example domains.',expected:'bank.example',headers:'From: Account Security <security@account-check.example>\nAuthentication-Results: mx.example; spf=fail; dkim=fail; dmarc=fail'},bec:{sender:'Finance Director <finance@vendor.example>',subject:'Updated payment instructions',body:'Please process the payment today using our new bank account. Keep this confidential until the transfer is complete.\nThe revised invoice is attached.\n\nTraining sample: reserved .example domains.',headers:'From: Finance Director <finance@vendor.example>\nReply-To: accounts@payment-change.example\nAuthentication-Results: mx.example; spf=pass; dkim=pass; dmarc=pass',expected:'vendor.example',attachments:'invoice.pdf'},normal:{sender:'Alex Chen <alex@example.com>',subject:'Wednesday project meeting',body:'Hi team,\n\nWe will meet in Room 3 at 2 PM on Wednesday to review project progress. Bring your weekly summary and any questions.\n\nThanks,\nAlex\n\nTraining sample.',headers:'From: Alex Chen <alex@example.com>\nAuthentication-Results: mx.example; spf=pass; dkim=pass; dmarc=pass',expected:'example.com'}};
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
let hasResult=false;
function render(r){const root=$('result');root.replaceChildren();const risk=el('div',null,'risk '+r.level),score=el('div',r.score,'score');score.append(el('small','/ 100 risk index'));const copy=el('div');copy.append(el('h3',r.level==='high'?'High risk: pause and verify':r.level==='medium'?'Review required':'Few detected signals'),el('p',r.findings.length+' triggered rules · '+new Set(r.urls.map(u=>u.url)).size+' distinct URL(s)'),el('p','A heuristic score, not a phishing probability.'));risk.append(score,copy);root.append(risk);
const cats=el('div',null,'category-grid');for(const c of r.categories){const row=el('div',null,'category');row.append(el('span',c.label),el('strong',c.score+' / '+c.cap));const meter=el('progress');meter.max=c.cap;meter.value=c.score;meter.setAttribute('aria-label',c.label);row.append(meter);cats.append(row);}root.append(cats,el('h3','Evidence & interpretation','subheading'));if(!r.findings.length)root.append(el('p','No rules triggered. Unrecognized phishing or compromised legitimate accounts remain possible.'));
for(const f of [...r.findings].sort((a,b)=>b.points-a.points)){const article=el('article',null,'finding'),title=el('h4',f.title);title.append(el('span','+'+f.points+' raw','weight'));article.append(title,el('div',f.evidence.join('\n'),'evidence'),el('p',f.why),el('small',MailLens.groups[f.group].label+' · '+f.id,'rule-meta'));root.append(article);}
const details=el('details',null,'report-detail');details.open=true;details.append(el('summary','Coverage & unresolved questions'));for(const c of r.coverage){const row=el('div',null,'coverage-row');row.append(el('strong',c.name+' — '+c.status),el('p',c.detail));details.append(row);}root.append(details);
const auth=el('details',null,'report-detail');auth.append(el('summary','Authentication claims (not verified)'));for(const [k,v]of Object.entries(r.auth))auth.append(el('p',k.toUpperCase()+': '+(v.length?v.join(', '):'Not present')));auth.append(el('p','Passing claims do not reduce the score. A legitimate or compromised domain can pass authentication. Conflicting claims require review in the receiving mail service.'));root.append(auth);
if(r.urls.length){const inv=el('details',null,'report-detail');inv.append(el('summary','URL inventory — '+new Set(r.urls.map(u=>u.url)).size+' destinations'));const displayed=new Set();for(const u of r.urls){const key=u.url+'|'+u.label;if(displayed.has(key))continue;displayed.add(key);const item=el('div',null,'coverage-row');item.append(el('strong','Actual host: '+u.host),el('div',u.url,'evidence'));if(u.label)item.append(el('p','Link label: '+u.label));item.append(el('p',u.flags.length?u.flags.map(id=>MailLens.rules.find(f=>f.id===id).title).join('; '):'No structural rules triggered. Destination safety is unknown.'));inv.append(item);}root.append(inv);}
const advice=el('div',null,'advice');advice.append(el('strong','Recommended action'),el('div',r.level==='high'?'Do not use the email links or attachments. Verify through a known official channel and report the message to your security team.':r.level==='medium'?'Independently verify the request before sharing information, opening files, or paying. Review the missing evidence above.':'Confirm the sender and purpose before any sensitive action. A low score cannot confirm safety.'),el('p','Already shared credentials? Change them through the official service and notify your security team. For a payment, contact your bank or payment provider promptly.'));root.append(advice);
const limits=el('details',null,'report-detail');limits.append(el('summary','Method & limitations'));for(const t of r.limitations)limits.append(el('p',t));limits.append(el('p','Score = min(100, sum of capped category scores). Each rule contributes once; repeated matches provide evidence only. Category bars show capped contributions.'));root.append(limits);hasResult=true;}
function run(data){const r=MailLens.analyze(data);for(const k of fields)$(k).value=data[k]||'';updateCount();$('error').textContent='';render(r);return r;}
function updateCount(){$('count').textContent=$('body').value.length.toLocaleString()+' / 100,000';}
function edited(){updateCount();if(hasResult&&!$('stale')){const msg=el('div','Input changed. Analyze again to update this report.','stale');msg.id='stale';$('result').prepend(msg);}}
for(const id of fields)$(id).addEventListener('input',edited);
$('body').addEventListener('input',()=>setSourceStatus('Body edited. Only links still present in the current source can be inspected.'));
$('form').addEventListener('submit',e=>{e.preventDefault();try{run(Object.fromEntries(fields.map(k=>[k,$(k).value])));}catch(err){$('error').textContent=err.message;}});
document.querySelectorAll('[data-sample]').forEach(b=>b.addEventListener('click',()=>{run(samples[b.dataset.sample]);setSourceStatus('Training sample loaded.');}));
const empty=$('result').innerHTML;$('clear').addEventListener('click',()=>{$('form').reset();$('error').textContent='';$('result').innerHTML=empty;hasResult=false;updateCount();$('email-file').value='';$('raw-source').value='';setSourceStatus('Plain-text input may omit button destinations. Import EML or paste rich HTML for better coverage.');$('body').focus();});
for(const [id,g] of Object.entries(MailLens.groups)){const section=el('details');section.append(el('summary',g.label+' · cap '+g.cap));for(const rule of MailLens.rules.filter(r=>r.group===id))section.append(el('p',rule.title+' (+'+rule.points+')'));$('catalog').append(section);}
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'analyze_email',title:'Analyze email risk',description:'Analyze supplied email locally and update the visible report. Does not open URLs or verify authentication.',inputSchema:{type:'object',properties:Object.fromEntries(fields.map(k=>[k,{type:'string',maxLength:({sender:500,subject:2000,body:100000,headers:50000,expected:253,attachments:5000})[k]}])),required:['body'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{if(!input||typeof input!=='object'||Object.keys(input).some(k=>!fields.includes(k)))throw Error('Invalid input fields');return run(input);}})).catch(()=>{});}catch{}}


function setSourceStatus(message){$('import-status').textContent=message;}
let importing=false;
async function importMessage(read,filename){
 if(importing)return;
 importing=true;
 const controls=[...document.querySelectorAll('input,textarea,button')];
 controls.forEach(c=>c.disabled=true);
 $('import-status').setAttribute('aria-busy','true');
 const previousStatus=$('import-status').textContent;
 setSourceStatus('Reading and decoding locally...');
 try{
  const raw=await read();
  const result=filename?await MailLensImport.parseFile(raw,filename):await MailLensImport.parseEmail(raw);
  run({...result.data,expected:''});
  const links=new Set(MailLens.analyze(result.data).urls.map(u=>u.url)).size;
  setSourceStatus(result.info.kind+' imported. '+(result.info.html?'HTML link destinations retained. ':'')+links+' distinct web URL(s) found. '+result.info.warnings.join(' '));
  $('raw-source').value='';
 }catch(err){
  $('error').textContent='Import failed: '+err.message;
  setSourceStatus(previousStatus+' The last import failed; previous inputs and results were preserved.');
 }finally{
  importing=false;controls.forEach(c=>c.disabled=false);$('email-file').value='';$('import-status').setAttribute('aria-busy','false');
 }
}
function importFile(file){
 if(!file)return;
 if(file.size>MailLensImport.MAX_FILE_BYTES){$('error').textContent='The file exceeds 10 MB. No input was changed.';return;}
 return importMessage(()=>file.arrayBuffer(),file.name);
}
$('email-file').addEventListener('change',e=>importFile(e.target.files[0]));
$('import-source').addEventListener('click',()=>importMessage(()=>Promise.resolve($('raw-source').value)));
const dropZone=$('drop-zone');
for(const event of ['dragenter','dragover'])dropZone.addEventListener(event,e=>{e.preventDefault();dropZone.classList.add('dragging');});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('dragging');if(e.dataTransfer.files.length!==1){$('error').textContent='Drop one email file at a time.';return;}importFile(e.dataTransfer.files[0]);});
$('body').addEventListener('paste',e=>{
 if(!e.clipboardData)return;
 e.preventDefault();
 try{
  const target=$('body'),prepared=MailLensImport.preparePaste(e.clipboardData.getData('text/html'),e.clipboardData.getData('text/plain'),target.value,target.selectionStart,target.selectionEnd);
  target.value=prepared.body;target.setSelectionRange(prepared.caret,prepared.caret);edited();$('error').textContent='';
  setSourceStatus(prepared.rich?'Rich clipboard HTML preserved as source, including supplied link destinations. Clipboard content can still omit parts of the original email.':'Only plain text was supplied by the clipboard. Hidden button destinations may be missing; import EML or HTML to recover them.');
 }catch(err){$('error').textContent=err.message;}
});
