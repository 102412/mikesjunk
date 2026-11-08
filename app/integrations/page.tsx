import { AppNav } from "@/components/app-nav";
import { IntegrationCatalog } from "@/components/integration-catalog";

export default function IntegrationsPage() {
  return <div className="app-shell">
    <AppNav />
    <main className="page-wrap">
      <header className="page-heading integration-heading">
        <div className="eyebrow">Connections</div>
        <h1>One control plane.<br /><span>Many real services.</span></h1>
        <p>Connections are powered by a privately hosted automation runtime—not a costly per-user connector reseller. Kernova shows only verified connection state and real sync results.</p>
      </header>
      <IntegrationCatalog />
    </main>
  </div>;
}
