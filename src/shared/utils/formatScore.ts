export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function getScoreLabel(score: number): string {
  if (score <= 2) return 'Terrible';
  if (score <= 3) return 'Bad';
  if (score <= 4) return 'Below Average';
  if (score <= 5) return 'Average';
  if (score <= 6) return 'Above Average';
  if (score <= 7) return 'Good';
  if (score <= 8) return 'Great';
  if (score <= 9) return 'Excellent';
  return 'Perfect';
}
