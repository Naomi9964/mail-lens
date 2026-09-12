import PostalMime from 'postal-mime';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const BODY_LIMIT = 100000;
const escape = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function size(raw) { return typeof raw === 'string' ? new TextEncoder().encode(raw).byteLength : raw.byteLength; }
function validateSize(raw) { if (!size(raw)) throw Error('The file or source is empty.'); if(size(raw)>MAX_FILE_BYTES) throw Error('The import exceeds 10 MB. Export a smaller email without large attachments.'); }
function checkFields(data) { for(const [key,max] of Object.entries({body:BODY_LIMIT,headers:50000,sender:500,subject:2000,attachments:5000})) if(data[key].length>max) throw Error('The decoded '+key+' exceeds the analysis limit ('+max.toLocaleString()+' characters). Nothing was imported; no content was silently cut off.'); }
export async function parseEmail(raw) {
 validateSize(raw);
 const prefix=typeof raw==='string'?raw.slice(0,50000):new TextDecoder().decode(new Uint8Array(raw instanceof ArrayBuffer?raw:raw.buffer,raw.byteOffset||0,Math.min(raw.byteLength,50000)));
 if(!/^(?:from|subject|date|mime-version|content-type|received|message-id):/im.test(prefix.split(/\r?\n\r?\n/)[0]))throw Error('This does not look like an EML email. Choose the original .eml file or paste the complete message source. Outlook .msg files are not supported.');
 const mail=await PostalMime.parse(raw,{maxNestingDepth:30,maxHeadersSize:50000,maxRfc822NestingDepth:3,forceRfc822Attachments:true});
 const warnings=[];
 const html=mail.html||'',text=mail.text||'';
 if(!html.trim()&&!text.trim())throw Error('No readable message body was found. The email may be encrypted, image-only, or contain only attachments. No analysis was performed.');
 // Keep both MIME alternatives: they can contain different links or instructions.
 const body=html.trim()?(html+(text.trim()?'\n<pre data-mail-lens="plain-alternative">'+escape(text)+'</pre>':'')):text;
 const headers=(mail.headerLines||[]).map(h=>h.line).join('\n');
 const from=mail.from?.address?((mail.from.name?mail.from.name+' ':'')+'<'+mail.from.address+'>'):(mail.headers.find(h=>h.key==='from')?.value||'');
 const attachments=mail.attachments.map(a=>a.filename||'[unnamed '+a.mimeType+']').join('\n');
 const data={sender:from,subject:mail.subject||'',body,headers,attachments};checkFields(data);
 if(!html.trim())warnings.push('This email has no HTML body. Hidden button destinations cannot be recovered from a plain-text-only message.');
 if(mail.attachments.some(a=>a.mimeType==='message/rfc822'))warnings.push('Attached emails were not analyzed. Save each attached email as an EML file and import it separately.');
 if(mail.attachments.some(a=>a.mimeType?.startsWith('image/')))warnings.push('Images and QR codes are not read. Image links with an HTML href are preserved, but destinations encoded only inside an image are unknown.');
 if(mail.attachments.length)warnings.push('Attachment names were imported; attachment contents were not scanned or opened.');
 return {data,info:{kind:'EML',html:!!html.trim(),text:!!text.trim(),attachmentCount:mail.attachments.length,warnings}};
}
export async function parseFile(bytes,name) {
 validateSize(bytes);
 const ext=name.split('.').pop().toLowerCase();
 if(ext==='eml')return parseEmail(bytes);
 if(!['html','htm','txt'].includes(ext))throw Error('Supported files: .eml, .html, .htm and .txt. For Outlook .msg, export or download the message as EML.');
 const body=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
 if(!body.trim())throw Error('The file contains no readable content.');
 if(body.length>BODY_LIMIT)throw Error('The file exceeds the 100,000-character body limit. Nothing was imported.');
 const isHtml=ext!=='txt';
 return {data:{sender:'',subject:'',headers:'',attachments:'',body},info:{kind:isHtml?'HTML file':'Text file',html:isHtml,text:!isHtml,attachmentCount:0,warnings:isHtml?['HTML imported as inert source. Sender, headers and attachment names are unavailable; add them if known.']:['Plain text cannot retain hidden button destinations. Use EML, HTML or rich paste for better link coverage.']}};
}
export function preparePaste(html,text,current,start,end) {
 const rich=!!html?.trim();const insert=rich?html:text||'';
 const body=current.slice(0,start)+insert+current.slice(end);
 if(body.length>BODY_LIMIT)throw Error('Paste exceeds the 100,000-character limit. The previous content was preserved.');
 return {body,caret:start+insert.length,rich};
}
