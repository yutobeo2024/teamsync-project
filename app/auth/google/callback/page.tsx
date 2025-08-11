"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (code) {
      // Send the authorization code to the parent window
      if (window.opener) {
        window.opener.postMessage({
          type: "GOOGLE_AUTH_CODE",
          code: code
        }, window.location.origin);
        window.close();
      }
    } else if (error) {
      // Handle error
      if (window.opener) {
        window.opener.postMessage({
          type: "GOOGLE_AUTH_ERROR",
          error: error
        }, window.location.origin);
        window.close();
      }
    }
  }, [searchParams]);

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <h2>Processing authentication...</h2>
        <p>This window will close automatically.</p>
      </div>
    </div>
  );
}