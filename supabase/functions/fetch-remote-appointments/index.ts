import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const remoteAppUrl = Deno.env.get('REMOTE_APP_URL');
    if (!remoteAppUrl) {
      throw new Error('REMOTE_APP_URL secret not configured');
    }

    const url = new URL(req.url);
    const since = url.searchParams.get('since') || '';

    // Call the other Lovable app's edge function
    const fetchUrl = `${remoteAppUrl}${since ? `?since=${since}` : ''}`;
    console.log('Fetching from remote app:', fetchUrl);

    const response = await fetch(fetchUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remote app error:', response.status, errorText);
      throw new Error(`Remote app returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Received ${Array.isArray(data) ? data.length : 0} records from remote app`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching remote appointments:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
