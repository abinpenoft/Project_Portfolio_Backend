import db from '../configs/db.js';
import { slugify } from '../utils/helpers.js';

const addSlugColumnAndPopulate = async () => {
    try {
        console.log('🔄 Starting migration: Adding slug column to media_posts...');

        // Check if slug column already exists
        const [columns] = await db.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_NAME = 'media_posts' AND COLUMN_NAME = 'slug'`
        );

        if (columns.length > 0) {
            console.log('✅ Slug column already exists. Skipping column creation.');
        } else {
            console.log('📝 Adding slug column...');
            await db.query(
                `ALTER TABLE media_posts 
                 ADD COLUMN slug VARCHAR(300) DEFAULT NULL AFTER title`
            );
            console.log('✅ Slug column added successfully.');
        }

        // Fetch all posts without slugs
        const [posts] = await db.query(
            'SELECT id, title FROM media_posts WHERE slug IS NULL OR slug = ""'
        );

        if (posts.length === 0) {
            console.log('✅ All posts already have slugs. No updates needed.');
            await db.end();
            process.exit(0);
        }

        console.log(`📊 Found ${posts.length} posts without slugs. Generating...`);

        // Generate slugs for each post
        for (const post of posts) {
            const slug = slugify(post.title);
            try {
                await db.query(
                    'UPDATE media_posts SET slug = ? WHERE id = ?',
                    [slug, post.id]
                );
                console.log(`  ✓ Post ${post.id}: "${post.title}" → "${slug}"`);
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.warn(`  ⚠ Duplicate slug for post ${post.id}. Appending ID...`);
                    const uniqueSlug = `${slug}-${post.id}`;
                    await db.query(
                        'UPDATE media_posts SET slug = ? WHERE id = ?',
                        [uniqueSlug, post.id]
                    );
                    console.log(`  ✓ Post ${post.id}: "${post.title}" → "${uniqueSlug}"`);
                } else {
                    throw err;
                }
            }
        }

        // Add unique constraint if it doesn't exist
        const [constraints] = await db.query(
            `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
             WHERE TABLE_NAME = 'media_posts' AND COLUMN_NAME = 'slug' AND CONSTRAINT_NAME != 'PRIMARY'`
        );

        if (constraints.length === 0) {
            console.log('📝 Adding UNIQUE constraint to slug column...');
            await db.query(
                'ALTER TABLE media_posts ADD CONSTRAINT uk_slug UNIQUE (slug)'
            );
            console.log('✅ UNIQUE constraint added.');
        } else {
            console.log('✅ UNIQUE constraint already exists.');
        }

        // Add index if it doesn't exist
        const [indexes] = await db.query(
            `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_NAME = 'media_posts' AND COLUMN_NAME = 'slug' AND INDEX_NAME != 'PRIMARY'`
        );

        if (indexes.length === 0) {
            console.log('📝 Adding INDEX to slug column...');
            await db.query(
                'CREATE INDEX idx_slug ON media_posts(slug)'
            );
            console.log('✅ INDEX added.');
        } else {
            console.log('✅ INDEX already exists.');
        }

        console.log('\n✨ Migration completed successfully!');
        await db.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        await db.end();
        process.exit(1);
    }
};

addSlugColumnAndPopulate();
