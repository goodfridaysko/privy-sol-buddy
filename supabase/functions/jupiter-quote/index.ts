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
    const { inputMint, outputMint, amount, slippageBps } = await req.json();

    console.log('Getting Jupiter quote:', { inputMint, outputMint, amount, slippageBps });

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
    });

    const response = await fetch(`${JUPITER_API}/quote?${params}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Jupiter API error:', error);
      throw new Error(`Jupiter API error: ${error}`);
    }

    const quote = await response.json();
    console.log('Got quote:', quote);

    return new Response(JSON.stringify(quote), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting quote:', error);
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
