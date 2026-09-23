import React from "react";
import { JobStatusBadge } from "./ui";
import type { PublishJob } from "../types";

type Props = {
  job?: PublishJob | null;
  compact?: boolean;
};

export function PublishJobStatus({
  job,
  compact = false,
}: Props) {
  if (!job) {
    return null;
  }

  if (job.status === "SUCCESS") {
    return (
      <div
        style={{
          padding: compact
            ? "6px 8px"
            : "9px 10px",
          borderRadius: 10,
          background:
            "rgba(34,197,94,.08)",
          border:
            "1px solid rgba(34,197,94,.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <JobStatusBadge
            v={job.status}
          />

          <span
            style={{
              fontSize: 12,
              color:
                "var(--muted, #64748b)",
            }}
          >
            انتشار با موفقیت انجام شد.
          </span>
        </div>

        {job.commitSha && (
          <div
            style={{
              marginTop: 5,
              fontSize: 11,
              color:
                "var(--muted, #64748b)",
            }}
          >
            Commit:{" "}
            <code>
              {job.commitSha.slice(
                0,
                8
              )}
            </code>
          </div>
        )}
      </div>
    );
  }

  if (job.status === "FAILED") {
    return (
      <div
        style={{
          padding: compact
            ? "6px 8px"
            : "9px 10px",
          borderRadius: 10,
          background:
            "rgba(239,68,68,.08)",
          border:
            "1px solid rgba(239,68,68,.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <JobStatusBadge
            v={job.status}
          />

          <span
            style={{
              fontSize: 12,
              color: "#b91c1c",
            }}
          >
            انتشار ناموفق بود.
          </span>
        </div>

        {job.errorMessage && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              lineHeight: 1.7,
              color: "#991b1b",
              wordBreak:
                "break-word",
            }}
          >
            {job.errorMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: compact
          ? "6px 8px"
          : "9px 10px",
        borderRadius: 10,
        background:
          "rgba(59,130,246,.07)",
        border:
          "1px solid rgba(59,130,246,.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexWrap: "wrap",
        }}
      >
        <JobStatusBadge
          v={job.status}
        />

        <span
          style={{
            fontSize: 12,
            color:
              "var(--muted, #64748b)",
          }}
        >
          {job.status ===
          "QUEUED"
            ? "در صف انتشار قرار دارد."
            : "در حال پردازش و ساخت نسخه عمومی است."}
        </span>
      </div>
    </div>
  );
}

export default PublishJobStatus;
