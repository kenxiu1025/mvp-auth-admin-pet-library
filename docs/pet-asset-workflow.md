# Pet Asset Workflow v1

> 本文檔為早期素材工作流筆記。完整的素材生產規格已整合至 [Asset / Character Pipeline Spec](./asset-pipeline-spec.md)。

這份流程是給目前的 MVP 使用，目標是先把兩隻已選定角色穩定做出第一輪可用素材，不急著一次做完整素材庫。

## 目標

第一輪只做：

- `white-cat`
- `tabby-cat`

每隻先完成 4 個核心狀態：

- `calm`
- `happy`
- `hungry`
- `angry`

推薦狀態：

- `sleepy`
- `excited`

## 工具分工

### GPT API

負責：

- 組裝 prompt
- 固定角色身份描述
- 產出批次任務清單
- 管理命名與狀態規格

### 本地 Stable Diffusion

負責：

- 以基準圖做 `img2img`
- 產出同角色不同情緒版本
- 每個狀態一次生成多張候選，人工挑圖後入庫

## 目錄結構

### 來源與配置

- `data/pet-asset-manifest.json`
- `prompts/pet-prompts.json`
- `data/pet-asset-jobs.json`

### 正式輸出

- `public/pet/white-cat/*.png`
- `public/pet/tabby-cat/*.png`

## 推薦流程

### Step 1：確認角色基準圖

目前 manifest 已經綁定兩張本地基準圖：

- `white-cat`
- `tabby-cat`

如需更換基準圖，只改 `data/pet-asset-manifest.json` 的 `baseImage` 即可。

### Step 2：生成任務清單

執行：

```bash
npm run assets:prepare
```

這會產生：

- `data/pet-asset-jobs.json`

如果只想看目前哪些圖還缺：

```bash
npm run assets:status
```

如果要把 jobs 匯出成更適合本地 Stable Diffusion 使用的工單：

```bash
npm run assets:export-sd
```

會輸出到：

- `data/sd-export/white-cat/*.json`
- `data/sd-export/white-cat/white-cat-prompt-pack.md`
- `data/sd-export/tabby-cat/*.json`
- `data/sd-export/tabby-cat/tabby-cat-prompt-pack.md`

其中：

- `.json` 適合你接程式或批次工具
- `.md` 適合你直接打開照著在 WebUI / Forge / Comfy 跑

### Step 3：用 SD 跑第一輪圖

建議設定：

- mode: `img2img`
- denoise strength: `0.2 ~ 0.35`
- CFG: `6 ~ 7`
- 先保持原構圖不變
- 每個狀態先出 `4` 張候選

第一輪先只跑：

- `white-cat/happy`
- `white-cat/hungry`
- `white-cat/angry`
- `tabby-cat/happy`
- `tabby-cat/hungry`
- `tabby-cat/angry`

因為 `calm` 基準圖已經有了。

如果你用 WebUI / Forge，最方便的方式是：

1. 先打開 `data/sd-export/<asset>/<asset>-prompt-pack.md`
2. 每次挑一個狀態
3. 把 `Prompt / Negative Prompt / denoise / cfg / steps / sampler` 直接貼到本地 SD
4. 用 manifest 裡的 `baseImage` 做 `img2img`

### Step 4：人工挑圖

挑選標準：

- 看起來還是同一隻貓
- 構圖不能跑掉
- 尾巴位置不要大變
- 臉型、眼睛顏色、花紋不能漂移
- 情緒有差異，但不要失真

### Step 5：放入正式目錄

把選中的圖放到：

```text
public/pet/white-cat/happy.png
public/pet/white-cat/hungry.png
public/pet/white-cat/angry.png
public/pet/tabby-cat/happy.png
public/pet/tabby-cat/hungry.png
public/pet/tabby-cat/angry.png
```

系統會自動依 `pet_assets` / `pet_asset_states` / `pets.selected_pet_asset_id` 去顯示。

## Fallback 規則

> 系統取圖策略定義於 [Product PRD §8](./product-prd.md#8-寵物系統需求產品層)。簡言之：先找狀態圖 → 退回 `calm.png` → 退回 `cat-default`。

所以你可以先只補：

- `calm`
- `happy`
- `hungry`
- `angry`

不用一次完成全部。

## 第二輪建議

等第一輪穩定後，再做：

- `sleepy`
- `excited`

再下一輪才考慮：

- 情緒貼圖特效
- 道具 overlay
- 偽動畫

## 後續可擴充

下一階段可以補：

- `scripts/generate-openai-prompts.ts`
- `scripts/import-generated-assets.ts`
- `data/pet-review-checklist.md`
- `public/pet-effects/*`

但目前不用先做，先把第一輪 2 隻角色的 4 狀態做好最重要。
