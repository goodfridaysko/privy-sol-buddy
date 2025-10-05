import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const JUPITER_API = 'https://quote-api.jup.ag/v6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { quoteResponse, userPublicKey } = await req.json();

    console.log('Building swap transaction for:', userPublicKey);

    const response = await fetch(`${JUPITER_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Jupiter swap API error:', error);
      throw new Error(`Jupiter swap API error: ${error}`);
    }

    const swapData = await response.json();
    console.log('Got swap transaction');

    return new Response(JSON.stringify(swapData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error building swap:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
