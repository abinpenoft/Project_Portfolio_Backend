import mysql from 'mysql2/promise';
import 'dotenv/config';

// Simple slugify function for use in migration (replicating backend logic)
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    console.log('Connected to database.');

    try {
        console.log('Adding slug column to programs table...');
        await connection.query('ALTER TABLE programs ADD COLUMN slug VARCHAR(255) AFTER title');

        console.log('Fetching existing programs...');
        const [rows] = await connection.query('SELECT id, title FROM programs');

        console.log(`Generating slugs for ${rows.length} programs...`);
        for (const row of rows) {
            let baseSlug = slugify(row.title);
            let slug = baseSlug;
            let counter = 1;
            
            // Ensure unique slug
            while (true) {
                const [existing] = await connection.query('SELECT id FROM programs WHERE slug = ? AND id != ?', [slug, row.id]);
                if (existing.length === 0) break;
                slug = `${baseSlug}-${counter++}`;
            }

            console.log(`Setting slug for program ${row.id}: ${slug}`);
            await connection.query('UPDATE programs SET slug = ? WHERE id = ?', [slug, row.id]);
        }

        console.log('Adding UNIQUE constraint and NOT NULL to slug column...');
        await connection.query('ALTER TABLE programs MODIFY COLUMN slug VARCHAR(255) NOT NULL');
        await connection.query('ALTER TABLE programs ADD UNIQUE INDEX idx_program_slug (slug)');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
