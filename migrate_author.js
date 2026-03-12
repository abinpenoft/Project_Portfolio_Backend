import db from './configs/db.js';

async function migrate() {
    try {
        console.log('🚀 Starting migration: Adding author column to media_posts...');
        
        // 1. Check if column exists
        const [columns] = await db.query('SHOW COLUMNS FROM media_posts LIKE "author"');
        
        if (columns.length === 0) {
            await db.query('ALTER TABLE media_posts ADD COLUMN author VARCHAR(255) DEFAULT "Office of Shibu Theckumpuram" AFTER thumbnail_url');
            console.log('✅ Column "author" added successfully.');
        } else {
            console.log('ℹ️ Column "author" already exists.');
        }
        
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
