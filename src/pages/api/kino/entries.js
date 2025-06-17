import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    const connectionConfig = {
        host: 'server-two',
        user: 'root',
        password: 'Enter!987',
        database: 'kineto'
    };

    try {
        const connection = await mysql.createConnection(connectionConfig);
        const [rows] = await connection.execute(`
            SELECT
                te.id AS time_entry_id,
                te.hours,
                te.spent_on,
                te.project_id,
                p.name AS project_name,
                te.issue_id,
                i.subject AS excercise_name,
                te.user_id,
                u.login AS user_login,
                cf.name AS custom_field_name,
                cv.value AS custom_field_value
            FROM
                time_entries te
                    LEFT JOIN projects p ON te.project_id = p.id
                    LEFT JOIN issues i ON te.issue_id = i.id
                    LEFT JOIN users u ON te.user_id = u.id
                    LEFT JOIN custom_values cv ON cv.customized_type = 'TimeEntry' AND cv.customized_id = te.id
                    LEFT JOIN custom_fields cf ON cv.custom_field_id = cf.id
            WHERE te.id = ${req.query.id?.replace(/[^0-9]/g, '') || 0};

        `);

        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Time entry not found' });
        }

        // Build the response object
        const base = {
            time_entry_id: rows[0].time_entry_id,
            hours: rows[0].hours,
            spent_on: rows[0].spent_on,
            project_id: rows[0].project_id,
            project_name: rows[0].project_name,
            issue_id: rows[0].issue_id,
            excercise_name: rows[0].excercise_name,
            user_id: rows[0].user_id,
            user_login: rows[0].user_login,
        };

        for (const row of rows) {
            if (row.custom_field_name) { // only add if custom field exists


                try {
                    base[row.custom_field_name] = JSON.parse(
                        row.custom_field_value
                            .replace(/\s+/g, '') // remove spaces
                            .replace(/(\d+)\.(?=,|\])/g, '$1.0') // fix decimals
                            .replace(/[\s\n\r]+/g, '') // remove spaces, newlines, carriage returns
                            .replace(/'/g, '"')                      // replace all single quotes with double quotes

                    );
                } catch (error) {
                    // console.error('Error parsing custom field value:', error);
                    console.log(row.custom_field_value);
                    base[row.custom_field_name] = row.custom_field_value; // fallback to string if JSON parsing fails
                }


            }
        }

        res.status(200).json(base);

    } catch (error) {
        console.error('Error connecting to the database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
