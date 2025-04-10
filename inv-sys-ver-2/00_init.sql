-- Create the replicator user and replication slot
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicator_password';
SELECT pg_create_physical_replication_slot('replication_slot');

-- Create suppliers table
CREATE TABLE public.suppliers (
    supplier_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT
);

-- Create products table
CREATE TABLE public.products (
    product_id SERIAL PRIMARY KEY,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    selling_price NUMERIC(10,2),
    CONSTRAINT products_sku_key UNIQUE (sku)
);


-- Create stores table
CREATE TABLE public.stores (
    store_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    password VARCHAR(256)
);

CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,            -- Unique ID for each sale (auto-incremented)
    store_id INTEGER NOT NULL,             -- ID of the store making the sale
    product_id INTEGER NOT NULL,           -- ID of the product being sold
    quantity INTEGER NOT NULL,             -- Quantity of the product sold
    selling_price DECIMAL(10, 2) NOT NULL, -- Selling price per unit
    purchase_price DECIMAL(10, 2) NOT NULL,-- Purchase price per unit
    profit DECIMAL(10, 2) NOT NULL,        -- Profit made from the sale
    timestamp TIMESTAMP DEFAULT NOW(),     -- Timestamp of when the sale was made
    supplier_id INTEGER,                   -- Supplier ID for the product (optional, can be NULL)
    FOREIGN KEY (store_id) REFERENCES stores(store_id),  -- Reference to the stores table (assumes stores table exists)
    FOREIGN KEY (product_id) REFERENCES products(product_id),  -- Reference to the products table (assumes products table exists)
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) -- Reference to the suppliers table (assumes suppliers table exists)
);


-- Create removed_stock table
CREATE TABLE public.removed_stock (
    remove_id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT CHECK (reason = ANY (ARRAY['damaged', 'expired', 'lost'])),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    purchase_price NUMERIC(10,2),
    CONSTRAINT removed_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
    CONSTRAINT removed_stock_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(store_id),
    CONSTRAINT removed_stock_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id)
);

-- Create inventory table
CREATE TABLE public.inventory (
    inventory_id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    purchase_price NUMERIC(10,2),
    CONSTRAINT inventory_store_id_product_id_supplier_id_key UNIQUE (store_id, product_id, supplier_id),
    CONSTRAINT inventory_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(store_id),
    CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT inventory_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- Create stock_in table
CREATE TABLE public.stock_in (
    stock_id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    purchase_price NUMERIC(10,2),
    CONSTRAINT stock_in_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
    CONSTRAINT stock_in_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(store_id),
    CONSTRAINT stock_in_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id)
);

-- Create supplier_requests table
CREATE TABLE public.supplier_requests (
    request_id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    contact_details TEXT NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT supplier_requests_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
);

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    store_id INTEGER REFERENCES stores(store_id) ON DELETE SET NULL,
    model TEXT NOT NULL,
    model_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suppliers
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP;

ALTER TABLE stores
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP;


ALTER TABLE products
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP;


