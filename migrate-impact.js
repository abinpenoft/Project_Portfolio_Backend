import pool from './configs/db.js';

const createTable = async () => {
    try {
        const query = `
      CREATE TABLE IF NOT EXISTS impact_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        value VARCHAR(100) NOT NULL,
        icon_name VARCHAR(100) DEFAULT 'Activity',
        icon_url VARCHAR(255),
        order_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
        await pool.query(query);
        console.log('✅ Table impact_metrics created successfully or already exists.');

        // Check if table is empty and insert initial data if needed
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM impact_metrics');
        if (rows[0].count === 0) {
            const initialData = [
                ['Members', '43,671+', 'Users', 0],
                ['Palliative Patients Supported', '3,500+', 'Heart', 1],
                ['Volunteers Engaged', '11,000+', 'HandHeart', 2],
                ['Self-Sustainability Projects', '15+', 'Activity', 3]
            ];
            for (const [title, value, icon, order] of initialData) {
                await pool.query(
                    'INSERT INTO impact_metrics (title, value, icon_name, order_index) VALUES (?, ?, ?, ?)',
                    [title, value, icon, order]
                );
            }
            console.log('✅ Initial metrics data inserted.');
        }
    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        process.exit();
    }
};

createTable();
