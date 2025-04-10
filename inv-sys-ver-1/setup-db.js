const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./inventory.db');

db.serialize(() => {
  // Drop existing tables
  db.run('DROP TABLE IF EXISTS removed_stock');
  db.run('DROP TABLE IF EXISTS sales');
  db.run('DROP TABLE IF EXISTS stock_in');
  db.run('DROP TABLE IF EXISTS inventory');
  db.run('DROP TABLE IF EXISTS products');
  db.run('DROP TABLE IF EXISTS suppliers');

  console.log("All tables dropped.");

  // Suppliers Table
  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT
  )`);

  // Products Table (Centralized product details)
  db.run(`CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL ,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Inventory Table (Tracks stock per supplier)
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    supplier_id INTEGER,
    quantity INTEGER,
    purchase_price NUMERIC(10, 2),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    CONSTRAINT unique_product_supplier_purchase_price UNIQUE (product_id, supplier_id, purchase_price)
  )`);

  // Stock-In Table (For purchases/restocking)
  db.run(`CREATE TABLE IF NOT EXISTS stock_in (
    stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    purchase_price NUMERIC(10,2),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
  )`);

  // Sales Table (For transactions when items are sold)
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    selling_price NUMERIC(10,2),
    purchase_price NUMERIC(10,2),
    profit NUMERIC(10,2),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    supplier_id INTEGER NOT NULL,  -- Supplier ID added for reference
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
  )`);

  // Removed Stock Table (For manually removed stock)
  db.run(`CREATE TABLE IF NOT EXISTS removed_stock (
    remove_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,  -- 'damaged', 'expired', 'lost'
    purchase_price NUMERIC(10,2),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
  )`);

  console.log("Database setup complete.");
});

db.close();
