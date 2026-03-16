import db from './configs/db.js';

async function test() {
    try {
        const [aRows] = await db.query('SELECT title FROM manifesto_long_term_commitments WHERE title LIKE "%a%" OR description LIKE "%a%"');
        console.log("A matches:", aRows.length);
        
        const [eRows] = await db.query('SELECT title FROM manifesto_long_term_commitments WHERE title LIKE "%e%" OR description LIKE "%e%"');
        console.log("E matches:", eRows.length);

        const [zRows] = await db.query('SELECT title FROM manifesto_long_term_commitments WHERE title LIKE "%z%" OR description LIKE "%z%"');
        console.log("Z matches:", zRows.length);
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

test();
