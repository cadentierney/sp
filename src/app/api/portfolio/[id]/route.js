import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { headers } from "next/headers";

// Handle portfolio deletion
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

    const portfolioId = params.id;

    const knex = require('knex')({
        client: 'pg',
        connection: process.env.PG_CONNECTION_STRING,
    });

    // Get all tables in portfolio and drop them
    await knex("tables").where('portfolio', portfolioId).select("name").then(tables => {
        tables.forEach(async (table) => {
            await knex.schema.dropTableIfExists(table.name);
        })
    });

    // Remove all table and file entries from the portfolio
    await knex("tables").where('portfolio', portfolioId).del();
    await knex("files").where('portfolio', portfolioId).del();

    // Remove record for portfolio owner/name pair
    await knex("portfolios").where('id', portfolioId).del();

    return NextResponse.json({message: "Portfolio deleted!"}, {status: 200});
}