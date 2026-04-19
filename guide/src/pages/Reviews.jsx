import { useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt, FaCommentDots, FaRegStar, FaStar } from 'react-icons/fa';
import { getMyReviews } from '../services/guidesService';
import './Reviews.css';

function ReviewStars({ rating }) {
    return (
        <div className="gr-stars" aria-label={`${rating} star review`}>
            {Array.from({ length: 5 }).map((_, index) =>
                index < rating ? <FaStar key={index} /> : <FaRegStar key={index} />
            )}
        </div>
    );
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function Reviews() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setError('');
            try {
                const response = await getMyReviews();
                if (alive) setData(response);
            } catch (err) {
                if (alive) setError(err.message || 'Unable to load reviews.');
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, []);

    const summary = useMemo(() => ({
        rating: Number(data?.rating || 0),
        reviewCount: Number(data?.review_count || 0),
        breakdown: Array.isArray(data?.rating_breakdown) ? data.rating_breakdown : [],
        reviews: Array.isArray(data?.results) ? data.results : [],
    }), [data]);

    return (
        <div className="gr-page">
            <header className="gr-header">
                <div>
                    <h1>Traveler Reviews</h1>
                    <p>See what travelers said about completed trips, including ratings and written feedback.</p>
                </div>
            </header>

            {error && <div className="gr-error">⚠️ {error}</div>}

            <section className="gr-summary-grid">
                <article className="gr-summary-card">
                    <span>Average Rating</span>
                    <strong>{summary.rating.toFixed(1)} / 5</strong>
                </article>
                <article className="gr-summary-card">
                    <span>Total Reviews</span>
                    <strong>{summary.reviewCount}</strong>
                </article>
            </section>

            <section className="gr-breakdown-card">
                <h2>Rating Breakdown</h2>
                <div className="gr-breakdown-list">
                    {summary.breakdown.map((row) => (
                        <div key={row.stars} className="gr-breakdown-row">
                            <span>{row.stars}★</span>
                            <div className="gr-breakdown-track">
                                <div className="gr-breakdown-fill" style={{ width: `${row.percentage}%` }} />
                            </div>
                            <strong>{row.count}</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className="gr-list-section">
                <h2>All Reviews</h2>
                {loading ? (
                    <div className="gr-loading">Loading reviews…</div>
                ) : summary.reviews.length === 0 ? (
                    <div className="gr-empty">No reviews yet. Traveler feedback will appear here after completed trips are reviewed.</div>
                ) : (
                    <div className="gr-grid">
                        {summary.reviews.map((review) => (
                            <article key={review.id} className="gr-card">
                                <div className="gr-card-head">
                                    <div>
                                        <h3>{review.traveler_name}</h3>
                                        <p>{review.trip_type}</p>
                                    </div>
                                    <ReviewStars rating={review.rating} />
                                </div>

                                <div className="gr-meta">
                                    <span><FaCalendarAlt /> {formatDate(review.created_at)}</span>
                                    <span>Trip: {formatDate(review.trip_start)} - {formatDate(review.trip_end)}</span>
                                </div>

                                <div className="gr-comment">
                                    <FaCommentDots className="gr-comment-icon" />
                                    <p>{review.comment || 'The traveler left a rating without a written comment.'}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
