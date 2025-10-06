import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RPC_ENDPOINTS = [
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://api.mainnet-beta.solana.com',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { publicKey, action, mint, amount, denominatedInSol, slippage, priorityFee, pool } = await req.json();

    console.log('[PumpPortal] Getting transaction from PumpPortal API...');
    
    // Get unsigned transaction from PumpPortal
    const pumpResponse = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey,
        action,
        mint,
        amount,
        denominatedInSol,
        slippage,
        priorityFee,
        pool
      }),
    });

    if (!pumpResponse.ok) {
      const errorText = await pumpResponse.text();
      console.error('[PumpPortal] API error:', errorText);
      throw new Error(`PumpPortal API failed: ${pumpResponse.status} - ${errorText}`);
    }

    const signedTransactionBytes = await pumpResponse.arrayBuffer();
    console.log('[PumpPortal] Got signed transaction from PumpPortal, sending to Solana...');

    // Try each RPC endpoint
    let lastError;
    for (const rpcUrl of RPC_ENDPOINTS) {
      try {
        console.log(`[PumpPortal] Trying ${rpcUrl}...`);
        
        const sendResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendTransaction',
            params: [
              btoa(String.fromCharCode(...new Uint8Array(signedTransactionBytes))),
              {
                encoding: 'base64',
                skipPreflight: true,
                maxRetries: 3
              }
            ]
          })
        });

        const result = await sendResponse.json();
        
        if (result.error) {
          console.error(`[PumpPortal] RPC error from ${rpcUrl}:`, result.error);
          lastError = result.error;
          continue;
        }

        const signature = result.result;
        console.log(`[PumpPortal] Success! Signature: ${signature}`);

        return new Response(
          JSON.stringify({ signature }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error(`[PumpPortal] Failed with ${rpcUrl}:`, error);
        lastError = error;
      }
    }

    throw new Error(`All RPC endpoints failed. Last error: ${JSON.stringify(lastError)}`);
  } catch (error: any) {
    console.error('[PumpPortal] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});