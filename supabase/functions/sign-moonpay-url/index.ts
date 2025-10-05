import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.194.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }

    const MOONPAY_API_KEY = 'pk_test_OgBAeHtOzfgW0XwvcUkEQa6v66xqusf';
    const MOONPAY_SECRET_KEY = Deno.env.get('MOONPAY_SECRET_KEY');

    if (!MOONPAY_SECRET_KEY) {
      throw new Error('MoonPay secret key not configured');
    }

    console.log('🔑 Using API Key:', MOONPAY_API_KEY);
    console.log('🔑 Secret Key length:', MOONPAY_SECRET_KEY.length, 'starts with:', MOONPAY_SECRET_KEY.substring(0, 10));

    // IMPORTANT: MoonPay requires signing the query string WITH the leading "?" character
    // Based on their PHP example: $query = '?apiKey=pk_test_key&currencyCode=eth&walletAddress=0xde...'
    const originalQuery = `?apiKey=${MOONPAY_API_KEY}&currencyCode=sol&walletAddress=${walletAddress}`;
    
    console.log('📝 Query string to sign (with ?):', originalQuery);
    
    // Create HMAC signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(MOONPAY_SECRET_KEY);
    const messageData = encoder.encode(originalQuery);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));

    // URL-encode the signature and append to the original query
    const encodedSignature = encodeURIComponent(signatureBase64);
    const signedUrl = `https://buy-sandbox.moonpay.com${originalQuery}&signature=${encodedSignature}`;

    console.log('🔐 Signed MoonPay URL for wallet:', walletAddress);
    console.log('✅ Full signature:', signatureBase64);
    console.log('🔗 Final URL:', signedUrl);

    return new Response(
      JSON.stringify({ url: signedUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error signing MoonPay URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
