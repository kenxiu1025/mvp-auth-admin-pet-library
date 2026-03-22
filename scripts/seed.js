const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const dbPath = path.join(process.cwd(), "data", "pet-task.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const now = new Date().toISOString();
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const userStmt = db.prepare(`
  INSERT INTO users (username, display_name, role, parent_user_id, password_hash, is_admin, created_at)
  VALUES (@username, @display_name, @role, @parent_user_id, @password_hash, @is_admin, @created_at)
  ON CONFLICT(username) DO UPDATE SET
    display_name = excluded.display_name,
    role = excluded.role,
    parent_user_id = excluded.parent_user_id,
    password_hash = excluded.password_hash,
    is_admin = excluded.is_admin
`);

const petStmt = db.prepare(`
  INSERT INTO pets (user_id, name, species, asset_key, selected_pet_asset_id, created_at)
  VALUES (@user_id, @name, 'cat', @asset_key, @selected_pet_asset_id, @created_at)
  ON CONFLICT(user_id) DO UPDATE SET
    name = excluded.name,
    asset_key = excluded.asset_key,
    selected_pet_asset_id = excluded.selected_pet_asset_id
`);

const petAssetStmt = db.prepare(`
  INSERT INTO pet_assets (key, name, species, is_active, created_at)
  VALUES (@key, @name, @species, @is_active, @created_at)
  ON CONFLICT(key) DO UPDATE SET
    name = excluded.name,
    species = excluded.species,
    is_active = excluded.is_active
`);

const petAssetStateStmt = db.prepare(`
  INSERT INTO pet_asset_states (pet_asset_id, state_key, image_path, created_at)
  VALUES (@pet_asset_id, @state_key, @image_path, @created_at)
  ON CONFLICT(pet_asset_id, state_key) DO UPDATE SET
    image_path = excluded.image_path
`);

const summaryStmt = db.prepare(`
  INSERT INTO daily_summary (
    user_id, summary_date, food_earned, coin_earned, completed_main, completed_side,
    total_tasks, completion_rate, mood, pet_status, updated_at
  )
  VALUES (@user_id, @summary_date, 0, 0, 0, 0, 0, 0, 'angry', 'hungry', @updated_at)
  ON CONFLICT(user_id, summary_date) DO NOTHING
`);

const configStmt = db.prepare(`
  INSERT INTO app_config (key, value)
  VALUES (@key, @value)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value
`);

const shopStmt = db.prepare(`
  INSERT INTO shop_items (name, description, price, image_emoji, created_at)
  VALUES (@name, @description, @price, @image_emoji, @created_at)
  ON CONFLICT(name) DO UPDATE SET
    description = excluded.description,
    price = excluded.price,
    image_emoji = excluded.image_emoji
`);

const petAssets = [
  { key: "cat-default", name: "預設貓咪", species: "cat", is_active: 1 },
  { key: "white-cat", name: "白貓", species: "cat", is_active: 1 },
  { key: "tabby-cat", name: "虎斑貓", species: "cat", is_active: 1 },
];

const petAssetStates = [
  { asset_key: "cat-default", state_key: "calm", image_path: "/pet/cat-default/calm.png" },
  { asset_key: "cat-default", state_key: "happy", image_path: "/pet/cat-default/happy.png" },
  { asset_key: "cat-default", state_key: "hungry", image_path: "/pet/cat-default/hungry.png" },
  { asset_key: "cat-default", state_key: "angry", image_path: "/pet/cat-default/angry.png" },
  { asset_key: "cat-default", state_key: "sleepy", image_path: "/pet/cat-default/sleepy.png" },
  { asset_key: "cat-default", state_key: "excited", image_path: "/pet/cat-default/excited.png" },
  { asset_key: "white-cat", state_key: "calm", image_path: "/pet/white-cat/calm.png" },
  { asset_key: "white-cat", state_key: "happy", image_path: "/pet/white-cat/happy.png" },
  { asset_key: "white-cat", state_key: "hungry", image_path: "/pet/white-cat/hungry.png" },
  { asset_key: "white-cat", state_key: "angry", image_path: "/pet/white-cat/angry.png" },
  { asset_key: "white-cat", state_key: "sleepy", image_path: "/pet/white-cat/sleepy.png" },
  { asset_key: "white-cat", state_key: "excited", image_path: "/pet/white-cat/excited.png" },
  { asset_key: "tabby-cat", state_key: "calm", image_path: "/pet/tabby-cat/calm.png" },
  { asset_key: "tabby-cat", state_key: "happy", image_path: "/pet/tabby-cat/happy.png" },
  { asset_key: "tabby-cat", state_key: "hungry", image_path: "/pet/tabby-cat/hungry.png" },
  { asset_key: "tabby-cat", state_key: "angry", image_path: "/pet/tabby-cat/angry.png" },
  { asset_key: "tabby-cat", state_key: "sleepy", image_path: "/pet/tabby-cat/sleepy.png" },
  { asset_key: "tabby-cat", state_key: "excited", image_path: "/pet/tabby-cat/excited.png" },
];

const users = [
  { username: "admin1", display_name: "Admin 1", role: "parent", is_admin: 1, password: "Admin1234" },
  { username: "parent1", display_name: "Parent 1", role: "parent", is_admin: 0, password: "Parent1234" },
  {
    username: "childA",
    display_name: "Child A",
    pet_name: "Milo",
    pet_asset_key: "white-cat",
    role: "child",
    is_admin: 0,
    password: "ChildA1234",
  },
  {
    username: "childB",
    display_name: "Child B",
    pet_name: "Luna",
    pet_asset_key: "tabby-cat",
    role: "child",
    is_admin: 0,
    password: "ChildB1234",
  },
];

for (const user of users.filter((item) => item.role === "parent")) {
  userStmt.run({
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    parent_user_id: null,
    password_hash: hashPassword(user.password),
    is_admin: user.is_admin,
    created_at: now,
  });
}

for (const petAsset of petAssets) {
  petAssetStmt.run({
    ...petAsset,
    created_at: now,
  });
}

const petAssetRows = db.prepare("SELECT id, key FROM pet_assets WHERE key IN ('cat-default', 'white-cat', 'tabby-cat')").all();
const petAssetIdByKey = Object.fromEntries(petAssetRows.map((row) => [row.key, row.id]));

for (const petAssetState of petAssetStates) {
  const petAssetId = petAssetIdByKey[petAssetState.asset_key];

  if (!petAssetId) {
    continue;
  }

  petAssetStateStmt.run({
    pet_asset_id: petAssetId,
    state_key: petAssetState.state_key,
    image_path: petAssetState.image_path,
    created_at: now,
  });
}

const parentRow = db.prepare("SELECT id FROM users WHERE username = 'parent1'").get();
const parentUserId = parentRow?.id ?? null;

for (const user of users.filter((item) => item.role === "child")) {
  userStmt.run({
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    parent_user_id: parentUserId,
    password_hash: hashPassword(user.password),
    is_admin: user.is_admin,
    created_at: now,
  });
}

const insertedUsers = db
  .prepare("SELECT id, username, role FROM users WHERE username IN ('admin1', 'parent1', 'childA', 'childB')")
  .all();

for (const user of insertedUsers) {
  if (user.role !== "child") {
    continue;
  }

  const petName = users.find((item) => item.username === user.username)?.pet_name || "Cat";
  const petAssetKey = users.find((item) => item.username === user.username)?.pet_asset_key || "cat-default";
  petStmt.run({
    user_id: user.id,
    name: petName,
    asset_key: petAssetKey,
    selected_pet_asset_id: petAssetIdByKey[petAssetKey] ?? petAssetIdByKey["cat-default"] ?? null,
    created_at: now,
  });

  summaryStmt.run({
    user_id: user.id,
    summary_date: today,
    updated_at: now,
  });
}

const shopItems = [
  { name: "紅色項圈", description: "讓貓咪看起來更有精神。", price: 20, image_emoji: "🧣" },
  { name: "小鈴鐺", description: "走路會發出清脆聲音。", price: 30, image_emoji: "🔔" },
  { name: "紙箱小屋", description: "最受歡迎的休息空間。", price: 40, image_emoji: "📦" },
  { name: "羽毛玩具", description: "陪伴貓咪玩耍的簡單玩具。", price: 25, image_emoji: "🪶" },
  { name: "星星坐墊", description: "柔軟又可愛的專屬坐墊。", price: 50, image_emoji: "⭐" },
];

for (const item of shopItems) {
  shopStmt.run({
    ...item,
    created_at: now,
  });
}

configStmt.run({
  key: "DAILY_FOOD_THRESHOLD",
  value: "30",
});

db.close();
console.log("Seed completed.");
