import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Key. Please check your .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication Functions
export const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
};

export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

// Database Functions
export const fetchData = async (table, filters = []) => {
    let query = supabase.from(table).select('*');

    filters.forEach(({ column, operator, value }) => {
        query = query.filter(column, operator, value);
    });

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const insertData = async (table, data) => {
    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;
};

export const updateData = async (table, id, data) => {
    const { error } = await supabase.from(table).update(data).eq('id', id);
    if (error) throw error;
};

export const deleteData = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
};

export default supabase;
