/**
 * 党政办物资库存工作台 - Web Server
 * 双模式数据存储：
 *   1. 设置了 DATABASE_URL 环境变量 → PostgreSQL（云端 Render 部署使用，数据持久不丢失）
 *   2. 未设置 DATABASE_URL → JSON 文件（本地运行使用）
 * 支持：用户认证、Session 管理、物资 CRUD、导航配置、用户管理、修改密码
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ==================== Config ====================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const DB_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const USE_PG = !!process.env.DATABASE_URL;

// ==================== Default Data ====================
const defaultNavConfig = [
  { id: 'dashboard', name: '库存总览', icon: '📊', category: null, locked: true },
  { id: 'furniture', name: '家具管理', icon: '🪑', category: '家具', locked: false },
  { id: 'toner', name: '硒鼓管理', icon: '🖨️', category: '硒鼓', locked: false },
  { id: 'paper', name: '纸类管理', icon: '📄', category: '复印纸', locked: false },
  { id: 'others', name: '其他物资', icon: '📦', category: '*', locked: true }
];

const defaultItems = [
  {id:1, category:'硒鼓', brand:'惠普 莱盛 格之格', model:'80A CF280A', type:'硒鼓', color:'黑', quantity:2, location:'304', printerModel:'HP LaserJet Pro 400 M401/M425', threshold:3, sortOrder:1, remark:''},
  {id:2, category:'硒鼓', brand:'惠普 莱盛 格之格', model:'80A CF280A', type:'粉盒', color:'黑', quantity:7, location:'304', printerModel:'HP LaserJet Pro 400 M401/M425', threshold:3, sortOrder:2, remark:''},
  {id:3, category:'硒鼓', brand:'惠普-盈佳', model:'88A CC388A', type:'硒鼓', color:'黑', quantity:1, location:'304', printerModel:'HP LaserJet P1106/P1108/M1136/M1213nf', threshold:2, sortOrder:3, remark:''},
  {id:4, category:'硒鼓', brand:'格之格 惠普 默远（217彩打）', model:'202A/CF500/501/502/503A', type:'硒鼓', color:'红', quantity:3, location:'304', printerModel:'HP Color LaserJet Pro MFP 281fdw', threshold:3, sortOrder:4, remark:''},
  {id:5, category:'硒鼓', brand:'格之格 惠普 默远（217彩打）', model:'202A/CF500/501/502/503A', type:'硒鼓', color:'黄', quantity:2, location:'304', printerModel:'HP Color LaserJet Pro MFP 281fdw', threshold:3, sortOrder:5, remark:''},
  {id:6, category:'硒鼓', brand:'格之格 惠普 默远（217彩打）', model:'202A/CF500/501/502/503A', type:'硒鼓', color:'蓝', quantity:3, location:'304', printerModel:'HP Color LaserJet Pro MFP 281fdw', threshold:3, sortOrder:6, remark:''},
  {id:7, category:'硒鼓', brand:'格之格 惠普 默远（217彩打）', model:'202A/CF500/501/502/503A', type:'硒鼓', color:'黑', quantity:5, location:'304', printerModel:'HP Color LaserJet Pro MFP 281fdw', threshold:3, sortOrder:7, remark:''},
  {id:8, category:'硒鼓', brand:'惠普（277dw）', model:'201', type:'硒鼓', color:'红', quantity:3, location:'304', printerModel:'HP Color LaserJet Pro M277dw', threshold:3, sortOrder:8, remark:''},
  {id:9, category:'硒鼓', brand:'惠普（277dw）', model:'201', type:'硒鼓', color:'黄', quantity:3, location:'304', printerModel:'HP Color LaserJet Pro M277dw', threshold:3, sortOrder:9, remark:''},
  {id:10, category:'硒鼓', brand:'惠普（277dw）', model:'201', type:'硒鼓', color:'蓝', quantity:2, location:'304', printerModel:'HP Color LaserJet Pro M277dw', threshold:3, sortOrder:10, remark:''},
  {id:11, category:'硒鼓', brand:'惠普（277dw）', model:'201', type:'硒鼓', color:'黑', quantity:3, location:'304', printerModel:'HP Color LaserJet Pro M277dw', threshold:3, sortOrder:11, remark:''},
  {id:12, category:'硒鼓', brand:'惠普', model:'228', type:'硒鼓', color:'黑', quantity:1, location:'304', printerModel:'HP LaserJet Pro M403/M427', threshold:2, sortOrder:12, remark:''},
  {id:13, category:'硒鼓', brand:'格之格-惠普', model:'278', type:'硒鼓', color:'黑', quantity:0, location:'304', printerModel:'HP LaserJet Pro M404/M428', threshold:2, sortOrder:13, remark:''},
  {id:14, category:'硒鼓', brand:'东芝-欣彩（124彩打机）', model:'FC415', type:'硒鼓', color:'红', quantity:6, location:'304', printerModel:'Toshiba e-STUDIO 124/224', threshold:3, sortOrder:14, remark:''},
  {id:15, category:'硒鼓', brand:'东芝-欣彩（124彩打机）', model:'FC415', type:'硒鼓', color:'黄', quantity:7, location:'304', printerModel:'Toshiba e-STUDIO 124/224', threshold:3, sortOrder:15, remark:''},
  {id:16, category:'硒鼓', brand:'东芝-欣彩（124彩打机）', model:'FC415', type:'硒鼓', color:'蓝', quantity:5, location:'304', printerModel:'Toshiba e-STUDIO 124/224', threshold:3, sortOrder:16, remark:''},
  {id:17, category:'硒鼓', brand:'东芝-欣彩（124彩打机）', model:'FC415', type:'硒鼓', color:'黑', quantity:5, location:'304', printerModel:'Toshiba e-STUDIO 124/224', threshold:3, sortOrder:17, remark:''},
  {id:18, category:'硒鼓', brand:'东芝-欣彩（124彩打机）', model:'废粉盒FC30C', type:'废粉盒', color:'黑', quantity:2, location:'304', printerModel:'Toshiba e-STUDIO 124/224', threshold:2, sortOrder:18, remark:''},
  {id:19, category:'硒鼓', brand:'柯美（314彩打机）', model:'TN324', type:'硒鼓', color:'红', quantity:4, location:'304', printerModel:'Konica Minolta bizhub C308/C368', threshold:3, sortOrder:19, remark:''},
  {id:20, category:'硒鼓', brand:'柯美（314彩打机）', model:'TN324', type:'硒鼓', color:'黄', quantity:4, location:'304', printerModel:'Konica Minolta bizhub C308/C368', threshold:3, sortOrder:20, remark:''},
  {id:21, category:'硒鼓', brand:'柯美（314彩打机）', model:'TN324', type:'硒鼓', color:'蓝', quantity:5, location:'304', printerModel:'Konica Minolta bizhub C308/C368', threshold:3, sortOrder:21, remark:''},
  {id:22, category:'硒鼓', brand:'柯美（314彩打机）', model:'TN324', type:'硒鼓', color:'黑', quantity:7, location:'304', printerModel:'Konica Minolta bizhub C308/C368', threshold:3, sortOrder:22, remark:''},
  {id:23, category:'硒鼓', brand:'柯美（314彩打机）', model:'未指定', type:'废粉盒', color:'黑', quantity:0, location:'304', printerModel:'Konica Minolta bizhub C308/C368', threshold:1, sortOrder:23, remark:''},
  {id:24, category:'硒鼓', brand:'格之格默远', model:'TN2215', type:'粉盒', color:'黑', quantity:4, location:'304', printerModel:'Brother HL-2240/2250DN/DCP-7060D', threshold:3, sortOrder:24, remark:''},
  {id:25, category:'硒鼓', brand:'brother 默远', model:'2250', type:'硒鼓架', color:'黑', quantity:4, location:'304', printerModel:'Brother HL-2240/2250DN/DCP-7060D', threshold:3, sortOrder:25, remark:''},
  {id:26, category:'硒鼓', brand:'京瓷', model:'TK5223', type:'黑色墨粉组件', color:'黑', quantity:0, location:'304', printerModel:'Kyocera ECOSYS P5021cdn/P5021cdw', threshold:1, sortOrder:26, remark:''},
  {id:27, category:'硒鼓', brand:'默远', model:'TN289', type:'硒鼓', color:'黑', quantity:1, location:'304', printerModel:'Brother HL-3150CDN/3170CDW', threshold:2, sortOrder:27, remark:''},
  {id:28, category:'硒鼓', brand:'默远', model:'TN289', type:'硒鼓', color:'黄', quantity:2, location:'304', printerModel:'Brother HL-3150CDN/3170CDW', threshold:2, sortOrder:28, remark:''},
  {id:29, category:'硒鼓', brand:'默远', model:'TN289', type:'硒鼓', color:'红', quantity:2, location:'304', printerModel:'Brother HL-3150CDN/3170CDW', threshold:2, sortOrder:29, remark:''},
  {id:30, category:'复印纸', brand:'得力', model:'A4复印纸（70g）', type:'复印纸', color:'白', quantity:15, location:'102', printerModel:'-', threshold:5, sortOrder:1, remark:''},
  {id:31, category:'复印纸', brand:'得力', model:'A4复印纸（80g）', type:'复印纸', color:'白', quantity:8, location:'102', printerModel:'-', threshold:3, sortOrder:2, remark:''},
  {id:32, category:'复印纸', brand:'晨光', model:'A3复印纸', type:'复印纸', color:'白', quantity:3, location:'102', printerModel:'-', threshold:2, sortOrder:3, remark:''},
  {id:33, category:'复印纸', brand:'得力', model:'彩色复印纸（粉色）', type:'复印纸', color:'粉', quantity:2, location:'102', printerModel:'-', threshold:2, sortOrder:4, remark:''},
  {id:34, category:'复印纸', brand:'得力', model:'彩色复印纸（蓝色）', type:'复印纸', color:'蓝', quantity:2, location:'102', printerModel:'-', threshold:2, sortOrder:5, remark:''},
  {id:35, category:'纸巾', brand:'心相印', model:'湿巾纸', type:'纸巾', color:'-', quantity:20, location:'102', printerModel:'-', threshold:5, sortOrder:1, remark:''},
  {id:36, category:'纸巾', brand:'维达', model:'抽纸', type:'纸巾', color:'-', quantity:50, location:'102', printerModel:'-', threshold:10, sortOrder:2, remark:''},
  {id:37, category:'纸巾', brand:'清风', model:'硬盒抽纸', type:'纸巾', color:'-', quantity:30, location:'102', printerModel:'-', threshold:10, sortOrder:3, remark:''},
  {id:38, category:'纸巾', brand:'心相印', model:'小包纸巾', type:'纸巾', color:'-', quantity:80, location:'102', printerModel:'-', threshold:20, sortOrder:4, remark:''},
  {id:39, category:'家具', brand:'得力', model:'办公椅', type:'转椅', color:'-', quantity:6, location:'304', printerModel:'-', threshold:2, sortOrder:1, remark:''},
  {id:40, category:'家具', brand:'震旦', model:'办公桌', type:'1.2m单人桌', color:'-', quantity:4, location:'304', printerModel:'-', threshold:1, sortOrder:2, remark:''},
  {id:41, category:'家具', brand:'宜家', model:'文件柜', type:'三层铁皮柜', color:'-', quantity:3, location:'102', printerModel:'-', threshold:1, sortOrder:3, remark:''}
];

// ==================== Password ====================
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const parts = String(stored).split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

// ==================== Data Store ====================
// PostgreSQL 存储（云端部署）
async function createPgStore() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // 建表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS items (
      id INT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      quantity INT NOT NULL DEFAULT 0,
      location TEXT NOT NULL DEFAULT '',
      printer_model TEXT NOT NULL DEFAULT '',
      threshold INT NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      remark TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS nav_config (
      id INT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 初始化管理员账号
  const userCount = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  if (userCount.rows[0].c === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
    await pool.query(
      'INSERT INTO users (username, password_hash, display_name, role) VALUES ($1,$2,$3,$4)',
      ['admin', salt + ':' + hash, '管理员', 'admin']
    );
  }

  // 初始化物资数据
  const itemCount = await pool.query('SELECT COUNT(*)::int AS c FROM items');
  if (itemCount.rows[0].c === 0) {
    for (const item of defaultItems) {
      await pool.query(
        `INSERT INTO items (id, category, brand, model, type, color, quantity, location, printer_model, threshold, sort_order, remark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [item.id, item.category, item.brand, item.model, item.type, item.color, item.quantity, item.location, item.printerModel, item.threshold, item.sortOrder, item.remark || '']
      );
    }
  }

  // 初始化导航配置
  const navCount = await pool.query('SELECT COUNT(*)::int AS c FROM nav_config');
  if (navCount.rows[0].c === 0) {
    await pool.query('INSERT INTO nav_config (id, value) VALUES (1, $1)', [JSON.stringify(defaultNavConfig)]);
  }

  return {
    mode: 'pg',
    async getUsers() {
      const r = await pool.query('SELECT * FROM users ORDER BY id');
      return r.rows.map(u => ({
        id: u.id, username: u.username, passwordHash: u.password_hash,
        displayName: u.display_name, role: u.role, createdAt: u.created_at
      }));
    },
    async findUserByUsername(username) {
      const r = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      const u = r.rows[0];
      if (!u) return null;
      return { id: u.id, username: u.username, passwordHash: u.password_hash, displayName: u.display_name, role: u.role, createdAt: u.created_at };
    },
    async createUser({ username, passwordHash, displayName, role }) {
      const r = await pool.query(
        'INSERT INTO users (username, password_hash, display_name, role) VALUES ($1,$2,$3,$4) RETURNING *',
        [username, passwordHash, displayName, role]
      );
      const u = r.rows[0];
      return { id: u.id, username: u.username, displayName: u.display_name, role: u.role, createdAt: u.created_at };
    },
    async deleteUser(id) {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
    },
    async updateUserPassword(id, passwordHash) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
    },
    async getItems() {
      const r = await pool.query('SELECT * FROM items ORDER BY sort_order, id');
      return r.rows.map(x => ({
        id: x.id, category: x.category, brand: x.brand, model: x.model, type: x.type,
        color: x.color, quantity: x.quantity, location: x.location, printerModel: x.printer_model,
        threshold: x.threshold, sortOrder: x.sort_order, remark: x.remark || ''
      }));
    },
    async replaceItems(items) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM items');
        for (const item of items) {
          await client.query(
            `INSERT INTO items (id, category, brand, model, type, color, quantity, location, printer_model, threshold, sort_order, remark)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [item.id, item.category || '', item.brand || '', item.model || '', item.type || '', item.color || '',
             item.quantity || 0, item.location || '', item.printerModel || '', item.threshold || 0, item.sortOrder || 0, item.remark || '']
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    async clearItems() {
      await pool.query('DELETE FROM items');
    },
    async getNavConfig() {
      const r = await pool.query('SELECT value FROM nav_config WHERE id = 1');
      if (!r.rows[0]) return JSON.parse(JSON.stringify(defaultNavConfig));
      try { return JSON.parse(r.rows[0].value); } catch { return JSON.parse(JSON.stringify(defaultNavConfig)); }
    },
    async saveNavConfig(config) {
      await pool.query('INSERT INTO nav_config (id, value) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET value = $1', [JSON.stringify(config)]);
    }
  };
}

// JSON 文件存储（本地运行）
function createFileStore() {
  function loadDB() {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  }
  function initDB() {
    let db = loadDB();
    if (!db) {
      db = { users: [], items: [], navConfig: [] };
    }
    if (!db.users || db.users.length === 0) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
      db.users = [{
        id: 1,
        username: 'admin',
        passwordHash: salt + ':' + hash,
        displayName: '管理员',
        role: 'admin',
        createdAt: new Date().toISOString()
      }];
    }
    if (!db.items || db.items.length === 0) {
      db.items = JSON.parse(JSON.stringify(defaultItems));
    }
    if (!db.navConfig || db.navConfig.length === 0) {
      db.navConfig = JSON.parse(JSON.stringify(defaultNavConfig));
    }
    saveDB(db);
    return db;
  }

  const db = initDB();

  return {
    mode: 'file',
    async getUsers() {
      return db.users.map(u => ({ id: u.id, username: u.username, passwordHash: u.passwordHash, displayName: u.displayName, role: u.role, createdAt: u.createdAt }));
    },
    async findUserByUsername(username) {
      return db.users.find(u => u.username === username) || null;
    },
    async createUser({ username, passwordHash, displayName, role }) {
      const newId = Math.max(0, ...db.users.map(u => u.id)) + 1;
      const newUser = { id: newId, username, passwordHash, displayName, role, createdAt: new Date().toISOString() };
      db.users.push(newUser);
      saveDB(db);
      return { id: newUser.id, username: newUser.username, displayName: newUser.displayName, role: newUser.role, createdAt: newUser.createdAt };
    },
    async deleteUser(id) {
      db.users = db.users.filter(u => u.id !== id);
      saveDB(db);
    },
    async updateUserPassword(id, passwordHash) {
      const u = db.users.find(u => u.id === id);
      if (u) { u.passwordHash = passwordHash; saveDB(db); }
    },
    async getItems() {
      return db.items;
    },
    async replaceItems(items) {
      db.items = items;
      saveDB(db);
    },
    async clearItems() {
      db.items = [];
      saveDB(db);
    },
    async getNavConfig() {
      return db.navConfig;
    },
    async saveNavConfig(config) {
      db.navConfig = config;
      saveDB(db);
    }
  };
}

async function createStore() {
  if (USE_PG) {
    console.log('● 数据存储：PostgreSQL（云端数据库）');
    return await createPgStore();
  }
  console.log('● 数据存储：JSON 文件（本地模式）');
  return createFileStore();
}

// ==================== Session Management ====================
const sessions = new Map(); // sessionId -> { userId, username, displayName, role, createdAt }

function createSession(user) {
  const sid = crypto.randomBytes(32).toString('hex');
  sessions.set(sid, {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: Date.now()
  });
  return sid;
}

function getSession(sid) {
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
    sessions.delete(sid);
    return null;
  }
  return session;
}

function destroySession(sid) {
  sessions.delete(sid);
}

// ==================== HTTP Helpers ====================
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      cookies[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    }
  });
  return cookies;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 10 * 1024 * 1024) { reject(new Error('Body too large')); } });
    req.on('end', () => {
      if (!data) { resolve({}); return; }
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, filePath, contentType) {
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length
    });
    res.end(data);
  } catch {
    sendJSON(res, 404, { error: 'Not found' });
  }
}

function getContentType(ext) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return types[ext] || 'application/octet-stream';
}

// ==================== Auth Middleware ====================
function requireAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies.sid;
  const session = getSession(sid);
  if (!session) {
    sendJSON(res, 401, { error: '未登录', needLogin: true });
    return null;
  }
  return session;
}

function requireAdmin(session) {
  return session && session.role === 'admin';
}

// ==================== Route Handler ====================
let store = null;

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // ---- Static files ----
  if (method === 'GET' && !pathname.startsWith('/api/')) {
    let filePath = pathname === '/' ? '/index.html' : pathname;
    // Security: prevent directory traversal
    filePath = filePath.replace(/\.\./g, '');
    const fullPath = path.join(PUBLIC_DIR, filePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath);
      sendFile(res, fullPath, getContentType(ext));
    } else {
      // SPA fallback
      const index = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(index)) {
        sendFile(res, index, 'text/html; charset=utf-8');
      } else {
        sendJSON(res, 404, { error: 'Not found' });
      }
    }
    return;
  }

  // ---- API Routes ----
  try {
    // -- Session check --
    if (pathname === '/api/session' && method === 'GET') {
      const cookies = parseCookies(req.headers.cookie);
      const session = getSession(cookies.sid);
      if (session) {
        sendJSON(res, 200, { authenticated: true, username: session.username, displayName: session.displayName, role: session.role });
      } else {
        sendJSON(res, 200, { authenticated: false });
      }
      return;
    }

    // -- Login --
    if (pathname === '/api/login' && method === 'POST') {
      const body = await readBody(req);
      const { username, password } = body;
      if (!username || !password) {
        sendJSON(res, 400, { error: '请输入用户名和密码' });
        return;
      }
      const user = await store.findUserByUsername(username);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        sendJSON(res, 401, { error: '用户名或密码错误' });
        return;
      }
      const sid = createSession(user);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `sid=${sid}; Path=/; Max-Age=${SESSION_MAX_AGE / 1000}; HttpOnly; SameSite=Lax`
      });
      res.end(JSON.stringify({ username: user.username, displayName: user.displayName, role: user.role }));
      return;
    }

    // -- Logout --
    if (pathname === '/api/logout' && method === 'POST') {
      const cookies = parseCookies(req.headers.cookie);
      if (cookies.sid) destroySession(cookies.sid);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 'sid=; Path=/; Max-Age=0'
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // -- Below routes require auth --
    const session = requireAuth(req, res);
    if (!session) return;

    // -- Get all items --
    if (pathname === '/api/items' && method === 'GET') {
      sendJSON(res, 200, await store.getItems());
      return;
    }

    // -- Replace all items --
    if (pathname === '/api/items' && method === 'PUT') {
      const body = await readBody(req);
      if (!Array.isArray(body)) {
        sendJSON(res, 400, { error: '数据格式错误' });
        return;
      }
      await store.replaceItems(body);
      sendJSON(res, 200, { ok: true });
      return;
    }

    // -- Clear all items --
    if (pathname === '/api/items/all' && method === 'DELETE') {
      await store.clearItems();
      sendJSON(res, 200, { ok: true });
      return;
    }

    // -- Get nav config --
    if (pathname === '/api/nav-config' && method === 'GET') {
      sendJSON(res, 200, await store.getNavConfig());
      return;
    }

    // -- Save nav config --
    if (pathname === '/api/nav-config' && method === 'PUT') {
      const body = await readBody(req);
      if (!Array.isArray(body)) {
        sendJSON(res, 400, { error: '数据格式错误' });
        return;
      }
      await store.saveNavConfig(body);
      sendJSON(res, 200, { ok: true });
      return;
    }

    // -- Change own password --
    if (pathname === '/api/me/password' && method === 'PUT') {
      const body = await readBody(req);
      const { oldPassword, newPassword } = body;
      if (!oldPassword || !newPassword) {
        sendJSON(res, 400, { error: '请输入原密码和新密码' });
        return;
      }
      if (newPassword.length < 4) {
        sendJSON(res, 400, { error: '新密码至少4位' });
        return;
      }
      const user = (await store.getUsers()).find(u => u.id === session.userId);
      if (!user) {
        sendJSON(res, 404, { error: '用户不存在' });
        return;
      }
      if (!verifyPassword(oldPassword, user.passwordHash)) {
        sendJSON(res, 400, { error: '原密码错误' });
        return;
      }
      await store.updateUserPassword(user.id, hashPassword(newPassword));
      // 修改密码后让其他设备重新登录
      for (const [sid, s] of sessions.entries()) {
        if (s.userId === user.id) sessions.delete(sid);
      }
      sendJSON(res, 200, { ok: true });
      return;
    }

    // -- User management (admin only) --
    if (pathname === '/api/users' && method === 'GET') {
      if (!requireAdmin(session)) {
        sendJSON(res, 403, { error: '需要管理员权限' });
        return;
      }
      const users = (await store.getUsers()).map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        createdAt: u.createdAt
      }));
      sendJSON(res, 200, users);
      return;
    }

    if (pathname === '/api/users' && method === 'POST') {
      if (!requireAdmin(session)) {
        sendJSON(res, 403, { error: '需要管理员权限' });
        return;
      }
      const body = await readBody(req);
      const { username, password, displayName, role } = body;
      if (!username || !password) {
        sendJSON(res, 400, { error: '用户名和密码必填' });
        return;
      }
      if (await store.findUserByUsername(username)) {
        sendJSON(res, 400, { error: '用户名已存在' });
        return;
      }
      const newUser = await store.createUser({
        username: username,
        passwordHash: hashPassword(password),
        displayName: displayName || username,
        role: role || 'user'
      });
      sendJSON(res, 200, { id: newUser.id, username: newUser.username, displayName: newUser.displayName, role: newUser.role });
      return;
    }

    // -- Delete user --
    const userDeleteMatch = pathname.match(/^\/api\/users\/(\d+)$/);
    if (userDeleteMatch && method === 'DELETE') {
      if (!requireAdmin(session)) {
        sendJSON(res, 403, { error: '需要管理员权限' });
        return;
      }
      const userId = parseInt(userDeleteMatch[1]);
      if (userId === session.userId) {
        sendJSON(res, 400, { error: '不能删除自己' });
        return;
      }
      const users = await store.getUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        sendJSON(res, 404, { error: '用户不存在' });
        return;
      }
      if (user.role === 'admin') {
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          sendJSON(res, 400, { error: '不能删除最后一个管理员' });
          return;
        }
      }
      await store.deleteUser(userId);
      sendJSON(res, 200, { ok: true });
      return;
    }

    // -- Reset user password --
    const userPwMatch = pathname.match(/^\/api\/users\/(\d+)\/password$/);
    if (userPwMatch && method === 'PUT') {
      if (!requireAdmin(session)) {
        sendJSON(res, 403, { error: '需要管理员权限' });
        return;
      }
      const userId = parseInt(userPwMatch[1]);
      const body = await readBody(req);
      const { password } = body;
      if (!password || password.length < 4) {
        sendJSON(res, 400, { error: '密码至少4位' });
        return;
      }
      const users = await store.getUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        sendJSON(res, 404, { error: '用户不存在' });
        return;
      }
      await store.updateUserPassword(userId, hashPassword(password));
      sendJSON(res, 200, { ok: true });
      return;
    }

    // -- 404 --
    sendJSON(res, 404, { error: 'API not found: ' + method + ' ' + pathname });

  } catch (err) {
    console.error('API Error:', err.message);
    sendJSON(res, 500, { error: '服务器错误: ' + err.message });
  }
}

// ==================== Start Server ====================
async function start() {
  store = await createStore();

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      console.error('Unhandled error:', err);
      if (!res.headersSent) {
        sendJSON(res, 500, { error: '服务器内部错误' });
      }
    });
  });

  server.listen(PORT, HOST, () => {
    console.log('========================================');
    console.log('  党政办物资库存工作台 - 服务已启动');
    console.log('========================================');
    console.log('');
    console.log('  本机访问:  http://localhost:' + PORT);
    if (!USE_PG) {
      console.log('  局域网访问: http://<本机IP>:' + PORT);
    }
    console.log('');
    console.log('  默认管理员账号: admin');
    console.log('  默认密码: admin123');
    console.log('');
    console.log('  首次登录后请及时修改密码！');
    console.log('========================================');
    console.log('');
    console.log('按 Ctrl+C 停止服务');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('端口 ' + PORT + ' 被占用，请尝试其他端口: PORT=3001 node server.js');
    } else {
      console.error('服务器错误:', err.message);
    }
  });
}

start().catch(err => {
  console.error('启动失败:', err.message);
  process.exit(1);
});
