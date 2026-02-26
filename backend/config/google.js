import axios from "axios";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Exchange authorization code for Google tokens
 */
const getGoogleTokens = async (code) => {
  const { data } = await axios.post(
    "https://oauth2.googleapis.com/token",
    {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: "postmessage",
      grant_type: "authorization_code",
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return data; // contains id_token, access_token, etc.
};

/**
 * Verify Google authorization code and return user payload
 * @param {string} code — authorization code from frontend
 */
const verifyGoogleCode = async (code) => {
  // 1️⃣ Exchange code for tokens
  const tokens = await getGoogleTokens(code);

  if (!tokens.id_token) {
    throw new Error("Failed to retrieve ID token from Google.");
  }

  // 2️⃣ Verify ID token
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email_verified) {
    throw new Error("Google email not verified.");
  }

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    googleId: payload.sub,
  };
};

export { googleClient, verifyGoogleCode };