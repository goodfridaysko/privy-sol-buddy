import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { quoteResponse, userPublicKey, wrapAndUnwrapSol, dynamicComputeUnitLimit } = await req.json();

    console.log('🔄 Jupiter Swap Request for user:', userPublicKey);

    // Build swap transaction
    const response = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: wrapAndUnwrapSol ?? true,
        dynamicComputeUnitLimit: dynamicComputeUnitLimit ?? true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Jupiter swap API error:', response.status, errorText);
      throw new Error(`Jupiter swap API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Swap transaction built successfully');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
