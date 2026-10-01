import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const channel = { on: vi.fn(), subscribe: vi.fn() };
const client = { channel: vi.fn(() => channel), auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "jwt-del-usuario" } } })) }, realtime: { setAuth: vi.fn() }, removeChannel: vi.fn() };
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => client) }));

describe("Realtime de Monitoreo", () => {
  beforeEach(() => { vi.stubGlobal("window", globalThis); channel.on.mockReturnValue(channel); });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.clearAllMocks(); });

  it("usa canal privado autenticado con la sesión del usuario y escucha cada tabla publicada", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    const { subscribeToMonitoring, monitoringRealtimeTables } = await import("./monitoring-realtime");
    const changes: string[] = [];
    const subscription = subscribeToMonitoring((table) => changes.push(table));
    await Promise.resolve(); await Promise.resolve();
    expect(subscription.mode).toBe("realtime");
    expect(client.channel).toHaveBeenCalledWith("private:monitoring:reliability", { config: { private: true } });
    expect(client.realtime.setAuth).toHaveBeenCalledWith("jwt-del-usuario");
    expect(channel.subscribe).toHaveBeenCalled();
    const tables = channel.on.mock.calls.map((call) => (call as unknown as [string, { table: string }, () => void])[1].table);
    expect(tables).toEqual([...monitoringRealtimeTables]);
    (channel.on.mock.calls[0] as unknown as [string, unknown, () => void])[2]();
    expect(changes).toEqual(["monitors"]);
    subscription.unsubscribe();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });

  it("sin Supabase configurado declara modo sondeo y refresca por intervalo (sin fingir tiempo real)", async () => {
    vi.useFakeTimers();
    const { subscribeToMonitoring } = await import("./monitoring-realtime");
    const changes: string[] = [];
    const subscription = subscribeToMonitoring((table) => changes.push(table), 30_000);
    expect(subscription.mode).toBe("polling");
    vi.advanceTimersByTime(61_000);
    expect(changes).toEqual(["poll", "poll"]);
    subscription.unsubscribe();
  });

  it("cada tabla publicada tiene RLS con alcance: un usuario no autorizado no recibe sus eventos", async () => {
    const { monitoringRealtimeTables } = await import("./monitoring-realtime");
    const sql = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20261001050000_site_reliability_monitoring.sql"), "utf8");
    const published = /foreach table_name in array array\[([^\]]+)\] loop\s+if not exists\(select 1 from pg_publication_tables/.exec(sql)![1]!;
    for (const table of monitoringRealtimeTables) {
      expect(published).toContain(`'${table}'`);
      expect(sql).toMatch(table === "alert_delivery_events" ? /policy monitoring_alerts_recipient on public\.alert_delivery_events[^;]*recipient_user_id=auth\.uid\(\)/ : new RegExp(`'${table}'[^\\n]*\\] loop\\s+execute format\\('drop policy if exists monitoring_project_read`));
    }
    expect(sql).toContain("private.can_view_monitoring_project(project_id)");
  });
});
