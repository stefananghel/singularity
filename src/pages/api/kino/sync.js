import mysql from 'mysql2/promise';
import { Client } from '@opensearch-project/opensearch';

export default async function handler(req, res) {
    const connectionConfig = {
        host: 'server-two',
        user: 'root',
        password: 'Enter!987',
        database: 'kineto'
    };

    const client = new Client({
        node: 'http://192.168.2.128:9200', // OpenSearch server
    });

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
                i.subject AS issue_subject,
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
            where te.id > 2872;
        `);

        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No time entries found' });
        }

        // Group rows by time_entry_id
        const groupedTimeEntries = {};

        for (const row of rows) {
            // If this time_entry_id doesn't exist in the grouped object, create a new entry
            if (!groupedTimeEntries[row.time_entry_id]) {
                groupedTimeEntries[row.time_entry_id] = {
                    time_entry_id: row.time_entry_id,
                    hours: row.hours,
                    spent_on: row.spent_on,
                    project_id: row.project_id,
                    project_name: row.project_name,
                    issue_id: row.issue_id,
                    issue_subject: row.issue_subject,
                    user_id: row.user_id,
                    user_login: row.user_login,
                    custom_fields: {} // Initialize an empty object for custom fields
                };
            }

            // If there's a custom field, add it to the custom_fields object
            if (row.custom_field_name) {
                try {
                    groupedTimeEntries[row.time_entry_id][row.custom_field_name] = JSON.parse(
                        row.custom_field_value
                            .replace(/\s+/g, '') // remove spaces
                            .replace(/(\d+)\.(?=,|\])/g, '$1.0') // fix decimals
                            .replace(/[\s\n\r]+/g, '') // remove spaces, newlines, carriage returns
                            .replace(/'/g, '"') // replace single quotes with double quotes
                    );
                } catch (error) {
                    console.log('Error parsing custom field value:', row.custom_field_value);
                    groupedTimeEntries[row.time_entry_id][row.custom_field_name] = row.custom_field_value; // fallback to raw value
                }
            }
        }

        // Now send the grouped time entries to OpenSearch
        const indexName = 'entries'; // OpenSearch index

        // Loop through each grouped time entry and index it into OpenSearch
        for (const timeEntryId in groupedTimeEntries) {
            const timeEntry = groupedTimeEntries[timeEntryId];
            const doc = timeEntry;

            try {
                // Index the document into OpenSearch
                const response = await client.index({
                    index: indexName,
                    body: doc
                });

                console.log('Document indexed:', response.body);
            } catch (err) {
                console.error('Error indexing document to OpenSearch:', err);
            }
        }

        res.status(200).json({ message: 'Time entries processed and indexed successfully' });

    } catch (error) {
        console.error('Error connecting to the database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
