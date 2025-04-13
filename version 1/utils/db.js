import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { join } from 'path';

export async function openDb() {
    return open({
        filename: join(process.cwd(), 'inventory.db'),
        driver: sqlite3.Database
    });
}
