import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tokenMints } = await req.json();
    
    console.log('Fetching prices for:', tokenMints);

    // Fetch SOL price from CoinGecko
    const solResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    const solData = await solResponse.json();
    const solPrice = solData?.solana?.usd || 0;

    // Fetch token prices from DexScreener (no auth required)
    const prices: Record<string, number> = {
      'So11111111111111111111111111111111111111112': solPrice
    };

    for (const mint of tokenMints) {
      if (mint === 'So11111111111111111111111111111111111111112') continue;
      
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${mint}`
        );
        const data = await response.json();
        
        // Get the first pair with USD price
        const pair = data?.pairs?.find((p: any) => p.priceUsd);
        if (pair) {
          prices[mint] = parseFloat(pair.priceUsd);
          console.log(`Price for ${mint}: $${prices[mint]}`);
        }
      } catch (error) {
        console.error(`Failed to fetch price for ${mint}:`, error);
        prices[mint] = 0;
      }
    }

    return new Response(
      JSON.stringify({ prices }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
