import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    const connectionConfig = {
        host: 'server-three', // replace with your MySQL host
        user: 'root', // replace with your MySQL username
        password: 'Enter!987', // replace with your MySQL password
        database: 'crms'
    };

    try {
        const connection = await mysql.createConnection(connectionConfig);
        const [rows] = await connection.execute(`
        SELECT
            \`Run YM\`,
            \`Customer Name\`,
            \`Supplier Name\`,
            \`Product Name\`,
            \`Gross Commission\`,
            \`Total Payout\`,
            CASE
                WHEN \`Gross Commission\` = 0 OR \`Gross Commission\` IS NULL THEN NULL
                ELSE ROUND((\`Total Payout\` / \`Gross Commission\`) * 100, 2)
            END AS \`Payout to Gross Comm %\`
        FROM
            crms.commision;
        `);
        await connection.end();

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error connecting to the database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}