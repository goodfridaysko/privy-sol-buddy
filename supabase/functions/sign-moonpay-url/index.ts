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

    // Build query parameters with sorted keys to ensure consistent ordering
    // MoonPay requires all parameter VALUES to be URL-encoded before signing
    const params: Record<string, string> = {
      apiKey: MOONPAY_API_KEY,
      colorCode: '9333ea',
      currencyCode: 'sol',
      showWalletAddressForm: 'false',
      walletAddress: walletAddress,
    };

    // Sort keys alphabetically and build query string manually
    const sortedKeys = Object.keys(params).sort();
    const queryParts = sortedKeys.map(key => {
      const encodedValue = encodeURIComponent(params[key]);
      return `${key}=${encodedValue}`;
    });
    const queryString = queryParts.join('&');
    
    console.log('📝 Query string to sign:', queryString);
    
    // Create HMAC signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(MOONPAY_SECRET_KEY);
    const messageData = encoder.encode(queryString);
    
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

    // URL-encode the signature and append to URL
    const encodedSignature = encodeURIComponent(signatureBase64);
    const signedUrl = `https://buy-sandbox.moonpay.com/?${queryString}&signature=${encodedSignature}`;

    console.log('🔐 Signed MoonPay URL for wallet:', walletAddress);
    console.log('✅ Signature generated:', signatureBase64.substring(0, 20) + '...');

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
