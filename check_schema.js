import db from './Backend/configs/db.js';

async function checkSchema() {
    try {
        const [rows] = await db.query('DESCRIBE media_posts');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error describing table:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
