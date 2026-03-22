# 電子寵物任務系統 MVP

使用 Next.js + SQLite 製作的 Web 版 MVP，現在已升級到認證與權限強化版本，支援家長派發、孩子提交、家長審核、invite onboarding、密碼登入與管理員後台。

## 功能

- 預設帳號：`admin1`、`parent1`、`childA`、`childB`
- 每位孩子各自擁有一隻貓
- 家長與孩子都必須使用密碼登入
- 貓糧任務：每個 `approved` 主線任務可得 `+10 貓糧`
- 貓星幣任務：每個 `approved` 支線任務可得 `+10 貓星幣`
- 每天最多 10 項任務
- 家長可從 `/parent` 批量派發今日任務
- 家長資料會依 `parent_user_id` 隔離，只能看到自己名下孩子
- 小孩只能在 `/child` 查看狀態並提交完成，不直接管理任務
- 管理員可從 `/admin` 查看家長與孩子綁定關係，並協助重設密碼
- 管理員可停用或重新啟用家長、孩子帳號
- navbar 會依目前登入身份自動收斂入口
- 任務狀態流轉：`pending -> submitted -> approved/rejected`
- child / parent 端皆有防重入保護
- 非法狀態轉換會回傳 `409`
- 貓咪狀態規則
  - 當日 `food < threshold` 時，狀態為 `hungry`
  - 當日 `food >= threshold` 時，狀態至少為 `normal`
  - 吃飽後依完成率決定情緒：`happy / calm / angry`
- 商店內建 5 個裝飾道具，可用 coin 購買並查看已購清單

## 技術

- Next.js App Router
- React
- SQLite
- better-sqlite3

## 資料表

資料庫 schema 位於：

- [migrations/001_init.sql](/Users/264271999qq.com/Documents/New%20project/migrations/001_init.sql)
- [migrations/002_app_config.sql](/Users/264271999qq.com/Documents/New%20project/migrations/002_app_config.sql)
- [migrations/003_roles_and_review_workflow.sql](/Users/264271999qq.com/Documents/New%20project/migrations/003_roles_and_review_workflow.sql)
- [migrations/004_task_reviews.sql](/Users/264271999qq.com/Documents/New%20project/migrations/004_task_reviews.sql)

包含以下資料表：

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

## Seed Data

seed 會建立：

- 家長帳號：`parent1`
- 管理員帳號：`admin1`
- 兩個孩子帳號：`childA`、`childB`
- 兩隻貓：`Milo`、`Luna`
- 5 個商店道具
- 預設設定：`DAILY_FOOD_THRESHOLD=30`
- 預設密碼：
  - `admin1 / Admin1234`
  - `parent1 / Parent1234`
  - `childA / ChildA1234`
  - `childB / ChildB1234`

腳本位於：

- [scripts/seed.js](/Users/264271999qq.com/Documents/New%20project/scripts/seed.js)

## API

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/submit`
- `PATCH /api/tasks/:id/review`
- `GET /api/tasks/:id/reviews`
- `GET /api/pet-status`
- `GET /api/shop-items`
- `POST /api/shop/buy`
- `POST /api/parent/assign-tasks`
- `GET /api/parent/review-queue`
- `GET /api/child/today`
- `GET /api/admin/overview`
- `POST /api/admin/reset-password`
- `PATCH /api/admin/users/:id/status`

另外補了一個登入 session API：

- `POST /api/session`
- `DELETE /api/session`

## 頁面

- `/login`
- `/parent`
- `/admin`
- `/child`
- `/tasks`
- `/pet`
- `/shop`

## 角色與權限

- `admin1`：管理員，可查看家長與孩子關係，並協助重設密碼
- `parent1`：家長角色，可派發與審核自己名下孩子的任務
- `childA`、`childB`：孩子角色，可查看寵物狀態與提交完成任務
- 家長與孩子的綁定透過 invite link 建立，資料歸屬存於 `users.parent_user_id`

## v1.2 任務狀態流轉

- `pending`：家長已派發，等待孩子完成
- `submitted`：孩子已提交完成，等待家長審核
- `approved`：家長批准，才會計入貓糧或貓星幣
- `rejected`：家長退回，不計分，孩子端會顯示「需重做」

## v1.2.1 穩定性補強

- child 端提交按鈕點擊後立即鎖定，避免連點重複提交
- parent 端審核按鈕按下後會鎖定該列，避免連續 approve / reject
- server 端對非法狀態轉換回傳 `409`
- 前端收到 `409` 時會提示「任務狀態已變更，請刷新」

## v1.2.1 task_reviews

- `task_reviews` 會記錄每次 approve / reject 的狀態流轉
- 欄位包含：`task_id`、`actor_user_id`、`from_status`、`to_status`、`note`、`created_at`
- 可用 `GET /api/tasks/:id/reviews` 讓家長查詢某個任務的審核歷史

## v1.2.1 輪詢降載

- child dashboard 維持 8 秒輪詢
- 當頁面進入 hidden 狀態時暫停輪詢
- 回到 visible 時立即刷新並恢復輪詢

## v1.2 使用方式

1. 家長用 `parent1 / Parent1234` 登入後進入 `/parent`。
2. 在 `/parent` 勾選模板並派發到今天。
3. 小孩用 `childA / ChildA1234` 或 `childB / ChildB1234` 登入後進入 `/child`。
4. 小孩在 `/child` 看到今日任務，對 `pending` 任務按「我完成了」後會變成 `submitted`。
5. 家長回到 `/parent` 在待審列表中批准或退回。
6. 只有 `approved` 任務會更新 `/child` 與 `/pet` 的貓糧、貓星幣、mood、petStatus。

## 管理員使用方式

1. 用 `admin1 / Admin1234` 登入。
2. 進入 `/admin`。
3. 可查看目前有多少家長、每位家長底下有哪些孩子。
4. 可直接替家長或孩子重設密碼。
5. 可停用或重新啟用帳號；被停用的帳號不可登入，既有 session 也會失效。

## 導覽列行為

- 未登入：只顯示 `/login`
- 家長：顯示 `/parent`、`/tasks`
- 小孩：顯示 `/child`、`/pet`、`/shop`
- 管理員：只顯示 `/admin`

## 寵物素材庫

- `/public/pet/cat-default/happy.png`
- `/public/pet/cat-default/calm.png`
- `/public/pet/cat-default/hungry.png`
- `/public/pet/cat-default/angry.png`
- `/public/pet/cat-default/sleepy.png`
- `/public/pet/cat-default/excited.png`
- `/public/pet/white-cat/calm.png`
- `/public/pet/white-cat/happy.png`
- `/public/pet/white-cat/hungry.png`
- `/public/pet/white-cat/angry.png`
- `/public/pet/tabby-cat/calm.png`
- `/public/pet/tabby-cat/happy.png`
- `/public/pet/tabby-cat/hungry.png`
- `/public/pet/tabby-cat/angry.png`
- `/public/pet/stickers/happy.gif`
- `/public/pet/stickers/angry.gif`

素材 mapping 位於：

- [lib/pet-assets.ts](/Users/264271999qq.com/Documents/New%20project/lib/pet-assets.ts)

目前資料模型：

- `pet_assets`：素材角色主表
- `pet_asset_states`：每隻角色的狀態圖
- `pets.selected_pet_asset_id`：孩子當前選中的素材角色
- 多個孩子可以共用同一隻素材角色，不會重複存素材

初始化素材角色：

- `cat-default`
- `white-cat`
- `tabby-cat`

替換與擴充方式：

- 直接把正式素材放進對應資料夾即可
- 建議至少先提供 `calm.png`
- 若某個狀態圖不存在，系統會先 fallback 到同角色的 `calm.png`
- 若同角色連 `calm.png` 也沒有，才會 fallback 到 `cat-default`
- `childA`、`childB` 目前只是 seed 預設各自選了不同素材角色，並不是各自擁有一份素材

## 如何啟動

1. 安裝依賴

```bash
npm install
```

2. 建立資料庫 schema

```bash
npm run db:migrate
```

3. 匯入 seed data

```bash
npm run db:seed
```

4. 啟動開發環境

```bash
npm run dev
```

5. 開啟瀏覽器

```text
http://localhost:3000/login
```

## 重新初始化資料庫

```bash
npm run db:reset
npm run db:migrate
npm run db:seed
```

## 專案結構

- [app](/Users/264271999qq.com/Documents/New%20project/app)
- [components](/Users/264271999qq.com/Documents/New%20project/components)
- [lib](/Users/264271999qq.com/Documents/New%20project/lib)
- [migrations](/Users/264271999qq.com/Documents/New%20project/migrations)
- [public/pet](/Users/264271999qq.com/Documents/New%20project/public/pet)
- [scripts](/Users/264271999qq.com/Documents/New%20project/scripts)

## 備註

- MVP 版本未加入動畫與排行榜
- 家長主入口：`/parent`
- 管理員主入口：`/admin`
- 小孩主入口：`/child`
- `/tasks` 保留為家長視圖
- v1.2 已改為審核制計分，`submitted` 不計分
- 商店道具為單次購買，不重複持有
