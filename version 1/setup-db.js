const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./inventory.db');

db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL ,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    supplier_id INTEGER,
    quantity INTEGER,
    purchase_price NUMERIC(10, 2),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stock_in (
    stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    purchase_price NUMERIC(10,2),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    selling_price NUMERIC(10,2),
    purchase_price NUMERIC(10,2),
    profit NUMERIC(10,2),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    supplier_id INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS removed_stock (
    remove_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,  -- 'damaged', 'expired', 'lost'
    purchase_price NUMERIC(10,2),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log("Database setup complete.");
});

db.close();
