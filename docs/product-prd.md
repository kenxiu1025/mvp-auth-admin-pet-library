# 電子寵物任務系統 — Product PRD

> 本文檔僅涵蓋 Web 產品層需求。角色素材與資產生產需求請見 [Asset / Character Pipeline Spec](./asset-pipeline-spec.md)。

## 1. 文檔目的

這份 Product PRD 專注於 Web 產品功能、使用者角色、頁面模塊與部署策略。
素材資產相關的生產流程、命名規範、一致性驗收等內容已獨立至 Asset Pipeline Spec。

## 2. 產品目標

### 核心目標

建立一個家庭可實際使用的電子寵物任務系統，讓家長可以透過任務派發與審核機制，驅動孩子完成日常事項，並用電子寵物狀態作為回饋。

### 核心成功指標

- 家長能穩定派發任務並完成審核
- 孩子能理解今日要做什麼，並完成提交
- 寵物狀態能正確反映孩子當日進度
- 權限隔離清楚，不會看見其他家庭資料

## 3. 目標使用者

### 家長

- 建立孩子帳號
- 派發任務
- 審核孩子提交
- 查看每日完成情況

### 孩子

- 看今天的任務與寵物狀態
- 提交已完成任務
- 從寵物回饋中感受成就

### 管理員

- 管理家長 / 孩子帳號
- 協助重設密碼
- 協助排查綁定與權限問題

## 4. 產品邊界

### 本 PRD 內

- Web 產品流程
- 權限與帳號模型
- 任務審核制
- 寵物狀態規則（產品層）
- 商店與道具購買
- invite onboarding
- 家庭資料隔離

### 本 PRD 暫不包含

- 真正上架的 App 版本
- 雲端多租戶運維
- 推播通知
- 複雜社交機制
- 排行榜
- 即時動畫引擎
- 本地素材資產工程（見 [Asset Pipeline Spec](./asset-pipeline-spec.md)）

## 5. 核心使用流程

### 流程 A：家長建立與綁定孩子

1. 家長註冊並設定密碼
2. 家長建立 invite link
3. 孩子透過 `/login?invite=TOKEN` 進入 onboarding
4. 孩子完成基本資料、角色設定、寵物命名與密碼設置
5. 系統完成 parent-child 關聯

### 流程 B：家長派發與審核

1. 家長到 `/parent`
2. 選擇孩子
3. 批量派發今日任務
4. 孩子完成後提交
5. 家長 approve / reject
6. 只有 approved 任務進入 food / coin 計分

### 流程 C：孩子端回饋

1. 孩子登入 `/child`
2. 查看寵物狀態與今日任務
3. 對 pending 任務點「我完成了」
4. 任務進入 submitted
5. 家長審核後，寵物狀態變化

## 6. 任務規則

### 任務類型

- 主線：貓糧
- 支線：貓星幣

### 任務狀態

- `pending`
- `submitted`
- `approved`
- `rejected`

### 計分規則

- 主線 approved 數 × 10 = food
- 支線 approved 數 × 10 = coin
- submitted 不計分
- rejected 不計分

### 每日規則

- 每日最多 10 項任務
- threshold 來自 `app_config`
- food 低於 threshold 時寵物為 `hungry`
- 達 threshold 後依完成率決定 mood

## 7. 權限模型

### role

- `admin`
- `parent`
- `child`

### 關聯規則

- `child.parent_user_id` 指向其所屬家長
- 家長只能查詢自己名下孩子
- 管理員可跨家庭查看資料

### 安全原則

- child 不可 approve / reject
- parent 不可越權查看他人孩子
- 被停用帳號不可登入

## 8. 寵物系統需求（產品層）

- 孩子帳號綁定一個寵物角色
- 寵物具備：
  - `petStatus`
  - `mood`
  - `todayFood`
  - `todayCoin`
- 頁面上顯示角色圖、狀態文案、道具結果
- 多個孩子可以共用同一角色素材
- 角色不會因為不同帳號而重複存一份圖
- 系統取圖策略：
  1. 先找該角色對應狀態圖
  2. 若不存在，退回該角色的 `calm.png`
  3. 若仍不存在，再退回 `cat-default`

> 角色素材的生產規格、狀態分類、命名規則等請見 [Asset Pipeline Spec](./asset-pipeline-spec.md)。

## 9. 商店與道具

### 當前需求

- 用 coin 購買內建道具
- 查看已購買清單

### 尚未完全定義的部分

<!-- TODO: 以下項目需要產品決策後再補完 -->
- 道具是否只是收藏，還是可以裝備
- 若可裝備，slot 如何定義
- 道具是否會影響角色顯示
- 動態角色與道具掛點如何處理

## 10. 頁面與 API

### 主要頁面

- `/login`
- `/parent`
- `/admin`
- `/child`
- `/tasks`
- `/pet`
- `/shop`

### 主要 API

#### 任務

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/submit`
- `PATCH /api/tasks/:id/review`
- `GET /api/tasks/:id/reviews`

#### 孩子 / 寵物

- `GET /api/child/today`
- `GET /api/pet-status`

#### 家長

- `POST /api/parent/assign-tasks`
- `GET /api/parent/review-queue`
- `GET /api/parent/daily-progress`

#### 商店

- `GET /api/shop-items`
- `POST /api/shop/buy`

#### 管理員

- `GET /api/admin/overview`
- `POST /api/admin/reset-password`
- `PATCH /api/admin/users/:id/status`

#### invite / onboarding / analytics

- `GET /api/invites/:token`
- `POST /api/invites/:token/accept`
- `POST /api/analytics/onboarding-event`
- `GET /api/analytics/onboarding-funnel`

## 11. 資料表與 Migration

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

## 12. 非功能需求

### 穩定性

- child / parent 端防重入
- 非法狀態流轉回 `409`
- child hidden 狀態暫停輪詢

### 可維護性

- 角色 / 狀態 / profile 配置檔化
- 流程可重複跑
- 素材流水線與 Web 主專案解耦

### 可擴展性

- 可新增更多角色
- 可新增更多狀態
- 可新增 LoRA 訓練與量產流程

## 13. 部署策略

- MVP 先以 Web / H5 為主要交付形式
- 家長 / 孩子透過手機瀏覽器使用
- 管理員使用桌面 Web
<!-- TODO: 正式雲端部署方案與資料庫升級尚未落地，需後續規劃 -->

## 14. 當前建議的產品優先順序

1. 穩定 Web MVP 主流程
2. 完成角色資產第一輪一致性驗證
3. 補孩子選寵物
4. 補道具裝備展示
5. 再評估動畫與 App 化

## 15. 已知待補項

- 孩子選寵物的正式產品流程
- 道具 slot / overlay 裝備系統
- 角色動作與動畫規格
- 正式部署方案與資料庫升級

> 素材相關待補項請見 [Asset Pipeline Spec](./asset-pipeline-spec.md)。
