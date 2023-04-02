import { drive_v3, google } from 'googleapis';
import 'dotenv/config';

const {
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_API_REFRESH_TOKEN,
	REDIRECT_URI,
	GOOGLE_API_KEY,
} = process.env;

const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);

// Sets the auth credentials.
oauth2Client.setCredentials({
	refresh_token: GOOGLE_API_REFRESH_TOKEN!,
});

// Get a non-expired access token, after refreshing if necessary
oauth2Client.getAccessToken();

const drive: drive_v3.Drive = google.drive({
	version: 'v3',
	auth: oauth2Client,
});

export default drive;