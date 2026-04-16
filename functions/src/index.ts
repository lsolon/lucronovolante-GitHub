import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();

export const fetchUrl = functions.https.onCall(async (data, context) => {
  const { url } = data;

  if (!url || typeof url !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'url' argument."
    );
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const text = await response.text();
    return { text };
  } catch (error) {
    console.error("Error fetching URL:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to fetch URL content."
    );
  }
});
