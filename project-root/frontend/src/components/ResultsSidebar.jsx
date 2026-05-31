import { formatDistance, formatDuration, formatScore } from "../utils/formatters.js";
import { translateMetaNote } from "../i18n/translations.js";

export default function ResultsSidebar({
  meta,
  route,
  selectedPoi,
  onPoiSelect,
  summary,
  t,
}) {
  return (
    <section className="panel results-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{t.results.eyebrow}</p>
          <h2>{t.results.title}</h2>
        </div>
        <div className="summary-pill">
          {summary.totalPois} / {summary.requestedPois} POIs
        </div>
      </div>

      <div className="summary-grid route-summary-grid">
        <div>
          <span>{t.results.distance}</span>
          <strong>{formatDistance(summary.totalDistanceKm)}</strong>
        </div>
        <div>
          <span>{t.results.visitTime}</span>
          <strong>{formatDuration(summary.totalVisitMinutes)}</strong>
        </div>
        <div>
          <span>{t.results.travelTime}</span>
          <strong>{formatDuration(summary.totalTravelMinutes)}</strong>
        </div>
        <div>
          <span>{t.results.totalRoute}</span>
          <strong>{formatDuration(summary.totalExperienceMinutes)}</strong>
        </div>
      </div>

      {summary.totalPois < summary.requestedPois && (
        <p className="results-note">{t.results.fewerPois}</p>
      )}

      {meta?.notes?.length ? (
        <div className="meta-notes">
          {meta.notes.map((note) => (
            <p className="results-note" key={note}>
              {translateMetaNote(note, t)}
            </p>
          ))}
        </div>
      ) : null}

      {route.length > 0 && (
        <div className="route-accordion">
          {route.map((poi) => {
            const isSelected = selectedPoi?.id === poi.id;
            const displayDescription =
              poi.aiDescription || poi.generatedDescription || poi.description;

            return (
              <article
                className={`poi-accordion-card ${isSelected ? "active" : ""}`}
                key={`${poi.id}-${poi.routePosition}`}
              >
                <button
                  className="poi-accordion-summary"
                  onClick={() => onPoiSelect(isSelected ? null : poi)}
                  type="button"
                >
                  <span className="poi-index">{poi.routePosition}</span>
                  <span className="poi-summary-main">
                    <strong>{poi.name}</strong>
                    <span>{poi.category} · {poi.subcategory}</span>
                    <span>{poi.neighborhoodZone || t.common.notAvailable}</span>
                  </span>
                  <span className="poi-summary-metrics">
                    <span>{t.results.rating} {formatScore(poi.rating)}</span>
                    <span>{t.results.visit} {formatDuration(poi.visitDuration)}</span>
                  </span>
                  <span className="accordion-indicator">{isSelected ? "−" : "+"}</span>
                </button>

                {isSelected && (
                  <div className="poi-accordion-detail">
                    <p className="poi-description">{displayDescription}</p>
                    <div className="detail-grid">
                      <div><span>{t.detail.route}</span><strong>{poi.routePosition}</strong></div>
                      <div><span>{t.detail.category}</span><strong>{poi.category}</strong></div>
                      <div><span>{t.detail.subcategory}</span><strong>{poi.subcategory}</strong></div>
                      <div><span>{t.form.neighborhoodZones}</span><strong>{poi.neighborhoodZone || t.common.notAvailable}</strong></div>
                      <div><span>{t.detail.rating}</span><strong>{formatScore(poi.rating)}</strong></div>
                      <div><span>{t.detail.score}</span><strong>{formatScore(poi.score)}</strong></div>
                      <div><span>{t.results.relevance}</span><strong>{formatScore(poi.hybridCandidateScore)}</strong></div>
                      <div><span>{t.detail.visit}</span><strong>{formatDuration(poi.visitDuration)}</strong></div>
                      <div><span>{t.detail.fromStart}</span><strong>{formatDistance(poi.distanceFromStartKm)}</strong></div>
                      <div><span>{t.detail.fromPrevious}</span><strong>{formatDistance(poi.distanceFromPreviousKm)}</strong></div>
                      <div><span>{t.detail.coordinates}</span><strong>{poi.latitude}, {poi.longitude}</strong></div>
                      <div><span>{t.detail.cluster}</span><strong>{poi.clusterGeo ?? t.common.notAvailable}</strong></div>
                      <div><span>{t.detail.confidence}</span><strong>{formatScore(poi.matchConfidence)}</strong></div>
                    </div>
                    <div className="tags-row">
                      <span>{t.detail.tags}</span>
                      <strong>{poi.tags || t.common.notAvailable}</strong>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
