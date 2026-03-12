import db from '../configs/db.js';

const addDesignationColumn = async () => {
    try {
        console.log('🔄 Starting migration: Adding designation column to ente_nadu_testimonials...');

        // Check if designation column already exists
        const [columns] = await db.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_NAME = 'ente_nadu_testimonials' AND COLUMN_NAME = 'designation'`
        );

        if (columns.length > 0) {
            console.log('✅ Designation column already exists. Skipping column creation.');
        } else {
            console.log('📝 Adding designation column...');
            await db.query(
                `ALTER TABLE ente_nadu_testimonials 
                 ADD COLUMN designation VARCHAR(150) DEFAULT NULL AFTER author_name`
            );
            console.log('✅ Designation column added successfully.');
        }

        console.log('\n✨ Migration completed successfully!');
        console.log('\nNew fields available for video testimonials:');
        console.log('  - author_name: Name of the person providing the testimonial');
        console.log('  - designation: Job title/designation of the person');
        console.log('\nAPI Example for creating video testimonial:');
        console.log(`{
  "type": "video",
  "author_name": "John Doe",
  "designation": "Farmer",
  "video_url": "https://example.com/video.mp4",
  "thumbnail_url": "/uploads/thumbnail.jpg",
  "caption": "Brief caption about the testimonial"
}`);

        await db.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        await db.end();
        process.exit(1);
    }
};

addDesignationColumn();
