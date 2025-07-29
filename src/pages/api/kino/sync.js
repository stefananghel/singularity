import mysql from 'mysql2/promise';
import { Client } from '@opensearch-project/opensearch';

export default async function handler(req, res) {
    const { id, sync } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'Missing required parameter: id' });
    }
    const connectionConfig = {
        host: 'server-two',
        user: 'root',
        password: 'Enter!987',
        database: 'kineto'
    };

    const client = new Client({
        node: 'http://server-two:9200',
        auth: {
            username: 'admin',
            password: 'Enter@38391'
        }
    });

    try {
        const connection = await mysql.createConnection(connectionConfig);
        const [rows] = await connection.execute(`
            SELECT te.id     AS time_entry_id,
                   te.hours,
                   te.spent_on,
                   te.project_id,
                   p.name    AS project_name,
                   te.issue_id,
                   i.subject AS issue_subject,
                   te.user_id,
                   u.login   AS user_login,
                   cf.name   AS custom_field_name,
                   cv.value  AS custom_field_value,
                   te.created_on,
                   te.updated_on
            FROM time_entries te
                     LEFT JOIN projects p ON te.project_id = p.id
                     LEFT JOIN issues i ON te.issue_id = i.id
                     LEFT JOIN users u ON te.user_id = u.id
                     LEFT JOIN custom_values cv ON cv.customized_type = 'TimeEntry' AND cv.customized_id = te.id
                     LEFT JOIN custom_fields cf ON cv.custom_field_id = cf.id
            WHERE te.id = ?;
        `, [id]);

        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No time entries found' });
        }

        const groupedTimeEntries = [];

        for (const row of rows) {
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
                    created_on: row.created_on,
                    updated_on: row.updated_on,
                    // custom_fields: {}
                };
            }

            if (row.custom_field_name) {
                // if (row.custom_field_name === 'stateList' && typeof row.custom_field_value === 'string') {
                //     groupedTimeEntries[row.time_entry_id][row.custom_field_name] = row.custom_field_value
                //         .replace(/\[|\]/g, '')
                //         .split(',')
                //         .map(s => s.trim());
                // } else {
                    try {
                        if (row.custom_field_value === '') {
                            groupedTimeEntries[row.time_entry_id][row.custom_field_name] = null;
                        } else {
                            const val = row.custom_field_value.trim();
                            if (/^(\[|\{|"|\d|true|false|null)/.test(val)) {
                                groupedTimeEntries[row.time_entry_id][row.custom_field_name] = JSON.parse(
                                    val
                                        .replace(/\s+/g, '')
                                        .replace(/(\d+)\.(?=,|\])/g, '$1.0')
                                        .replace(/[\s\n\r]+/g, '')
                                        .replace(/'/g, '"')
                                );
                            } else {
                                groupedTimeEntries[row.time_entry_id][row.custom_field_name] = row.custom_field_value;
                            }
                        }
                    } catch (error) {
                        if (row.custom_field_value !== '') {
                            console.log(error);
                            console.log('Error parsing custom field value:', row.custom_field_name, row.custom_field_value);
                            console.log("Row data:", row);
                        }
                        groupedTimeEntries[row.time_entry_id][row.custom_field_name] = row.custom_field_value;
                    }
                }
            }
        // }

        if (sync === 'true') {
            const indexName = 'spent_time_entries';
            for (const timeEntryId in groupedTimeEntries) {
                const timeEntry = groupedTimeEntries[timeEntryId];
                const doc = timeEntry;
                console.log(doc);
                try {
                    await client.index({
                        index: indexName,
                        body: doc
                    });
                } catch (err) {
                    console.error('Error indexing document to OpenSearch:', err);
                }
            }
        }

        res.status(200).json(Object.keys(groupedTimeEntries).map(key => groupedTimeEntries[key]));

    } catch (error) {
        console.error('Error connecting to the database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
