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

    // Use Jupiter V6 API with LEGACY transaction flag
    const swapBody = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
      asLegacyTransaction: true, // CRITICAL: Force legacy transactions for Privy
    };

    console.log('📤 Calling Jupiter V6 swap API (LEGACY MODE)...');
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
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

    // Verify it's a legacy transaction (not v0)
    const txBuffer = Uint8Array.from(atob(data.swapTransaction), c => c.charCodeAt(0));
    const firstByte = txBuffer[0];
    
    if (firstByte === 0x80 || firstByte === 128) {
      console.error('❌ Jupiter returned v0 transaction despite asLegacyTransaction flag!');
      throw new Error('Jupiter returned versioned transaction. Privy requires legacy transactions.');
    }

    console.log('✅ Legacy swap transaction built successfully');

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
