# 🛒 Bazaar Inventory Tracking System

A scalable and audit-friendly inventory tracking service designed for kiryana stores, built to evolve into a high-performance multi-store, multi-supplier ecosystem. This system ensures real-time stock visibility, transactional integrity, and high concurrency support — aligned with Bazaar Technologies’ mission to streamline supply chains and boost store profitability.

---

## 🧠 Business Context

At Bazaar Technologies, robust inventory systems are at the heart of ensuring profitability and operational excellence. This system was designed to:
- Prevent **stockouts** and **overstocking** through real-time visibility.
- Support **high-volume transactions** for thousands of stores.
- Deliver scalable backend services that evolve from a single store to a nationwide retail network.

---

## ✅ Design Decisions

### 📦 Data Modeling
- **Stage 1**: Local storage (SQLite), focusing on modeling `Products`, `StockMovements`, and calculating real-time quantity.
- **Stage 2**: Introduced PostgreSQL with normalized schemas:
  - `Stores`, `Suppliers`, `Products`, `Stock`, and `StockMovements`
  - Stock is tracked **per store and per supplier**
- **Stage 3**: Added `AuditLogs` table and adopted denormalized views + read replicas for performance.

### ⚙️ Architecture
- **Monolith → Modular → Scalable**
- Used REST APIs throughout all stages for standardization.
- In **v3**, added:
  - Event-driven stock updates (Node.js EventEmitter)
  - Asynchronous processing
  - Optional message broker integration (e.g., RabbitMQ/Kafka)
  - Read/Write separation and caching layers

### 🛡️ Security & Performance
- **Stage 2**: Basic authentication, rate-limiting, and PostgreSQL indexing
- **Stage 3**: Horizontal scaling, sharding considerations, and queue-based job processing
- **Audit trail** for all inventory changes

---

## 📌 Assumptions

- Each product’s stock is tracked **per store** and **per supplier**.
- Products can be **stocked in**, **sold**, or **manually removed**.
- No frontend — only REST API or CLI interactions.
- Performance at scale is prioritized: reads optimized via caching, writes made durable via transactional control.
- Audit logging is required for traceability in v3.
- Quantity cannot go negative during any transaction.

---

## 📥 API Design

### ➕ `POST /add-stock`
```json
{
  "store_id": 1,
  "supplier_id": 5,
  "product_id": 101,
  "quantity": 50
}
