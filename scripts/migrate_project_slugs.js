import pool from '../configs/db.js';
import { slugify } from '../utils/helpers.js';

const migrateProjectSlugs = async () => {
    try {
        console.log('🚀 Starting project slug migration...');

        // 1. Add slug column if it doesn't exist
        const [columns] = await pool.query('SHOW COLUMNS FROM projects LIKE "slug"');
        if (columns.length === 0) {
            console.log('📝 Adding slug column to projects table...');
            await pool.query('ALTER TABLE projects ADD COLUMN slug VARCHAR(255) AFTER title');
            console.log('✅ Slug column added.');
        } else {
            console.log('ℹ️ Slug column already exists.');
        }

        // 2. Fetch all projects that don't have a slug or have an empty slug
        const [rows] = await pool.query('SELECT id, title FROM projects WHERE slug IS NULL OR slug = ""');
        console.log(`📊 Found ${rows.length} projects needing slug generation.`);

        for (const row of rows) {
            let baseSlug = slugify(row.title);
            let slug = baseSlug;
            let counter = 1;

            // Check for uniqueness and append counter if necessary
            while (true) {
                const [existing] = await pool.query('SELECT id FROM projects WHERE slug = ? AND id != ?', [slug, row.id]);
                if (existing.length === 0) break;
                slug = `${baseSlug}-${counter++}`;
            }

            await pool.query('UPDATE projects SET slug = ? WHERE id = ?', [slug, row.id]);
            console.log(`✅ Updated project ID ${row.id}: ${slug}`);
        }

        // 3. Add unique index to slug column if not already there
        const [indexes] = await pool.query('SHOW INDEX FROM projects WHERE Key_name = "uk_project_slug"');
        if (indexes.length === 0) {
            console.log('📝 Adding unique index to project slug...');
            await pool.query('ALTER TABLE projects ADD UNIQUE INDEX uk_project_slug (slug)');
            console.log('✅ Unique index added.');
        } else {
            console.log('ℹ️ Unique index already exists.');
        }

        console.log('🎉 Project migration completed successfully.');
    } catch (err) {
        console.error('❌ Project migration failed:', err);
    } finally {
        process.exit();
    }
};

migrateProjectSlugs();
