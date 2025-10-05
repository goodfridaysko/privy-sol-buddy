import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Jupiter Swap function called');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Parsing request body...');
    const body = await req.json();
    const { quoteResponse, userPublicKey } = body;

    console.log('🔧 Building swap transaction for:', {
      user: userPublicKey,
      inAmount: quoteResponse?.inAmount,
      outAmount: quoteResponse?.outAmount
    });

    // Validate inputs
    if (!quoteResponse || !userPublicKey) {
      throw new Error('Missing quoteResponse or userPublicKey');
    }

    const swapBody = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1000000,
          priorityLevel: "veryHigh"
        }
      }
    };

    console.log('📤 Calling Jupiter swap API (lite-api v1)...');
    const response = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(swapBody),
    });

    console.log('📡 Jupiter swap API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Jupiter swap API error:', errorText);
      throw new Error(`Jupiter swap failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Validate response
    if (!data || !data.swapTransaction) {
      console.error('❌ Invalid swap response:', data);
      throw new Error('Invalid swap transaction response from Jupiter');
    }

    console.log('✅ Swap transaction built successfully');

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
