import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { headers } from "next/headers";

// Handle table creation
export async function PUT(request) {
    const headerList = headers();
    const authHeader = headerList.get("authorization");

    const authToken = (authHeader || '').split("Bearer ")[1];

    if (!authToken) {
        return NextResponse.json({error: "auth token must be provided"}, {status: 401});
    }

    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser(authToken);

    if (!user) {
        return NextResponse.json({error: `could not verify user: ${error.message}`}, {status: 401});
    }

    const data = await request.json();
    const tableName = data['tableName'];
    const portfolio = data['portfolio']
    const columns = data['columns'];
    const rows = data['rows'];

    if (!tableName || !columns || !rows) {
        return NextResponse.json({error: "invalid form data"}, {status: 403});
    }

    const knex = require('knex')({
        client: 'pg',
        connection: process.env.PG_CONNECTION_STRING,
    });

    // Use first 8 chars of uuid to make the table name unique
    const uniqueTableName = tableName + '_' + user.id.substring(0, 8);

    // Create new table with provided columns
    await knex.schema.createTable(uniqueTableName, (table) => {
        table.increments('id');
        columns.forEach(column => {
            table.string(column);
        });
    });

    // Insert data into new table
    await knex(uniqueTableName).insert(rows);

    // Add record for new table owner/name pair
    await knex("tables").insert({user: user.id, name: uniqueTableName, portfolio: portfolio});

    return NextResponse.json({message: "Table created!"}, {status: 201});
}