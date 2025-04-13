# 🛒 Bazaar Inventory Tracking System

A scalable and audit-friendly inventory tracking service for kiryana stores, designed to evolve from a local single-store app to a high-performance, multi-store, multi-supplier platform. It ensures real-time stock visibility, transactional integrity, and high concurrency — aligned with Bazaar Technologies’ mission to streamline supply chains and boost profitability.

---

## 🧠 Business Context

Bazaar Technologies needs robust inventory systems to:

- Prevent **stockouts** and **overstocking** through real-time visibility.
- Support **high-volume transactions** across thousands of stores.
- Scale from local kiryana setups to a **nationwide** retail network.

---

## ✅ Design Decisions

### 📦 Data Modeling (Versioned Evolution)

#### 🧱 Version 1 – SQLite (Single Store)

- Local SQLite-based schema
- Tracked `suppliers`, `products`, `inventory`, `sales`, `stock_in`, and `removed_stock`
- Inventory unique on `(product_id, supplier_id, purchase_price)`
- No support for multi-store, soft deletes, or audits

#### 🏪 Version 2 – PostgreSQL (Multi-Store)

- Switched to **PostgreSQL** for scalability and data integrity
- Added:
  - `stores`, `supplier_requests`
  - Soft deletes with `is_deleted`, `deleted_at`
  - Unique constraints on `(store_id, product_id, supplier_id)`
  - Foreign key constraints for data integrity
  - Read replica user (`replicator`) for future replication

#### 🚀 Version 3 – Performance & Audit Logging

- Introduced:
  - `AuditLogs` for tracking all inventory-related changes
  - Read replicas via PostgreSQL physical replication
  - Denormalized views for fast dashboard/report queries
  - Index optimization and efficient query planning

---

## 📊 Version Feature Matrix

| Feature                            | v1 (SQLite) | v2 (PostgreSQL) | v3 (Advanced) |
|-----------------------------------|-------------|------------------|---------------|
| Multi-Store Support               | ❌          | ✅               | ✅            |
| Soft Deletes                      | ❌          | ✅               | ✅            |
| Audit Logging                     | ❌          | ❌               | ✅            |
| Replication & Denormalized Views | ❌          | ❌               | ✅            |
| Inventory by Store-Supplier-Product | ❌        | ✅               | ✅            |

---


## ⚙️ Architecture Evolution

### 🧪 Stage 1 (SQLite)
- Single-store setup using SQLite
- Tracked suppliers, products, and sales
- No real-time or multi-store capabilities

### 🏗 Stage 2 (PostgreSQL)
- Introduced PostgreSQL for multi-store support
- Normalized schema with foreign key constraints
- Added supplier request flow and soft deletes

### 🚀 Stage 3 (Scalable & Event-Driven)
- Asynchronous updates using `Node.js EventEmitter`
- **Read/Write Separation**:
  - Dockerized PostgreSQL master-replica setup
  - Master for writes, replica for read-heavy operations
- **Upstash Redis** caching for performance
- **PM2** process manager for horizontal scaling
- **API Rate Limiting** for protection and stability

---

## 🛡️ Security & Performance Enhancements

### Stage 2:
- Basic authentication for securing endpoints
- Rate limiting to prevent abuse (across 500+ stores)

### Stage 3:
- **Horizontal scaling** with PM2 to handle traffic from thousands of stores
- **Async stock sync** via EventEmitter
- **Caching layer** with Upstash Redis
- **Audit trail** with `ActivityLogs` for traceability
- **Read/Write separation** using Docker PostgreSQL cluster
- Future-ready for **sharding** and **Kafka/RabbitMQ integration**

---

## 🗂 Project Structure
```
📦 
├─ .gitattributes
├─ README.md
├─ version 1
│  ├─ .gitignore
│  ├─ inventory.db
│  ├─ jsconfig.json
│  ├─ next.config.mjs
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.mjs
│  ├─ public
│  │  ├─ file.svg
│  │  ├─ globe.svg
│  │  ├─ next.svg
│  │  ├─ vercel.svg
│  │  └─ window.svg
│  ├─ setup-db.js
│  ├─ src
│  │  └─ app
│  │     ├─ api
│  │     │  ├─ inventory
│  │     │  │  └─ view
│  │     │  │     └─ route.js
│  │     │  ├─ product
│  │     │  │  ├─ add_product
│  │     │  │  │  └─ route.js
│  │     │  │  ├─ remove
│  │     │  │  │  └─ route.js
│  │     │  │  ├─ sale
│  │     │  │  │  └─ route.js
│  │     │  │  ├─ stock_in
│  │     │  │  │  └─ route.js
│  │     │  │  └─ update_product
│  │     │  │     └─ route.js
│  │     │  └─ supplier
│  │     │     ├─ add_supplier
│  │     │     │  └─ route.js
│  │     │     └─ update_supplier
│  │     │        └─ route.js
│  │     ├─ favicon.ico
│  │     ├─ globals.css
│  │     ├─ layout.js
│  │     └─ page.js
│  └─ utils
│     └─ db.js
├─ version 2
│  ├─ .gitignore
│  ├─ 00_init.sql
│  ├─ database
│  │  └─ database.js
│  ├─ jsconfig.json
│  ├─ middleware.js
│  ├─ middleware
│  │  ├─ authAdmin.js
│  │  └─ authStore.js
│  ├─ next.config.mjs
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.mjs
│  ├─ public
│  │  ├─ file.svg
│  │  ├─ globe.svg
│  │  ├─ next.svg
│  │  ├─ vercel.svg
│  │  └─ window.svg
│  └─ src
│     ├─ app
│     │  ├─ api
│     │  │  ├─ auth
│     │  │  │  ├─ admin
│     │  │  │  │  └─ login
│     │  │  │  │     └─ route.js
│     │  │  │  └─ login
│     │  │  │     └─ route.js
│     │  │  ├─ inventory
│     │  │  │  ├─ get_inventory
│     │  │  │  │  └─ [id]
│     │  │  │  │     └─ route.js
│     │  │  │  ├─ remove
│     │  │  │  │  └─ [id]
│     │  │  │  │     └─ route.js
│     │  │  │  ├─ sale
│     │  │  │  │  └─ [id]
│     │  │  │  │     └─ route.js
│     │  │  │  └─ update
│     │  │  │     └─ [id]
│     │  │  │        └─ route.js
│     │  │  ├─ products
│     │  │  │  ├─ add_product
│     │  │  │  │  └─ route.js
│     │  │  │  ├─ list_products
│     │  │  │  │  └─ route.js
│     │  │  │  ├─ remove_product
│     │  │  │  │  └─ route.js
│     │  │  │  └─ update_product
│     │  │  │     └─ route.js
│     │  │  ├─ reports
│     │  │  │  └─ route.js
│     │  │  ├─ store
│     │  │  │  ├─ add_store
│     │  │  │  │  └─ route.js
│     │  │  │  └─ remove_store
│     │  │  │     └─ route.js
│     │  │  └─ suppliers
│     │  │     ├─ add_supplier
│     │  │     │  └─ route.js
│     │  │     ├─ create_request
│     │  │     │  └─ route.js
│     │  │     ├─ get_suppliers
│     │  │     │  └─ route.js
│     │  │     ├─ remove_supplier
│     │  │     │  └─ route.js
│     │  │     └─ request_action
│     │  │        └─ [request_id]
│     │  │           └─ route.js
│     │  ├─ favicon.ico
│     │  ├─ globals.css
│     │  ├─ layout.js
│     │  └─ page.js
│     └─ middleware.js
└─ version 3
   ├─ .gitignore
   ├─ 00_init.sql
   ├─ database
   │  └─ database.js
   ├─ docker
   ├─ docker-compose.yaml
   ├─ ecosystem.config.js
   ├─ jsconfig.json
   ├─ listeners
   │  ├─ activity_log.js
   │  ├─ cache_Events
   │  │  ├─ all_inventory_remove_cache.js
   │  │  ├─ inventory_cache_remove.js
   │  │  ├─ products_cache_remove.js
   │  │  └─ reports_clear.js
   │  ├─ insertion_events
   │  │  ├─ remove_insert.js
   │  │  ├─ sale_insert.js
   │  │  └─ stock_in_insert.js
   │  └─ update_quantity.js
   ├─ logs
   │  └─ service_gateway.err
   ├─ middleware.js
   ├─ middleware
   │  ├─ authAdmin.js
   │  └─ authStore.js
   ├─ next.config.mjs
   ├─ package-lock.json
   ├─ package.json
   ├─ pg_hba.conf
   ├─ postcss.config.mjs
   ├─ postgresql.conf
   ├─ public
   │  ├─ file.svg
   │  ├─ globe.svg
   │  ├─ next.svg
   │  ├─ vercel.svg
   │  └─ window.svg
   ├─ src
   │  ├─ app.zip
   │  ├─ app
   │  │  ├─ api
   │  │  │  ├─ auth
   │  │  │  │  ├─ admin
   │  │  │  │  │  └─ login
   │  │  │  │  │     └─ route.js
   │  │  │  │  └─ login
   │  │  │  │     └─ route.js
   │  │  │  ├─ inventory
   │  │  │  │  ├─ get_inventory
   │  │  │  │  │  └─ [id]
   │  │  │  │  │     └─ route.js
   │  │  │  │  ├─ remove
   │  │  │  │  │  └─ [id]
   │  │  │  │  │     └─ route.js
   │  │  │  │  ├─ sale
   │  │  │  │  │  └─ [id]
   │  │  │  │  │     └─ route.js
   │  │  │  │  └─ update
   │  │  │  │     └─ [id]
   │  │  │  │        └─ route.js
   │  │  │  ├─ products
   │  │  │  │  ├─ add_product
   │  │  │  │  │  └─ route.js
   │  │  │  │  ├─ list_products
   │  │  │  │  │  └─ route.js
   │  │  │  │  ├─ remove_product
   │  │  │  │  │  └─ route.js
   │  │  │  │  └─ update_product
   │  │  │  │     └─ route.js
   │  │  │  ├─ reports
   │  │  │  │  └─ route.js
   │  │  │  ├─ store
   │  │  │  │  ├─ add_store
   │  │  │  │  │  └─ route.js
   │  │  │  │  └─ remove_store
   │  │  │  │     └─ route.js
   │  │  │  └─ suppliers
   │  │  │     ├─ add_supplier
   │  │  │     │  └─ route.js
   │  │  │     ├─ create_request
   │  │  │     │  └─ route.js
   │  │  │     ├─ get_suppliers
   │  │  │     │  └─ route.js
   │  │  │     ├─ remove_supplier
   │  │  │     │  └─ route.js
   │  │  │     └─ request_action
   │  │  │        └─ [request_id]
   │  │  │           └─ route.js
   │  │  ├─ favicon.ico
   │  │  ├─ globals.css
   │  │  ├─ layout.js
   │  │  └─ page.js
   │  └─ middleware.js
   └─ utils
      ├─ eventEmitter.js
      └─ redis.js
```
---

## 📌 Assumptions

### 🟢 Stage 1: Single Store Model
- Designed for a **single kiryana store** with local storage (flat file or SQLite).
- Product stock movements are tracked:
  - ✅ **Stock In**
  - 🛒 **Sale**
  - 🧹 **Manual Removal**
- Traceability for every action (**stock in, sale, removal**) is captured at the **product level**.
- Simple **CLI** or **REST API** for interaction.
- **No authentication** or rate limiting.
- The focus is on **data integrity**, **security**, and **basic scalability** for single-store operation.
- **Negative stock quantities** are not allowed.
- Performance is acceptable at this early stage with basic operations for one store.
- No **multi-store** or **multi-supplier** capabilities in this stage.

### 🟡 Stage 2: Multi-Store and Supplier Support
- Supports **500+ stores** with a **central product catalog** and **store-specific stock**.
- Stock is tracked at the **store-supplier-product** level.
- **Traceability** is implemented for every action (**stock in, sale, removal**) at the **store**, **product**, and **supplier** level.
- **APIs** are optimized to handle basic requests:
  - Filtering and reporting by store, product, date range.
- **Basic authentication** for users.
- **Request throttling** introduced to prevent abuse using **Upstash Redis** for rate limiting.
- **Relational Database (PostgreSQL)** used for centralized storage.
- **Negative stock quantities** are not allowed.
- Focus is on **scalability**, **security**, and **performance optimization** for handling **500+ stores**.
- Database schema designed for **multi-store support** and **supplier-specific inventory tracking**.
- **Asynchronous updates** are not yet implemented; some latency is acceptable.

### 🔵 Stage 3: Large-Scale Distributed Architecture with Real-Time Sync
- Supports **thousands of stores**, with **near real-time stock synchronization**.
- **Horizontal scalability** is prioritized using **PM2** to handle a growing number of stores and suppliers.
- Every action (**Stock In, Sale, Removal**) is traceable to:
  - 🧑 **User**
  - 🏬 **Store**
  - 📦 **Product**
  - 🏭 **Supplier**
- **Audit logging** is implemented for full traceability of stock movements.
- **Asynchronous updates** (event-driven) are introduced using **Event Emitters** for **real-time stock sync**.
- **Read/write separation** implemented using **Docker** with **read replicas** to improve performance.
- **Caching strategies** employed to speed up frequently accessed data.
- **API rate limits** and **security enhancements** implemented using **Upstash Redis** to handle high concurrency and prevent abuse.
- Database design supports **high-volume transactions** and **multi-store operations**.
- **Negative stock quantities** are not allowed.
- The system is designed for **high availability**, **fault tolerance**, and **performance at scale**.

---

## 🔌 API Design

### Stage 1

```
api/
├── inventory/
│   └── view/                     # GET - View inventory details      
├── product/
│   ├── add_product/              # POST - Add a new product
│   ├── remove/                   # POST - Remove or mark a product as damaged or lost
│   ├── sale/                     # POST - Record a product sale
│   ├── stock_in/                 # POST - Add stock to an existing or a new product
│   └── update_product/           # PUT - Update product information
└── supplier/
    ├── add_supplier/             # POST - Add a new supplier
    └── update_supplier/          # PUT - Update existing supplier details

```
Stage 2: 
```
api/
├── auth/
│   ├── admin_login/         # POST - Admin login
│   └── login/               # POST - User login
├── inventory/
│   ├── get_inventory/       # GET - Fetch inventory details
│   ├── remove/              # POST - Remove item from inventory
│   ├── sale/                # POST - Record sale
│   └── update/              # PUT - Update inventory
├── products/
│   ├── add_product/         # POST - Add a new product
│   ├── list_products/       # GET - List all products
│   ├── remove_product/      # DELETE - Remove product
│   └── update_product/      # PUT - Update product details
├── reports/
│   └── route.js             # GET - Generate filtering by store,supplier , and date range
├── store/
│   ├── add_store/           # POST - Add new store
│   └── remove_store/        # DELETE - Remove existing store
├── suppliers/
│   ├── add_supplier/        # POST - Add a supplier
│   ├── create_request/      # POST - Request action from supplier
│   ├── get_suppliers/       # GET - List all suppliers
│   ├── remove_supplier/     # DELETE - Remove a supplier
│   └── request_action/      # PATCH - Act on supplier request

```

Stage 3: 
```
api/
├── auth/
│   ├── admin/                   # POST - Admin login
│   │   └── login
│   └── login                    # POST - User login
├── inventory/
│   ├── get_inventory            # GET - Fetch inventory data
│   ├── remove                   # POST - Remove item
│   ├── sale                     # POST - Record sale
│   └── update                   # PUT - Update inventory
├── products/
│   ├── add_product              # POST - Add product
│   ├── list_products            # GET - List products
│   ├── remove_product           # DELETE - Remove product
│   └── update_product           # PUT - Update product
├── reports/                     # GET - Generate filtering by store,supplier , and date range
├── store/
│   ├── add_store                # POST - Add store
│   └── remove_store             # DELETE - Remove store
└── suppliers/
    ├── add_supplier             # POST - Add supplier
    ├── create_request           # POST - Create supplier request
    ├── get_suppliers            # GET - List suppliers
    ├── remove_supplier          # DELETE - Remove supplier
    └── request_action           # PATCH - Act on supplier request By admin
```

---

## 🔄 Evolution Rationale (v1 → v3)

### ✅ Version 1
- **Simple structure** designed for a single store with local storage (SQLite or flat file).
- **Multi-supplier support** implemented at a basic level, where any supplier can deliver any product.
- **No authentication** or support for multi-store functionalities.
- **Traceability** is implemented for stock movements (stock in, sale, removal) at the product level.
- Basic operations with a focus on data integrity, security, and performance for a single store.

### ⚙️ Version 2
- **Authentication** introduced for admins and users to secure the platform.
- **Multi-supplier support** is enhanced with a central product catalog and store-specific stock.
- **APIs** now support **filtering and reporting** by store, product, and date range.
- **Request throttling** introduced using **Upstash Redis** to manage load and prevent abuse.
- Transitioned to a **relational database (PostgreSQL)** for better data management and scalability.
- **Negative stock quantities** are still prevented, with some latency due to non-asynchronous updates.

### 🚀 Version 3
- **Fully modular folder structure** for easier extensibility and maintenance.
- Consistent and cleaner naming conventions (no underscores) for improved readability.
- **Multi-supplier support** is fully integrated with enhanced tracking at the store-supplier-product level.
- **Horizontal scaling** using **PM2** to handle large volumes of stores and suppliers.
- **Asynchronous updates** implemented with **event-driven architecture** for real-time stock synchronization.
- **Read/write separation** using **Docker** for improved performance and scalability.
- **Caching strategies** and **API rate limiting** via **Upstash Redis** for better handling of high concurrency.
- **Audit logging** introduced for full traceability of stock movements across stores, products, and suppliers.
- Database schema optimized for **high-volume transactions**, ensuring high availability and fault tolerance.

---
## ✅ Conclusion

This Inventory Tracking System was engineered with a strong focus on scalability, reliability, and performance—evolving from a basic single-store CLI/API into a distributed architecture that supports thousands of stores and suppliers.

Throughout all versions, the system ensured:

- ✅ Multi-supplier support
- 📦 Accurate stock movement tracking (Stock In, Sale, Manual Removal)
- 🔐 Role-based access and security features
- ⚙️ Horizontal scaling with PM2
- 🐳 Read/Write replica setup using Docker
- 🚦 API rate limiting and request throttling via Upstash Redis
- ⚡ Asynchronous updates using EventEmitter
- 📊 Filtering and reporting capabilities for operational insights

This solution aligns with real-world challenges faced at Bazaar Technologies—providing a scalable, secure, and efficient inventory system ready for high-volume operations and future extensibility.

📌 *Built to grow with your business. Structured to scale.*

