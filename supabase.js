// Configuración de conexión a Supabase

// 1. Pega aquí la "Project URL" que obtuviste del panel de Supabase
const SUPABASE_URL = "https://wcxmeikghmxltofudqjb.supabase.co";

// 2. Pega aquí tu "anon public API key"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjeG1laWtnaG14bHRvZnVkcWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTc3ODMsImV4cCI6MjA5MzMzMzc4M30.pC0wuM2ZKfqoKsa-TfY1_wOdqKikPU1GfYP86uCBtfs";

// Inicializar el cliente
// El objeto supabase estará disponible globalmente porque lo cargaremos vía CDN en el index.html
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
