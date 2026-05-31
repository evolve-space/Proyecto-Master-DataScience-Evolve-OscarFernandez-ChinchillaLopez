import { formatDistance, formatDuration, formatScore } from "../utils/formatters.js";

export default function PoiDetailPanel({ poi, t }) {
  const displayDescription =
    poi?.aiDescription || poi?.generatedDescription || poi?.description;

  return (
    <section className="panel detail-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{t.detail.eyebrow}</p>
          <h2>{poi ? poi.name : t.detail.emptyTitle}</h2>
        </div>
      </div>

      {!poi && <p>{t.detail.emptyText}</p>}

      {poi && (
        <div className="detail-content">
          <p className="detail-description">{displayDescription}</p>
          <div className="detail-grid">
            <div><span>{t.detail.route}</span><strong>{poi.routePosition}</strong></div>
            <div><span>{t.detail.category}</span><strong>{poi.category}</strong></div>
            <div><span>{t.detail.subcategory}</span><strong>{poi.subcategory}</strong></div>
            <div><span>{t.detail.rating}</span><strong>{formatScore(poi.rating)}</strong></div>
            <div><span>{t.detail.score}</span><strong>{formatScore(poi.score)}</strong></div>
            <div><span>{t.results.relevance}</span><strong>{formatScore(poi.hybridCandidateScore)}</strong></div>
            <div><span>{t.detail.visit}</span><strong>{formatDuration(poi.visitDuration)}</strong></div>
            <div><span>{t.detail.fromStart}</span><strong>{formatDistance(poi.distanceFromStartKm)}</strong></div>
            <div><span>{t.detail.fromPrevious}</span><strong>{formatDistance(poi.distanceFromPreviousKm)}</strong></div>
            <div><span>{t.detail.coordinates}</span><strong>{poi.latitude}, {poi.longitude}</strong></div>
            <div><span>{t.detail.cluster}</span><strong>{poi.clusterGeo ?? t.common.notAvailable}</strong></div>
            <div><span>{t.detail.confidence}</span><strong>{formatScore(poi.matchConfidence)}</strong></div>
            <div><span>{t.detail.tags}</span><strong>{poi.tags || t.common.notAvailable}</strong></div>
          </div>
        </div>
      )}
    </section>
  );
}
