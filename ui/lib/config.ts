// Central configuration — edit this file to point to your server
export const CONFIG = {
  // The URL where nginx is running. 
  // For local dev: http://localhost
  // For LAN access (mobile): http://YOUR_IP (e.g. http://10.100.102.15)
  // For production: https://your-domain.com
  SERVER_URL: 'http://10.100.102.15',

  // Google OAuth client ID (type: WEB). Required to obtain an idToken on native.
  // You can find this in Firebase -> Project settings -> Your apps -> Web client ID
  // or in google-services.json under client[0].oauth_client[*] where client_type is 3.
  GOOGLE_WEB_CLIENT_ID: '616555091525-v2nsc1ou583h7qlak98oo6nfg0uns46g.apps.googleusercontent.com',
};
