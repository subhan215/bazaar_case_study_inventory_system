import { NextResponse } from 'next/server';
import { openDb } from '../../../../../utils/db';

export async function GET(req) {
    try {
        const db = await openDb();
        const { searchParams } = new URL(req.url);
        const product_id = searchParams.get("product_id");
        const supplier_id = searchParams.get("supplier_id");
        const purchase_price = searchParams.get("purchase_price");
        const quantity_min = searchParams.get("quantity_min");
        const quantity_max = searchParams.get("quantity_max");
        let query = 'SELECT * FROM inventory WHERE 1=1'; 
        const params = [];

        if (product_id) {
            query += ' AND product_id = ?';
            params.push(product_id);
        }

        if (supplier_id) {
            query += ' AND supplier_id = ?';
            params.push(supplier_id);
        }

        if (purchase_price) {
            query += ' AND purchase_price = ?';
            params.push(purchase_price);
        }

        if (quantity_min) {
            query += ' AND quantity >= ?';
            params.push(quantity_min);
        }

        if (quantity_max) {
            query += ' AND quantity <= ?';
            params.push(quantity_max);
        }
        const inventory = await db.all(query, params);

        return NextResponse.json({
            success: true,
            data: inventory,
            message: 'Inventory fetched successfully',
        });
    } catch (error) {
        console.error("Error fetching inventory:", error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch inventory',
            error: error.message,
        }, { status: 500 });
    }
}
