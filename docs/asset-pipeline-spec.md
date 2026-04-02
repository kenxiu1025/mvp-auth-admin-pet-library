# 電子寵物任務系統 — Asset / Character Pipeline Spec

> 本文檔僅涵蓋角色素材與資產生產需求。Web 產品功能需求請見 [Product PRD](./product-prd.md)。

## 1. 文檔目的

這份 Asset Pipeline Spec 專注於角色設定、狀態資產需求、素材命名版本規則、一致性驗收標準、以及素材生產與微修流程。
產品功能、帳號模型、任務規則、商店等內容已獨立至 Product PRD。

## 2. 角色設定

### 當前預設角色

| character_id | display_name | species | 風格 |
|---|---|---|---|
| `cat-default` | Cat Default | cat | 系統預設 fallback |
| `white-cat` | White Cat | cat | kawaii / clean / soft-light / children-book / sticker-friendly |
| `tabby-cat` | Tabby Cat | cat | kawaii / clean / soft-light / children-book / sticker-friendly |

### 角色身份特徵（以 white-cat 為例）

- 白色摺耳小貓
- 大型藍寶石色眼睛
- 粉色鼻子
- 圓臉
- 正面坐姿、四腳可見
- 尾巴捲在左邊

詳細角色配置檔位於：

- `pet_pipeline/config/characters/white_cat.yaml`
- `pet_pipeline/config/characters/tabby_cat.yaml`

### 角色 fixed_traits 與 forbidden_traits

每個角色配置檔中明確定義：

- `fixed_traits`：必須在所有狀態圖中保持一致的特徵
- `forbidden_traits`：任何狀態圖都不應出現的特徵

## 3. 狀態資產需求

### 核心狀態（MVP 第一輪必做）

| state_id | 情緒目標 | 類型 |
|---|---|---|
| `calm` | 平靜安定 | 表情型 |
| `happy` | 明顯開心但不失身份 | 姿態型 |
| `hungry` | 可愛渴望、有期待感 | 姿態型 |
| `angry` | 可愛不爽、非敵意 | 姿態型 |

### 推薦狀態（第二輪補充）

| state_id | 情緒目標 | 類型 |
|---|---|---|
| `sleepy` | 昏沉柔軟 | 表情型 |
| `excited` | 興奮雀躍 | 姿態型 |

### 基準狀態

| state_id | 情緒目標 | 用途 |
|---|---|---|
| `default` | 中性吉祥物基線 | 作為下游比對的錨定圖 |

## 4. 表情型 / 姿態型狀態分類

### 表情型

- 主要靠**臉部表情**傳達情緒
- 身體輪廓、坐姿、尾巴位置與基準圖保持一致
- 適合使用 face inpaint 處理
- 範例：`calm`、`sleepy`

### 姿態型

- 情緒需要透過**身體姿態 + 表情**共同傳達
- 不只改臉，輪廓與動態也會有差異
- 適合使用完整 production render 或 img2img
- 範例：`happy`、`hungry`、`angry`、`excited`

<!-- TODO: 每個狀態的「表情型/姿態型」分類為目前建議，可能需依實際產出結果調整 -->

### 各狀態推薦渲染參數

詳見 `pet_pipeline/config/states.yaml`，包含：

- `facial_focus`：表情重點
- `prompt_addon` / `negative_addon`
- `recommended_denoise_range`
- `recommended_mask_type`
- `recommended_pipeline`（preview / face_inpaint / production）

## 5. 素材命名與版本規則

### 檔案命名格式

```
{character}_{state}_{stage}_v{n}.png
```

範例：

- `white_cat_happy_raw_v1.png`
- `white_cat_happy_review_v2.png`
- `white_cat_happy_final_v1.png`

### stage 定義

| stage | 說明 |
|---|---|
| `raw` | AI 首次輸出 |
| `review` | 經 inpaint 或手動微修後的候選 |
| `final` | 通過驗收的正式資產 |

### 正式輸出目錄

- Web 產品用：`public/pet/{character}/{state}.png`
- 流水線內部：`pet_pipeline/output/{stage}/{character}/{file}`

### 來源與配置

- `data/pet-asset-manifest.json`
- `prompts/pet-prompts.json`
- `data/pet-asset-jobs.json`

## 6. 一致性驗收標準

### 第一優先：Identity Consistency（身份一致性）

玩家必須能在不同狀態圖之間，一眼認出是同一隻角色。

驗收項目：

- 眼睛顏色與角色規格一致
- 毛色/花紋與角色規格一致
- 耳朵形狀與角色規格一致
- 尾巴長度與粗細穩定
- 鼻子與嘴巴位置自然居中

### 第二優先：Expression Differentiation（情緒差異度）

不同狀態之間的情緒要有明確差異，但不能為了強調差異而導致身份漂移。

驗收項目：

- 指定狀態的情緒清楚可辨
- 情緒強度不能強到身份破裂
- 眼睛和嘴巴仍然像同一隻角色

### 第三優先：Composition Stability（構圖穩定性）

驗收項目：

- 畫布尺寸正確
- 角色居中一致
- 身體比例與批准基線相符
- 四腳可見（除非狀態設計刻意隱藏）

### 資產品質

- 背景已去除（final 階段）
- 透明 PNG 無光暈
- 檔名遵循命名規則
- manifest 條目已建立

> 完整人工審圖 checklist 見 `pet_pipeline/docs/HUMAN_REVIEW_CHECKLIST.md`。

## 7. 素材生產與微修流程

### 工具分工

#### GPT API

- 組裝 prompt
- 固定角色身份描述
- 產出批次任務清單
- 管理命名與狀態規格

#### 本地 Stable Diffusion

- 以基準圖做 `img2img`
- 產出同角色不同情緒版本
- 每個狀態一次生成多張候選，人工挑圖後入庫

#### ComfyUI

- production / inpaint 正式渲染
- ControlNet 鎖定身體比例
- IP-Adapter 保持角色身份
- face inpaint 處理表情變化

#### Ollama（本地視覺 QC）

- 本地視覺模型做自動品質檢查

#### OpenClaw

- skill 調度入口

### 推薦生產流程

#### Step 1：確認角色基準圖

manifest 已綁定本地基準圖，如需更換只改 `data/pet-asset-manifest.json` 的 `baseImage`。

#### Step 2：生成任務清單

```bash
npm run assets:prepare    # 產生 data/pet-asset-jobs.json
npm run assets:status     # 查看哪些圖還缺
npm run assets:export-sd  # 匯出本地 SD 工單
```

#### Step 3：Preview 渲染

```bash
make pet-preview-jobs
make pet-render-preview
```

建議 img2img 設定：

- denoise strength: `0.2 ~ 0.35`
- CFG: `6 ~ 7`
- 先保持原構圖不變
- 每個狀態先出 4 張候選

#### Step 4：Production 渲染（正式批次）

使用 ControlNet + IP-Adapter + face inpaint。

```bash
make pet-render-production
```

#### Step 5：人工挑圖

挑選標準：

- 看起來還是同一隻貓
- 構圖不能跑掉
- 尾巴位置不要大變
- 臉型、眼睛顏色、花紋不能漂移
- 情緒有差異，但不要失真

#### Step 6：微修（inpaint）

針對挑中但有小問題的候選做 face/eyes/mouth inpaint。

```bash
make pet-render-inpaint
```

#### Step 7：放入正式目錄

```text
public/pet/white-cat/happy.png
public/pet/white-cat/hungry.png
...
```

#### Step 8：匯出 manifest

```bash
make pet-review
make pet-manifest
```

### Fallback 規則

系統取圖策略：

1. 先找該角色對應狀態圖
2. 若不存在，退回該角色的 `calm.png`
3. 若仍不存在，再退回 `cat-default`

### 各階段目錄結構

| 目錄 | 說明 |
|---|---|
| `pet_pipeline/output/raw/` | AI 首次輸出 |
| `pet_pipeline/output/review/` | inpaint 或手動微修後的候選 |
| `pet_pipeline/output/final/` | 通過驗收的正式資產 |

## 8. 生產分輪計畫

### 第一輪（MVP 必做）

角色：`white-cat`、`tabby-cat`

狀態：`calm`、`happy`、`hungry`、`angry`

> `calm` 基準圖已有，第一輪只需補 `happy`、`hungry`、`angry`。

### 第二輪

- `sleepy`
- `excited`

### 後續可擴充

- 情緒貼圖特效
- 道具 overlay
- 偽動畫
- LoRA 訓練與量產流程

## 9. 相關文檔

- [pet_pipeline/README.md](../pet_pipeline/README.md)
- [pet_pipeline/RUNBOOK.md](../pet_pipeline/RUNBOOK.md)
- [pet_pipeline/docs/PIPELINE_OVERVIEW.md](../pet_pipeline/docs/PIPELINE_OVERVIEW.md)
- [pet_pipeline/docs/FORMAL_WORKFLOW.md](../pet_pipeline/docs/FORMAL_WORKFLOW.md)
- [pet_pipeline/docs/HUMAN_REVIEW_CHECKLIST.md](../pet_pipeline/docs/HUMAN_REVIEW_CHECKLIST.md)
- [pet_pipeline/docs/LORA_WORKFLOW.md](../pet_pipeline/docs/LORA_WORKFLOW.md)
- [pet_pipeline/docs/LOCAL_ENV_SNAPSHOT.md](../pet_pipeline/docs/LOCAL_ENV_SNAPSHOT.md)
- [pet_pipeline/docs/LOCAL_VL_QC_RUNBOOK.md](../pet_pipeline/docs/LOCAL_VL_QC_RUNBOOK.md)

## 10. 已知待補項

<!-- TODO: 以下項目需要後續規劃 -->
- `excited` 狀態是否確定為姿態型（需依實際產出結果調整）
- 道具 overlay 與角色圖的合成規格
- 動畫資產規格（偽動畫 / 真動畫）
- 更多角色的身份特徵定義
- LoRA 訓練數據集建立標準
- 更穩定的角色姿態資產生產流程
