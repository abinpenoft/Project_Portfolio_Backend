import mysql from 'mysql2/promise';
import 'dotenv/config';

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    console.log('Connected to database.');

    try {
        console.log('Creating programs table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS programs (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating program_media table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS program_media (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                program_id INT UNSIGNED NOT NULL,
                media_type ENUM('photo', 'video') NOT NULL,
                file_url VARCHAR(500) NOT NULL,
                thumbnail_url VARCHAR(500) DEFAULT NULL,
                caption VARCHAR(500) DEFAULT NULL,
                order_index INT NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
                INDEX idx_program_id (program_id)
            )
        `);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
