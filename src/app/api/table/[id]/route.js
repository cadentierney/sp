import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { headers } from "next/headers";

// Handle table deletion
export async function DELETE(request, { params }) {
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

    const tableName = params.id;

    const knex = require('knex')({
        client: 'pg',
        connection: process.env.PG_CONNECTION_STRING,
    });

    // Drop table
    await knex.schema.dropTableIfExists(tableName);

    // Remove record for table owner/name pair
    await knex("tables").where('name', tableName).del();

    return NextResponse.json({message: "Table deleted!"}, {status: 200});
}