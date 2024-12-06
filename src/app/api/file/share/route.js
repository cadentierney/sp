import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { headers } from "next/headers";

// Handle file sharing
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
    const fileId = data['fileId'];
    const email = data['email'];

    if (!fileId || !email) {
        return NextResponse.json({error: "invalid form data"}, {status: 403});
    }

    const knex = require('knex')({
        client: 'pg',
        connection: process.env.PG_CONNECTION_STRING,
        searchPath: ['auth', 'public']
    });

    // Get uuid of user with the specified email
    await knex("users").where('email', email).select("id").first().then(async (userId) => {
        // Add user to shared files table
        await knex("shared_files").insert({file: fileId, user: userId.id});
    }).catch(err => {
        console.error(err);
        return NextResponse.json({message: "User not found!"}, {status: 404});
    });

    return NextResponse.json({message: "File shared!"}, {status: 200});
}