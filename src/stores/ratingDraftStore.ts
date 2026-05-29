import { create } from 'zustand';

interface RatingDraft {
  photoUri: string | null;
  productId: string | null;
  productName: string | null;
  score: number | null;
  reviewText: string;
  wouldBuyAgain: boolean | null;
  tagIds: string[];
}

interface RatingDraftState extends RatingDraft {
  setPhoto: (uri: string) => void;
  setProduct: (id: string, name: string) => void;
  setScore: (score: number) => void;
  setReviewText: (text: string) => void;
  setWouldBuyAgain: (value: boolean | null) => void;
  toggleTag: (tagId: string) => void;
  reset: () => void;
}

const initialDraft: RatingDraft = {
  photoUri: null,
  productId: null,
  productName: null,
  score: null,
  reviewText: '',
  wouldBuyAgain: null,
  tagIds: [],
};

export const useRatingDraftStore = create<RatingDraftState>((set) => ({
  ...initialDraft,
  setPhoto: (photoUri) => set({ photoUri }),
  setProduct: (productId, productName) => set({ productId, productName }),
  setScore: (score) => set({ score }),
  setReviewText: (reviewText) => set({ reviewText }),
  setWouldBuyAgain: (wouldBuyAgain) => set({ wouldBuyAgain }),
  toggleTag: (tagId) =>
    set((state) => ({
      tagIds: state.tagIds.includes(tagId)
        ? state.tagIds.filter((id) => id !== tagId)
        : [...state.tagIds, tagId],
    })),
  reset: () => set(initialDraft),
}));
