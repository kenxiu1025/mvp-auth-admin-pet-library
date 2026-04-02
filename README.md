# 電子寵物任務系統

使用 Next.js + SQLite 建立的家庭型電子寵物 MVP。  
目前專案已包含三個層次：

- Web 產品本體：家長、孩子、管理員三種角色與任務審核流程
- 寵物素材庫：角色資產與狀態圖資料模型
- 本地素材生產流水線：`pet_pipeline/`，支援 ComfyUI / Ollama 的資產生成與 QC

## 1. 產品概覽

### 核心定位

- 家長派發任務
- 孩子提交完成
- 家長審核後才計分
- 透過電子寵物狀態、情緒與道具，讓孩子對日常任務有持續回饋

### 目前已完成

- 家長 / 孩子 / 管理員角色模型
- 密碼登入、invite onboarding、親子綁定
- 任務派發、提交、審核、審核歷史
- 每日完成總覽
- onboarding 漏斗追蹤
- 商店 / 道具購買
- 寵物狀態與情緒規則
- 家庭資料隔離
- 管理員後台
- 本地素材流水線 `pet_pipeline/`

### 目前仍偏 MVP 的部分

- 孩子正式「選寵物」流程仍未完整產品化
- 道具還沒做成完整 slot / overlay 裝備系統
- 角色動畫仍是後續規劃，不是現階段完成項
- 正式雲端部署與資料庫升級尚未落地

## 2. 角色與權限

### `admin`

- 管理員
- 可查看家長 / 孩子關係
- 可重設密碼
- 可停用 / 啟用帳號

### `parent`

- 家長
- 只能查看自己名下孩子
- 可派發任務
- 可審核 `submitted` 任務
- 可查看 daily progress、review queue、onboarding funnel

### `child`

- 孩子
- 只能查看自己的寵物與任務
- 只能把 `pending` 任務提交成 `submitted`
- 不可 approve / reject

## 3. 任務流程

### 狀態流轉

```text
pending -> submitted -> approved / rejected
```

### 計分規則

- 只有 `approved` 任務會計分
- 主線任務：`+10 food`
- 支線任務：`+10 coin`

### 寵物規則

- 每日 food 生存線來自 `app_config`
- 預設 `DAILY_FOOD_THRESHOLD = 30`
- `food < threshold`：`hungry`
- `food >= threshold` 時，依完成率決定情緒：
  - `happy`
  - `calm`
  - `angry`

## 4. 主要頁面

- `/login`
- `/parent`
- `/admin`
- `/child`
- `/tasks`
- `/pet`
- `/shop`

## 5. 主要 API

### 任務

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/submit`
- `PATCH /api/tasks/:id/review`
- `GET /api/tasks/:id/reviews`

### 孩子 / 寵物

- `GET /api/child/today`
- `GET /api/pet-status`

### 家長

- `POST /api/parent/assign-tasks`
- `GET /api/parent/review-queue`
- `GET /api/parent/daily-progress`

### 商店

- `GET /api/shop-items`
- `POST /api/shop/buy`

### 管理員

- `GET /api/admin/overview`
- `POST /api/admin/reset-password`
- `PATCH /api/admin/users/:id/status`

### invite / onboarding / analytics

- `GET /api/invites/:token`
- `POST /api/invites/:token/accept`
- `POST /api/analytics/onboarding-event`
- `GET /api/analytics/onboarding-funnel`

## 6. 資料表與 Migration

目前主要 migration：

- `migrations/001_init.sql`
- `migrations/002_app_config.sql`
- `migrations/003_roles_and_review_workflow.sql`
- `migrations/004_task_reviews.sql`
- `migrations/005_onboarding_and_invites.sql`
- `migrations/006_onboarding_events.sql`
- `migrations/007_auth_and_admin.sql`
- `migrations/008_user_disable.sql`
- `migrations/009_pet_asset_keys.sql`
- `migrations/010_pet_asset_library.sql`

主要資料表：

- `users`
- `pets`
- `tasks`
- `daily_summary`
- `shop_items`
- `inventory`
- `app_config`
- `task_reviews`
- `parent_invites`
- `onboarding_events`
- `pet_assets`
- `pet_asset_states`

## 7. 預設帳號

seed 會建立：

- `admin1 / Admin1234`
- `parent1 / Parent1234`
- `childA / ChildA1234`
- `childB / ChildB1234`

## 8. 本地啟動

### 安裝依賴

```bash
npm install
```

### 建立資料庫

```bash
npm run db:migrate
npm run db:seed
```

### 啟動開發環境

```bash
npm run dev
```

### 建議登入入口

- 家長：`http://localhost:3000/login`
- 邀請 onboarding：`/login?invite=TOKEN`
- 孩子端：登入後進 `/child`
- 管理員：登入後進 `/admin`

## 9. 本地素材流水線

`pet_pipeline/` 是獨立於主 Web 專案的本地素材工作區。

> 完整的素材生產規格、角色設定、狀態分類、命名規則、一致性驗收標準請見 [docs/asset-pipeline-spec.md](./docs/asset-pipeline-spec.md)。

### 能力

- 角色 / 狀態 YAML 配置
- preview / production / inpaint / lora_inference profiles
- ComfyUI production / inpaint 接入
- 本地 Ollama 視覺 QC
- OpenClaw skill 調度入口

### 主要入口

- `./pet_pipeline/scripts/verify_pipeline_ready.sh`
- `./pet_pipeline/scripts/run_white_cat_batch.sh`
- `./pet_pipeline/scripts/run_white_cat_batch.sh --inpaint-only`
- `python3 pet_pipeline/scripts/qc_single_image.py --image ... --character ... --state ...`

### 相關文檔

- [pet_pipeline/README.md](./pet_pipeline/README.md)
- [pet_pipeline/RUNBOOK.md](./pet_pipeline/RUNBOOK.md)
- [pet_pipeline/docs/PIPELINE_OVERVIEW.md](./pet_pipeline/docs/PIPELINE_OVERVIEW.md)
- [pet_pipeline/docs/LOCAL_ENV_SNAPSHOT.md](./pet_pipeline/docs/LOCAL_ENV_SNAPSHOT.md)
- [pet_pipeline/docs/LOCAL_VL_QC_RUNBOOK.md](./pet_pipeline/docs/LOCAL_VL_QC_RUNBOOK.md)

## 10. 目前寵物資產模型

### Web 產品資料模型

- `pet_assets`：素材角色主表
- `pet_asset_states`：角色狀態圖
- `pets.selected_pet_asset_id`：孩子當前綁定的素材角色

這代表：

- 多個孩子可以共用同一隻角色素材
- 角色不會因為不同帳號而重複存一份圖

### 當前預設角色

- `cat-default`
- `white-cat`
- `tabby-cat`

## 11. 文件導讀

如果你想快速理解目前系統，建議按這個順序看：

1. [README.md](./README.md)（本文件）
2. [docs/product-prd.md](./docs/product-prd.md) — Product PRD（Web 產品需求）
3. [docs/asset-pipeline-spec.md](./docs/asset-pipeline-spec.md) — Asset / Character Pipeline Spec（角色素材生產需求）
4. [docs/PRD_MVP.md](./docs/PRD_MVP.md) — 原始 PRD 索引頁（說明拆分背景）
5. [pet_pipeline/README.md](./pet_pipeline/README.md)
6. [pet_pipeline/docs/PIPELINE_OVERVIEW.md](./pet_pipeline/docs/PIPELINE_OVERVIEW.md)

## 12. 已知待補項

- 孩子選寵物的正式產品流程
- 道具 slot / overlay 裝備系統
- 角色動作與動畫規格
- 正式部署方案與資料庫升級
- 更穩定的角色姿態資產生產流程
