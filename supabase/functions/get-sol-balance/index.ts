import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from 'npm:@solana/web3.js@1.98.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multiple RPC endpoints to try
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana.public-rpc.com',
  'https://rpc.ankr.com/solana',
];

// Simple in-memory cache (5 second TTL)
const cache = new Map<string, { balance: number; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

async function getBalanceWithRetry(address: string): Promise<number> {
  // Check cache first
  const cached = cache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('📦 Returning cached balance for:', address);
    return cached.balance;
  }

  // Try each endpoint
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`🔍 Trying ${endpoint}...`);
      const connection = new Connection(endpoint, 'confirmed');
      const publicKey = new PublicKey(address);
      const lamports = await connection.getBalance(publicKey);
      const balance = lamports / LAMPORTS_PER_SOL;
      
      console.log(`✅ Success from ${endpoint}: ${balance} SOL`);
      
      // Cache the result
      cache.set(address, { balance, timestamp: Date.now() });
      
      return balance;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ ${endpoint} failed:`, errorMsg);
      continue;
    }
  }
  
  throw new Error('All RPC endpoints failed');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔐 Fetching balance for:', address);
    const balance = await getBalanceWithRetry(address);

    return new Response(
      JSON.stringify({ balance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: errorMsg, balance: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
