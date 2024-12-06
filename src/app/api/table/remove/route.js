import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { headers } from "next/headers";

// Handle removing tables from portfolios
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
    const portfolio = data['portfolio'];

    if (!tableName || !portfolio) {
        return NextResponse.json({error: "invalid form data"}, {status: 403});
    }

    const knex = require('knex')({
        client: 'pg',
        connection: process.env.PG_CONNECTION_STRING,
        searchPath: ['auth', 'public']
    });

    // Remove entry for the table/portfolio pair
    await knex("tables").del().where({user: user.id, name: tableName, portfolio: portfolio});

    return NextResponse.json({message: "Table removed!"}, {status: 200});
}