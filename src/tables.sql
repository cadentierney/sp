CREATE TABLE tables (
    id bigint primary key generated always as identity,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE shared_tables (
    id bigint primary key generated always as identity,
    table_id bigint REFERENCES tables(id),
    user_id bigint REFERENCES auth.users(id),
    shared_at timestamp with time zone DEFAULT now()
);

CREATE TABLE shared_files (
    id bigint primary key generated always as identity,
    file_id bigint REFERENCES files(id),
    user_id bigint REFERENCES auth.users(id),
    shared_at timestamp with time zone DEFAULT now()
);

CREATE TABLE portfolios (
    id bigint primary key generated always as identity,
    user_id bigint REFERENCES auth.users(id),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE files (
    id bigint primary key generated always as identity,
    name text NOT NULL,
    path text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
