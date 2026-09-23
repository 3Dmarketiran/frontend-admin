import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { Spinner, fmtDateTime } from "../../components/ui";
import { useToast } from "../../lib/toast";

interface GithubStatus {
  connected: boolean;
  owner: string | null;
  repository: string | null;
  branch: string;
  lastSuccessfulPublish: { at: string | null; commitSha: string | null } | null;
  lastFailedPublish: { at: string | null; error: string | null } | null;
}

export default function AdminGitHubSettings() {
  const { push } = useToast();
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [form, setForm] = useState({ githubOwner: "", githubRepository: "", githubBranch: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get<GithubStatus>("/api/admin/github/status").then((s) => {
      setStatus(s);
      setForm({ githubOwner: s.owner ?? "", githubRepository: s.repository ?? "", githubBranch: s.branch ?? "main" });
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post<{ ok: boolean; message: string }>("/api/admin/github/test");
      setTestResult(r);
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof ApiError ? err.message : "خطای نامشخص" });
    } finally {
      setTesting(false);
    }
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/api/admin/github/config", form);
      push("تنظیمات GitHub ذخیره شد.", "success");
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در ذخیره تنظیمات.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="اتصال GitHub" />
      <div className="content">
        {loading ? <Spinner /> : (
          <div className="grid grid-2">
            <div className="card">
              <div className="section-head"><h2>وضعیت اتصال</h2></div>
              <p>
                {status?.connected ? <span className="badge badge-success">متصل</span> : <span className="badge badge-error">قطع</span>}
              </p>
              <table style={{ marginTop: 8 }}>
                <tbody>
                  <tr><td>مخزن</td><td>{status?.owner}/{status?.repository}</td></tr>
                  <tr><td>شاخه</td><td>{status?.branch}</td></tr>
                  <tr><td>آخرین انتشار موفق</td><td>{status?.lastSuccessfulPublish ? fmtDateTime(status.lastSuccessfulPublish.at) : "—"}</td></tr>
                  <tr><td>آخرین انتشار ناموفق</td><td>{status?.lastFailedPublish ? fmtDateTime(status.lastFailedPublish.at) : "—"}</td></tr>
                </tbody>
              </table>
              <p className="form-help" style={{ marginTop: 10 }}>توکن GitHub هرگز در این پنل نمایش داده نمی‌شود و فقط در متغیر محیطی سرور (<code>GITHUB_TOKEN</code>) نگهداری می‌شود.</p>
              <button className="btn btn-outline" onClick={testConnection} disabled={testing} style={{ marginTop: 10 }}>
                {testing ? "در حال تست..." : "تست اتصال"}
              </button>
              {testResult && (
                <div className={`alert ${testResult.ok ? "alert-success" : "alert-error"}`} style={{ marginTop: 10 }}>{testResult.message}</div>
              )}
            </div>

            <div className="card">
              <div className="section-head"><h2>پیکربندی مخزن</h2></div>
              <form onSubmit={saveConfig}>
                <div className="form-group"><label>مالک (Owner)</label><input value={form.githubOwner} onChange={(e) => setForm({ ...form, githubOwner: e.target.value })} /></div>
                <div className="form-group"><label>نام مخزن</label><input value={form.githubRepository} onChange={(e) => setForm({ ...form, githubRepository: e.target.value })} /></div>
                <div className="form-group"><label>شاخه</label><input value={form.githubBranch} onChange={(e) => setForm({ ...form, githubBranch: e.target.value })} /></div>
                <button className="btn btn-primary btn-block" disabled={saving} type="submit">{saving ? "در حال ذخیره..." : "ذخیره"}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
