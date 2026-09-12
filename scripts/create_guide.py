from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from pathlib import Path
import json, subprocess, html
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/mail-lens-guide.pdf'
meta=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("./dist/engine.js")))'],cwd=ROOT,text=True))
W,H=595.28,841.89
navy=HexColor('#0c2840'); teal=HexColor('#0c655f'); muted=HexColor('#536e80'); pale=HexColor('#edf5f8')
c=canvas.Canvas(str(OUT),pagesize=(W,H)); c.setTitle('Mail Lens - Explainable Phishing Email Analysis'); c.setAuthor('Mail Lens')
styles={'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10.5,leading=15,textColor=navy),'small':ParagraphStyle('small',fontName='Helvetica',fontSize=9,leading=13,textColor=muted),'h':ParagraphStyle('h',fontName='Helvetica-Bold',fontSize=15,leading=20,textColor=teal),'table':ParagraphStyle('table',fontName='Helvetica',fontSize=9,leading=12,textColor=navy)}
def p(text,y,style='body',x=48,width=499):
    obj=Paragraph(text,styles[style]); _,height=obj.wrap(width,700);obj.drawOn(c,x,y-height);return y-height-9

def begin(num,kicker,title,subtitle):
    c.setFillColor(navy);c.rect(0,H-92,W,92,fill=1,stroke=0)
    c.setFillColor(HexColor('#5de0c0'));c.setFont('Helvetica-Bold',10);c.drawString(48,H-34,'MAIL LENS / '+kicker)
    c.setFillColor(white);c.setFont('Helvetica-Bold',23);c.drawString(48,H-66,title)
    c.setStrokeColor(HexColor('#dce4ea'));c.line(48,43,W-48,43)
    c.setFillColor(muted);c.setFont('Helvetica',8);c.drawString(48,28,'Version 2.1 | English product & methodology guide | 11 September 2026');c.drawRightString(W-48,28,str(num))
    return p(subtitle,H-115)

def heading(text,y):return p(text,y-4,'h')
def table(rows,y,widths):
    content=[[Paragraph(html.escape(str(v)),styles['table']) for v in row]for row in rows]
    t=Table(content,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),pale),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#f7f9fa')]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,0),.6,HexColor('#ccdce4'))]));_,h=t.wrap(499,700);t.drawOn(c,48,y-h);return y-h-15

y=begin(1,'OVERVIEW','Understand before you click.','An explainable, browser-based screening tool for suspicious emails. Designed for initial triage, learning and evidence review.')
y=heading('What the system does',y)
y=p('Mail Lens evaluates an email using <b>30 deterministic rules across five categories</b>. It returns a 0-100 risk index, the triggering evidence, plain-English explanations, category contributions and missing checks. It does not use a trained classifier or claim a measured detection accuracy.',y)
y=table([['Category','Evidence examined'],['Social engineering','Urgency, credentials, payments, changed bank details, secrecy, remote access and QR instructions.'],['URLs & HTML','Actual destination hosts, misleading labels, IP literals, shorteners, internationalized domains and active HTML.'],['Sender identity','From, Reply-To, Return-Path and an optional independently known official domain.'],['Authentication claims','SPF, DKIM and DMARC values in pasted Authentication-Results headers.'],['Attachment clues','Executable, double-extension, macro, archive and direction-control clues in filenames or body text.']],y,[145,354])
y=heading('Privacy by design',y)
y=p('Email input stays in the current browser page. The application makes no network requests with the pasted content and does not save it to browser storage. URLs are shown as inert text, and pasted HTML is never rendered or executed. Loading the application or downloading this guide still involves ordinary website requests.',y)
y=heading('Use the result as a reason to investigate',y)
y=p('A high score is a warning, not proof of fraud. A low score is not proof of safety. Sophisticated messages, compromised legitimate accounts and attacks contained in images or attachments can evade these rules.',y)
assert y>58,y
c.showPage()
y=begin(2,'WORKFLOW','Supply context. Review evidence.','The quality of the assessment depends on what you paste and which independent facts you can provide.')
for title,text in [('1. Import the original message','Choose an EML file or drop it into the import area (maximum 10 MB). MIME parts, base64, quoted-printable and declared character sets are decoded locally. You can also paste complete email source or import an HTML / TXT file.'),('2. Preserve links and add context','Ordinary paste keeps clipboard HTML when available, including hidden button targets. If only plain text is supplied, a warning explains the missing coverage. Add an independently known official domain and any missing sender or header information.'),('3. Read the decision and score breakdown','Review the risk band, capped category contributions and triggered rules. Each finding includes evidence, a raw weight and an explanation that mentions plausible benign causes.'),('4. Inspect what remains unknown','Coverage distinguishes checked inputs from missing inputs. Authentication values are labeled as claims. The URL inventory identifies actual hostnames without opening the destinations.'),('5. Verify through an independent channel','For sensitive requests, use a known official app, a saved bookmark or an established contact. Avoid relying on phone numbers or verification links supplied by the suspicious message. [1]')]:
    y=heading(title,y);y=p(text,y)
y=heading('Input and parsing boundaries',y)
y=p('EML import fills From, Subject, raw headers and attachment names. Both HTML and plain-text MIME alternatives are retained. Import replaces the current message and clears the expected domain; failed imports preserve the previous inputs. Authentication-Results remains an unverified claim.',y)
y=p('Decoded body limit: 100,000 characters; headers: 50,000. Oversize imports are rejected without truncation. HTML/TXT files must be UTF-8. MSG, encrypted messages, PDF, image/QR content and attached emails are not analyzed. Attachments are not opened or scanned.',y,'small')
assert y>58,y
c.showPage()
y=begin(3,'DECISION METHOD','Transparent weights, bounded totals.','Rule weights and thresholds are product design choices. They have not been calibrated against a labeled phishing dataset.')
y=p('<b>Risk index = min(100, sum of category contributions)</b><br/>Each category contribution is min(category cap, sum of triggered rule weights). Each rule adds points only once. Up to three evidence snippets are retained per rule.',y)
y=table([['Category','Maximum contribution'],*[[v['label'],v['cap']]for v in meta['groups'].values()]],y,[330,169])
y=table([['Score','Decision','Interpretation'],['0-19','Few detected signals','No safety verdict; continue normal verification.'],['20-49','Review required','Resolve suspicious clues before sensitive actions.'],['50-100','High risk','Pause interaction and verify / report.']],y,[65,130,304])
y=heading('Why the method uses caps',y)
y=p('Correlated clues can exaggerate a naive sum. For example, an executable with a double extension triggers two file rules (25 + 25), but Attachment clues contributes at most 25. Repeating the same suspicious URL or phrase does not increase a rule weight.',y)
y=heading('Missing data is not exculpatory evidence',y)
y=p('Omitted headers, unavailable attachments or an absent expected domain do not add or subtract points. Instead, the coverage panel records the gap. Passing authentication claims also do not subtract points.',y)
y=heading('Authentication requires a trust boundary',y)
y=p('An Authentication-Results field reports an upstream system\'s assertions. Its presence does not make those assertions trustworthy. Mail Lens cannot establish the trusted receiving boundary or verify SPF, DKIM or DMARC; it only parses the pasted claims. Multiple or conflicting claims need review in the receiving service. [2]',y)
assert y>58,y
c.showPage()
y=begin(4,'RULE REFERENCE','What contributes to the score','All 30 rules are listed below. Weights are raw; category caps and the global cap apply afterward.')
rows=[['Category / cap','Rule','Weight']]
for r in meta['rules']:
    g=meta['groups'][r['group']];rows.append([g['label']+' / '+str(g['cap']),r['title'],r['points']])
# Compact reference table sized to fit a single readable page.
compact=ParagraphStyle('compact',fontName='Helvetica',fontSize=8,leading=10,textColor=navy)
content=[[Paragraph(html.escape(str(v)),compact)for v in row]for row in rows]
t=Table(content,colWidths=[126,333,40]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),pale),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#f7f9fa')]),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),3.5),('BOTTOMPADDING',(0,0),(-1,-1),3.5),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6)]));_,h=t.wrap(499,700);t.drawOn(c,48,y-h);assert y-h>55,(y,h)
c.showPage()
y=begin(5,'EXAMPLES & LIMITS','Interpret a result responsibly.','The built-in samples use reserved example domains. Their scores illustrate rule behavior, not benchmark accuracy.')
y=table([['Sample','Result','Why'],['Account alert','100 / High risk','Social engineering 40, URLs 40, identity 20 and authentication claims 25 total 125, capped at 100.'],['Payment fraud','52 / High risk','Payment, bank-change and secrecy clues reach the content cap of 40; different Reply-To adds 12. Pasted passing authentication does not cancel them.'],['Meeting invite','0 / Few detected signals','No rules trigger. This is still not a verified safe email.']],y,[100,110,289])
y=heading('Known limitations and false positives',y)
y=p('Legitimate password resets, payment workflows, marketing redirects, support platforms, internationalized domains and archives can trigger rules. Exact hostname comparisons are not public-suffix-aware organizational alignment checks. A trusted-looking From address can be forged or compromised.',y)
y=p('Not performed: DNS or WHOIS lookups; domain age or reputation checks; redirect expansion; cryptographic email authentication; malware scanning; archive extraction; QR/image analysis; full semantic or multilingual understanding. English and selected Chinese phrase patterns are supported.',y)
y=heading('If someone has already interacted',y)
y=p('Change exposed credentials through the official service, notify your security team and follow its incident response process. If a payment was sent, contact the bank or payment provider promptly. Preserve the original email for investigation. [1]',y)
y=heading('Validation and future evaluation',y)
y=p('Functional checks verify MIME decoding, hidden-link preservation, clipboard handling, scoring caps and rejection of unsupported or oversized inputs. They do not establish real-world accuracy. A future evaluation should use separately labeled benign and phishing samples, measure false positives and false negatives, and calibrate thresholds before production use.',y)
y=heading('References',y)
y=p('[1] NIST, <i>Phishing</i>, updated August 19, 2025.<br/><link href="https://www.nist.gov/itl/smallbusinesscyber/guidance-topic/phishing" color="#0c655f">nist.gov/itl/smallbusinesscyber/guidance-topic/phishing</link><br/>[2] IETF RFC 8601, <i>Message Header Field for Indicating Message Authentication Status</i>, May 2019, Sections 1.1-1.3.<br/><link href="https://www.rfc-editor.org/rfc/rfc8601.html" color="#0c655f">rfc-editor.org/rfc/rfc8601.html</link><br/>Sources accessed September 11, 2026. Neither source endorses the scoring weights.',y,'small')
assert y>58,y
c.save();print(OUT)

