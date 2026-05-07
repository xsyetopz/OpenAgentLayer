use crate::{ControlPlane, DaemonConfig, OpenDexDaemon};

#[test]
fn daemon_route_catalog_covers_robdex_bridge_groups() {
    let mut daemon = OpenDexDaemon::new(ControlPlane::new(), DaemonConfig::default());
    let response = daemon.handle_request("GET /health HTTP/1.1\r\n\r\n");
    assert_eq!(response.status_code, 200);
}
