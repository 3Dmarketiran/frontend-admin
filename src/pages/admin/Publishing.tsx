import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, JobStatusBadge, Modal, Spinner, fmtDateTime } from "../../components/ui";
import type { PublishJob } from "../../types";

export default function AdminPublishing() {
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PublishJob | null>(null);

  function load() {
    setLoading(true);
    api.get<{ jobs: PublishJob[] }>("/api/publishing/jobs").then((r) => setJobs(r.jobs)).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 8000); // poll for in-progress jobs
    return () => clearInterval(t);
  }, []);

  async function openDetail(job: PublishJob) {
    const full = await api.get<{ job: PublishJob }>(`/api/publishing/jobs/${job.id}`);
    setDetail(full.job);
  }

  return (
    <>
      <PageHeader title="صف انتشار" />
      <div className="content">
        <div className="section-head"><h2>تاریخچه انتشار ({jobs.length})</h2></div>
        {loading ? <Spinner /> : jobs.length === 0 ? (
          <EmptyState icon="🚀" text="هنوز درخواست انتشاری ثبت نشده است." />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead><tr><th>محصول</th><th>فروشنده</th><th>وضعیت</th><th>Commit</th><th>زمان درخواست</th><th></th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{j.product?.name ?? "—"}</td>
                    <td>{j.seller?.storeName ?? "—"}</td>
                    <td><JobStatusBadge v={j.status} /></td>
                    <td><code style={{ fontSize: ".75rem" }}>{j.commitSha?.slice(0, 8) ?? "—"}</code></td>
                    <td>{fmtDateTime(j.requestedAt)}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openDetail(j)}>جزئیات</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {detail && (
        <Modal title={`جزئیات انتشار — ${detail.product?.name ?? detail.id}`} onClose={() => setDetail(null)}>
          <div style={{ marginBottom: 10 }}><JobStatusBadge v={detail.status} /></div>
          {detail.errorMessage && <div className="alert alert-error">{detail.errorMessage}</div>}
          <div style={{ maxHeight: 260, overflowY: "auto", background: "#0f172a", color: "#e2e8f0", padding: 12, borderRadius: 8, fontSize: ".78rem", fontFamily: "monospace" }}>
            {(detail.logs ?? []).map((l) => (
              <div key={l.id} style={{ color: l.level === "error" ? "#fca5a5" : l.level === "warn" ? "#fde047" : "#a7f3d0" }}>
                [{new Date(l.createdAt).toLocaleTimeString("fa-IR")}] {l.message}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
