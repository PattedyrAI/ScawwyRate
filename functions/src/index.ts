import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Update item stats when a new rating is created
export const onRatingCreated = functions.firestore
  .document("ratings/{ratingId}")
  .onCreate(async (snapshot) => {
    const rating = snapshot.data();
    const itemRef = db.collection("items").doc(rating.itemId);

    await db.runTransaction(async (transaction) => {
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists) return;

      const item = itemDoc.data()!;
      const newCount = item.ratingCount + 1;
      const newTotal = item.totalScore + rating.score;
      const newAverage = newTotal / newCount;
      const newHighest = Math.max(item.highestScore || 0, rating.score);
      const newLowest = Math.min(item.lowestScore || 10, rating.score);

      transaction.update(itemRef, {
        ratingCount: newCount,
        totalScore: newTotal,
        averageScore: newAverage,
        highestScore: newHighest,
        lowestScore: newLowest,
      });
    });

    // Post to Discord if webhook configured
    await postToDiscord(rating);
  });

// Update item stats when a rating is deleted
export const onRatingDeleted = functions.firestore
  .document("ratings/{ratingId}")
  .onDelete(async (snapshot) => {
    const rating = snapshot.data();
    const itemRef = db.collection("items").doc(rating.itemId);

    await db.runTransaction(async (transaction) => {
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists) return;

      const item = itemDoc.data()!;
      const newCount = Math.max(0, item.ratingCount - 1);

      if (newCount === 0) {
        transaction.update(itemRef, {
          ratingCount: 0,
          totalScore: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 10,
        });
      } else {
        const newTotal = item.totalScore - rating.score;
        const newAverage = newTotal / newCount;

        // Recalculate highest/lowest from remaining ratings
        const ratingsSnapshot = await db
          .collection("ratings")
          .where("itemId", "==", rating.itemId)
          .get();

        let newHighest = 0;
        let newLowest = 10;
        ratingsSnapshot.docs.forEach((doc) => {
          const r = doc.data();
          if (doc.id !== snapshot.id) {
            newHighest = Math.max(newHighest, r.score);
            newLowest = Math.min(newLowest, r.score);
          }
        });

        transaction.update(itemRef, {
          ratingCount: newCount,
          totalScore: newTotal,
          averageScore: newAverage,
          highestScore: newHighest,
          lowestScore: newLowest,
        });
      }
    });
  });

// Exchange Discord authorization code for tokens and create Firebase user
export const exchangeDiscordCode = functions.https.onCall(
  async (data) => {
    const {code, redirectUri} = data;

    if (!code || !redirectUri) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing code or redirectUri"
      );
    }

    const clientId = functions.config().discord?.client_id;
    const clientSecret = functions.config().discord?.client_secret;

    if (!clientId || !clientSecret) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Discord credentials not configured"
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Failed to exchange Discord code"
      );
    }

    const tokens = await tokenResponse.json();

    // Fetch Discord user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {Authorization: `Bearer ${tokens.access_token}`},
    });

    if (!userResponse.ok) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Failed to fetch Discord user"
      );
    }

    const discordUser = await userResponse.json();

    // Create or get Firebase user
    let firebaseUser;
    try {
      firebaseUser = await admin
        .auth()
        .getUserByEmail(`${discordUser.id}@discord.rateit.app`);
    } catch {
      firebaseUser = await admin.auth().createUser({
        uid: discordUser.id,
        email: `${discordUser.id}@discord.rateit.app`,
        displayName: discordUser.username,
      });
    }

    // Build avatar URL
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${
        parseInt(discordUser.discriminator || "0") % 5
      }.png`;

    // Update user document in Firestore
    await db.collection("users").doc(firebaseUser.uid).set(
      {
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || "",
        avatarUrl: avatarUrl,
        email: discordUser.email || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    // Create custom token for Firebase Auth
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

    return {customToken};
  }
);

// Generate unique invite code
export const generateInviteCode = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in"
      );
    }

    // Characters without confusing ones (0, O, I, l, 1)
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    let isUnique = false;
    while (!isUnique) {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const existing = await db
        .collection("groups")
        .where("inviteCode", "==", code)
        .limit(1)
        .get();

      isUnique = existing.empty;
    }

    return {code};
  }
);

// Helper function to post rating to Discord
async function postToDiscord(rating: FirebaseFirestore.DocumentData) {
  const groupDoc = await db.collection("groups").doc(rating.groupId).get();
  const group = groupDoc.data();

  if (!group?.discordWebhookUrl) return;

  const userDoc = await db.collection("users").doc(rating.userId).get();
  const user = userDoc.data();
  if (!user) return;

  const itemDoc = await db.collection("items").doc(rating.itemId).get();
  const item = itemDoc.data();
  if (!item) return;

  const embed: Record<string, unknown> = {
    embeds: [
      {
        title: "New Rating!",
        description: `**${user.username}** rated **${item.name}** ${rating.score}/10`,
        color: getColorForScore(rating.score),
        fields: [
          {name: "Category", value: item.category, inline: true},
          {name: "Score", value: `${rating.score}/10`, inline: true},
        ],
        thumbnail: {url: user.avatarUrl},
        timestamp: new Date().toISOString(),
      },
    ],
  };

  if (rating.imageUrl) {
    (embed.embeds as Record<string, unknown>[])[0].image = {
      url: rating.imageUrl,
    };
  }

  if (rating.comment) {
    (
      (embed.embeds as Record<string, unknown>[])[0].fields as Record<
        string,
        unknown
      >[]
    ).push({
      name: "Comment",
      value: rating.comment,
      inline: false,
    });
  }

  try {
    await fetch(group.discordWebhookUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(embed),
    });
  } catch (error) {
    console.error("Failed to post to Discord:", error);
  }
}

function getColorForScore(score: number): number {
  if (score >= 8) return 0x00ff00; // Green
  if (score >= 6) return 0xffff00; // Yellow
  if (score >= 4) return 0xffa500; // Orange
  return 0xff0000; // Red
}
