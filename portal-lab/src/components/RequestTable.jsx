/**
 * RequestTable — reusable component
 * Props:
 *   requests      — array of request objects
 *   onStatusChange(id, newStatus) — callback to update a request status
 *   loading       — boolean, shows skeleton rows while fetching
 */
export default function RequestTable({ requests = [], onStatusChange, loading = false }) {
  const SKELETON_ROWS = 4;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Client</th>
          <th>Lab</th>
          <th>Status</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {/* Loading skeleton */}
        {loading &&
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <tr key={`skel-${i}`} className="skeleton-row">
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j}>
                  <span className="skeleton-cell" />
                </td>
              ))}
            </tr>
          ))}

        {/* Empty state */}
        {!loading && requests.length === 0 && (
          <tr>
            <td colSpan={6} className="empty-state">
              No test requests found. Create one to get started.
            </td>
          </tr>
        )}

        {/* Data rows */}
        {!loading &&
          requests.map((r) => (
            <tr key={r.id}>
              <td className="id-cell">{r.id}</td>
              <td>{r.company_name ?? r.client_id ?? "—"}</td>
              <td>{r.lab_name ?? r.lab_id ?? "—"}</td>
              <td>
                <span className={`badge ${r.status}`}>
                  {r.status?.replace(/_/g, " ")}
                </span>
              </td>
              <td className="muted-cell">
                {r.created_at
                  ? new Date(r.created_at).toLocaleDateString()
                  : "—"}
              </td>
              <td className="action-cell">
                {r.status === "pending" && (
                  <button
                    className="btn-sm"
                    onClick={() => onStatusChange?.(r.id, "in_progress")}
                  >
                    ▶ Start
                  </button>
                )}
                {r.status === "in_progress" && (
                  <button
                    className="btn-sm btn-success"
                    onClick={() => onStatusChange?.(r.id, "completed")}
                  >
                    ✓ Complete
                  </button>
                )}
                {r.status === "completed" && (
                  <span className="muted-cell">Done</span>
                )}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
