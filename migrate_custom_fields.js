import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    try {
        const pool = await mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'crm',
        });

        console.log('Creating custom fields tables...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS enquiry_custom_fields (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                field_label VARCHAR(100) NOT NULL,
                field_type ENUM('text', 'dropdown') NOT NULL DEFAULT 'text',
                field_options JSON DEFAULT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS enquiry_custom_values (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                enquiry_id INT UNSIGNED NOT NULL,
                field_id INT UNSIGNED NOT NULL,
                field_value TEXT,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (enquiry_id) REFERENCES contact_enquiries(id) ON DELETE CASCADE,
                FOREIGN KEY (field_id) REFERENCES enquiry_custom_fields(id) ON DELETE CASCADE,
                UNIQUE KEY uk_enquiry_field (enquiry_id, field_id)
            )
        `);

        console.log('Custom fields tables created successfully!');
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error creating tables:', err);
        process.exit(1);
    }
})();
