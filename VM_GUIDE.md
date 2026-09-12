# Mail Lens 虛擬機使用教學

適用版本：Mail Lens 2.1。介面維持英文；本教學以繁體中文說明。

## 1. 先選擇使用方式

**只想在虛擬機內使用：複製專案、啟動 Python 靜態伺服器，再用虛擬機內的瀏覽器開啟。** 不需要 Node.js、API Key、資料庫或 GitHub 登入。

Mail Lens 的分析程式是在「開啟網頁的瀏覽器」執行。如果主機瀏覽器連到虛擬機提供的網站，郵件仍在主機瀏覽器分析。若希望分析留在虛擬機裡，請連瀏覽器與待分析郵件都放在虛擬機內。

此工具不執行附件，也不是惡意程式沙箱。匯入 EML 是讀取郵件結構和文字；不需要開啟郵件中的網址。

## 2. 把檔案搬進虛擬機

可透過虛擬機的共用資料夾或複製壓縮檔搬入專案。拿到 `mail-lens-vm.zip` 時先解壓縮；壓縮檔內的根目錄是 `mail-lens`。不要直接在壓縮檔預覽視窗啟動。

本教學假設放在以下位置；如果不同，請修改後續 `cd` 的路徑。

| 虛擬機系統 | 專案資料夾 |
| --- | --- |
| Ubuntu / Debian | `~/mail-lens` |
| Windows | `C:\Tools\mail-lens` |

確認專案至少包含：

```text
mail-lens/
  dist/
    index.html
    style.css
    engine.js
    app.js
    importer.js
    mail-lens-guide.pdf
    postal-mime-LICENSE.txt
  tests/
    hidden-link.eml
  README.md
  VM_GUIDE.md
```

請保留整個 `dist` 資料夾。只複製 `index.html` 會缺少分析引擎、匯入功能及樣式。`node_modules` 是開發依賴，不需要從 Windows 複製到 Linux。

GitHub 儲存庫建立後，也可以在虛擬機內從該儲存庫的 **Code → Download ZIP** 下載；私密儲存庫需先登入有權限的帳號。解壓縮後確認工作目錄，不要把「GitHub 上傳成功」當作使用本機版本的先決條件。

## 3. Ubuntu / Debian：最快啟動

以下命令全部在**虛擬機的 Terminal** 執行。

先檢查 Python：

```bash
python3 --version
```

若顯示找不到指令，連線安裝一次：

```bash
sudo apt update
sudo apt install python3
```

進入專案並啟動：

```bash
cd ~/mail-lens
python3 -m http.server 8766 --bind 127.0.0.1 --directory dist
```

保持終端機開著，在**虛擬機內**的瀏覽器開啟：

[http://127.0.0.1:8766/](http://127.0.0.1:8766/)

應看到 **MAIL LENS**、**Keep the original links**、**Choose a file or drop it here**。Python 指令中的 `--directory dist` 會只提供網站輸出資料夾；`--bind 127.0.0.1` 則限制為虛擬機本身連線。[Python 官方說明](https://docs.python.org/3/library/http.server.html#command-line-interface)

停止時回到同一個終端機，按 **Ctrl+C**。下次使用再次執行啟動指令即可；這個步驟不會設定開機自動啟動。

## 4. Windows 虛擬機：最快啟動

先安裝 Python 3（若已安裝可略過），並在**虛擬機的 PowerShell** 檢查：

```powershell
py -3 --version
```

Python 可從 [Python 官方網站](https://www.python.org/downloads/windows/) 取得。安裝後重新開啟 PowerShell。

```powershell
Set-Location C:\Tools\mail-lens
py -3 -m http.server 8766 --bind 127.0.0.1 --directory dist
```

若只有 `python` 指令可用，先用 `python --version` 確認是 Python 3，再改成：

```powershell
python -m http.server 8766 --bind 127.0.0.1 --directory dist
```

保持視窗開著，在**虛擬機內**的瀏覽器開啟 [http://127.0.0.1:8766/](http://127.0.0.1:8766/)。按 **Ctrl+C** 可停止服務。

## 5. 第一次驗證與使用

1. 按 **Meeting invite**：預期為 **0 / Few detected signals**。
2. 按 **Account alert**：預期為 **100 / High risk: pause and verify**。
3. 按 **Clear**，在 **Choose a file or drop it here** 選取專案的 `tests/hidden-link.eml`。
4. 匯入後確認 From、Subject 與正文已填入，狀態區顯示 **EML imported**。
5. 展開 **URL inventory**：應出現 `evil.example` 與 **Verify account** 連結標籤，表示原本隱藏在按鈕裡的目標已被保留。這是人工測試資料，不需開啟網址。
6. 改用自己的 EML。若要比對官方網域，在 **More context for stronger checks → Expected official domain** 填入你事先知道的正確網域，再按 **Analyze email**。

匯入新檔案會取代目前郵件並清空 Expected official domain；分析中途修改欄位後，請重新按 **Analyze email** 更新結果。

結果是規則風險分數，不是釣魚機率。0 分也不是安全證明；請同時看證據、缺少的檢查與建議。

## 6. 四種輸入方式

| 方式 | 操作 | 可以保留什麼 |
| --- | --- | --- |
| EML（優先使用） | 選檔或拖入匯入區 | 解碼 MIME，保留 HTML、文字、標頭和附件名稱 |
| 完整原始碼 | 展開 **Or paste complete email source**，貼入原始郵件後按 **Import source** | 與 EML 相同，但須包含標頭及 MIME 正文 |
| 保留格式貼上 | 正常複製郵件，貼入 **Message body** | 剪貼簿有 HTML 時保留實際 href；畫面會顯示 HTML 原始碼 |
| HTML / TXT 檔 | 在相同匯入區選檔 | UTF-8 HTML 保留內含連結；TXT 只有可見文字 |

如果跨主機／虛擬機的共用剪貼簿只傳送純文字，HTML 連結仍會遺失。遇到 **Only plain text was supplied by the clipboard**，改用 EML 檔，不要期待從「Click here」文字還原出原本網址。

限制：單檔 10 MB；解碼正文 100,000 字元；標頭 50,000 字元。超過上限會拒絕匯入，不會默默截斷。MSG、加密郵件、PDF、QR code／圖片內容不支援；附加的另一封 EML 需另存後分別匯入。附件只檢查名稱，沒有掃描內容。

英文介紹可從 **Download English guide** 下載，也可直接開啟 `dist/mail-lens-guide.pdf`。

## 7. 選用：從主機瀏覽器連進虛擬機

如果只需在虛擬機內分析，可以略過本節。主機的 `127.0.0.1` 代表主機，虛擬機的 `127.0.0.1` 代表虛擬機；兩者不是同一台機器。

先停止原服務，然後在 Linux 虛擬機執行：

```bash
cd ~/mail-lens
python3 -m http.server 8766 --bind 0.0.0.0 --directory dist
```

Windows 虛擬機的等效指令：

```powershell
Set-Location C:\Tools\mail-lens
py -3 -m http.server 8766 --bind 0.0.0.0 --directory dist
```

`0.0.0.0` 是監聽設定，不是瀏覽器要輸入的網址。服務沒有使用者登入機制；這裡的 Python 伺服器僅供本機實驗用途，不適合直接公開到 Internet。[Python 官方說明](https://docs.python.org/3/library/http.server.html)

### 方法 A：Host-only 網路

在虛擬機軟體設定好 Host-only 網卡。Linux 可用 `ip -4 addr`、Windows 可用 `ipconfig` 找出該網卡的 IP。主機瀏覽器輸入 `http://虛擬機IP:8766/`，把文字替換成實際位址。

若虛擬機防火牆阻擋，僅允許主機位址到 TCP 8766；不需要關閉整個防火牆。

### 方法 B：NAT 連接埠轉送

若使用的虛擬機平台支援 NAT 連接埠轉送，建立以下規則；設定頁面名稱依軟體而異：

| 項目 | 設定 |
| --- | --- |
| 協定 | TCP |
| 主機 IP | `127.0.0.1` |
| 主機連接埠 | `8767` |
| 虛擬機連接埠 | `8766` |
| 虛擬機 IP | 該 NAT 網卡的位址，依平台規則填入 |

主機端開啟 [http://127.0.0.1:8767/](http://127.0.0.1:8767/)。使用 8767 是為了避免和目前主機已使用的 8766 衝突。若平台沒有 NAT 轉送設定，可用 Host-only，或直接在虛擬機內開瀏覽器。

再次提醒：此方式是在**主機瀏覽器**分析郵件，虛擬機只提供網頁檔案。

## 8. 選用：修改程式、重新編譯與測試

單純使用 `dist` 不需要這一節。開發時在虛擬機安裝 Node.js 22（本專案曾使用的主要版本）和 npm，然後在專案根目錄執行：

```bash
npm ci
npm run build
npm test
```

第一次 `npm ci` 需要連線下載鎖定的套件。`npm run build` 重新產生 `dist/importer.js`。目前測試預期為 **24 個引擎檢查 + 13 個匯入檢查**。Windows 與 Linux 的本機套件可能不同，請在目標虛擬機重新執行 `npm ci`。

修改完成後，原本的 Python 服務會提供磁碟上的新檔案；瀏覽器重新整理即可，必要時使用 Ctrl+Shift+R 清除快取。只修改教學文件不需要重新編譯。

## 9. 常見問題

| 狀況 | 處理方式 |
| --- | --- |
| 顯示資料夾清單，沒有 Mail Lens | 確認在專案根目錄啟動，且用了 `--directory dist` |
| 網頁沒樣式或分析按鈕沒反應 | 檢查是否完整複製 `dist`，特別是 `engine.js`、`app.js`、`importer.js` |
| `Address already in use` | 改用 8768 啟動，瀏覽器也改成對應連接埠 |
| 主機開不了 VM 的網站 | 確认監聽不是 VM 的 127.0.0.1，並檢查 Host-only / NAT 轉送與防火牆 |
| 看到舊版，沒有匯入區 | 重新整理快取，確認啟動的是新專案資料夾 |
| EML 太大 | 使用較小的郵件；可另行匯出不含大附件的副本，但要記錄因此失去的證據 |
| 按鈕網址還是沒出現 | 不要只貼純文字；改匯入原始 EML，查看是否有 HTML 或未支援目標提示 |
| VM 斷網後能否使用？ | Python、瀏覽器與 `dist` 都已備妥即可；目前分析不需外網查詢 |
| 關閉終端機後網站不能開 | 重新執行啟動命令，並保持終端機開啟 |

本教學依目前專案檔案與 Python 官方指令說明整理；尚未在你的實際虛擬機環境中執行驗證。
