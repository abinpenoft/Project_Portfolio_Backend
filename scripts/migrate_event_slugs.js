import pool from '../configs/db.js';
import { slugify } from '../utils/helpers.js';

const migrateSlugs = async () => {
    try {
        console.log('🚀 Starting event slug migration...');

        // 1. Add slug column if it doesn't exist
        const [columns] = await pool.query('SHOW COLUMNS FROM events LIKE "slug"');
        if (columns.length === 0) {
            console.log('📝 Adding slug column to events table...');
            await pool.query('ALTER TABLE events ADD COLUMN slug VARCHAR(255) AFTER event_name');
            console.log('✅ Slug column added.');
        } else {
            console.log('ℹ️ Slug column already exists.');
        }

        // 2. Fetch all events that don't have a slug or have an empty slug
        const [rows] = await pool.query('SELECT id, event_name FROM events WHERE slug IS NULL OR slug = ""');
        console.log(`📊 Found ${rows.length} events needing slug generation.`);

        for (const row of rows) {
            let baseSlug = slugify(row.event_name);
            let slug = baseSlug;
            let counter = 1;

            // Check for uniqueness and append counter if necessary
            while (true) {
                const [existing] = await pool.query('SELECT id FROM events WHERE slug = ? AND id != ?', [slug, row.id]);
                if (existing.length === 0) break;
                slug = `${baseSlug}-${counter++}`;
            }

            await pool.query('UPDATE events SET slug = ? WHERE id = ?', [slug, row.id]);
            console.log(`✅ Updated event ID ${row.id}: ${slug}`);
        }

        // 3. Add unique index to slug column if not already there
        const [indexes] = await pool.query('SHOW INDEX FROM events WHERE Key_name = "uk_event_slug"');
        if (indexes.length === 0) {
            console.log('📝 Adding unique index to event slug...');
            await pool.query('ALTER TABLE events ADD UNIQUE INDEX uk_event_slug (slug)');
            console.log('✅ Unique index added.');
        } else {
            console.log('ℹ️ Unique index already exists.');
        }

        console.log('🎉 Migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
};

migrateSlugs();
