import * as Sharing from 'expo-sharing';
import { getScoreLabel } from './formatScore';

interface ShareableRating {
  score: number;
  productName: string;
  brandName?: string;
  username: string;
  reviewText?: string | null;
}

export async function shareRating(rating: ShareableRating) {
  const label = getScoreLabel(rating.score);
  const brand = rating.brandName ? ` by ${rating.brandName}` : '';
  const review = rating.reviewText ? `\n\n"${rating.reviewText}"` : '';

  const message =
    `${rating.productName}${brand}\n` +
    `${rating.score}/10 - ${label}${review}\n\n` +
    `Rated by @${rating.username} on Everrate`;

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(message);
  }
}
