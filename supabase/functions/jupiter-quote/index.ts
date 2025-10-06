import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Jupiter Quote function called');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Parsing request body...');
    const body = await req.json();
    const { inputMint, outputMint, amount, slippageBps } = body;

    console.log('📊 Quote request:', {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      amountSOL: amount / 1e9
    });

    // Validate inputs
    if (!inputMint || !outputMint || !amount) {
      throw new Error('Missing required parameters');
    }

    if (amount < 1000000) { // Less than 0.001 SOL
      throw new Error('Amount too small (minimum 0.001 SOL)');
    }

    // Use Jupiter V6 API which supports legacy transactions better
    const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
    quoteUrl.searchParams.append('inputMint', inputMint);
    quoteUrl.searchParams.append('outputMint', outputMint);
    quoteUrl.searchParams.append('amount', amount.toString());
    quoteUrl.searchParams.append('slippageBps', (slippageBps || 1000).toString());

    console.log('🔗 Calling Jupiter V6 API:', quoteUrl.toString());

    const response = await fetch(quoteUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('📡 Jupiter API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Jupiter API error:', errorText);
      throw new Error(`Jupiter API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Validate response
    if (!data || !data.inputMint || !data.outputMint) {
      console.error('❌ Invalid Jupiter response:', data);
      throw new Error('Invalid quote response from Jupiter');
    }

    console.log('✅ Quote received successfully:', {
      inAmount: data.inAmount,
      outAmount: data.outAmount,
      priceImpact: data.priceImpactPct
    });

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('💥 Function error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
