import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multiple RPC endpoints for fallback
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
];

serve(async (req) => {
  console.log('📡 Send Solana Transaction function called');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { signedTransaction } = await req.json();

    if (!signedTransaction) {
      throw new Error('Missing signedTransaction');
    }

    console.log('📤 Sending transaction, bytes:', signedTransaction.length);

    let lastError: Error | null = null;

    // Try each RPC endpoint until one succeeds
    for (const rpcUrl of RPC_ENDPOINTS) {
      try {
        console.log(`🔍 Trying RPC: ${rpcUrl}`);

        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendTransaction',
            params: [
              signedTransaction,
              {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                encoding: 'base64',
              },
            ],
          }),
        });

        if (!response.ok) {
          console.error(`❌ RPC ${rpcUrl} returned ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.error) {
          console.error(`❌ RPC error from ${rpcUrl}:`, data.error);
          lastError = new Error(data.error.message || JSON.stringify(data.error));
          continue;
        }

        const signature = data.result;
        console.log(`✅ Transaction sent successfully via ${rpcUrl}:`, signature);

        return new Response(
          JSON.stringify({ signature }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      } catch (error) {
        console.error(`❌ Error with RPC ${rpcUrl}:`, error);
        lastError = error as Error;
        continue;
      }
    }

    // If all RPCs failed
    throw lastError || new Error('All RPC endpoints failed');

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
