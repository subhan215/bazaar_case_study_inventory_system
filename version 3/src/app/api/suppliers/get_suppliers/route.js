
import { NextResponse } from "next/server";
import { replicaPool } from "../../../../../database/database";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";

export async function GET() {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const client = await replicaPool.connect(); 

    try {
        console.log("Fetching suppliers from database...");
        const result = await client.query("SELECT * FROM suppliers");

        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
