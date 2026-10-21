'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.name && user.role === 'CUSTOMER') {
      setName(user.name);
    }
    loadReviews();
  }, [productId]);

  async function loadReviews() {
    try {
      const res = await api.get<any>(`/api/reviews?productId=${productId}&status=APPROVED`);
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setReviews(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage('Please enter your name');
      return;
    }
    setSubmitting(true);
    setMessage('');

    try {
      const token = getToken() || undefined;
      await api.post('/api/reviews', {
        productId,
        name: name.trim(),
        rating,
        comment: comment.trim(),
      }, { token });

      setMessage('✅ Review submitted! It will appear after admin approval.');
      setShowForm(false);
      setComment('');
      setRating(5);
      setName('');
    } catch (err: any) {
      setMessage(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="border-t border-gray-200 mt-10 pt-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#0F2A5C]">
            Customer Reviews
          </h2>
          {reviews.length > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star}>{star <= Math.round(avgRating) ? '★' : '☆'}</span>
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {avgRating.toFixed(1)} ({reviews.length} reviews)
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">No reviews yet. Be the first!</p>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#0F2A5C] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] transition"
        >
          {showForm ? 'Cancel' : '+ Write a Review'}
        </button>
      </div>

      {message && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3">
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 rounded-lg p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0F2A5C] mb-1">Your Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2A5C]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0F2A5C] mb-1">Rating</label>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={star <= rating ? 'text-yellow-500' : 'text-gray-300'}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0F2A5C] mb-1">Comment</label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#0F2A5C]"
              placeholder="Share your experience with this product..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#0F2A5C] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">⭐</div>
          <p className="text-gray-600 mb-1">No reviews yet</p>
          <p className="text-sm text-gray-400">Be the first to review this product!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-[#0F2A5C]">{review.name}</div>
                  <div className="text-yellow-500 text-sm">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>{star <= review.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString('en-GB')}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-gray-700 mt-2">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}