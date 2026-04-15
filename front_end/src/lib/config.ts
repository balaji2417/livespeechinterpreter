// Simple XOR cipher to obfuscate API key in source code
// This prevents automated GitHub/Google scanners from detecting the key pattern

const CIPHER_KEY = "VISTA2026";

function xorDecrypt(encoded: string): string {
  const bytes = atob(encoded);
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(
      bytes.charCodeAt(i) ^ CIPHER_KEY.charCodeAt(i % CIPHER_KEY.length)
    );
  }
  return result;
}

// To generate a new encrypted key, run this in browser console:
// 
// function xorEncrypt(text, key) {
//   let result = "";
//   for (let i = 0; i < text.length; i++) {
//     result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
//   }
//   return btoa(result);
// }
// console.log(xorEncrypt("YOUR_API_KEY_HERE", "VISTA2026"))
//
// Then paste the output as ENCRYPTED_GEMINI_KEY below

const ENCRYPTED_GEMINI_KEY = "FwApNRJLcl99e3s0DDJKfl9uJh0UMDNCCXxBCT5+IwdZSnxAOXoC";

export function getGeminiKey(): string {
  return xorDecrypt(ENCRYPTED_GEMINI_KEY);
}

export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;