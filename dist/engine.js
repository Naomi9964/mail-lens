(function(root){
'use strict';
const groups={content:{label:'Social engineering',cap:40},links:{label:'URLs & HTML',cap:40},identity:{label:'Sender identity',cap:25},auth:{label:'Authentication claims',cap:25},files:{label:'Attachment clues',cap:25}};
const rules=[
['urgency','content',10,'Urgency or account threat','Pressure can discourage independent checking. Legitimate reminders can also be urgent.'],
['secrets','content',30,'Request for credentials or sensitive data','Requests to enter or share secrets can be credential harvesting. Legitimate resets may use similar wording; verify independently.'],
['payment','content',15,'Payment or reward request','Money requests and rewards need out-of-band confirmation; an invoice alone is not proof of fraud.'],
['bankchange','content',25,'Changed payment instructions','A new beneficiary or bank account is a business email compromise warning. Confirm through an established contact.'],
['secrecy','content',15,'Secrecy or isolation pressure','Instructions to avoid colleagues or normal verification can suppress scrutiny.'],
['remote','content',20,'Remote access or protection bypass','Installing remote access tools or disabling protection can give an attacker control.'],
['qr','content',10,'QR code used for account action','Moving login or payment to a QR code obscures the destination. Images are not decoded here.'],
['http','links',8,'Unencrypted HTTP URL','HTTP does not protect transport. HTTPS by itself also does not establish legitimacy.'],
['userinfo','links',25,'User information before @ in a URL','The text before @ is not the destination host. Read the normalized hostname in the URL inventory.'],
['ip','links',20,'Numeric IP destination','An IP literal can obscure identity. Some internal services legitimately use IP addresses.'],
['short','links',12,'Known URL shortening service','A short URL hides its final destination. Redirects are not followed.'],
['idn','links',12,'Internationalized domain name','Punycode can represent legitimate non-English domains or misleading lookalike characters.'],
['port','links',8,'Nonstandard web port','An explicit nonstandard port is unusual for public account services but may be legitimate internally.'],
['mismatch','links',30,'Displayed URL differs from destination','A URL-shaped link label names a different host than its target. Tracking systems can also produce this difference.'],
['expectedlink','links',15,'URL outside the expected domain','The destination is outside the independently supplied domain and its subdomains. Third-party services may be legitimate.'],
['embedded','links',20,'Expected domain embedded in another host','The trusted domain appears inside a different hostname, a possible impersonation pattern.'],
['active','links',25,'Active HTML or embedded form','Scripts, frames, forms, or script/data links are unexpected in email and can support credential collection. The HTML is never executed.'],
['reply','identity',12,'Reply-To hostname differs from From','Replies may go elsewhere. Customer support systems and mailing platforms can use different domains.'],
['return','identity',5,'Return-Path hostname differs from From','This weak signal is common in legitimate bulk email and is not a DMARC alignment test.'],
['expectedfrom','identity',20,'Sender outside the expected domain','The sender address does not match the independently supplied domain or a subdomain. Display names are not verified identity.'],
['display','identity',20,'Display-name address differs from mailbox','An email-like display name advertises a different domain than the actual angle-bracket address.'],
['multiplefrom','identity',15,'Multiple From claims','Multiple From headers or different manual and header addresses require reviewing the original message.'],
['dmarc','auth',25,'Pasted DMARC failure claim','A failure is a warning if recorded by a trusted receiving system. Pasted text cannot establish that trust.'],
['spf','auth',10,'Pasted SPF fail or softfail claim','This claims a sending authorization problem; forwarding can cause SPF failures. No DNS check is performed.'],
['dkim','auth',15,'Pasted DKIM failure claim','This claims a signature verification failure; modification in transit may be a cause. Signatures are not verified here.'],
['executable','files',25,'Executable or script filename','A named executable, script, or shortcut can run code. This inspects names, not file bytes.'],
['double','files',25,'Document-like name ending in executable extension','A double extension can disguise executable content as a document or image.'],
['macro','files',20,'Macro-enabled file or enable-macros request','Macros can execute code. A name or instruction does not prove a malicious payload.'],
['archive','files',8,'Archive or disk image filename','Archives and images can hide contents; this is only a weak packaging signal.'],
['bidi','files',20,'Bidirectional control character','Direction-control characters can change how a filename or message appears. Legitimate languages also use direction controls.']
].map(([id,group,points,title,why])=>({id,group,points,title,why}));
const decode=s=>s.replace(/&#(x[0-9a-f]+|\d+);?/gi,(_,n)=>{const x=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return x>0&&x<=0x10ffff?String.fromCodePoint(x):'\ufffd';}).replace(/&(amp|lt|gt|quot|apos|colon);/gi,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",colon:':'})[n.toLowerCase()]);
function headersOf(s){const out={};const unfolded=s.replace(/\r\n?/g,'\n').split('\n\n')[0].replace(/\n[ \t]+/g,' ');for(const line of unfolded.split('\n')){const m=line.match(/^([a-z][a-z0-9-]*):\s*(.*)$/i);if(m)(out[m[1].toLowerCase()]??=[]).push(m[2]);}return out;}
function mailbox(s){const angle=s.match(/<([^>]+)>/);const m=(angle?angle[1]:s).match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-z0-9.-]+\.[a-z]{2,})/i);return m?{address:m[0].toLowerCase(),host:m[1].toLowerCase()}:null;}
function normalizeExpected(s){if(!s.trim())return '';const v=s.trim().toLowerCase().replace(/\.$/,'');if(!/^[a-z0-9.-]+$/.test(v)||!v.includes('.')||v.split('.').some(x=>!x||x.length>63||x.startsWith('-')||x.endsWith('-')))throw Error('Enter a domain only, such as example.com (no protocol, path, or port).');return v;}
const inside=(h,d)=>h===d||h.endsWith('.'+d);
function analyze(input){
if(!input||typeof input!=='object')throw Error('Provide an email object.');
const limits={sender:500,subject:2000,body:100000,headers:50000,expected:253,attachments:5000},data={};
for(const [k,limit] of Object.entries(limits)){data[k]=input[k]??'';if(typeof data[k]!=='string'||data[k].length>limit)throw Error('Invalid '+k+' input or length limit exceeded.');}
if(!data.body.trim())throw Error('Paste an email body before analyzing.');
const expected=normalizeExpected(data.expected),h=headersOf(data.headers),findings=[];
function add(id,evidence){const rule=rules.find(x=>x.id===id);let f=findings.find(x=>x.id===id);if(!f){f={...rule,evidence:[]};findings.push(f);}const e=String(evidence).slice(0,400);if(!f.evidence.includes(e)&&f.evidence.length<3)f.evidence.push(e);}
const raw=decode(data.body),plain=raw.replace(/<[^>]*>/g,' '),text=data.subject+'\n'+plain;
const patterns={urgency:/\burgent\b|immediately|act now|within 24 hours|suspend(?:ed)?|account.{0,20}(?:clos|block)|緊急|立即|停權/i,secrets:/(?:enter|send|share|provide|confirm|verify|reset|update|submit).{0,50}(?:password|passcode|\botp\b|verification code|credit card|social security|bank details)|(?:輸入|提供|回覆|驗證).{0,25}(?:密碼|驗證碼|信用卡|身分證)/i,payment:/wire transfer|gift cards?|claim.{0,20}prize|(?:send|make|process).{0,20}payment|transfer.{0,20}(?:funds|money)|匯款|轉帳|中獎/i,bankchange:/(?:new|changed?|updated?).{0,30}(?:bank|beneficiary|payment details)|(?:bank|payment).{0,30}(?:changed?|updated?)|變更.{0,15}(?:帳戶|銀行)/i,secrecy:/do not (?:tell|contact|discuss)|keep.{0,20}(?:secret|confidential)|請勿聯絡|不要告訴/i,remote:/(?:install|download).{0,30}(?:anydesk|teamviewer|remote access)|disable.{0,25}(?:antivirus|security|protection)/i,qr:/(?:scan|use).{0,20}qr.{0,60}(?:login|log in|verify|pay)|掃描.{0,20}(?:QR|二維碼)/i};
for(const [id,re]of Object.entries(patterns)){const m=text.match(re);if(m)add(id,m[0]);}
const urls=[],seen=new Set(),unresolvedLinks=[];
function collect(value,label=''){let v=decode(value).trim().replace(/[.,;!?)\]}]+$/,'');v=v.replace(/^hxxps:/i,'https:').replace(/^hxxp:/i,'http:').replace(/\[\.\]/g,'.');if(/^www\./i.test(v))v='https://'+v;if(v.startsWith('//'))v='https:'+v;if(!/^https?:\/\//i.test(v)){if(label||v)unresolvedLinks.push(v);return;}try{const u=new URL(v),host=u.hostname.toLowerCase().replace(/\.$/,'');const key=u.href+'|'+label;if(seen.has(key))return;seen.add(key);const flags=[];function flag(id){add(id,u.href);flags.push(id);}if(u.protocol==='http:')flag('http');if(u.username||u.password)flag('userinfo');if(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)||host.startsWith('['))flag('ip');if(['bit.ly','tinyurl.com','t.co','rebrand.ly','shorturl.at'].some(d=>inside(host,d)))flag('short');if(host.includes('xn--'))flag('idn');if(u.port)flag('port');if(expected&&!inside(host,expected)){flag('expectedlink');if(host.includes(expected))flag('embedded');}try{if(/^(?:https?:\/\/|www\.)/i.test(label)){const shown=new URL(/^www\./i.test(label)?'https://'+label:label);if(shown.hostname.toLowerCase().replace(/\.$/,'')!==host){add('mismatch',label+' -> '+u.href);flags.push('mismatch');}}}catch{}urls.push({url:u.href,host,label,flags});}catch{}}
for(const m of raw.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)){const href=m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);if(href)collect(href[1]??href[2]??href[3],decode(m[2].replace(/<[^>]*>/g,'')).trim());}
for(const m of raw.replace(/<a\b[^>]*>[\s\S]*?<\/a\s*>/gi,' ').matchAll(/(?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"']+/gi))collect(m[0]);
if(/<(?:script|iframe|form)\b|(?:href|src)\s*=\s*["']?\s*(?:javascript|data)\s*:/i.test(raw))add('active',raw.match(/<(?:script|iframe|form)\b[^>]*>|(?:href|src)\s*=\s*["']?\s*(?:javascript|data)\s*:[^\s>]*/i)?.[0]||'Active HTML detected');
const source=data.sender||(h.from||[])[0]||'',from=mailbox(source),reply=mailbox((h['reply-to']||[]).join(' ')),ret=mailbox((h['return-path']||[]).join(' '));
if(from&&reply&&from.host!==reply.host)add('reply',from.host+' -> '+reply.host);
if(from&&ret&&from.host!==ret.host)add('return',from.host+' -> '+ret.host);
if(from&&expected&&!inside(from.host,expected))add('expectedfrom',from.host+' vs '+expected);
const display=source.includes('<')?mailbox(source.split('<')[0]):null;if(from&&display&&from.host!==display.host)add('display',display.address+' -> '+from.address);
const headerFrom=mailbox((h.from||[])[0]||'');if((h.from||[]).length>1||(data.sender&&from&&headerFrom&&from.address!==headerFrom.address))add('multiplefrom',source+' | '+(h.from||[]).join(' | '));
const authText=(h['authentication-results']||[]).join('\n');const auth={};for(const method of ['spf','dkim','dmarc']){const matches=[...authText.matchAll(new RegExp('\\b'+method+'\\s*=\\s*(pass|fail|softfail|neutral|none|temperror|permerror)\\b','gi'))];auth[method]=[...new Set(matches.map(m=>m[1].toLowerCase()))];if(auth[method].some(v=>v==='fail'||v==='softfail'))add(method,method+'='+auth[method].join(', '));}
const fileText=data.attachments+'\n'+plain;
const filePatterns={executable:/\b[^\s<>"']+\.(?:exe|scr|js|vbs|bat|cmd|ps1|lnk|msi|hta)\b/i,double:/\b[^\s<>"']+\.(?:pdf|docx?|xlsx?|jpe?g|png|txt)\.(?:exe|scr|js|vbs|bat|cmd|lnk|msi)\b/i,macro:/\b[^\s<>"']+\.(?:docm|xlsm|pptm)\b|enable.{0,15}macros|啟用巨集/i,archive:/\b[^\s<>"']+\.(?:zip|rar|7z|iso|img)\b/i,bidi:/[\u202a-\u202e\u2066-\u2069]/};for(const[id,re]of Object.entries(filePatterns)){const m=fileText.match(re);if(m)add(id,id==='bidi'?'Unicode direction-control character U+'+m[0].charCodeAt(0).toString(16).toUpperCase():m[0]);}
const categories=Object.entries(groups).map(([id,g])=>{const raw=findings.filter(f=>f.group===id).reduce((n,f)=>n+f.points,0);return{id,...g,raw,score:Math.min(g.cap,raw)};});const score=Math.min(100,categories.reduce((n,g)=>n+g.score,0));
const coverage=[{name:'Message wording',status:'Checked',detail:'Selected phrase patterns; context, images and all languages are not fully understood.'},{name:'Sender address',status:from?'Checked':'Missing / unparsed',detail:from?from.address:'Supply a full From address or raw From header.'},{name:'Expected domain',status:expected?'Compared':'Not supplied',detail:expected||'No independent domain reference was supplied.'},{name:'URL structure',status:unresolvedLinks.length?'Partial':urls.length?'Checked':'No supported URLs found',detail:'HTTP(S), www and hxxp / [.] forms; scheme-relative targets assume HTTPS. No redirects or reputation checks.'+(unresolvedLinks.length?' '+unresolvedLinks.length+' non-web or relative link target(s) could not be evaluated as web destinations.':'')},{name:'Authentication',status:authText?'Claims parsed':'Not supplied',detail:'Authentication-Results headers only; never cryptographically verified.'},{name:'Attachment names',status:data.attachments.trim()?'Supplied names checked':'Body clues only',detail:'No attachment bytes, malware scanning or archive extraction.'}];
return{version:'2.1',score,level:score>=50?'high':score>=20?'medium':'low',findings,categories,urls,auth,coverage,expected,limitations:['No DNS, WHOIS, reputation, redirect resolution, attachment sandboxing, QR decoding or live mail authentication.','Use EML or complete-source import for MIME/base64/quoted-printable decoding. Plain text cannot recover hidden links. Encrypted messages, QR images and attached emails are not decoded for analysis.','Exact hostname comparisons are not public-suffix or organizational-domain alignment checks.','Scores and thresholds are heuristic design choices; no measured accuracy or probability calibration is claimed.']};
}
const api={analyze,rules,groups};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MailLens=api;
})(globalThis);

