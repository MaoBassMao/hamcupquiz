// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// 文字列なので引用符で囲む
const supabaseUrl = 'https://tkaysnjmyowddqjvqjtf.supabase.co';
// こちらも文字列なので引用符で囲む
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYXlzbmpteW93ZGRxanZxanRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NzY5MjIsImV4cCI6MjA2MDE1MjkyMn0.nVj1j2sQE6TuEv9xygWUyYmjsYbdaRY_GTc4kbTFpnA';

export const supabase = createClient(supabaseUrl, supabaseKey);